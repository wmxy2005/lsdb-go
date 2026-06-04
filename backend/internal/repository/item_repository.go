package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"lsdb-go/backend/internal/model"
)

type ItemRepository struct{ db *sql.DB }

type scanner interface{ Scan(dest ...any) error }

func NewItemRepository(db *sql.DB) *ItemRepository { return &ItemRepository{db: db} }

func (r *ItemRepository) List(q model.ItemQuery) (model.ItemListResult, error) {
	where, args, params := buildFilters(q)
	if q.Favi {
		where = append(where, `b.id IS NOT NULL`)
	}
	whereSQL := `a.id > 0`
	if len(where) > 0 {
		whereSQL += ` AND ` + strings.Join(where, ` AND `)
	}
	countSQL := `SELECT COUNT(1) FROM items AS a LEFT JOIN itemfavi AS b ON a.id = b.itemId AND b.userId = ? AND b.expired=0 WHERE ` + whereSQL
	countArgs := append([]any{q.UserID}, args...)
	var total int64
	if err := r.db.QueryRow(countSQL, countArgs...).Scan(&total); err != nil {
		return model.ItemListResult{}, err
	}
	offset := (q.Page - 1) * q.PageSize
	listSQL := `SELECT a.id,a.base,a.category,a.subcategory,a.name,a.createAt,a.updateAt,a.title,a.date,a.thumbnail,a.roll,a.trailer,a.tag,a.tag2,a.tag3,a.extra,a.content,a.images,a.type,b.id AS favi
		FROM items AS a LEFT JOIN itemfavi AS b ON a.id = b.itemId AND b.userId = ? AND b.expired=0
		WHERE ` + whereSQL + ` ` + sortClause(q.Sort, q.Favi) + ` LIMIT ? OFFSET ?`
	listArgs := append([]any{q.UserID}, args...)
	listArgs = append(listArgs, q.PageSize, offset)
	rows, err := r.db.Query(listSQL, listArgs...)
	if err != nil {
		return model.ItemListResult{}, err
	}
	defer rows.Close()
	var items []model.Item
	for rows.Next() {
		item, err := scanItem(rows)
		if err != nil {
			return model.ItemListResult{}, err
		}
		items = append(items, item)
	}
	return model.ItemListResult{Items: items, Total: total, CountSQL: countSQL, ListSQL: listSQL, Params: params}, rows.Err()
}

func (r *ItemRepository) Get(id string, userID int64) (model.Item, error) {
	row := r.db.QueryRow(`SELECT a.id,a.base,a.category,a.subcategory,a.name,a.createAt,a.updateAt,a.title,a.date,a.thumbnail,a.roll,a.trailer,a.tag,a.tag2,a.tag3,a.extra,a.content,a.images,a.type,b.id AS favi
		FROM items AS a LEFT JOIN itemfavi AS b ON a.id = b.itemId AND b.userId = ? AND b.expired=0
		WHERE a.id = ?`, userID, id)
	return scanItem(row)
}

func (r *ItemRepository) Create(req model.ItemWrite) (int64, error) {
	res, err := r.db.Exec(`INSERT INTO items(base,category,subcategory,name,createAt,updateAt,title,date,thumbnail,roll,trailer,tag,tag2,tag3,extra,content,images,type)
		VALUES(?,?,?,?,datetime(CURRENT_TIMESTAMP,'localtime'),datetime(CURRENT_TIMESTAMP,'localtime'),?,?,?,?,?,?,?,?,?,?,?,?)`,
		value(req.Base), value(req.Category), value(req.Subcategory), value(req.Name), value(req.Title), ptrValue(req.Date),
		ptrValue(req.Thumbnail), ptrValue(req.Roll), ptrValue(req.Trailer), value(req.TagValue()), value(req.Tag2Value()), value(req.Tag3Value()), ptrValue(req.Extra), value(req.Content), value(req.ImagesValue()), ptrIntValue(req.Type))
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *ItemRepository) Update(id string, req model.ItemWrite) error {
	fields := []string{}
	args := []any{}
	tag := req.TagValue()
	tag2 := req.Tag2Value()
	tag3 := req.Tag3Value()
	images := req.ImagesValue()
	add := func(name string, v any, ok bool) {
		if ok {
			fields = append(fields, name+" = ?")
			args = append(args, v)
		}
	}
	add("base", value(req.Base), req.Base != nil)
	add("category", value(req.Category), req.Category != nil)
	add("subcategory", value(req.Subcategory), req.Subcategory != nil)
	add("name", value(req.Name), req.Name != nil)
	add("title", value(req.Title), req.Title != nil)
	add("date", ptrValue(req.Date), req.Date != nil)
	add("thumbnail", ptrValue(req.Thumbnail), req.Thumbnail != nil)
	add("roll", ptrValue(req.Roll), req.Roll != nil)
	add("trailer", ptrValue(req.Trailer), req.Trailer != nil)
	add("tag", value(tag), tag != nil)
	add("tag2", value(tag2), tag2 != nil)
	add("tag3", value(tag3), tag3 != nil)
	add("extra", ptrValue(req.Extra), req.Extra != nil)
	add("content", value(req.Content), req.Content != nil)
	add("images", value(images), images != nil)
	add("type", ptrIntValue(req.Type), req.Type != nil)
	if len(fields) == 0 {
		return sql.ErrNoRows
	}
	fields = append(fields, `updateAt = datetime(CURRENT_TIMESTAMP,'localtime')`)
	args = append(args, id)
	_, err := r.db.Exec(`UPDATE items SET `+strings.Join(fields, ", ")+` WHERE id = ?`, args...)
	return err
}

