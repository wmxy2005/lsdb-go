package service

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCommandServiceOpendirDirSepPaths(t *testing.T) {
	fileRoot := t.TempDir()
	dir := filepath.Join(fileRoot, "wallpaper", "4k", "item1")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}

	cases := []string{
		`wallpaper\4k\item1\`,
		`wallpaper\4k\item1`,
		`wallpaper/4k/item1`,
		`wallpaper/4k/item1/`,
	}
	for _, path := range cases {
		t.Run(path, func(t *testing.T) {
			r := &fakeCommandRunner{}
			s := NewCommandServiceWithRunner(fileRoot, "windows", r)
			if err := s.Run("opendir", path); err != nil {
				t.Fatalf("Run(%q) err = %v", path, err)
			}
		})
	}
}
