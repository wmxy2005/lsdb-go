package service

import (
	"errors"
	"sync"
	"testing"
	"time"

	gopsnet "github.com/shirou/gopsutil/v4/net"
)

type mockCPUReader struct {
	mu      sync.Mutex
	value   float64
	delay   time.Duration
	called  chan struct{}
	percent func(interval time.Duration, percpu bool) ([]float64, error)
}

func (m *mockCPUReader) Percent(interval time.Duration, percpu bool) ([]float64, error) {
	if m.percent != nil {
		return m.percent(interval, percpu)
	}
	if m.delay > 0 {
		time.Sleep(m.delay)
	}
	if m.called != nil {
		select {
		case m.called <- struct{}{}:
		default:
		}
	}
	m.mu.Lock()
	v := m.value
	m.mu.Unlock()
	return []float64{v}, nil
}

type mockNetworkReader struct {
	mu            sync.Mutex
	values        []gopsnet.IOCountersStat
	valuesPerCall [][]gopsnet.IOCountersStat
	step          gopsnet.IOCountersStat
	called        chan struct{}
	onSample      func()
	lastPernic    bool
	physicalSet   physicalInterfaceSet
	physicalErr   error
	physicalCalls int
}

func (m *mockNetworkReader) IOCounters(pernic bool) ([]gopsnet.IOCountersStat, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.lastPernic = pernic
	hasTimedSample := len(m.valuesPerCall) > 0 || len(m.values) > 0
	if hasTimedSample && m.onSample != nil {
		m.onSample()
	}
	if m.called != nil {
		select {
		case m.called <- struct{}{}:
		default:
		}
	}
	if len(m.valuesPerCall) > 0 {
		value := m.valuesPerCall[0]
		m.valuesPerCall = m.valuesPerCall[1:]
		return value, nil
	}
	if len(m.values) == 0 {
		return []gopsnet.IOCountersStat{{Name: "eth0"}}, nil
	}
	value := m.values[0]
	if value.Name == "" {
		value.Name = "eth0"
	}
	if len(m.values) > 1 {
		m.values = m.values[1:]
	} else if m.step.BytesSent != 0 || m.step.BytesRecv != 0 {
		m.values[0].BytesSent += m.step.BytesSent
		m.values[0].BytesRecv += m.step.BytesRecv
	}
	return []gopsnet.IOCountersStat{value}, nil
}

func (m *mockNetworkReader) PhysicalInterfaces() (physicalInterfaceSet, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.physicalCalls++
	if m.physicalErr != nil {
		return physicalInterfaceSet{}, m.physicalErr
	}
	return m.physicalSet, nil
}

func TestMonitorServiceFirstSnapshotReturnsZero(t *testing.T) {
	reader := &mockCPUReader{value: 42, delay: 50 * time.Millisecond}
	networkReader := &mockNetworkReader{}
	svc := NewMonitorServiceWithDeps(30*time.Second, reader, networkReader, time.Now)

	snapshot := svc.Snapshot()
	if snapshot.CPU != 0 {
		t.Fatalf("first snapshot cpu = %v, want 0", snapshot.CPU)
	}
	if snapshot.UploadSpeed != 0 {
		t.Fatalf("first snapshot uploadSpeed = %v, want 0", snapshot.UploadSpeed)
	}
	if snapshot.DownloadSpeed != 0 {
		t.Fatalf("first snapshot downloadSpeed = %v, want 0", snapshot.DownloadSpeed)
	}
}

func TestMonitorServiceReturnsCachedValueAfterSample(t *testing.T) {
	called := make(chan struct{}, 1)
	reader := &mockCPUReader{value: 42.5, called: called}
	networkReader := &mockNetworkReader{}
	svc := NewMonitorServiceWithDeps(30*time.Second, reader, networkReader, time.Now)

	svc.Snapshot()
	select {
	case <-called:
	case <-time.After(2 * time.Second):
		t.Fatal("sample loop did not run")
	}

	var snapshot MonitorSnapshot
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snapshot = svc.Snapshot()
		if snapshot.CPU == 42.5 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if snapshot.CPU != 42.5 {
		t.Fatalf("second snapshot cpu = %v, want 42.5", snapshot.CPU)
	}
}

