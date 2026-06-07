//go:build windows

package service

import (
	"strings"

	"github.com/yusufpapurcu/wmi"
)

type win32NetworkAdapter struct {
	Name            string
	NetConnectionID string
	Description     string
	Manufacturer    string
	ServiceName     string
	PNPDeviceID     string
	PhysicalAdapter bool
}

func physicalInterfaces() (physicalInterfaceSet, error) {
	var adapters []win32NetworkAdapter
	if err := wmi.Query("SELECT Name, NetConnectionID, Description, Manufacturer, ServiceName, PNPDeviceID, PhysicalAdapter FROM Win32_NetworkAdapter", &adapters); err != nil {
		return physicalInterfaceSet{}, err
	}

	names := make(map[string]bool, len(adapters))
	for _, adapter := range adapters {
		if !isWindowsPhysicalNetworkAdapter(adapter) {
			continue
		}
		addPhysicalInterfaceName(names, adapter.Name)
		addPhysicalInterfaceName(names, adapter.NetConnectionID)
	}
	return physicalInterfaceSet{names: names, verified: true}, nil
}

func isWindowsPhysicalNetworkAdapter(adapter win32NetworkAdapter) bool {
	if !adapter.PhysicalAdapter {
		return false
	}
	pnpDeviceID := strings.ToUpper(strings.TrimSpace(adapter.PNPDeviceID))
	if !strings.HasPrefix(pnpDeviceID, `PCI\`) && !strings.HasPrefix(pnpDeviceID, `USB\`) {
		return false
	}
	return !windowsNetworkAdapterHasVirtualKeyword(adapter)
}

func windowsNetworkAdapterHasVirtualKeyword(adapter win32NetworkAdapter) bool {
	values := []string{
		adapter.Name,
		adapter.NetConnectionID,
		adapter.Description,
		adapter.Manufacturer,
		adapter.ServiceName,
		adapter.PNPDeviceID,
	}
	for _, value := range values {
		normalized := normalizeNetworkInterfaceName(value)
		if normalized == "" {
			continue
		}
		if isVirtualNetworkInterfaceName(normalized) {
			return true
		}
	}
	return false
}

func addPhysicalInterfaceName(names map[string]bool, name string) {
	normalized := normalizeNetworkInterfaceName(name)
	if normalized == "" {
		return
	}
	names[normalized] = true
}
