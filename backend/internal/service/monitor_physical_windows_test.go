//go:build windows

package service

import "testing"

func TestIsWindowsPhysicalNetworkAdapterAcceptsPCIAndUSBHardware(t *testing.T) {
	cases := []win32NetworkAdapter{
		{
			Name:            "Intel(R) Ethernet Controller",
			NetConnectionID: "Ethernet",
			Description:     "Intel(R) Ethernet Controller",
			Manufacturer:    "Intel",
			PNPDeviceID:     `PCI\VEN_8086&DEV_15F3`,
			PhysicalAdapter: true,
		},
		{
			Name:            "USB Wi-Fi Adapter",
			NetConnectionID: "Wi-Fi",
			Description:     "Realtek USB Wireless LAN",
			Manufacturer:    "Realtek",
			PNPDeviceID:     `USB\VID_0BDA&PID_B812`,
			PhysicalAdapter: true,
		},
	}

	for _, tc := range cases {
		if !isWindowsPhysicalNetworkAdapter(tc) {
			t.Fatalf("adapter %q rejected, want accepted", tc.Name)
		}
	}
}

func TestIsWindowsPhysicalNetworkAdapterRejectsVirtualAdapters(t *testing.T) {
	cases := []win32NetworkAdapter{
		{
			Name:            "Mihomo",
			NetConnectionID: "Mihomo",
			Description:     "Mihomo TUN Adapter",
			Manufacturer:    "Mihomo",
			ServiceName:     "wintun",
			PNPDeviceID:     `ROOT\NET\0001`,
			PhysicalAdapter: true,
		},
		{
			Name:            "Wintun Userspace Tunnel",
			NetConnectionID: "Wintun",
			Description:     "WireGuard Tunnel Adapter",
			Manufacturer:    "WireGuard LLC",
			ServiceName:     "wintun",
			PNPDeviceID:     `PCI\VEN_1234&DEV_5678`,
			PhysicalAdapter: true,
		},
		{
			Name:            "Hyper-V Virtual Ethernet Adapter",
			NetConnectionID: "vEthernet",
			Description:     "Hyper-V Virtual Ethernet Adapter",
			Manufacturer:    "Microsoft",
			PNPDeviceID:     `PCI\VEN_1414&DEV_5353`,
			PhysicalAdapter: true,
		},
	}

	for _, tc := range cases {
		if isWindowsPhysicalNetworkAdapter(tc) {
			t.Fatalf("adapter %q accepted, want rejected", tc.Name)
		}
	}
}