func TestMonitorServiceCalculatesNetworkSpeedInMBPerSecond(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }

	called := make(chan struct{}, 4)
	reader := &mockCPUReader{value: 20, delay: 10 * time.Millisecond}
	networkReader := &mockNetworkReader{
		called: called,
		values: []gopsnet.IOCountersStat{
			{BytesSent: 1024 * 1024, BytesRecv: 2 * 1024 * 1024},
			{BytesSent: 3 * 1024 * 1024, BytesRecv: 8 * 1024 * 1024},
		},
		step: gopsnet.IOCountersStat{BytesSent: 2 * 1024 * 1024, BytesRecv: 6 * 1024 * 1024},
		onSample: func() {
			now = now.Add(time.Second)
		},
	}
	svc := NewMonitorServiceWithDeps(30*time.Second, reader, networkReader, clock)

	svc.Snapshot()
	<-called
	<-called

	var snapshot MonitorSnapshot
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snapshot = svc.Snapshot()
		if snapshot.UploadSpeed == 2 && snapshot.DownloadSpeed == 6 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if snapshot.UploadSpeed != 2 {
		t.Fatalf("uploadSpeed = %v, want 2", snapshot.UploadSpeed)
	}
	if snapshot.DownloadSpeed != 6 {
		t.Fatalf("downloadSpeed = %v, want 6", snapshot.DownloadSpeed)
	}
	networkReader.mu.Lock()
	lastPernic := networkReader.lastPernic
	networkReader.mu.Unlock()
	if !lastPernic {
		t.Fatal("IOCounters pernic = false, want true")
	}
}

func TestMonitorServiceAggregatesActiveNetworkInterfaces(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }

	called := make(chan struct{}, 4)
	networkReader := &mockNetworkReader{
		called: called,
		valuesPerCall: [][]gopsnet.IOCountersStat{
			{
				{Name: "Ethernet", BytesSent: 1024 * 1024, BytesRecv: 2 * 1024 * 1024},
				{Name: "Wi-Fi", BytesSent: 4 * 1024 * 1024, BytesRecv: 8 * 1024 * 1024},
			},
			{
				{Name: "Ethernet", BytesSent: 3 * 1024 * 1024, BytesRecv: 5 * 1024 * 1024},
				{Name: "Wi-Fi", BytesSent: 9 * 1024 * 1024, BytesRecv: 15 * 1024 * 1024},
			},
		},
		onSample: func() {
			now = now.Add(time.Second)
		},
	}
	svc := NewMonitorServiceWithDeps(30*time.Second, &mockCPUReader{value: 20}, networkReader, clock)

	svc.Snapshot()
	<-called
	<-called

	var snapshot MonitorSnapshot
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snapshot = svc.Snapshot()
		if snapshot.UploadSpeed == 7 && snapshot.DownloadSpeed == 10 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if snapshot.UploadSpeed != 7 {
		t.Fatalf("uploadSpeed = %v, want 7", snapshot.UploadSpeed)
	}
	if snapshot.DownloadSpeed != 10 {
		t.Fatalf("downloadSpeed = %v, want 10", snapshot.DownloadSpeed)
	}
}

func TestMonitorServiceIgnoresLoopbackAndEmptyNetworkInterfaces(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }

	called := make(chan struct{}, 4)
	networkReader := &mockNetworkReader{
		called: called,
		valuesPerCall: [][]gopsnet.IOCountersStat{
			{
				{Name: "Loopback Pseudo-Interface 1", BytesSent: 50 * 1024 * 1024, BytesRecv: 50 * 1024 * 1024},
				{Name: "Ethernet", BytesSent: 1024 * 1024, BytesRecv: 1024 * 1024},
				{Name: "Teredo Tunneling Pseudo-Interface", BytesSent: 10 * 1024 * 1024, BytesRecv: 10 * 1024 * 1024},
				{Name: "vEthernet", BytesSent: 0, BytesRecv: 0},
			},
			{
				{Name: "Loopback Pseudo-Interface 1", BytesSent: 100 * 1024 * 1024, BytesRecv: 100 * 1024 * 1024},
				{Name: "Ethernet", BytesSent: 2 * 1024 * 1024, BytesRecv: 4 * 1024 * 1024},
				{Name: "Teredo Tunneling Pseudo-Interface", BytesSent: 20 * 1024 * 1024, BytesRecv: 20 * 1024 * 1024},
				{Name: "vEthernet", BytesSent: 0, BytesRecv: 0},
			},
		},
		onSample: func() {
			now = now.Add(time.Second)
		},
	}
	svc := NewMonitorServiceWithDeps(30*time.Second, &mockCPUReader{value: 20}, networkReader, clock)

	svc.Snapshot()
	<-called
	<-called

	var snapshot MonitorSnapshot
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snapshot = svc.Snapshot()
		if snapshot.UploadSpeed == 1 && snapshot.DownloadSpeed == 3 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if snapshot.UploadSpeed != 1 {
		t.Fatalf("uploadSpeed = %v, want 1", snapshot.UploadSpeed)
	}
	if snapshot.DownloadSpeed != 3 {
		t.Fatalf("downloadSpeed = %v, want 3", snapshot.DownloadSpeed)
	}
}