func buildFilters(q model.ItemQuery) ([]string, []any, map[string]string) {
	var where []string
	var args []any
	params := map[string]string{}
	add := func(sqlPart string, values ...any) {
		where = append(where, sqlPart)
		args = append(args, values...)
	}
	if q.Base != "" {
		add(`a.base = ?`, q.Base)
		params[":base"] = q.Base
	}
	for _, v := range q.Category {
		add(`a.category = ?`, v)
		params[":category"] = v
	}
	if q.Subcategory != "" {
		add(`a.subcategory = ?`, q.Subcategory)
		params[":subcategory"] = q.Subcategory
	}
	for i, v := range q.Tag {
		pat := "%;" + v + ";%"
		add(`(a.tag LIKE ? OR a.tag2 LIKE ? OR a.tag3 LIKE ?)`, pat, pat, pat)
		params[fmt.Sprintf(":tag%d", i)] = pat
	}
	for i, v := range q.Keyword {
		pat := "%" + v + "%"
		add(`(a.name LIKE ? OR a.title LIKE ? OR a.content LIKE ? OR a.extra LIKE ?)`, pat, pat, pat, pat)
		params[fmt.Sprintf(":keyword%d", i)] = pat
	}
	if q.DateFrom != "" {
		add(`a.date >= ?`, q.DateFrom)
		params[":dateFrom"] = q.DateFrom
	}
	if q.DateTo != "" {
		add(`a.date <= ?`, q.DateTo)
		params[":dateTo"] = q.DateTo
	}
	if q.Type != "" {
		add(`a.type = ?`, q.Type)
		params[":type"] = q.Type
	}
	return where, args, params
}

func sortClause(sort string, isFavi bool) string {
	switch sort {
	case "date":
		if isFavi {
			return `ORDER BY b.datetime DESC, a.date DESC, a.id DESC`
		}
		return `ORDER BY a.date DESC, a.id DESC`
	case "dateAsc":
		if isFavi {
			return `ORDER BY b.datetime ASC, a.date ASC, a.id ASC`
		}
		return `ORDER BY a.date ASC, a.id ASC`
	case "idAsc":
		if isFavi {
			return `ORDER BY b.id ASC, a.id ASC`
		}
		return `ORDER BY a.id ASC`
	default:
		if isFavi {
			return `ORDER BY b.id DESC, a.id ASC`
		}
		return `ORDER BY a.id DESC`
	}
}

func scanItem(r scanner) (model.Item, error) {
	var item model.Item
	var createAt, updateAt, date, thumbnail, roll, trailer, extra, content, images, tag, tag2, tag3 sql.NullString
	var typ, favi sql.NullInt64
	err := r.Scan(&item.ID, &item.Base, &item.Category, &item.Subcategory, &item.Name, &createAt, &updateAt, &item.Title, &date, &thumbnail, &roll, &trailer, &tag, &tag2, &tag3, &extra, &content, &images, &typ, &favi)
	if err != nil {
		return item, err
	}
	item.CreateAt = nullStringPtr(createAt)
	item.UpdateAt = nullStringPtr(updateAt)
	item.Date = nullStringPtr(date)
	item.Thumbnail = nullStringPtr(thumbnail)
	item.Roll = nullStringPtr(roll)
	item.Trailer = nullStringPtr(trailer)
	item.Tag = nullString(tag)
	item.Tag2 = nullString(tag2)
	item.Tag3 = nullString(tag3)
	item.Extra = nullStringPtr(extra)
	item.Content = nullString(content)
	item.Images = nullString(images)
	if typ.Valid {
		item.Type = &typ.Int64
	}
	if favi.Valid {
		item.Favi = &favi.Int64
	}
	return item, nil
}

func nullString(v sql.NullString) string {
	if v.Valid {
		return v.String
	}
	return ""
}

func nullStringPtr(v sql.NullString) *string {
	if v.Valid {
		return &v.String
	}
	return nil
}

func value(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}

func ptrValue(v *string) any {
	if v == nil {
		return nil
	}
	return *v
}

func ptrIntValue(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}
