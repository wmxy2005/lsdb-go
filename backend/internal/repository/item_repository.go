package repository

import (
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"gorm.io/gorm"

	"lsdb-go/backend/internal/model"
)

type ItemRepository struct{ db *gorm.DB }

func NewItemRepository(db *gorm.DB) *ItemRepository { return &ItemRepository{db: db} }

func (r *ItemRepository) List(q model.ItemQuery) (model.ItemListResult, error) {
	tx := r.db.Table("items AS a").
		Joins("LEFT JOIN itemfavi AS b ON a.id = b.item_id AND b.user_id = ? AND b.expired = 0", q.UserID).
		Where("a.id > 0")
	tx = applyFilters(r.db, tx, q)
	if q.Favi {
		tx = tx.Where("b.id IS NOT NULL")
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return model.ItemListResult{}, err
	}

	offset := (q.Page - 1) * q.PageSize
	var items []model.Item
	err := tx.Select("a.*, b.id AS favi").
		Order(sortClause(q.Sort, q.Favi)).
		Limit(q.PageSize).
		Offset(offset).
		Scan(&items).Error
	if err != nil {
		return model.ItemListResult{}, err
	}
	return model.ItemListResult{Items: items, Total: total}, nil
}

func (r *ItemRepository) Get(id string, userID int64) (model.Item, error) {
	var item model.Item
	err := r.db.Table("items AS a").
		Joins("LEFT JOIN itemfavi AS b ON a.id = b.item_id AND b.user_id = ? AND b.expired = 0", userID).
		Select("a.*, b.id AS favi").
		Where("a.id = ?", id).
		Scan(&item).Error
	if err != nil {
		return model.Item{}, err
	}
	if item.ID == 0 {
		return model.Item{}, gorm.ErrRecordNotFound
	}
	return item, nil
}

func (r *ItemRepository) Create(req model.ItemWrite) (int64, error) {
	now := time.Now().Format("2006-01-02 15:04:05")
	fields := map[string]any{
		"base":        derefStr(req.Base),
		"category":    derefStr(req.Category),
		"subcategory": derefStr(req.Subcategory),
		"name":        derefStr(req.Name),
		"created_at":  now,
		"updated_at":  now,
		"title":       derefStr(req.Title),
		"date":        req.Date,
		"thumbnail":   req.Thumbnail,
		"roll":        req.Roll,
		"trailer":     req.Trailer,
		"tag":         strOrEmpty(req.TagValue()),
		"tag2":        strOrEmpty(req.Tag2Value()),
		"tag3":        strOrEmpty(req.Tag3Value()),
		"extra":       req.Extra,
		"content":     derefStr(req.Content),
		"images":      strOrEmpty(req.ImagesValue()),
		"type":        req.Type,
	}
	result := r.db.Table("items").Create(fields)
	if result.Error != nil {
		return 0, result.Error
	}
	var id int64
	r.db.Table("items").Order("id DESC").Limit(1).Pluck("id", &id)
	return id, nil
}

func (r *ItemRepository) Update(id string, req model.ItemWrite) error {
	tag := req.TagValue()
	tag2 := req.Tag2Value()
	tag3 := req.Tag3Value()
	images := req.ImagesValue()
	fields := map[string]any{
		"updated_at": time.Now().Format("2006-01-02 15:04:05"),
	}
	addField := func(name string, v any, ok bool) {
		if ok {
			fields[name] = v
		}
	}
	addField("base", derefStr(req.Base), req.Base != nil)
	addField("category", derefStr(req.Category), req.Category != nil)
	addField("subcategory", derefStr(req.Subcategory), req.Subcategory != nil)
	addField("name", derefStr(req.Name), req.Name != nil)
	addField("title", derefStr(req.Title), req.Title != nil)
	addField("date", req.Date, req.Date != nil)
	addField("thumbnail", req.Thumbnail, req.Thumbnail != nil)
	addField("roll", req.Roll, req.Roll != nil)
	addField("trailer", req.Trailer, req.Trailer != nil)
	addField("tag", strOrEmpty(tag), tag != nil)
	addField("tag2", strOrEmpty(tag2), tag2 != nil)
	addField("tag3", strOrEmpty(tag3), tag3 != nil)
	addField("extra", req.Extra, req.Extra != nil)
	addField("content", derefStr(req.Content), req.Content != nil)
	addField("images", strOrEmpty(images), images != nil)
	addField("type", req.Type, req.Type != nil)
	if len(fields) == 1 {
		return gorm.ErrRecordNotFound
	}
	return r.db.Table("items").Where("id = ?", id).Updates(fields).Error
}

