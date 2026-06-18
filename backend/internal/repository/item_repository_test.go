package repository

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"lsdb-go/backend/internal/database"
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
	// Pin to one connection so every statement hits the same in-memory database.
	rawDB.SetMaxOpenConns(1)
	schema := []string{
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
	}
	for _, s := range schema {
		if _, err := rawDB.Exec(s); err != nil {
			t.Fatal(err)
		}
	}
	// Build the FTS index + sync triggers so keyword/tag search behaves like prod.
	if err := database.MigrateItemsFTS(db); err != nil {
		t.Fatal(err)
	}
	rows := []string{
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
	for _, s := range rows {
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

func TestFiltersKeywordSubstringMidWord(t *testing.T) {
	db := openItemTestDB(t)
	// "igh" is a mid-word substring of "Night" (id=3 title/content) — trigram FTS
	// must still find it, matching the old LIKE '%igh%' behavior.
	items := query(t, db, model.ItemQuery{Keyword: []string{"igh"}, Page: 1, PageSize: 10})
	if len(items) != 1 || items[0].ID != 3 {
		t.Fatalf("expected [3], got %v", ids(items))
	}
}

func TestFiltersKeywordCJKSubstring(t *testing.T) {
	db := openItemTestDB(t)
	if err := db.Exec(`INSERT INTO items(id,base,category,subcategory,name,title,date,tag,tag2,tag3,content,images)
		VALUES(10,'wall','4k','2026','cn','蓝色天空','2026-02-01','','','','晴朗的蓝色天空','x.png')`).Error; err != nil {
		t.Fatal(err)
	}
	// Substring inside a run of Han characters (no word boundaries).
	items := query(t, db, model.ItemQuery{Keyword: []string{"色天空"}, Page: 1, PageSize: 10})
	if len(items) != 1 || items[0].ID != 10 {
		t.Fatalf("expected [10], got %v", ids(items))
	}
}

func TestFiltersKeywordShortFallsBackToLike(t *testing.T) {
	db := openItemTestDB(t)
	// "4k" is 2 chars, below the trigram minimum, so it must use the LIKE fallback.
	// It appears in id=1's tag (;4k;sky;).
	items := query(t, db, model.ItemQuery{Keyword: []string{"4k"}, Page: 1, PageSize: 10})
	if len(items) != 1 || items[0].ID != 1 {
		t.Fatalf("expected [1], got %v", ids(items))
	}
}

func TestFiltersKeywordReflectsUpdate(t *testing.T) {
	db := openItemTestDB(t)
	repo := NewItemRepository(db)

	if got := ids(query(t, db, model.ItemQuery{Keyword: []string{"zebra"}, Page: 1, PageSize: 10})); len(got) != 0 {
		t.Fatalf("pre-update expected none, got %v", got)
	}

	title := "zebra crossing"
	if err := repo.Update("3", model.ItemWrite{Title: &title}); err != nil {
		t.Fatal(err)
	}

	// The AFTER UPDATE trigger must have re-synced the FTS index.
	got := ids(query(t, db, model.ItemQuery{Keyword: []string{"zebra"}, Page: 1, PageSize: 10}))
	if len(got) != 1 || got[0] != 3 {
		t.Fatalf("post-update expected [3], got %v", got)
	}
}

func TestFiltersTagExactMembership(t *testing.T) {
	db := openItemTestDB(t)
	// "sky" is a member of id=1's tag (;4k;sky;).
	if got := ids(query(t, db, model.ItemQuery{Tag: []string{"sky"}, Page: 1, PageSize: 10})); len(got) != 1 || got[0] != 1 {
		t.Fatalf("tag=sky expected [1], got %v", got)
	}
	// "4" is NOT a member (only ;4k; exists) — must not match as a prefix.
	if got := ids(query(t, db, model.ItemQuery{Tag: []string{"4"}, Page: 1, PageSize: 10})); len(got) != 0 {
		t.Fatalf("tag=4 expected none (exact membership, not prefix), got %v", got)
	}
}

func TestFiltersTagIsColumnRestricted(t *testing.T) {
	db := openItemTestDB(t)
	// id=20: ";solo;" appears only in content, never as a tag.
	if err := db.Exec(`INSERT INTO items(id,base,category,subcategory,name,title,date,tag,tag2,tag3,content,images)
		VALUES(20,'wall','4k','2026','c','t','2026-03-01',';other;','','','has ;solo; in content','z.png')`).Error; err != nil {
		t.Fatal(err)
	}
	// A tag filter must look only at tag columns, so "solo" matches nothing.
	if got := ids(query(t, db, model.ItemQuery{Tag: []string{"solo"}, Page: 1, PageSize: 10})); len(got) != 0 {
		t.Fatalf("tag=solo expected none (content-only), got %v", got)
	}
	// A real tag on the same row still matches.
	if got := ids(query(t, db, model.ItemQuery{Tag: []string{"other"}, Page: 1, PageSize: 10})); len(got) != 1 || got[0] != 20 {
		t.Fatalf("tag=other expected [20], got %v", got)
	}
}
