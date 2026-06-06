package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

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

func (h *MonitorHandler) StreamPC(c *gin.Context) {
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		response.Fail(c, http.StatusInternalServerError, 500, "streaming unsupported")
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Writer.WriteHeaderNow()
	flusher.Flush()

	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	if !h.writeSnapshotEvent(c, flusher) {
		return
	}

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-ticker.C:
			if !h.writeSnapshotEvent(c, flusher) {
				return
			}
		}
	}
}

func (h *MonitorHandler) writeSnapshotEvent(c *gin.Context, flusher http.Flusher) bool {
	snapshot := h.monitor.Snapshot()
	payload, err := json.Marshal(gin.H{
		"time":          snapshot.Time,
		"cpu":           snapshot.CPU,
		"uploadSpeed":   snapshot.UploadSpeed,
		"downloadSpeed": snapshot.DownloadSpeed,
	})
	if err != nil {
		return false
	}

	if _, err := fmt.Fprintf(c.Writer, "id: %d\r\nevent: message\r\ndata: %s\r\n\r\n", time.Now().UnixNano(), payload); err != nil {
		return false
	}
	flusher.Flush()
	return true
}
