package model

import (
	"encoding/json"
	"strings"
)

type User struct {
	ID           int64
	Username     string
	PasswordHash string
}

type Item struct {
	ID          int64   `json:"id"`
	Base        string  `json:"base"`
	Category    string  `json:"category"`
	Subcategory string  `json:"subcategory"`
	Name        string  `json:"name"`
	CreateAt    *string `json:"createAt"`
	UpdateAt    *string `json:"updateAt"`
	Title       string  `json:"title"`
	Date        *string `json:"date"`
	Thumbnail   *string `json:"thumbnail"`
	Roll        *string `json:"roll"`
	Trailer     *string `json:"trailer"`
	Tag         string  `json:"tag"`
	Tag2        string  `json:"tag2"`
	Tag3        string  `json:"tag3"`
	Extra       *string `json:"extra"`
	Content     string  `json:"content"`
	Images      string  `json:"images"`
	Type        *int64  `json:"type"`
	Favi        *int64  `json:"favi"`
}

type ItemWrite struct {
	Base        *string    `json:"base"`
	Category    *string    `json:"category"`
	Subcategory *string    `json:"subcategory"`
	Name        *string    `json:"name"`
	Title       *string    `json:"title"`
	Date        *string    `json:"date"`
	Thumbnail   *string    `json:"thumbnail"`
	Roll        *string    `json:"roll"`
	Trailer     *string    `json:"trailer"`
	Tag         *ListField `json:"tag"`
	Tag2        *ListField `json:"tag2"`
	Tag3        *ListField `json:"tag3"`
	Tags        *ListField `json:"tags"`
	Tags2       *ListField `json:"tags2"`
	Tags3       *ListField `json:"tags3"`
	Extra       *string    `json:"extra"`
	Content     *string    `json:"content"`
	Images      *ListField `json:"images"`
	Type        *int64     `json:"type"`
}

type ListField struct {
	Values []string
}

func (f *ListField) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		f.Values = nil
		return nil
	}
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		f.Values = splitListValues(s)
		return nil
	}
	var raw []json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	values := make([]string, 0, len(raw))
	for _, item := range raw {
		var itemString string
		if err := json.Unmarshal(item, &itemString); err == nil {
			values = append(values, itemString)
			continue
		}
		var itemObject map[string]any
		if err := json.Unmarshal(item, &itemObject); err != nil {
			return err
		}
		for _, key := range []string{"value", "name"} {
			if v, ok := itemObject[key].(string); ok {
				values = append(values, v)
				break
			}
		}
	}
	f.Values = cleanListValues(values)
	return nil
}

func (f *ListField) Join() string {
	if f == nil {
		return ""
	}
	return strings.Join(cleanListValues(f.Values), ";")
}

func (f *ListField) JoinWrapped() string {
	if f == nil {
		return ""
	}
	values := cleanListValues(f.Values)
	if len(values) == 0 {
		return ""
	}
	return ";" + strings.Join(values, ";") + ";"
}

func (w ItemWrite) TagValue() *string {
	return joinedWrapped(w.Tags, w.Tag)
}

func (w ItemWrite) Tag2Value() *string {
	return joinedWrapped(w.Tags2, w.Tag2)
}

func (w ItemWrite) Tag3Value() *string {
	return joinedWrapped(w.Tags3, w.Tag3)
}

func (w ItemWrite) ImagesValue() *string {
	if w.Images == nil {
		return nil
	}
	v := w.Images.Join()
	return &v
}

func joinedWrapped(fields ...*ListField) *string {
	for _, field := range fields {
		if field != nil {
			v := field.JoinWrapped()
			return &v
		}
	}
	return nil
}

func splitListValues(v string) []string {
	return cleanListValues(strings.Split(v, ";"))
}

func cleanListValues(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, v := range values {
		v = strings.TrimSpace(v)
		if v != "" && !seen[v] {
			out = append(out, v)
			seen[v] = true
		}
	}
	return out
}

type Role struct {
	ID     int64   `json:"id"`
	Date   *string `json:"date"`
	Title  string  `json:"title"`
	Name   string  `json:"name"`
	Images string  `json:"images"`
	Remark string  `json:"remark"`
	Base   string  `json:"base"`
}

type ItemQuery struct {
	UserID      int64
	Base        string
	Category    []string
	Subcategory string
	Keyword     []string
	Tag         []string
	DateFrom    string
	DateTo      string
	MatchMode   string
	Favi        bool
	Type        string
	Sort        string
	Page        int
	PageSize    int
}

type ItemListResult struct {
	Items    []Item
	Total    int64
	CountSQL string
	ListSQL  string
	RoleSQL  string
	Params   map[string]string
}
