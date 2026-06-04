package service

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

type commandCall struct {
	name string
	args []string
}

type fakeCommandRunner struct {
	calls []commandCall
	err   error
}

func (r *fakeCommandRunner) Start(name string, args ...string) error {
	r.calls = append(r.calls, commandCall{name: name, args: append([]string{}, args...)})
	return r.err
}

func TestCommandServiceRun(t *testing.T) {
	t.Run("shutdown", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		if err := svc.Run("shutdown", ""); err != nil {
			t.Fatal(err)
		}
		assertCommandCall(t, runner, "shutdown", []string{"-s", "-f", "-t", "0"})
	})

	t.Run("restart", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		if err := svc.Run("restart", ""); err != nil {
			t.Fatal(err)
		}
		assertCommandCall(t, runner, "shutdown", []string{"-r", "-f", "-t", "0"})
	})

	t.Run("opendir", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		fileRoot := t.TempDir()
		svc := NewCommandServiceWithRunner(fileRoot, "windows", runner)
		dir := filepath.Join(fileRoot, "wallpaper", "4k")
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := svc.Run("opendir", "wallpaper/4k"); err != nil {
			t.Fatal(err)
		}
		abs, err := filepath.Abs(dir)
		if err != nil {
			t.Fatal(err)
		}
		assertCommandCall(t, runner, "explorer", []string{abs})
	})

	t.Run("opendir missing path", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		if err := svc.Run("opendir", " "); !errors.Is(err, ErrMissingPath) {
			t.Fatalf("err = %v", err)
		}
		assertNoCommandCalls(t, runner)
	})

	t.Run("opendir invalid path", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		if err := svc.Run("opendir", "missing"); !errors.Is(err, ErrInvalidPath) {
			t.Fatalf("err = %v", err)
		}
		assertNoCommandCalls(t, runner)
	})

	t.Run("opendir file path", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		fileRoot := t.TempDir()
		svc := NewCommandServiceWithRunner(fileRoot, "windows", runner)
		path := filepath.Join(fileRoot, "file.txt")
		if err := os.WriteFile(path, []byte("file"), 0o644); err != nil {
			t.Fatal(err)
		}
		if err := svc.Run("opendir", "file.txt"); !errors.Is(err, ErrInvalidPath) {
			t.Fatalf("err = %v", err)
		}
		assertNoCommandCalls(t, runner)
	})

	t.Run("opendir unsafe path", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		if err := svc.Run("opendir", "../outside"); !errors.Is(err, ErrUnsafePath) {
			t.Fatalf("err = %v", err)
		}
		assertNoCommandCalls(t, runner)
	})

	t.Run("unsupported command", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		if err := svc.Run("unknown", ""); !errors.Is(err, ErrUnsupportedCommand) {
			t.Fatalf("err = %v", err)
		}
		assertNoCommandCalls(t, runner)
	})

	t.Run("unsupported platform", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "linux", runner)
		if err := svc.Run("shutdown", ""); !errors.Is(err, ErrUnsupportedPlatform) {
			t.Fatalf("err = %v", err)
		}
		assertNoCommandCalls(t, runner)
	})

	t.Run("runner error", func(t *testing.T) {
		startErr := errors.New("start failed")
		runner := &fakeCommandRunner{err: startErr}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		if err := svc.Run("shutdown", ""); !errors.Is(err, startErr) {
			t.Fatalf("err = %v", err)
		}
		assertCommandCall(t, runner, "shutdown", []string{"-s", "-f", "-t", "0"})
	})
}

func assertCommandCall(t *testing.T, runner *fakeCommandRunner, name string, args []string) {
	t.Helper()
	if len(runner.calls) != 1 {
		t.Fatalf("calls = %#v", runner.calls)
	}
	call := runner.calls[0]
	if call.name != name || !reflect.DeepEqual(call.args, args) {
		t.Fatalf("call = %#v, want name=%q args=%#v", call, name, args)
	}
}

func assertNoCommandCalls(t *testing.T, runner *fakeCommandRunner) {
	t.Helper()
	if len(runner.calls) != 0 {
		t.Fatalf("calls = %#v", runner.calls)
	}
}
