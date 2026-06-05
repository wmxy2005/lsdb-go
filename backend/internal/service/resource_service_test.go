package service

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/color"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
)

func tinyWebP(t *testing.T) []byte {
	t.Helper()
	data, err := base64.StdEncoding.DecodeString("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/vuUAAA=")
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func testPNG(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.RGBA{uint8(x), uint8(y), 0, 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestImageSizeSupportsWebP(t *testing.T) {
	tmp := t.TempDir()
	if err := os.WriteFile(filepath.Join(tmp, "tiny.webp"), tinyWebP(t), 0o644); err != nil {
		t.Fatal(err)
	}

	w, h := NewResourceService(tmp).ImageSize("", "", "", "", "tiny.webp")
	if w != 1 || h != 1 {
		t.Fatalf("ImageSize(tiny.webp) = %dx%d, want 1x1", w, h)
	}
}

func TestImageSizeCacheHit(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "cached.webp")
	if err := os.WriteFile(path, tinyWebP(t), 0o644); err != nil {
		t.Fatal(err)
	}

	var decodeCount atomic.Int32
	decoder := func(r io.Reader) (image.Config, string, error) {
		decodeCount.Add(1)
		return image.DecodeConfig(r)
	}
	svc := NewResourceServiceWithDecoder(tmp, decoder)

	w1, h1 := svc.ImageSize("", "", "", "", "cached.webp")
	w2, h2 := svc.ImageSize("", "", "", "", "cached.webp")
	if w1 != 1 || h1 != 1 || w2 != 1 || h2 != 1 {
		t.Fatalf("sizes = (%d,%d) and (%d,%d), want 1x1", w1, h1, w2, h2)
	}
	if decodeCount.Load() != 1 {
		t.Fatalf("decode count = %d, want 1", decodeCount.Load())
	}
}

func TestImageSizeCacheInvalidatesOnReplace(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "mutable.png")
	if err := os.WriteFile(path, tinyWebP(t), 0o644); err != nil {
		t.Fatal(err)
	}

	svc := NewResourceService(tmp)
	w, h := svc.ImageSize("", "", "", "", "mutable.png")
	if w != 1 || h != 1 {
		t.Fatalf("initial size = %dx%d, want 1x1", w, h)
	}

	if err := os.WriteFile(path, testPNG(t, 3, 2), 0o644); err != nil {
		t.Fatal(err)
	}
	w, h = svc.ImageSize("", "", "", "", "mutable.png")
	if w != 3 || h != 2 {
		t.Fatalf("replaced size = %dx%d, want 3x2", w, h)
	}
}

func TestImageSizeCachePurgesOnDelete(t *testing.T) {
	tmp := t.TempDir()
	path := filepath.Join(tmp, "gone.webp")
	if err := os.WriteFile(path, tinyWebP(t), 0o644); err != nil {
		t.Fatal(err)
	}

	svc := NewResourceService(tmp)
	w, h := svc.ImageSize("", "", "", "", "gone.webp")
	if w != 1 || h != 1 {
		t.Fatalf("initial size = %dx%d, want 1x1", w, h)
	}

	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
	w, h = svc.ImageSize("", "", "", "", "gone.webp")
	if w != 0 || h != 0 {
		t.Fatalf("deleted size = %dx%d, want 0x0", w, h)
	}
}
