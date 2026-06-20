package service

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type SyncStreamEvent struct {
	ID      string `json:"id,omitempty"`
	Time    string `json:"time"`
	Text    string `json:"text,omitempty"`
	Message string `json:"message,omitempty"`
}

type SyncTaskStartResult struct {
	ProcessID string `json:"processId"`
}

type syncTaskStatus string

const (
	syncTaskRunning syncTaskStatus = "running"
	syncTaskDone    syncTaskStatus = "done"
	syncTaskError   syncTaskStatus = "error"
)

type syncTaskEvent struct {
	Event string
	Data  SyncStreamEvent
}

type SyncTaskEvent = syncTaskEvent

type syncTask struct {
	processID string
	args      SyncArgs
	nextEvent uint64

	mu          sync.Mutex
	status      syncTaskStatus
	events      []syncTaskEvent
	subscribers map[chan syncTaskEvent]struct{}
	updatedAt   time.Time
	finishedAt  time.Time
}

func (s *CommandService) StartSyncTask(args SyncArgs) (*SyncTaskStartResult, error) {
	if s.osName != "windows" {
		return nil, ErrUnsupportedPlatform
	}
	normalized, err := sanitizeSyncArgs(args)
	if err != nil {
		return nil, err
	}

	s.cleanupExpiredTasks()
	processID := s.newProcessID()
	task := &syncTask{
		processID:   processID,
		args:        normalized,
		status:      syncTaskRunning,
		subscribers: make(map[chan syncTaskEvent]struct{}),
		updatedAt:   s.now(),
	}

	s.tasksMu.Lock()
	s.tasks[processID] = task
	s.tasksMu.Unlock()

	go s.runSyncTask(task)

	return &SyncTaskStartResult{ProcessID: processID}, nil
}

func (s *CommandService) SubscribeSyncTask(processID string) ([]syncTaskEvent, <-chan syncTaskEvent, func(), error) {
	processID = strings.TrimSpace(processID)
	if processID == "" {
		return nil, nil, nil, ErrMissingProcessID
	}

	s.cleanupExpiredTasks()

	s.tasksMu.Lock()
	task := s.tasks[processID]
	s.tasksMu.Unlock()
	if task == nil {
		return nil, nil, nil, ErrSyncTaskNotFound
	}

	task.mu.Lock()
	defer task.mu.Unlock()

	replay := append([]syncTaskEvent(nil), task.events...)
	if task.status != syncTaskRunning {
		return replay, nil, func() {}, nil
	}

	ch := make(chan syncTaskEvent, 64)
	task.subscribers[ch] = struct{}{}
	cancel := func() {
		task.mu.Lock()
		if _, ok := task.subscribers[ch]; ok {
			delete(task.subscribers, ch)
			close(ch)
		}
		task.mu.Unlock()
	}

	return replay, ch, cancel, nil
}

func (s *CommandService) runSyncTask(task *syncTask) {
	finalOutput, err := s.streamRunner.Run(task.args, func(line string) {
		text := strings.TrimSpace(line)
		if text == "" {
			return
		}
		s.publishSyncTaskEvent(task, "log", SyncStreamEvent{
			Time: s.now().Format("15:04:05"),
			Text: text,
		})
	})

	if err != nil {
		message := strings.TrimSpace(finalOutput)
		if message == "" {
			message = err.Error()
		}
		s.finishSyncTask(task, syncTaskError, "error", SyncStreamEvent{
			Time:    s.now().Format("15:04:05"),
			Message: message,
		})
		return
	}

	doneMessage := "Sync complete"
	if text := strings.TrimSpace(finalOutput); text != "" {
		doneMessage = text
	}
	s.finishSyncTask(task, syncTaskDone, "done", SyncStreamEvent{
		Time:    s.now().Format("15:04:05"),
		Message: doneMessage,
	})
}

