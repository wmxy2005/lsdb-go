package service

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"testing"
)

func TestImageSizeSupportsWebP(t *testing.T) {
	tmp := t.TempDir()
	data, err := base64.StdEncoding.DecodeString("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/vuUAAA=")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmp, "tiny.webp"), data, 0o644); err != nil {
		t.Fatal(err)
	}

	w, h := NewResourceService(tmp).ImageSize("", "", "", "", "tiny.webp")
	if w != 1 || h != 1 {
		t.Fatalf("ImageSize(tiny.webp) = %dx%d, want 1x1", w, h)
	}
}
