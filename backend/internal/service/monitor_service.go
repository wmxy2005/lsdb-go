package service

import (
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
)

type CPUReader interface {
	Percent(interval time.Duration, percpu bool) ([]float64, error)
}

type gopsutilCPUReader struct{}

func (gopsutilCPUReader) Percent(interval time.Duration, percpu bool) ([]float64, error) {
	return cpu.Percent(interval, percpu)
}

type MonitorService struct {
	mu           sync.Mutex
	idleTimeout  time.Duration
	lastActivity time.Time
	running      bool
	reader       CPUReader
	now          func() time.Time
	snapshotTime string
	snapshotCPU  float64
}

func NewMonitorService(idleTimeout time.Duration) *MonitorService {
	return NewMonitorServiceWithDeps(idleTimeout, gopsutilCPUReader{}, time.Now)
}

func NewMonitorServiceWithDeps(idleTimeout time.Duration, reader CPUReader, now func() time.Time) *MonitorService {
	if idleTimeout <= 0 {
		idleTimeout = 30 * time.Second
	}
	if reader == nil {
		reader = gopsutilCPUReader{}
	}
	if now == nil {
		now = time.Now
	}
	s := &MonitorService{
		idleTimeout: idleTimeout,
		reader:      reader,
		now:         now,
	}
	s.resetSnapshot()
	return s
}

func (s *MonitorService) Snapshot() (string, float64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.lastActivity = s.now()
	if !s.running {
		s.resetSnapshotLocked()
		s.running = true
		go s.sampleLoop()
	}
	return s.snapshotTime, s.snapshotCPU
}

func (s *MonitorService) resetSnapshot() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.resetSnapshotLocked()
}

func (s *MonitorService) resetSnapshotLocked() {
	s.snapshotTime = s.now().Format("15:04:05")
	s.snapshotCPU = 0
}

func (s *MonitorService) sampleLoop() {
	for {
		percents, err := s.reader.Percent(time.Second, false)

		s.mu.Lock()
		if !s.running {
			s.mu.Unlock()
			return
		}
		if err == nil && len(percents) > 0 {
			s.snapshotTime = s.now().Format("15:04:05")
			s.snapshotCPU = percents[0]
		}
		if s.now().Sub(s.lastActivity) > s.idleTimeout {
			s.running = false
			s.mu.Unlock()
			return
		}
		s.mu.Unlock()
	}
}