func TestMonitorServiceOnlyCountsPhysicalNetworkInterfaces(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }

	called := make(chan struct{}, 4)
	networkReader := &mockNetworkReader{
		called: called,
		physicalSet: physicalInterfaceSet{
			names:    map[string]bool{"ethernet": true},
			verified: true,
		},
		valuesPerCall: [][]gopsnet.IOCountersStat{
			{
				{Name: "Ethernet", BytesSent: 1024 * 1024, BytesRecv: 2 * 1024 * 1024},
				{Name: "vEthernet", BytesSent: 10 * 1024 * 1024, BytesRecv: 20 * 1024 * 1024},
			},
			{
				{Name: "Ethernet", BytesSent: 3 * 1024 * 1024, BytesRecv: 5 * 1024 * 1024},
				{Name: "vEthernet", BytesSent: 30 * 1024 * 1024, BytesRecv: 60 * 1024 * 1024},
			},
		},
		onSample: func() {
			now = now.Add(time.Second)
		},
	}
	svc := NewMonitorServiceWithDeps(30*time.Second, &mockCPUReader{value: 20}, networkReader, clock)

	svc.Snapshot()
	<-called
	<-called

	var snapshot MonitorSnapshot
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snapshot = svc.Snapshot()
		if snapshot.UploadSpeed == 2 && snapshot.DownloadSpeed == 3 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if snapshot.UploadSpeed != 2 {
		t.Fatalf("uploadSpeed = %v, want 2", snapshot.UploadSpeed)
	}
	if snapshot.DownloadSpeed != 3 {
		t.Fatalf("downloadSpeed = %v, want 3", snapshot.DownloadSpeed)
	}
}

func TestMonitorServiceFallsBackWhenPhysicalNetworkInterfacesUnavailable(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }

	called := make(chan struct{}, 4)
	networkReader := &mockNetworkReader{
		called:      called,
		physicalErr: errors.New("wmi unavailable"),
		valuesPerCall: [][]gopsnet.IOCountersStat{
			{
				{Name: "Ethernet", BytesSent: 1024 * 1024, BytesRecv: 1024 * 1024},
				{Name: "vEthernet", BytesSent: 4 * 1024 * 1024, BytesRecv: 8 * 1024 * 1024},
			},
			{
				{Name: "Ethernet", BytesSent: 2 * 1024 * 1024, BytesRecv: 4 * 1024 * 1024},
				{Name: "vEthernet", BytesSent: 9 * 1024 * 1024, BytesRecv: 15 * 1024 * 1024},
			},
		},
		onSample: func() {
			now = now.Add(time.Second)
		},
	}
	svc := NewMonitorServiceWithDeps(30*time.Second, &mockCPUReader{value: 20}, networkReader, clock)

	svc.Snapshot()
	<-called
	<-called

	var snapshot MonitorSnapshot
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snapshot = svc.Snapshot()
		if snapshot.UploadSpeed == 6 && snapshot.DownloadSpeed == 10 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if snapshot.UploadSpeed != 6 {
		t.Fatalf("uploadSpeed = %v, want 6", snapshot.UploadSpeed)
	}
	if snapshot.DownloadSpeed != 10 {
		t.Fatalf("downloadSpeed = %v, want 10", snapshot.DownloadSpeed)
	}
}

