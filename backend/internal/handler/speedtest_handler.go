package handler

import (
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/response"
)

const (
	defaultSpeedTestBytes = 128 * 1024 * 1024
	maxSpeedTestBytes     = 512 * 1024 * 1024
	speedTestBufferBytes  = 1024 * 1024
)

var speedTestZeroChunk = make([]byte, speedTestBufferBytes)

type SpeedTestHandler struct{}

func NewSpeedTestHandler() *SpeedTestHandler {
	return &SpeedTestHandler{}
}

func (h *SpeedTestHandler) Ping(c *gin.Context) {
	response.OK(c, gin.H{
		"time": time.Now().UnixMilli(),
	})
}

func (h *SpeedTestHandler) Download(c *gin.Context) {
	size, ok := parseSpeedTestBytes(c)
	if !ok {
		return
	}

	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Length", strconv.FormatInt(size, 10))
	c.Header("Cache-Control", "no-store")
	c.Status(http.StatusOK)

	remaining := size
	for remaining > 0 {
		chunk := speedTestZeroChunk
		if remaining < int64(len(chunk)) {
			chunk = chunk[:remaining]
		}
		n, err := c.Writer.Write(chunk)
		if err != nil || n <= 0 {
			return
		}
		remaining -= int64(n)
	}
}

func (h *SpeedTestHandler) Upload(c *gin.Context) {
	size, ok := parseSpeedTestBytes(c)
	if !ok {
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, size)
	received, err := io.CopyBuffer(io.Discard, c.Request.Body, make([]byte, speedTestBufferBytes))
	if err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "invalid upload body")
		return
	}

	response.OK(c, gin.H{
		"bytes": received,
	})
}

func parseSpeedTestBytes(c *gin.Context) (int64, bool) {
	raw := c.DefaultQuery("bytes", strconv.Itoa(defaultSpeedTestBytes))
	size, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || size <= 0 || size > maxSpeedTestBytes {
		response.Fail(c, http.StatusBadRequest, 400, "invalid bytes")
		return 0, false
	}

	return size, true
}
