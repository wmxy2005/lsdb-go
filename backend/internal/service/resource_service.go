package service

import (
	"errors"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	_ "golang.org/x/image/webp"
)

type imageConfigDecoder func(r io.Reader) (image.Config, string, error)

type imageSizeEntry struct {
	width     int
	height    int
	modTime   time.Time
	size      int64
	checkedAt time.Time
}

// defaultImageSizeRecheckInterval is set to the maximum time.Duration (~292
// years), so a cached dimension is effectively never re-stat'd for the life of
// the process: each file is stat'd and decoded once on first access, then served
// from cache. This keeps list rendering off the filesystem entirely (one stat per
// thumbnail per request is costly on network drives). Trade-off: dimension changes
// on disk are not picked up until the process restarts.
const defaultImageSizeRecheckInterval time.Duration = 1<<63 - 1

type ResourceService struct {
	fileRoot            string
	sizeCache           sync.Map
	decodeConfig        imageConfigDecoder
	sizeRecheckInterval time.Duration
}

func NewResourceService(fileRoot string) *ResourceService {
	return NewResourceServiceWithDecoder(fileRoot, image.DecodeConfig)
}

func NewResourceServiceWithDecoder(fileRoot string, decoder imageConfigDecoder) *ResourceService {
	if decoder == nil {
		decoder = image.DecodeConfig
	}
	return &ResourceService{
		fileRoot:            fileRoot,
		decodeConfig:        decoder,
		sizeRecheckInterval: defaultImageSizeRecheckInterval,
	}
}

func (s *ResourceService) Resolve(base, category, subcategory, name, filename string) (string, error) {
	if strings.TrimSpace(filename) == "" {
		return "", errors.New("filename is required")
	}
	parts := []string{s.fileRoot}
	for _, p := range []string{base, category, subcategory, name, filename} {
		p = strings.TrimSpace(strings.ReplaceAll(p, "\\", "/"))
		if p == "" {
			continue
		}
		if strings.Contains(p, "..") || strings.HasPrefix(p, "/") {
			return "", errors.New("unsafe path")
		}
		parts = append(parts, p)
	}
	rootAbs, err := filepath.Abs(s.fileRoot)
	if err != nil {
		return "", err
	}
	pathAbs, err := filepath.Abs(filepath.Join(parts...))
	if err != nil {
		return "", err
	}
	rel, err := filepath.Rel(rootAbs, pathAbs)
	if err != nil || strings.HasPrefix(rel, "..") || filepath.IsAbs(rel) {
		return "", errors.New("unsafe path")
	}
	return pathAbs, nil
}

func (s *ResourceService) ResolveForRequest(base, category, subcategory, name, filename string, force bool) (string, error) {
	path, err := s.Resolve(base, category, subcategory, name, filename)
	if err != nil {
		return "", err
	}
	if !FileExists(path) && force {
		fallback, err := s.Resolve("", "", "", "", "image-not-found.jpg")
		if err == nil && FileExists(fallback) {
			return fallback, nil
		}
	}
	return path, nil
}

func (s *ResourceService) ImageSize(base, category, subcategory, name, filename string) (int, int) {
	path, err := s.Resolve(base, category, subcategory, name, filename)
	if err != nil {
		return 0, 0
	}
	return s.imageSizeForPath(path)
}

func (s *ResourceService) imageSizeForPath(path string) (int, int) {
	now := time.Now()
	if raw, ok := s.sizeCache.Load(path); ok {
		entry := raw.(imageSizeEntry)
		// Fast path: a recently validated entry is trusted without touching
		// the filesystem, bounding staleness to sizeRecheckInterval.
		if s.sizeRecheckInterval > 0 && now.Sub(entry.checkedAt) < s.sizeRecheckInterval {
			return entry.width, entry.height
		}
		// Past the window: re-validate cheaply against mod time + size.
		if st, err := os.Stat(path); err == nil && !st.IsDir() &&
			entry.modTime.Equal(st.ModTime()) && entry.size == st.Size() {
			entry.checkedAt = now
			s.sizeCache.Store(path, entry)
			return entry.width, entry.height
		}
	}

	st, err := os.Stat(path)
	if err != nil || st.IsDir() {
		s.sizeCache.Delete(path)
		return 0, 0
	}

	f, err := os.Open(path)
	if err != nil {
		return 0, 0
	}
	defer f.Close()

	cfg, _, err := s.decodeConfig(f)
	if err != nil {
		return 0, 0
	}

	s.sizeCache.Store(path, imageSizeEntry{
		width:     cfg.Width,
		height:    cfg.Height,
		modTime:   st.ModTime(),
		size:      st.Size(),
		checkedAt: now,
	})
	return cfg.Width, cfg.Height
}

func (s *ResourceService) URL(base, category, subcategory, name, filename string, force bool) string {
	q := url.Values{}
	if force {
		q.Set("force", "true")
	}
	q.Set("base", base)
	if category != "" {
		q.Set("category", category)
	}
	if subcategory != "" {
		q.Set("subcategory", subcategory)
	}
	if name != "" {
		q.Set("name", name)
	}
	q.Set("filename", filename)
	return "/api/resource?" + q.Encode()
}

func FileExists(path string) bool {
	st, err := os.Stat(path)
	return err == nil && !st.IsDir()
}
