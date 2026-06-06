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
)

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

	if _, err := io.CopyN(c.Writer, zeroReader{}, size); err != nil {
		return
	}
}

func (h *SpeedTestHandler) Upload(c *gin.Context) {
	size, ok := parseSpeedTestBytes(c)
	if !ok {
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, size)
	received, err := io.Copy(io.Discard, c.Request.Body)
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

type zeroReader struct{}

func (zeroReader) Read(p []byte) (int, error) {
	clear(p)
	return len(p), nil
}
