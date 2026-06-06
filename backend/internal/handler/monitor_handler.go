package handler

import (
	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/response"
	"lsdb-go/backend/internal/service"
)

type MonitorHandler struct {
	monitor *service.MonitorService
}

func NewMonitorHandler(monitor *service.MonitorService) *MonitorHandler {
	return &MonitorHandler{monitor: monitor}
}

func (h *MonitorHandler) GetPC(c *gin.Context) {
	snapshot := h.monitor.Snapshot()
	response.OK(c, gin.H{
		"time":          snapshot.Time,
		"cpu":           snapshot.CPU,
		"uploadSpeed":   snapshot.UploadSpeed,
		"downloadSpeed": snapshot.DownloadSpeed,
	})
}