func TestMonitorServiceDoesNotFallbackWhenPhysicalNetworkInterfacesVerifiedEmpty(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }

	called := make(chan struct{}, 4)
	networkReader := &mockNetworkReader{
		called: called,
		physicalSet: physicalInterfaceSet{
			names:    map[string]bool{},
			verified: true,
		},
		valuesPerCall: [][]gopsnet.IOCountersStat{
			{
				{Name: "Mihomo", BytesSent: 1024 * 1024, BytesRecv: 1024 * 1024},
				{Name: "vEthernet", BytesSent: 4 * 1024 * 1024, BytesRecv: 8 * 1024 * 1024},
			},
			{
				{Name: "Mihomo", BytesSent: 20 * 1024 * 1024, BytesRecv: 30 * 1024 * 1024},
				{Name: "vEthernet", BytesSent: 9 * 1024 * 1024, BytesRecv: 15 * 1024 * 1024},
			},
		},
		onSample: func() {
			now = now.Add(time.Second)
		},
	}
	svc := NewMonitorServiceWithDeps(30*time.Second, &mockCPUReader{value: 20}, networkReader, clock)

	svc.Snapshot()
	<-called
	<-called

	time.Sleep(20 * time.Millisecond)
	snapshot := svc.Snapshot()
	if snapshot.UploadSpeed != 0 {
		t.Fatalf("uploadSpeed = %v, want 0", snapshot.UploadSpeed)
	}
	if snapshot.DownloadSpeed != 0 {
		t.Fatalf("downloadSpeed = %v, want 0", snapshot.DownloadSpeed)
	}
}

func TestMonitorServiceIgnoresMihomoNetworkInterfaceWithoutPhysicalWhitelist(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }

	called := make(chan struct{}, 4)
	networkReader := &mockNetworkReader{
		called: called,
		valuesPerCall: [][]gopsnet.IOCountersStat{
			{
				{Name: "Mihomo", BytesSent: 1024 * 1024, BytesRecv: 1024 * 1024},
				{Name: "Ethernet", BytesSent: 2 * 1024 * 1024, BytesRecv: 3 * 1024 * 1024},
			},
			{
				{Name: "Mihomo", BytesSent: 20 * 1024 * 1024, BytesRecv: 30 * 1024 * 1024},
				{Name: "Ethernet", BytesSent: 5 * 1024 * 1024, BytesRecv: 7 * 1024 * 1024},
			},
		},
		onSample: func() {
			now = now.Add(time.Second)
		},
	}
	svc := NewMonitorServiceWithDeps(30*time.Second, &mockCPUReader{value: 20}, networkReader, clock)

	svc.Snapshot()
	<-called
	<-called

	var snapshot MonitorSnapshot
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snapshot = svc.Snapshot()
		if snapshot.UploadSpeed == 3 && snapshot.DownloadSpeed == 4 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if snapshot.UploadSpeed != 3 {
		t.Fatalf("uploadSpeed = %v, want 3", snapshot.UploadSpeed)
	}
	if snapshot.DownloadSpeed != 4 {
		t.Fatalf("downloadSpeed = %v, want 4", snapshot.DownloadSpeed)
	}
}

func TestMonitorServiceReadsPhysicalNetworkInterfacesOnlyOnce(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }

	called := make(chan struct{}, 8)
	reader := &mockCPUReader{
		value: 10,
		percent: func(interval time.Duration, percpu bool) ([]float64, error) {
			select {
			case called <- struct{}{}:
			default:
			}
			return []float64{10}, nil
		},
	}
	networkReader := &mockNetworkReader{
		physicalSet: physicalInterfaceSet{
			names:    map[string]bool{"ethernet": true},
			verified: true,
		},
		valuesPerCall: [][]gopsnet.IOCountersStat{
			{{Name: "Ethernet", BytesSent: 1024 * 1024, BytesRecv: 1024 * 1024}},
			{{Name: "Ethernet", BytesSent: 2 * 1024 * 1024, BytesRecv: 3 * 1024 * 1024}},
			{{Name: "Ethernet", BytesSent: 3 * 1024 * 1024, BytesRecv: 5 * 1024 * 1024}},
		},
		onSample: func() {
			now = now.Add(time.Second)
		},
	}
	svc := NewMonitorServiceWithDeps(50*time.Millisecond, reader, networkReader, clock)

	svc.Snapshot()
	<-called

	var snapshot MonitorSnapshot
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snapshot = svc.Snapshot()
		if snapshot.CPU == 10 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if snapshot.CPU != 10 {
		t.Fatalf("cached cpu = %v, want 10", snapshot.CPU)
	}

	now = now.Add(100 * time.Millisecond)
	time.Sleep(20 * time.Millisecond)
	now = now.Add(100 * time.Millisecond)

	svc.Snapshot()
	<-called

	networkReader.mu.Lock()
	physicalCalls := networkReader.physicalCalls
	networkReader.mu.Unlock()
	if physicalCalls != 1 {
		t.Fatalf("PhysicalInterfaceNames calls = %v, want 1", physicalCalls)
	}
}

