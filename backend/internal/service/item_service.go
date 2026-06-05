package service

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"lsdb-go/backend/internal/model"
	"lsdb-go/backend/internal/repository"
)

type ItemService struct {
	items     *repository.ItemRepository
	roles     *RoleService
	resources *ResourceService
}

func NewItemService(items *repository.ItemRepository, roles *RoleService, resources *ResourceService) *ItemService {
	return &ItemService{items: items, roles: roles, resources: resources}
}

func (s *ItemService) List(q model.ItemQuery) (map[string]any, error) {
	start := time.Now()
	res, err := s.items.List(q)
	if err != nil {
		return nil, err
	}
	var list []map[string]any
	for _, item := range res.Items {
		list = append(list, s.ItemMap(item, false))
	}
	roleList := []map[string]any{}
	if len(q.Keyword) > 0 || len(q.Tag) > 0 {
		roleList, err = s.roles.ListForTags(append(q.Tag, q.Keyword...))
		if err != nil {
			roleList = []map[string]any{}
		}
	}
	pages := int64(0)
	if res.Total > 0 {
		pages = (res.Total + int64(q.PageSize) - 1) / int64(q.PageSize)
	}
	title := strings.Join(q.Tag, " ")
	if title == "" {
		title = strings.Join(q.Keyword, " ")
	}
	return map[string]any{
		"base":        q.Base,
		"category":    q.Category,
		"subcategory": q.Subcategory,
		"keyword":     q.Keyword,
		"tag":         q.Tag,
		"dateFrom":    q.DateFrom,
		"dateTo":      q.DateTo,
		"matchMode":   q.MatchMode,
		"favi":        q.Favi,
		"type":        q.Type,
		"sort":        q.Sort,
		"page":        q.Page,
		"current":     q.Page,
		"pageSize":    q.PageSize,
		"pages":       pages,
		"total":       res.Total,
		"costTime":    float64(time.Since(start).Microseconds()) / 1_000_000,
		"roleList":    roleList,
		"title":       title,
		"message":     fmt.Sprintf("%d record(s), %d page(s)", res.Total, pages),
		"list":        list,
	}, nil
}

func (s *ItemService) Get(id string, userID int64) (map[string]any, error) {
	item, err := s.items.Get(id, userID)
	if err != nil {
		return nil, err
	}
	return s.ItemMap(item, true), nil
}

func (s *ItemService) Create(req model.ItemWrite, userID int64) (map[string]any, error) {
	id, err := s.items.Create(req)
	if err != nil {
		return nil, err
	}
	return s.Get(fmt.Sprint(id), userID)
}

func (s *ItemService) Update(id string, req model.ItemWrite, userID int64) (map[string]any, error) {
	if err := s.items.Update(id, req); err != nil {
		return nil, err
	}
	return s.Get(id, userID)
}

func (s *ItemService) ItemMap(item model.Item, detail bool) map[string]any {
	m := map[string]any{
		"id":          item.ID,
		"base":        item.Base,
		"category":    item.Category,
		"subcategory": item.Subcategory,
		"name":        item.Name,
		"created_at":  item.CreatedAt,
		"updated_at":  item.UpdatedAt,
		"title":       item.Title,
		"date":        item.Date,
		"thumbnail":   item.Thumbnail,
		"roll":        item.Roll,
		"trailer":     item.Trailer,
		"tag":         item.Tag,
		"tag2":        item.Tag2,
		"tag3":        item.Tag3,
		"extra":       item.Extra,
		"content":     item.Content,
		"images":      item.Images,
		"type":        item.Type,
		"favi":        item.Favi,
		"avatar":      avatar(item.Base),
		"avatarSrc":   s.avatarSrc(item),
		"tagList":     tagList(item),
		"isFavi":      item.Favi != nil,
	}
	if item.Thumbnail != nil && *item.Thumbnail != "" {
		// m["thumbnailPath"] = filepath.Join(item.Base, item.Category, item.Subcategory, item.Name, *item.Thumbnail)
		w, h := s.resources.ImageSize(item.Base, item.Category, item.Subcategory, item.Name, *item.Thumbnail)
		m["thumbnailW"] = w
		m["thumbnailH"] = h
	} else {
		m["thumbnailPath"] = ""
		m["thumbnailW"] = 0
		m["thumbnailH"] = 0
	}
	if detail {
		imgList, videoThumbnail := s.detailImages(item)
		imgList1, imgList2 := splitImageLists(imgList)
		m["videoThumbnail"] = videoThumbnail
		m["imgList"] = imgList
		m["imgList1"] = imgList1
		m["imgList2"] = imgList2
		m["fileList"] = s.fileList(item)
	}
	return m
}

