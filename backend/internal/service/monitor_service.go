package service

import (
	"strings"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	gopsnet "github.com/shirou/gopsutil/v4/net"
)

type CPUReader interface {
	Percent(interval time.Duration, percpu bool) ([]float64, error)
}

type NetworkReader interface {
	IOCounters(pernic bool) ([]gopsnet.IOCountersStat, error)
	PhysicalInterfaces() (physicalInterfaceSet, error)
}

type gopsutilCPUReader struct{}

func (gopsutilCPUReader) Percent(interval time.Duration, percpu bool) ([]float64, error) {
	return cpu.Percent(interval, percpu)
}

type gopsutilNetworkReader struct{}

func (gopsutilNetworkReader) IOCounters(pernic bool) ([]gopsnet.IOCountersStat, error) {
	return gopsnet.IOCounters(pernic)
}

func (gopsutilNetworkReader) PhysicalInterfaces() (physicalInterfaceSet, error) {
	return physicalInterfaces()
}

type MonitorSnapshot struct {
	Time          string
	CPU           float64
	UploadSpeed   float64
	DownloadSpeed float64
}

type MonitorService struct {
	mu                       sync.Mutex
	idleTimeout              time.Duration
	lastActivity             time.Time
	running                  bool
	cpuReader                CPUReader
	networkReader            NetworkReader
	now                      func() time.Time
	snapshot                 MonitorSnapshot
	physicalInterfaces       physicalInterfaceSet
	physicalInterfacesLoaded bool
}

func NewMonitorService(idleTimeout time.Duration) *MonitorService {
	return NewMonitorServiceWithDeps(idleTimeout, gopsutilCPUReader{}, gopsutilNetworkReader{}, time.Now)
}

func NewMonitorServiceWithDeps(idleTimeout time.Duration, cpuReader CPUReader, networkReader NetworkReader, now func() time.Time) *MonitorService {
	if idleTimeout <= 0 {
		idleTimeout = 30 * time.Second
	}
	if cpuReader == nil {
		cpuReader = gopsutilCPUReader{}
	}
	if networkReader == nil {
		networkReader = gopsutilNetworkReader{}
	}
	if now == nil {
		now = time.Now
	}
	s := &MonitorService{
		idleTimeout:   idleTimeout,
		cpuReader:     cpuReader,
		networkReader: networkReader,
		now:           now,
	}
	s.resetSnapshot()
	return s
}

func (s *MonitorService) Snapshot() MonitorSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.lastActivity = s.now()
	if !s.running {
		s.resetSnapshotLocked()
		s.running = true
		go s.sampleLoop()
	}
	return s.snapshot
}

func (s *MonitorService) resetSnapshot() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.resetSnapshotLocked()
}

func (s *MonitorService) resetSnapshotLocked() {
	s.snapshot = MonitorSnapshot{
		Time: s.now().Format("15:04:05"),
	}
}

func (s *MonitorService) sampleLoop() {
	var previousNetwork map[string]networkCounters
	var previousNetworkTime time.Time
	physicalInterfaces := s.physicalNetworkInterfaces()

	for {
		percents, cpuErr := s.cpuReader.Percent(time.Second, false)
		networkStats, networkErr := s.networkReader.IOCounters(true)
		sampleTime := s.now()

		s.mu.Lock()
		if !s.running {
			s.mu.Unlock()
			return
		}
		if cpuErr == nil && len(percents) > 0 {
			s.snapshot.Time = sampleTime.Format("15:04:05")
			s.snapshot.CPU = percents[0]
		}
		if networkErr == nil && len(networkStats) > 0 {
			currentNetwork := collectNetworkCounters(networkStats, physicalInterfaces)
			if len(currentNetwork) > 0 {
				if previousNetwork != nil {
					elapsed := sampleTime.Sub(previousNetworkTime).Seconds()
					if elapsed >= 0.25 && elapsed <= 10 {
						sentDelta, recvDelta := networkDeltas(previousNetwork, currentNetwork)
						s.snapshot.UploadSpeed = bytesPerSecondToMB(float64(sentDelta) / elapsed)
						s.snapshot.DownloadSpeed = bytesPerSecondToMB(float64(recvDelta) / elapsed)
					}
				}
				previousNetwork = currentNetwork
				previousNetworkTime = sampleTime
				s.snapshot.Time = sampleTime.Format("15:04:05")
			}
		}
		if sampleTime.Sub(s.lastActivity) > s.idleTimeout {
			s.running = false
			s.mu.Unlock()
			return
		}
		s.mu.Unlock()
	}
}

func (s *MonitorService) physicalNetworkInterfaces() physicalInterfaceSet {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.physicalInterfacesLoaded {
		return s.physicalInterfaces
	}

	physicalInterfaces, err := s.networkReader.PhysicalInterfaces()
	if err != nil {
		physicalInterfaces = physicalInterfaceSet{}
	}
	s.physicalInterfaces = physicalInterfaces
	s.physicalInterfacesLoaded = true
	return s.physicalInterfaces
}

type physicalInterfaceSet struct {
	names    map[string]bool
	verified bool
}

type networkCounters struct {
	bytesSent uint64
	bytesRecv uint64
}

func collectNetworkCounters(stats []gopsnet.IOCountersStat, physicalInterfaces physicalInterfaceSet) map[string]networkCounters {
	counters := make(map[string]networkCounters, len(stats))
	for _, stat := range stats {
		if !isMonitorNetworkInterface(stat, physicalInterfaces) {
			continue
		}
		counters[stat.Name] = networkCounters{
			bytesSent: stat.BytesSent,
			bytesRecv: stat.BytesRecv,
		}
	}
	return counters
}

func isMonitorNetworkInterface(stat gopsnet.IOCountersStat, physicalInterfaces physicalInterfaceSet) bool {
	name := normalizeNetworkInterfaceName(stat.Name)
	if name == "" {
		return false
	}
	if stat.BytesSent == 0 && stat.BytesRecv == 0 {
		return false
	}
	if name == "lo" || name == "lo0" || strings.Contains(name, "loopback") {
		return false
	}
	if isVirtualNetworkInterfaceName(name) {
		return false
	}
	if physicalInterfaces.verified && !physicalInterfaces.names[name] {
		return false
	}
	return true
}

func isVirtualNetworkInterfaceName(name string) bool {
	for _, keyword := range virtualNetworkInterfaceKeywords {
		if strings.Contains(name, keyword) {
			return true
		}
	}
	return false
}

func normalizeNetworkInterfaceName(name string) string {
	return strings.TrimSpace(strings.ToLower(name))
}

var virtualNetworkInterfaceKeywords = []string{
	"mihomo",
	"clash",
	"wintun",
	"wireguard",
	"tun",
	"tap",
	"vpn",
	"virtual",
	"hyper-v",
	"vmware",
	"virtualbox",
	"docker",
	"loopback",
	"teredo",
	"isatap",
}

func networkDeltas(previous, current map[string]networkCounters) (uint64, uint64) {
	var sentDelta uint64
	var recvDelta uint64
	for name, currentCounters := range current {
		previousCounters, ok := previous[name]
		if !ok {
			continue
		}
		if currentCounters.bytesSent >= previousCounters.bytesSent {
			sentDelta += currentCounters.bytesSent - previousCounters.bytesSent
		}
		if currentCounters.bytesRecv >= previousCounters.bytesRecv {
			recvDelta += currentCounters.bytesRecv - previousCounters.bytesRecv
		}
	}
	return sentDelta, recvDelta
}

func bytesPerSecondToMB(value float64) float64 {
	return value / 1024 / 1024
}
