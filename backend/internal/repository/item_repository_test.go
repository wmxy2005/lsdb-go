package repository

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"lsdb-go/backend/internal/model"
)

func openItemTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatal(err)
	}
	rawDB, _ := db.DB()
	stmts := []string{
		`CREATE TABLE items (
			id INTEGER PRIMARY KEY, base TEXT, category TEXT, subcategory TEXT, name TEXT,
			created_at TEXT, updated_at TEXT,
			title TEXT, date TEXT, thumbnail TEXT, roll TEXT, trailer TEXT,
			tag TEXT, tag2 TEXT, tag3 TEXT, extra TEXT, content TEXT, images TEXT, type INTEGER
		)`,
		`CREATE TABLE itemfavi (
			id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER DEFAULT 0, item_id INTEGER DEFAULT 0,
			created_at TEXT, updated_at TEXT, expired INTEGER DEFAULT 0
		)`,
		// Items for filter tests:
		// id=1: category=4k, tag=;4k;sky;
		`INSERT INTO items(id,base,category,subcategory,name,title,date,tag,tag2,tag3,content,images)
		 VALUES(1,'wall','4k','2026','sky','Sky','2026-01-01',';4k;sky;',';JPEG;',';HD;','content','a.png')`,
		// id=2: category=4k, tag=;plain;
		`INSERT INTO items(id,base,category,subcategory,name,title,date,tag,tag2,tag3,content,images)
		 VALUES(2,'wall','4k','2026','plain','Plain','2026-01-02',';plain;',';JPEG;',';HD;','content','b.png')`,
		// id=3: category=hd, keyword in title
		`INSERT INTO items(id,base,category,subcategory,name,title,date,tag,tag2,tag3,content,images)
		 VALUES(3,'wall','hd','2025','night','Night Sky','2026-01-03',';hd;',';PNG;','','night content','c.png')`,
	}
	for _, s := range stmts {
		if _, err := rawDB.Exec(s); err != nil {
			t.Fatal(err)
		}
	}
	return db
}

func query(t *testing.T, db *gorm.DB, q model.ItemQuery) []model.Item {
	t.Helper()
	repo := NewItemRepository(db)
	res, err := repo.List(q)
	if err != nil {
		t.Fatalf("List error: %v", err)
	}
	return res.Items
}

func ids(items []model.Item) []int64 {
	out := make([]int64, len(items))
	for i, item := range items {
		out[i] = item.ID
	}
	return out
}

func TestFiltersDefaultMatchModeUsesAnd(t *testing.T) {
	db := openItemTestDB(t)
	q := model.ItemQuery{
		Category:  []string{"4k"},
		Tag:       []string{"4k"},
		Page:      1,
		PageSize:  10,
	}
	items := query(t, db, q)
	// Category=4k AND tag=;4k;% → only id=1
	if len(items) != 1 || items[0].ID != 1 {
		t.Fatalf("expected [1], got %v", ids(items))
	}
}

func TestFiltersOrMatchModeUsesOr(t *testing.T) {
	db := openItemTestDB(t)
	for _, mode := range []string{"or", "OR", " Or "} {
		q := model.ItemQuery{
			Category:  []string{"hd"},
			Tag:       []string{"4k"},
			MatchMode: mode,
			Page:      1,
			PageSize:  10,
		}
		items := query(t, db, q)
		// OR mode: category=hd OR tag=;4k;% → id=1 (tag match) + id=3 (category match)
		if len(items) != 2 {
			t.Fatalf("mode %q: expected 2 items, got %v", mode, ids(items))
		}
	}
}

func TestFiltersScalarsStayAnd(t *testing.T) {
	db := openItemTestDB(t)
	q := model.ItemQuery{
		Base:     "wall",
		Category: []string{"4k"},
		Keyword:  []string{"sky"},
		MatchMode: "or",
		Page:     1,
		PageSize: 10,
	}
	items := query(t, db, q)
	// base=wall AND (category=4k OR name/title/content LIKE %sky%)
	// id=1: base=wall, category=4k → matches
	// id=2: base=wall, category=4k → matches category
	// id=3: base=wall, category=hd, title="Night Sky" → matches keyword but not base+category OR keyword
	// Actually: base=wall (scalar AND) + (category=4k OR keyword=sky OR mode)
	// id=1: base=wall AND (cat=4k OR name like %sky%) = wall AND (true OR true) = true → match
	// id=2: base=wall AND (cat=4k OR name like %sky%) = wall AND (true OR false) = true → match
	// id=3: base=wall AND (cat=hd: false OR name/title like %sky%: true=Night Sky) = wall AND true = true → match
	if len(items) != 3 {
		t.Fatalf("expected 3, got %v", ids(items))
	}
}

func TestFiltersSingleCategory(t *testing.T) {
	db := openItemTestDB(t)
	q := model.ItemQuery{
		Category: []string{"hd"},
		Page:     1,
		PageSize: 10,
	}
	items := query(t, db, q)
	if len(items) != 1 || items[0].ID != 3 {
		t.Fatalf("expected [3], got %v", ids(items))
	}
}

func TestFiltersSubcategory(t *testing.T) {
	db := openItemTestDB(t)
	// Single subcategory → only id=3
	if got := ids(query(t, db, model.ItemQuery{Subcategory: []string{"2025"}, Page: 1, PageSize: 10})); len(got) != 1 || got[0] != 3 {
		t.Fatalf("subcategory=2025: expected [3], got %v", got)
	}
	// Multi-value subcategory IN (...) → id=1 and id=2
	if got := ids(query(t, db, model.ItemQuery{Subcategory: []string{"2026"}, Page: 1, PageSize: 10})); len(got) != 2 {
		t.Fatalf("subcategory=2026: expected 2 items, got %v", got)
	}
	// AND with category: subcategory=2026 AND category=4k → id=1,2
	if got := ids(query(t, db, model.ItemQuery{Subcategory: []string{"2026"}, Category: []string{"4k"}, Page: 1, PageSize: 10})); len(got) != 2 {
		t.Fatalf("subcategory=2026 AND category=4k: expected 2 items, got %v", got)
	}
}

func TestFiltersKeyword(t *testing.T) {
	db := openItemTestDB(t)
	q := model.ItemQuery{
		Keyword:  []string{"night"},
		Page:     1,
		PageSize: 10,
	}
	items := query(t, db, q)
	if len(items) != 1 || items[0].ID != 3 {
		t.Fatalf("expected [3], got %v", ids(items))
	}
}

func TestFiltersKeywordMatchesTag(t *testing.T) {
	db := openItemTestDB(t)
	q := model.ItemQuery{
		Keyword:  []string{"JPEG"},
		Page:     1,
		PageSize: 10,
	}
	items := query(t, db, q)
	// JPEG only appears in tag2 (;JPEG;), not in name/title/content/extra
	if len(items) != 2 {
		t.Fatalf("expected [1,2], got %v", ids(items))
	}
}
