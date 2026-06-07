//go:build !windows

package service

func physicalInterfaces() (physicalInterfaceSet, error) {
	return physicalInterfaceSet{}, nil
}
