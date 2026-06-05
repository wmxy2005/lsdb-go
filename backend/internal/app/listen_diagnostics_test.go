package app

import (
	"strings"
	"testing"
)

func TestListenAddressDiagnosticsAllInterfaces(t *testing.T) {
	lines := listenAddressDiagnostics(":8080", func() []string {
		return []string{"192.168.10.87"}
	})
	text := strings.Join(lines, "\n")
	if !strings.Contains(text, "HTTP listen address: :8080") {
		t.Fatalf("diagnostics missing listen address: %s", text)
	}
	if !strings.Contains(text, "Local URL: http://localhost:8080") {
		t.Fatalf("diagnostics missing local URL: %s", text)
	}
	if !strings.Contains(text, "LAN URL: http://192.168.10.87:8080") {
		t.Fatalf("diagnostics missing LAN URL: %s", text)
	}
	if strings.Contains(text, "LAN access disabled") {
		t.Fatalf("all-interface address should not be localhost-only: %s", text)
	}
}

func TestListenAddressDiagnosticsAllInterfacesExplicitIPv4(t *testing.T) {
	lines := listenAddressDiagnostics("0.0.0.0:8080", func() []string {
		return []string{"192.168.10.87"}
	})
	text := strings.Join(lines, "\n")
	if !strings.Contains(text, "LAN URL: http://192.168.10.87:8080") {
		t.Fatalf("diagnostics missing LAN URL: %s", text)
	}
}

func TestListenAddressDiagnosticsAllInterfacesExplicitIPv6(t *testing.T) {
	lines := listenAddressDiagnostics("[::]:8080", func() []string {
		return []string{"192.168.10.87"}
	})
	text := strings.Join(lines, "\n")
	if !strings.Contains(text, "LAN URL: http://192.168.10.87:8080") {
		t.Fatalf("diagnostics missing LAN URL: %s", text)
	}
}

func TestListenAddressDiagnosticsLocalhostOnly(t *testing.T) {
	for _, addr := range []string{"127.0.0.1:8080", "localhost:8080"} {
		lines := listenAddressDiagnostics(addr, func() []string {
			return []string{"192.168.10.87"}
		})
		text := strings.Join(lines, "\n")
		if !strings.Contains(text, "LAN access disabled") {
			t.Fatalf("%s diagnostics missing localhost-only warning: %s", addr, text)
		}
		if strings.Contains(text, "LAN URL: http://192.168.10.87:8080") {
			t.Fatalf("%s diagnostics should not advertise LAN URL: %s", addr, text)
		}
	}
}

func TestListenAddressDiagnosticsPort80Warning(t *testing.T) {
	lines := listenAddressDiagnostics(":80", func() []string {
		return []string{"192.168.10.87"}
	})
	text := strings.Join(lines, "\n")
	if !strings.Contains(text, "Port 80 may require Administrator permission") {
		t.Fatalf("diagnostics missing port 80 warning: %s", text)
	}
}
