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
	output string
}

func (r *fakeCommandRunner) Start(name string, args ...string) error {
	r.calls = append(r.calls, commandCall{name: name, args: append([]string{}, args...)})
	return r.err
}

func (r *fakeCommandRunner) Run(name string, args ...string) (string, error) {
	r.calls = append(r.calls, commandCall{name: name, args: append([]string{}, args...)})
	return r.output, r.err
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

	t.Run("sync", func(t *testing.T) {
		runner := &fakeCommandRunner{output: "sync ok"}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		output, err := svc.RunWithArgs("sync", "", SyncArgs{
			Base:     "base",
			Category: "category",
			Item:     "item-001",
		})
		if err != nil {
			t.Fatal(err)
		}
		if output != "sync ok" {
			t.Fatalf("output = %q", output)
		}
		assertCommandCall(t, runner, "powershell", []string{
			"-NoProfile",
			"-ExecutionPolicy",
			"Bypass",
			"-Command",
			"& 'D:\\src\\lsdb-from\\download_media_item.ps1' -CondaEnv base --base 'base' --category 'category' --item 'item-001'",
		})
	})

	t.Run("sync missing base", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		_, err := svc.RunWithArgs("sync", "", SyncArgs{
			Category: "category",
			Item:     "item-001",
		})
		if !errors.Is(err, ErrMissingBase) {
			t.Fatalf("err = %v", err)
		}
		assertNoCommandCalls(t, runner)
	})

	t.Run("sync missing category", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		_, err := svc.RunWithArgs("sync", "", SyncArgs{
			Base: "base",
			Item: "item-001",
		})
		if !errors.Is(err, ErrMissingCategory) {
			t.Fatalf("err = %v", err)
		}
		assertNoCommandCalls(t, runner)
	})

	t.Run("sync missing item", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		_, err := svc.RunWithArgs("sync", "", SyncArgs{
			Base:     "base",
			Category: "category",
		})
		if !errors.Is(err, ErrMissingItem) {
			t.Fatalf("err = %v", err)
		}
		assertNoCommandCalls(t, runner)
	})

	t.Run("sync unsafe value", func(t *testing.T) {
		runner := &fakeCommandRunner{}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		_, err := svc.RunWithArgs("sync", "", SyncArgs{
			Base:     "base",
			Category: "../actress",
			Item:     "item-001",
		})
		if !errors.Is(err, ErrUnsafeValue) {
			t.Fatalf("err = %v", err)
		}
		assertNoCommandCalls(t, runner)
	})

	t.Run("sync runner error exposes output", func(t *testing.T) {
		runErr := errors.New("exit status 1")
		runner := &fakeCommandRunner{output: "boom", err: runErr}
		svc := NewCommandServiceWithRunner(t.TempDir(), "windows", runner)
		output, err := svc.RunWithArgs("sync", "", SyncArgs{
			Base:     "base",
			Category: "category",
			Item:     "item-001",
		})
		if output != "boom" {
			t.Fatalf("output = %q", output)
		}
		var outputErr *CommandOutputError
		if !errors.As(err, &outputErr) {
			t.Fatalf("err = %T %v", err, err)
		}
		if outputErr.Output != "boom" {
			t.Fatalf("outputErr.Output = %q", outputErr.Output)
		}
		if !errors.Is(err, runErr) {
			t.Fatalf("err = %v", err)
		}
		assertCommandCall(t, runner, "powershell", []string{
			"-NoProfile",
			"-ExecutionPolicy",
			"Bypass",
			"-Command",
			"& 'D:\\src\\lsdb-from\\download_media_item.ps1' -CondaEnv base --base 'base' --category 'category' --item 'item-001'",
		})
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
