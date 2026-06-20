package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/response"
	"lsdb-go/backend/internal/service"
)

type CommandHandler struct{ commands *service.CommandService }

func NewCommandHandler(commands *service.CommandService) *CommandHandler {
	return &CommandHandler{commands: commands}
}

func (h *CommandHandler) Run(c *gin.Context) {
	output, err := h.commands.RunWithArgs(c.Param("type"), c.Query("path"), service.SyncArgs{
		Base:     c.Query("base"),
		Category: c.Query("category"),
		Item:     c.Query("item"),
	})
	if err != nil {
		response.FailErr(c, err)
		return
	}
	response.OK(c, output)
}

func (h *CommandHandler) StartSync(c *gin.Context) {
	result, err := h.commands.StartSyncTask(service.SyncArgs{
		Base:     c.Query("base"),
		Category: c.Query("category"),
		Item:     c.Query("item"),
	})
	if err != nil {
		response.FailErr(c, err)
		return
	}
	response.OK(c, result)
}

func (h *CommandHandler) StreamSync(c *gin.Context) {
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		response.Fail(c, http.StatusInternalServerError, 500, "streaming unsupported")
		return
	}

	replay, ch, cancel, err := h.commands.SubscribeSyncTask(c.Query("processId"))
	if err != nil {
		response.FailErr(c, err)
		return
	}
	defer cancel()

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Writer.WriteHeaderNow()
	flusher.Flush()

	for _, event := range replay {
		if !writeSyncTaskEvent(c, flusher, event) {
			return
		}
	}
	if ch == nil {
		return
	}

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case event, ok := <-ch:
			if !ok {
				return
			}
			if !writeSyncTaskEvent(c, flusher, event) {
				return
			}
		}
	}
}

func writeSyncTaskEvent(c *gin.Context, flusher http.Flusher, event service.SyncTaskEvent) bool {
	payload, err := json.Marshal(event.Data)
	if err != nil {
		return false
	}
	if _, err := fmt.Fprintf(c.Writer, "id: %s\r\nevent: %s\r\ndata: %s\r\n\r\n", event.ID(), event.Event, payload); err != nil {
		return false
	}
	flusher.Flush()
	return true
}
