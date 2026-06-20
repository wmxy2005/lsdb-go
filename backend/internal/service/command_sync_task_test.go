package service

import (
	"errors"
	"testing"
	"time"
)

type fakeSyncStreamRunner struct {
	run func(args SyncArgs, emit func(string)) (string, error)
}

func (r fakeSyncStreamRunner) Run(args SyncArgs, emit func(string)) (string, error) {
	return r.run(args, emit)
}

func TestStartSyncTaskAndReplay(t *testing.T) {
	now := time.Date(2026, 6, 20, 12, 0, 0, 0, time.UTC)
	runner := &fakeCommandRunner{}
	streamRunner := fakeSyncStreamRunner{
		run: func(args SyncArgs, emit func(string)) (string, error) {
			emit("line one")
			emit("line two")
			return "", nil
		},
	}
	svc := NewCommandServiceWithDependencies(t.TempDir(), "windows", runner, streamRunner, func() time.Time { return now }, 5*time.Minute, 16)

	result, err := svc.StartSyncTask(SyncArgs{Base: "base", Category: "cat", Item: "item"})
	if err != nil {
		t.Fatal(err)
	}
	if result.ProcessID == "" {
		t.Fatal("expected process id")
	}

	time.Sleep(50 * time.Millisecond)

	replay, ch, cancel, err := svc.SubscribeSyncTask(result.ProcessID)
	if err != nil {
		t.Fatal(err)
	}
	defer cancel()
	if ch != nil {
		t.Fatal("expected completed task to replay without live channel")
	}
	if len(replay) != 3 {
		t.Fatalf("replay len = %d", len(replay))
	}
	if replay[0].Event != "log" || replay[0].Data.Text != "line one" {
		t.Fatalf("first replay = %#v", replay[0])
	}
	if replay[1].Event != "log" || replay[1].Data.Text != "line two" {
		t.Fatalf("second replay = %#v", replay[1])
	}
	if replay[2].Event != "done" {
		t.Fatalf("done replay = %#v", replay[2])
	}
}

func TestStartSyncTaskLiveSubscriberReceivesEvents(t *testing.T) {
	now := time.Date(2026, 6, 20, 12, 0, 0, 0, time.UTC)
	started := make(chan struct{}, 1)
	release := make(chan struct{})
	streamRunner := fakeSyncStreamRunner{
		run: func(args SyncArgs, emit func(string)) (string, error) {
			emit("hello")
			select {
			case started <- struct{}{}:
			default:
			}
			<-release
			return "", nil
		},
	}
	svc := NewCommandServiceWithDependencies(t.TempDir(), "windows", &fakeCommandRunner{}, streamRunner, func() time.Time { return now }, 5*time.Minute, 16)

	result, err := svc.StartSyncTask(SyncArgs{Base: "base", Category: "cat", Item: "item"})
	if err != nil {
		t.Fatal(err)
	}
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("runner did not start")
	}

	replay, ch, cancel, err := svc.SubscribeSyncTask(result.ProcessID)
	if err != nil {
		t.Fatal(err)
	}
	defer cancel()
	if ch == nil {
		t.Fatal("expected live channel")
	}
	if len(replay) == 0 || replay[0].Event != "log" || replay[0].Data.Text != "hello" {
		t.Fatalf("unexpected replay = %#v", replay)
	}

	release <- struct{}{}
	var doneEvent syncTaskEvent
	select {
	case doneEvent = <-ch:
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for done event")
	}
	if doneEvent.Event != "done" {
		t.Fatalf("doneEvent = %#v", doneEvent)
	}
}

func TestStartSyncTaskFailure(t *testing.T) {
	now := time.Date(2026, 6, 20, 12, 0, 0, 0, time.UTC)
	streamRunner := fakeSyncStreamRunner{
		run: func(args SyncArgs, emit func(string)) (string, error) {
			emit("warn line")
			return "fatal line", errors.New("exit status 1")
		},
	}
	svc := NewCommandServiceWithDependencies(t.TempDir(), "windows", &fakeCommandRunner{}, streamRunner, func() time.Time { return now }, 5*time.Minute, 16)

	result, err := svc.StartSyncTask(SyncArgs{Base: "base", Category: "cat", Item: "item"})
	if err != nil {
		t.Fatal(err)
	}

	time.Sleep(50 * time.Millisecond)

	replay, ch, cancel, err := svc.SubscribeSyncTask(result.ProcessID)
	if err != nil {
		t.Fatal(err)
	}
	defer cancel()
	if ch != nil {
		t.Fatal("expected completed failed task")
	}
	if replay[len(replay)-1].Event != "error" || replay[len(replay)-1].Data.Message != "fatal line" {
		t.Fatalf("replay tail = %#v", replay[len(replay)-1])
	}
}

func TestSubscribeSyncTaskValidationAndExpiry(t *testing.T) {
	current := time.Date(2026, 6, 20, 12, 0, 0, 0, time.UTC)
	streamRunner := fakeSyncStreamRunner{
		run: func(args SyncArgs, emit func(string)) (string, error) {
			return "", nil
		},
	}
	svc := NewCommandServiceWithDependencies(t.TempDir(), "windows", &fakeCommandRunner{}, streamRunner, func() time.Time { return current }, time.Minute, 16)

	if _, _, _, err := svc.SubscribeSyncTask(""); !errors.Is(err, ErrMissingProcessID) {
		t.Fatalf("err = %v", err)
	}
	if _, _, _, err := svc.SubscribeSyncTask("missing"); !errors.Is(err, ErrSyncTaskNotFound) {
		t.Fatalf("err = %v", err)
	}

	result, err := svc.StartSyncTask(SyncArgs{Base: "base", Category: "cat", Item: "item"})
	if err != nil {
		t.Fatal(err)
	}
	time.Sleep(50 * time.Millisecond)

	current = current.Add(2 * time.Minute)
	if _, _, _, err := svc.SubscribeSyncTask(result.ProcessID); !errors.Is(err, ErrSyncTaskNotFound) {
		t.Fatalf("err = %v", err)
	}
}