func (s *ItemService) avatarSrc(item model.Item) string {
	checks := []struct {
		base        string
		category    string
		subcategory string
	}{{base: item.Base, category: item.Category, subcategory: item.Subcategory}, {base: item.Base, category: item.Category}, {base: item.Base}}
	for _, chk := range checks {
		path, err := s.resources.Resolve(chk.base, chk.category, chk.subcategory, "", "logo.png")
		if err == nil && FileExists(path) {
			return s.resources.URL(item.Base, chk.category, chk.subcategory, "", "logo.png", false)
		}
	}
	return ""
}

func (s *ItemService) imgList(item model.Item) []map[string]any {
	var out []map[string]any
	for i, img := range SplitFiles(item.Images) {
		w, h := s.resources.ImageSize(item.Base, item.Category, item.Subcategory, item.Name, img)
		out = append(out, map[string]any{"imgIndex": i, "value": img, "width": w, "height": h})
	}
	return out
}

func (s *ItemService) detailImages(item model.Item) ([]map[string]any, string) {
	videoThumbnail := ""
	if item.Thumbnail != nil {
		videoThumbnail = *item.Thumbnail
	}
	images := SplitFiles(item.Images)
	skipFirst := item.Trailer != nil && *item.Trailer != "" && len(images) > 0
	if skipFirst {
		videoThumbnail = images[0]
	}
	out := make([]map[string]any, 0, len(images))
	for i, img := range images {
		if skipFirst && i == 0 {
			continue
		}
		w, h := s.resources.ImageSize(item.Base, item.Category, item.Subcategory, item.Name, img)
		out = append(out, map[string]any{"imgIndex": i, "value": img, "width": w, "height": h})
	}
	return out, videoThumbnail
}

func splitImageLists(images []map[string]any) ([]map[string]any, []map[string]any) {
	var wide []map[string]any
	var narrow []map[string]any
	for _, img := range images {
		width, _ := img["width"].(int)
		if width >= 200 {
			wide = append(wide, img)
		} else {
			narrow = append(narrow, img)
		}
	}
	return wide, narrow
}

func avatar(base string) string {
	base = strings.ToUpper(strings.TrimSpace(base))
	if len(base) > 3 {
		return base[:3]
	}
	return base
}

func tagList(item model.Item) []map[string]any {
	out := []map[string]any{}
	if item.Base != "" {
		out = append(out, map[string]any{"type": "base", "tagIndex": 0, "value": item.Base})
	}
	if item.Category != "" {
		out = append(out, map[string]any{"type": "category", "tagIndex": 0, "value": item.Category})
	}
	if item.Subcategory != "" {
		out = append(out, map[string]any{"type": "subcategory", "tagIndex": 0, "value": item.Subcategory})
	}
	for _, group := range []struct{ typ, val string }{{"tag", item.Tag}, {"tag2", item.Tag2}, {"tag3", item.Tag3}} {
		for i, v := range SplitTags(group.val) {
			out = append(out, map[string]any{"type": group.typ, "tagIndex": i + 1, "value": v})
		}
	}
	return out
}

func (s *ItemService) fileList(item model.Item) []map[string]any {
	var out []map[string]any
	seen := map[string]bool{}
	if item.Thumbnail != nil && *item.Thumbnail != "" {
		out = append(out, map[string]any{"type": "thumbnail", "value": *item.Thumbnail})
		seen[*item.Thumbnail] = true
	}
	for _, img := range SplitFiles(item.Images) {
		if !seen[img] {
			out = append(out, map[string]any{"type": "image", "value": img})
			seen[img] = true
		}
	}
	for _, f := range []*string{item.Roll, item.Trailer} {
		if f != nil && *f != "" && !seen[*f] {
			out = append(out, map[string]any{"type": "file", "thumbUrl": "/video.svg", "value": *f})
			seen[*f] = true
		}
	}
	return s.addFolderMediaFiles(item, out, seen)
}

func (s *ItemService) addFolderMediaFiles(item model.Item, out []map[string]any, seen map[string]bool) []map[string]any {
	folderFile, err := s.resources.Resolve(item.Base, item.Category, item.Subcategory, item.Name, ".folder")
	if err != nil {
		return out
	}
	entries, err := os.ReadDir(filepath.Dir(folderFile))
	if err != nil {
		return out
	}
	sort.Slice(entries, func(i, j int) bool {
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		mediaType := mediaFileType(name)
		if mediaType == "" || seen[name] {
			continue
		}
		file := map[string]any{"type": "file", "value": name}
		if mediaType == "video" {
			file["thumbUrl"] = "/video.svg"
		}
		out = append(out, file)
		seen[name] = true
	}
	return out
}

func mediaFileType(name string) string {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg":
		return "image"
	case ".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v":
		return "video"
	default:
		return ""
	}
}

func SplitTags(v string) []string {
	var out []string
	seen := map[string]bool{}
	for _, p := range strings.Split(v, ";") {
		p = strings.TrimSpace(p)
		if p != "" && !seen[p] {
			out = append(out, p)
			seen[p] = true
		}
	}
	return out
}

func SplitFiles(v string) []string {
	return SplitTags(v)
}
