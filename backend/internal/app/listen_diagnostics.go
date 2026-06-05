package app

import (
	"fmt"
	"net"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

type ipAddrFunc func() []string

func listenAddressDiagnostics(addr string, ipAddrs ipAddrFunc) []string {
	info := parseListenAddress(addr)
	lines := []string{
		fmt.Sprintf("HTTP listen address: %s", info.displayAddr),
		fmt.Sprintf("Local URL: http://localhost:%s", info.port),
	}
	if info.allInterfaces {
		for _, ip := range ipAddrs() {
			lines = append(lines, fmt.Sprintf("LAN URL: http://%s:%s", ip, info.port))
		}
		if len(lines) == 2 {
			lines = append(lines, "LAN URL: no active private IPv4 address detected; run ipconfig to find the address manually")
		}
	} else if info.localOnly {
		lines = append(lines, "LAN access disabled: this address only listens on localhost; set LSDB_ADDR=:8080 or LSDB_ADDR=0.0.0.0:8080 to allow LAN clients")
	}
	if info.port == "80" {
		lines = append(lines, "Port 80 may require Administrator permission or may already be used by IIS/Apache/Nginx; use netstat -ano | findstr :80 if startup fails")
	}
	return lines
}

type listenAddressInfo struct {
	displayAddr   string
	port          string
	allInterfaces bool
	localOnly     bool
}

func parseListenAddress(addr string) listenAddressInfo {
	displayAddr := strings.TrimSpace(addr)
	if displayAddr == "" {
		displayAddr = ":8080"
	}
	host, port := splitListenHostPort(displayAddr)
	hostKey := strings.ToLower(strings.Trim(host, "[]"))
	return listenAddressInfo{
		displayAddr:   displayAddr,
		port:          port,
		allInterfaces: hostKey == "" || hostKey == "0.0.0.0" || hostKey == "::",
		localOnly:     hostKey == "localhost" || hostKey == "127.0.0.1" || hostKey == "::1",
	}
}

func splitListenHostPort(addr string) (string, string) {
	if strings.HasPrefix(addr, ":") {
		return "", strings.TrimPrefix(addr, ":")
	}
	if host, port, err := net.SplitHostPort(addr); err == nil {
		return host, port
	}
	if u, err := url.Parse("http://" + addr); err == nil && u.Port() != "" {
		return u.Hostname(), u.Port()
	}
	return addr, "8080"
}

func localIPv4Addrs() []string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	seen := map[string]bool{}
	var ips []string
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			ip, ok := addr.(*net.IPNet)
			if !ok {
				continue
			}
			v4 := ip.IP.To4()
			if v4 == nil || !v4.IsPrivate() {
				continue
			}
			value := v4.String()
			if !seen[value] {
				seen[value] = true
				ips = append(ips, value)
			}
		}
	}
	sort.Slice(ips, func(i, j int) bool {
		return ipv4SortKey(ips[i]) < ipv4SortKey(ips[j])
	})
	return ips
}

func ipv4SortKey(ip string) uint32 {
	parts := strings.Split(ip, ".")
	if len(parts) != 4 {
		return 0
	}
	var key uint32
	for _, part := range parts {
		n, err := strconv.Atoi(part)
		if err != nil || n < 0 || n > 255 {
			return 0
		}
		key = key<<8 | uint32(n)
	}
	return key
}
