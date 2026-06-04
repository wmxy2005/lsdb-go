package service

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

var (
	ErrUnsupportedCommand  = errors.New("unsupported command")
	ErrUnsupportedPlatform = errors.New("unsupported platform")
	ErrMissingPath         = errors.New("path is required")
	ErrInvalidPath         = errors.New("path must be an existing directory")
	ErrUnsafePath          = errors.New("path must be relative to file root")
)

type CommandRunner interface {
	Start(name string, args ...string) error
}

type ExecCommandRunner struct{}

func (ExecCommandRunner) Start(name string, args ...string) error {
	return exec.Command(name, args...).Start()
}

type CommandService struct {
	fileRoot string
	osName   string
	runner   CommandRunner
}

func NewCommandService(fileRoot string) *CommandService {
	return NewCommandServiceWithRunner(fileRoot, runtime.GOOS, ExecCommandRunner{})
}

func NewCommandServiceWithRunner(fileRoot, osName string, runner CommandRunner) *CommandService {
	return &CommandService{fileRoot: fileRoot, osName: osName, runner: runner}
}

func (s *CommandService) Run(typ, path string) error {
	if s.osName != "windows" {
		return ErrUnsupportedPlatform
	}
	switch strings.ToLower(strings.TrimSpace(typ)) {
	case "shutdown":
		return s.runner.Start("shutdown", "-s", "-f", "-t", "0")
	case "restart":
		return s.runner.Start("shutdown", "-r", "-f", "-t", "0")
	case "opendir":
		return s.openDir(path)
	default:
		return ErrUnsupportedCommand
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
