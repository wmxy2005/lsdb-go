package service

import (
	"net/url"
	"os"
	"path/filepath"
	"testing"

	"lsdb-go/backend/internal/model"
)

func TestItemServiceAvatarSrcLogoCandidates(t *testing.T) {
	tests := []struct {
		name     string
		files    []string
		filename string
		category string
		subcat   string
	}{
		{
			name:     "keeps png priority",
			files:    []string{"wallpaper/4k/logo.png", "wallpaper/4k/logo.jpg", "wallpaper/4k/logo.svg", "wallpaper/4k/logo.ico"},
			filename: "logo.png",
			category: "4k",
		},
		{
			name:     "falls back to jpg",
			files:    []string{"wallpaper/4k/logo.jpg", "wallpaper/4k/logo.svg", "wallpaper/4k/logo.ico"},
			filename: "logo.jpg",
			category: "4k",
		},
		{
			name:     "falls back to svg",
			files:    []string{"wallpaper/4k/logo.svg", "wallpaper/4k/logo.ico"},
			filename: "logo.svg",
			category: "4k",
		},
		{
			name:     "falls back to ico",
			files:    []string{"wallpaper/4k/logo.ico"},
			filename: "logo.ico",
			category: "4k",
		},
		{
			name:     "prefers more specific directory over extension priority in parent",
			files:    []string{"wallpaper/logo.png", "wallpaper/4k/logo.jpg"},
			filename: "logo.jpg",
			category: "4k",
		},
		{
			name:     "prefers subcategory over category",
			files:    []string{"wallpaper/4k/logo.png", "wallpaper/4k/desktop/logo.ico"},
			filename: "logo.ico",
			category: "4k",
			subcat:   "desktop",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmp := t.TempDir()
			for _, file := range tt.files {
				path := filepath.Join(tmp, filepath.FromSlash(file))
				if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
					t.Fatal(err)
				}
				if err := os.WriteFile(path, []byte("logo"), 0o644); err != nil {
					t.Fatal(err)
				}
			}

			svc := &ItemService{resources: NewResourceService(tmp)}
			src := svc.avatarSrc(model.Item{
				Base:        "wallpaper",
				Category:    "4k",
				Subcategory: tt.subcat,
			})
			parsed, err := url.Parse(src)
			if err != nil {
				t.Fatalf("avatarSrc returned invalid URL %q: %v", src, err)
			}
			values := parsed.Query()
			if values.Get("filename") != tt.filename {
				t.Fatalf("filename = %q, want %q in %q", values.Get("filename"), tt.filename, src)
			}
			if values.Get("base") != "wallpaper" || values.Get("category") != tt.category || values.Get("subcategory") != tt.subcat {
				t.Fatalf("location query = %q, want category=%q subcategory=%q", src, tt.category, tt.subcat)
			}
		})
	}
}