func TestMonitorServiceIgnoresCounterRollbackAndAbnormalElapsed(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }

	called := make(chan struct{}, 6)
	sampleIndex := 0
	networkReader := &mockNetworkReader{
		called: called,
		valuesPerCall: [][]gopsnet.IOCountersStat{
			{{Name: "Ethernet", BytesSent: 10 * 1024 * 1024, BytesRecv: 10 * 1024 * 1024}},
			{{Name: "Ethernet", BytesSent: 8 * 1024 * 1024, BytesRecv: 12 * 1024 * 1024}},
			{{Name: "Ethernet", BytesSent: 12 * 1024 * 1024, BytesRecv: 16 * 1024 * 1024}},
		},
		onSample: func() {
			sampleIndex++
			if sampleIndex == 3 {
				now = now.Add(100 * time.Millisecond)
				return
			}
			now = now.Add(time.Second)
		},
	}
	svc := NewMonitorServiceWithDeps(30*time.Second, &mockCPUReader{value: 20}, networkReader, clock)

	svc.Snapshot()
	<-called
	<-called
	<-called

	var snapshot MonitorSnapshot
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snapshot = svc.Snapshot()
		if snapshot.UploadSpeed == 0 && snapshot.DownloadSpeed == 2 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if snapshot.UploadSpeed != 0 {
		t.Fatalf("uploadSpeed = %v, want 0", snapshot.UploadSpeed)
	}
	if snapshot.DownloadSpeed != 2 {
		t.Fatalf("downloadSpeed = %v, want 2", snapshot.DownloadSpeed)
	}
}

func TestMonitorServiceStopsAfterIdleTimeout(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }

	called := make(chan struct{}, 8)
	reader := &mockCPUReader{
		value:  10,
		called: called,
		percent: func(interval time.Duration, percpu bool) ([]float64, error) {
			select {
			case called <- struct{}{}:
			default:
			}
			return []float64{10}, nil
		},
	}
	networkReader := &mockNetworkReader{
		values: []gopsnet.IOCountersStat{
			{BytesSent: 1024 * 1024, BytesRecv: 1024 * 1024},
			{BytesSent: 2 * 1024 * 1024, BytesRecv: 3 * 1024 * 1024},
		},
	}
	svc := NewMonitorServiceWithDeps(50*time.Millisecond, reader, networkReader, clock)

	svc.Snapshot()
	<-called

	var snapshot MonitorSnapshot
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		snapshot = svc.Snapshot()
		if snapshot.CPU == 10 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if snapshot.CPU != 10 {
		t.Fatalf("cached cpu = %v, want 10", snapshot.CPU)
	}

	now = now.Add(100 * time.Millisecond)

	time.Sleep(20 * time.Millisecond)

	now = now.Add(100 * time.Millisecond)
	snapshot = svc.Snapshot()
	if snapshot.CPU != 0 {
		t.Fatalf("restarted snapshot cpu = %v, want 0", snapshot.CPU)
	}
	if snapshot.UploadSpeed != 0 {
		t.Fatalf("restarted snapshot uploadSpeed = %v, want 0", snapshot.UploadSpeed)
	}
	if snapshot.DownloadSpeed != 0 {
		t.Fatalf("restarted snapshot downloadSpeed = %v, want 0", snapshot.DownloadSpeed)
	}
}
