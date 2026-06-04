package service

import (
	"errors"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

type ResourceService struct{ fileRoot string }

func NewResourceService(fileRoot string) *ResourceService {
	return &ResourceService{fileRoot: fileRoot}
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
	f, err := os.Open(path)
	if err != nil {
		return 0, 0
	}
	defer f.Close()
	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return 0, 0
	}
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
