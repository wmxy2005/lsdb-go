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
	width   int
	height  int
	modTime time.Time
	size    int64
}

type ResourceService struct {
	fileRoot     string
	sizeCache    sync.Map
	decodeConfig imageConfigDecoder
}

func NewResourceService(fileRoot string) *ResourceService {
	return NewResourceServiceWithDecoder(fileRoot, image.DecodeConfig)
}

func NewResourceServiceWithDecoder(fileRoot string, decoder imageConfigDecoder) *ResourceService {
	if decoder == nil {
		decoder = image.DecodeConfig
	}
	return &ResourceService{fileRoot: fileRoot, decodeConfig: decoder}
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
	st, err := os.Stat(path)
	if err != nil || st.IsDir() {
		s.sizeCache.Delete(path)
		return 0, 0
	}

	if raw, ok := s.sizeCache.Load(path); ok {
		entry := raw.(imageSizeEntry)
		if entry.modTime.Equal(st.ModTime()) && entry.size == st.Size() {
			return entry.width, entry.height
		}
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
		width:   cfg.Width,
		height:  cfg.Height,
		modTime: st.ModTime(),
		size:    st.Size(),
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
