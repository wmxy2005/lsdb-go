package service

import (
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
}

type gopsutilCPUReader struct{}

func (gopsutilCPUReader) Percent(interval time.Duration, percpu bool) ([]float64, error) {
	return cpu.Percent(interval, percpu)
}

type gopsutilNetworkReader struct{}

func (gopsutilNetworkReader) IOCounters(pernic bool) ([]gopsnet.IOCountersStat, error) {
	return gopsnet.IOCounters(pernic)
}

type MonitorSnapshot struct {
	Time          string
	CPU           float64
	UploadSpeed   float64
	DownloadSpeed float64
}

type MonitorService struct {
	mu            sync.Mutex
	idleTimeout   time.Duration
	lastActivity  time.Time
	running       bool
	cpuReader     CPUReader
	networkReader NetworkReader
	now           func() time.Time
	snapshot      MonitorSnapshot
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
	var previousNetwork *gopsnet.IOCountersStat
	var previousNetworkTime time.Time

	for {
		percents, cpuErr := s.cpuReader.Percent(time.Second, false)
		networkStats, networkErr := s.networkReader.IOCounters(false)
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
			currentNetwork := networkStats[0]
			if previousNetwork != nil {
				elapsed := sampleTime.Sub(previousNetworkTime).Seconds()
				if elapsed > 0 {
					s.snapshot.UploadSpeed = bytesPerSecondToMB(float64(currentNetwork.BytesSent-previousNetwork.BytesSent) / elapsed)
					s.snapshot.DownloadSpeed = bytesPerSecondToMB(float64(currentNetwork.BytesRecv-previousNetwork.BytesRecv) / elapsed)
				}
			}
			previousNetwork = &currentNetwork
			previousNetworkTime = sampleTime
			s.snapshot.Time = sampleTime.Format("15:04:05")
		}
		if sampleTime.Sub(s.lastActivity) > s.idleTimeout {
			s.running = false
			s.mu.Unlock()
			return
		}
		s.mu.Unlock()
	}
}

func bytesPerSecondToMB(value float64) float64 {
	return value / 1024 / 1024
}