// applyFilters applies scalar and text-group filters from q to tx.
// baseDB is used to create sub-condition groups for OR mode.
func applyFilters(baseDB *gorm.DB, tx *gorm.DB, q model.ItemQuery) *gorm.DB {
	if q.Base != "" {
		tx = tx.Where("a.base = ?", q.Base)
	}
	if q.DateFrom != "" {
		tx = tx.Where("a.date >= ?", q.DateFrom)
	}
	if q.DateTo != "" {
		tx = tx.Where("a.date <= ?", q.DateTo)
	}
	if q.Type != "" {
		tx = tx.Where("a.type = ?", q.Type)
	}

	type cond struct {
		sql  string
		args []any
	}
	var textConds []cond
	if len(q.Category) > 0 {
		placeholders := strings.Repeat("?,", len(q.Category))
		placeholders = placeholders[:len(placeholders)-1]
		args := make([]any, len(q.Category))
		for i, v := range q.Category {
			args[i] = v
		}
		textConds = append(textConds, cond{fmt.Sprintf("a.category IN (%s)", placeholders), args})
	}
	if len(q.Subcategory) > 0 {
		placeholders := strings.Repeat("?,", len(q.Subcategory))
		placeholders = placeholders[:len(placeholders)-1]
		args := make([]any, len(q.Subcategory))
		for i, v := range q.Subcategory {
			args[i] = v
		}
		textConds = append(textConds, cond{fmt.Sprintf("a.subcategory IN (%s)", placeholders), args})
	}
	for _, v := range q.Tag {
		// Exact tag membership via FTS: match the wrapped token ;v; restricted to
		// the tag columns. The ;..; wrapper is always >=3 chars, so trigram always
		// applies — no length fallback needed. Same result as LIKE '%;v;%'.
		textConds = append(textConds, cond{"a.id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH ?)", []any{ftsTagQuery(v)}})
	}
	for _, v := range q.Keyword {
		// Trigram FTS needs >=3 characters; shorter terms fall back to a LIKE scan.
		if utf8.RuneCountInString(v) >= 3 {
			textConds = append(textConds, cond{"a.id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH ?)", []any{ftsMatchQuery(v)}})
			continue
		}
		pat := "%" + v + "%"
		textConds = append(textConds, cond{"(a.name LIKE ? OR a.title LIKE ? OR a.content LIKE ? OR a.extra LIKE ? OR a.tag LIKE ? OR a.tag2 LIKE ? OR a.tag3 LIKE ?)", []any{pat, pat, pat, pat, pat, pat, pat}})
	}

	if len(textConds) == 0 {
		return tx
	}

	if strings.EqualFold(strings.TrimSpace(q.MatchMode), "or") {
		grp := baseDB.Where(textConds[0].sql, textConds[0].args...)
		for _, c := range textConds[1:] {
			grp = grp.Or(c.sql, c.args...)
		}
		tx = tx.Where(grp)
	} else {
		for _, c := range textConds {
			tx = tx.Where(c.sql, c.args...)
		}
	}
	return tx
}

func sortClause(sort string, isFavi bool) string {
	switch sort {
	case "date":
		if isFavi {
			return `b.updated_at DESC, a.date DESC, a.id DESC`
		}
		return `a.date DESC, a.id DESC`
	case "dateAsc":
		if isFavi {
			return `b.updated_at ASC, a.date ASC, a.id ASC`
		}
		return `a.date ASC, a.id ASC`
	case "idAsc":
		if isFavi {
			return `b.id ASC, a.id ASC`
		}
		return `a.id ASC`
	default:
		if isFavi {
			return `b.id DESC, a.id ASC`
		}
		return `a.id DESC`
	}
}

// ftsMatchQuery wraps a term as an FTS5 string literal so the trigram matcher
// treats punctuation and query operators (", *, OR, NEAR, ...) as literal text,
// preserving plain substring search semantics.
func ftsMatchQuery(v string) string {
	return `"` + strings.ReplaceAll(v, `"`, `""`) + `"`
}

// ftsTagQuery builds a column-restricted FTS5 query matching the wrapped token
// ;v; only within the tag columns, reproducing LIKE '%;v;%' exact membership.
func ftsTagQuery(v string) string {
	return `{tag tag2 tag3} : ` + ftsMatchQuery(";"+v+";")
}

func derefStr(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}

func strOrEmpty(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}
