package service

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"strings"
	"time"
)

var (
	ErrUnsupportedCommand  = errors.New("unsupported command")
	ErrUnsupportedPlatform = errors.New("unsupported platform")
	ErrMissingPath         = errors.New("path is required")
	ErrInvalidPath         = errors.New("path must be an existing directory")
	ErrUnsafePath          = errors.New("path must be relative to file root")
	ErrMissingBase         = errors.New("base is required")
	ErrMissingCategory     = errors.New("category is required")
	ErrMissingItem         = errors.New("item is required")
	ErrUnsafeValue         = errors.New("command arguments contain unsafe path characters")
	ErrMissingProcessID    = errors.New("processId is required")
	ErrSyncTaskNotFound    = errors.New("sync task not found")
)

type CommandRunner interface {
	Start(name string, args ...string) error
	Run(name string, args ...string) (string, error)
}

type SyncStreamRunner interface {
	Run(args SyncArgs, emit func(string)) (string, error)
}

type ExecCommandRunner struct{}
type ExecSyncStreamRunner struct{}

func (ExecCommandRunner) Start(name string, args ...string) error {
	return exec.Command(name, args...).Start()
}

func (ExecCommandRunner) Run(name string, args ...string) (string, error) {
	output, err := exec.Command(name, args...).CombinedOutput()
	return strings.TrimSpace(string(output)), err
}

func (ExecSyncStreamRunner) Run(args SyncArgs, emit func(string)) (string, error) {
	return runSyncCommandStreaming(args, emit)
}

type CommandService struct {
	fileRoot        string
	osName          string
	runner          CommandRunner
	streamRunner    SyncStreamRunner
	taskTTL         time.Duration
	taskBufferLimit int
	now             func() time.Time
	tasksMu         sync.Mutex
	tasks           map[string]*syncTask
	nextTaskID      uint64
}

type SyncArgs struct {
	Base     string
	Category string
	Item     string
}

type CommandOutputError struct {
	Output string
	Err    error
}

func (e *CommandOutputError) Error() string {
	if text := strings.TrimSpace(e.Output); text != "" {
		return text
	}
	if e.Err != nil {
		return e.Err.Error()
	}
	return ""
}

func (e *CommandOutputError) Unwrap() error {
	return e.Err
}

func NewCommandService(fileRoot string) *CommandService {
	return NewCommandServiceWithDependencies(
		fileRoot,
		runtime.GOOS,
		ExecCommandRunner{},
		ExecSyncStreamRunner{},
		time.Now,
		5*time.Minute,
		500,
	)
}

func NewCommandServiceWithRunner(fileRoot, osName string, runner CommandRunner) *CommandService {
	return NewCommandServiceWithDependencies(
		fileRoot,
		osName,
		runner,
		ExecSyncStreamRunner{},
		time.Now,
		5*time.Minute,
		500,
	)
}

func NewCommandServiceWithDependencies(
	fileRoot, osName string,
	runner CommandRunner,
	streamRunner SyncStreamRunner,
	now func() time.Time,
	taskTTL time.Duration,
	taskBufferLimit int,
) *CommandService {
	if streamRunner == nil {
		streamRunner = ExecSyncStreamRunner{}
	}
	if now == nil {
		now = time.Now
	}
	if taskTTL <= 0 {
		taskTTL = 5 * time.Minute
	}
	if taskBufferLimit <= 0 {
		taskBufferLimit = 500
	}
	return &CommandService{
		fileRoot:        fileRoot,
		osName:          osName,
		runner:          runner,
		streamRunner:    streamRunner,
		taskTTL:         taskTTL,
		taskBufferLimit: taskBufferLimit,
		now:             now,
		tasks:           make(map[string]*syncTask),
	}
}

func (s *CommandService) Run(typ, path string) error {
	_, err := s.RunWithArgs(typ, path, SyncArgs{})
	return err
}

func (s *CommandService) RunWithArgs(typ, path string, syncArgs SyncArgs) (string, error) {
	if s.osName != "windows" {
		return "", ErrUnsupportedPlatform
	}
	switch strings.ToLower(strings.TrimSpace(typ)) {
	case "shutdown":
		return "", s.runner.Start("shutdown", "-s", "-f", "-t", "0")
	case "restart":
		return "", s.runner.Start("shutdown", "-r", "-f", "-t", "0")
	case "opendir":
		return "", s.openDir(path)
	case "sync":
		return s.syncItem(syncArgs)
	default:
		return "", ErrUnsupportedCommand
	}
}

func (s *CommandService) openDir(path string) error {
	path = strings.TrimSpace(path)
	if path == "" {
		return ErrMissingPath
	}
	path = strings.ReplaceAll(path, "\\", "/")
	if strings.Contains(path, "..") || strings.HasPrefix(path, "/") || filepath.IsAbs(path) {
		return ErrUnsafePath
	}
	rootAbs, err := filepath.Abs(s.fileRoot)
	if err != nil {
		return err
	}
	abs, err := filepath.Abs(filepath.Join(rootAbs, filepath.FromSlash(path)))
	if err != nil {
		return err
	}
	rel, err := filepath.Rel(rootAbs, abs)
	if err != nil || strings.HasPrefix(rel, "..") || filepath.IsAbs(rel) {
		return ErrUnsafePath
	}
	st, err := os.Stat(abs)
	if err != nil || !st.IsDir() {
		return ErrInvalidPath
	}
	return s.runner.Start("explorer", abs)
}

func (s *CommandService) syncItem(args SyncArgs) (string, error) {
	normalized, err := sanitizeSyncArgs(args)
	if err != nil {
		return "", err
	}
	output, err := s.runner.Run("powershell", buildSyncPowerShellArgs(normalized)...)
	if err != nil {
		return output, &CommandOutputError{Output: output, Err: err}
	}
	return output, nil
}

func sanitizeSyncArgs(args SyncArgs) (SyncArgs, error) {
	base, err := sanitizeSyncValue(args.Base, ErrMissingBase)
	if err != nil {
		return SyncArgs{}, err
	}
	category, err := sanitizeSyncValue(args.Category, ErrMissingCategory)
	if err != nil {
		return SyncArgs{}, err
	}
	item, err := sanitizeSyncValue(args.Item, ErrMissingItem)
	if err != nil {
		return SyncArgs{}, err
	}
	return SyncArgs{
		Base:     base,
		Category: category,
		Item:     item,
	}, nil
}

func buildSyncPowerShellArgs(args SyncArgs) []string {
	scriptPath := `D:\src\lsdb-from\download_media_item.ps1`
	command := fmt.Sprintf(
		"& '%s' -CondaEnv base --base '%s' --category '%s' --item '%s'",
		scriptPath,
		escapePowerShellSingleQuoted(args.Base),
		escapePowerShellSingleQuoted(args.Category),
		escapePowerShellSingleQuoted(args.Item),
	)
	return []string{"-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command}
}

func sanitizeSyncValue(value string, missingErr error) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", missingErr
	}
	if strings.Contains(value, "..") || strings.ContainsAny(value, `/\`) {
		return "", ErrUnsafeValue
	}
	return value, nil
}

func escapePowerShellSingleQuoted(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}
