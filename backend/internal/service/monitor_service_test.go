package service

import (
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
	mu       sync.Mutex
	values   []gopsnet.IOCountersStat
	step     gopsnet.IOCountersStat
	called   chan struct{}
	onSample func()
}

func (m *mockNetworkReader) IOCounters(pernic bool) ([]gopsnet.IOCountersStat, error) {
	if m.onSample != nil {
		m.onSample()
	}
	if m.called != nil {
		select {
		case m.called <- struct{}{}:
		default:
		}
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.values) == 0 {
		return []gopsnet.IOCountersStat{{}}, nil
	}
	value := m.values[0]
	if len(m.values) > 1 {
		m.values = m.values[1:]
	} else if m.step.BytesSent != 0 || m.step.BytesRecv != 0 {
		m.values[0].BytesSent += m.step.BytesSent
		m.values[0].BytesRecv += m.step.BytesRecv
	}
	return []gopsnet.IOCountersStat{value}, nil
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
