package service

import (
	"sync"
	"testing"
	"time"
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

func TestMonitorServiceFirstSnapshotReturnsZero(t *testing.T) {
	reader := &mockCPUReader{value: 42, delay: 50 * time.Millisecond}
	svc := NewMonitorServiceWithDeps(30*time.Second, reader, time.Now)

	_, cpu := svc.Snapshot()
	if cpu != 0 {
		t.Fatalf("first snapshot cpu = %v, want 0", cpu)
	}
}

func TestMonitorServiceReturnsCachedValueAfterSample(t *testing.T) {
	called := make(chan struct{}, 1)
	reader := &mockCPUReader{value: 42.5, called: called}
	svc := NewMonitorServiceWithDeps(30*time.Second, reader, time.Now)

	svc.Snapshot()
	select {
	case <-called:
	case <-time.After(2 * time.Second):
		t.Fatal("sample loop did not run")
	}

	_, cpu := svc.Snapshot()
	if cpu != 42.5 {
		t.Fatalf("second snapshot cpu = %v, want 42.5", cpu)
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
	svc := NewMonitorServiceWithDeps(50*time.Millisecond, reader, clock)

	svc.Snapshot()
	<-called

	var cpu float64
	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		_, cpu = svc.Snapshot()
		if cpu == 10 {
			break
		}
		time.Sleep(2 * time.Millisecond)
	}
	if cpu != 10 {
		t.Fatalf("cached cpu = %v, want 10", cpu)
	}

	now = now.Add(100 * time.Millisecond)

	time.Sleep(20 * time.Millisecond)

	now = now.Add(100 * time.Millisecond)
	_, cpu = svc.Snapshot()
	if cpu != 0 {
		t.Fatalf("restarted snapshot cpu = %v, want 0", cpu)
	}
}