func (s *CommandService) publishSyncTaskEvent(task *syncTask, eventType string, data SyncStreamEvent) {
	event := syncTaskEvent{
		Event: eventType,
		Data:  data,
	}.withID(task.nextEventID())

	task.mu.Lock()
	task.events = append(task.events, event)
	if len(task.events) > s.taskBufferLimit {
		task.events = append([]syncTaskEvent(nil), task.events[len(task.events)-s.taskBufferLimit:]...)
	}
	task.updatedAt = s.now()
	subscribers := taskSubscriberList(task.subscribers)
	task.mu.Unlock()

	for _, ch := range subscribers {
		select {
		case ch <- event:
		default:
		}
	}
}

func (s *CommandService) finishSyncTask(task *syncTask, status syncTaskStatus, eventType string, data SyncStreamEvent) {
	event := syncTaskEvent{
		Event: eventType,
		Data:  data,
	}.withID(task.nextEventID())

	task.mu.Lock()
	task.status = status
	task.finishedAt = s.now()
	task.updatedAt = task.finishedAt
	task.events = append(task.events, event)
	if len(task.events) > s.taskBufferLimit {
		task.events = append([]syncTaskEvent(nil), task.events[len(task.events)-s.taskBufferLimit:]...)
	}
	subscribers := taskSubscriberList(task.subscribers)
	task.subscribers = make(map[chan syncTaskEvent]struct{})
	task.mu.Unlock()

	for _, ch := range subscribers {
		select {
		case ch <- event:
		default:
		}
		close(ch)
	}
}

func (s *CommandService) cleanupExpiredTasks() {
	now := s.now()
	s.tasksMu.Lock()
	for id, task := range s.tasks {
		task.mu.Lock()
		expired := task.status != syncTaskRunning && !task.updatedAt.IsZero() && now.Sub(task.updatedAt) > s.taskTTL
		task.mu.Unlock()
		if expired {
			delete(s.tasks, id)
		}
	}
	s.tasksMu.Unlock()
}

func (s *CommandService) newProcessID() string {
	id := atomic.AddUint64(&s.nextTaskID, 1)
	return fmt.Sprintf("sync-%d-%d", s.now().UnixNano(), id)
}

func taskSubscriberList(subscribers map[chan syncTaskEvent]struct{}) []chan syncTaskEvent {
	result := make([]chan syncTaskEvent, 0, len(subscribers))
	for ch := range subscribers {
		result = append(result, ch)
	}
	return result
}

func (e syncTaskEvent) ID() string {
	switch {
	case e.Data.ID != "":
		return e.Data.ID
	case e.Data.Time != "":
		return e.Data.Time
	default:
		return ""
	}
}

func (e syncTaskEvent) withID(id string) syncTaskEvent {
	e.Data.ID = id
	return e
}

func (t *syncTask) nextEventID() string {
	t.nextEvent++
	return fmt.Sprintf("%s-%d", t.processID, t.nextEvent)
}

func runSyncCommandStreaming(args SyncArgs, emit func(string)) (string, error) {
	cmd := exec.Command("powershell", buildSyncPowerShellArgs(args)...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return "", err
	}
	if err := cmd.Start(); err != nil {
		return "", err
	}

	var outMu sync.Mutex
	var allOutput bytes.Buffer
	appendLine := func(line string) {
		line = strings.TrimSpace(line)
		if line == "" {
			return
		}
		outMu.Lock()
		if allOutput.Len() > 0 {
			allOutput.WriteByte('\n')
		}
		allOutput.WriteString(line)
		outMu.Unlock()
		emit(line)
	}

	var wg sync.WaitGroup
	readPipe := func(r io.Reader) {
		defer wg.Done()
		scanner := bufio.NewScanner(r)
		buf := make([]byte, 0, 64*1024)
		scanner.Buffer(buf, 1024*1024)
		for scanner.Scan() {
			appendLine(scanner.Text())
		}
		if err := scanner.Err(); err != nil {
			appendLine(err.Error())
		}
	}

	wg.Add(2)
	go readPipe(stdout)
	go readPipe(stderr)

	waitErr := cmd.Wait()
	wg.Wait()

	outMu.Lock()
	output := strings.TrimSpace(allOutput.String())
	outMu.Unlock()

	if waitErr != nil {
		if output != "" {
			return output, &CommandOutputError{Output: output, Err: waitErr}
		}
		return "", waitErr
	}
	return output, nil
}
