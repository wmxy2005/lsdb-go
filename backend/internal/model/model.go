package model

import (
	"encoding/json"
	"strings"
)

type User struct {
	ID           int64   `gorm:"column:id;primaryKey;autoIncrement;not null"`
	Username     string  `gorm:"column:username;uniqueIndex;not null"`
	PasswordHash string  `gorm:"column:password_hash;not null"`
	CreatedAt    *string `gorm:"column:created_at"`
	UpdatedAt    *string `gorm:"column:updated_at"`
}

func (User) TableName() string { return "user" }

type Item struct {
	ID          int64   `json:"id"          gorm:"column:id;primaryKey"`
	Base        string  `json:"base"         gorm:"column:base"`
	Category    string  `json:"category"     gorm:"column:category"`
	Subcategory string  `json:"subcategory"  gorm:"column:subcategory"`
	Name        string  `json:"name"         gorm:"column:name"`
	CreatedAt   *string `json:"created_at"   gorm:"column:created_at"`
	UpdatedAt   *string `json:"updated_at"   gorm:"column:updated_at"`
	Title       string  `json:"title"        gorm:"column:title"`
	Date        *string `json:"date"         gorm:"column:date"`
	Thumbnail   *string `json:"thumbnail"    gorm:"column:thumbnail"`
	Roll        *string `json:"roll"         gorm:"column:roll"`
	Trailer     *string `json:"trailer"      gorm:"column:trailer"`
	Tag         string  `json:"tag"          gorm:"column:tag"`
	Tag2        string  `json:"tag2"         gorm:"column:tag2"`
	Tag3        string  `json:"tag3"         gorm:"column:tag3"`
	Extra       *string `json:"extra"        gorm:"column:extra"`
	Content     string  `json:"content"      gorm:"column:content"`
	Images      string  `json:"images"       gorm:"column:images"`
	Type        *int64  `json:"type"         gorm:"column:type"`
	Favi        *int64  `json:"favi"         gorm:"column:favi;->;<-:false"`
}

func (Item) TableName() string { return "items" }

type Role struct {
	ID     int64   `json:"id"     gorm:"column:id;primaryKey"`
	Date   *string `json:"date"   gorm:"column:date"`
	Title  string  `json:"title"  gorm:"column:title"`
	Name   string  `json:"name"   gorm:"column:name"`
	Images string  `json:"images" gorm:"column:images"`
	Remark string  `json:"remark" gorm:"column:remark"`
	Base   string  `json:"base"   gorm:"column:base"`
}

func (Role) TableName() string { return "role" }

type Itemfavi struct {
	ID       int64  `gorm:"column:id;primaryKey;autoIncrement;not null"`
	UserID    int64   `gorm:"column:user_id;uniqueIndex:idx_itemfavi_user_item"`
	ItemID    int64   `gorm:"column:item_id;uniqueIndex:idx_itemfavi_user_item"`
	CreatedAt *string `gorm:"column:created_at"`
	UpdatedAt *string `gorm:"column:updated_at"`
	Expired   int64   `gorm:"column:expired"`
}

func (Itemfavi) TableName() string { return "itemfavi" }

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

type ItemQuery struct {
	UserID      int64
	Base        string
	Category    []string
	Subcategory []string
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
	Items []Item
	Total int64
}
