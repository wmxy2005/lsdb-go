package database

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"lsdb-go/backend/internal/model"
	"lsdb-go/backend/internal/repository"
)

func TestMigrateCreatesAllTablesOnEmptyDB(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "empty.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	m := db.Migrator()
	for _, table := range []string{"user", "items", "role", "itemfavi"} {
		if !m.HasTable(table) {
			t.Fatalf("expected table %q to exist", table)
		}
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatal(err)
	}
}

func TestMigrateCreatesItemfaviUniqueIndex(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "empty.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	if !db.Migrator().HasIndex(&model.Itemfavi{}, "idx_itemfavi_user_item") {
		t.Fatal("expected idx_itemfavi_user_item unique index on itemfavi")
	}
}

func TestOpenEnablesWAL(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "wal.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()

	var mode string
	if err := db.Raw("PRAGMA journal_mode").Scan(&mode).Error; err != nil {
		t.Fatal(err)
	}
	if !strings.EqualFold(mode, "wal") {
		t.Fatalf("journal_mode = %q, want wal", mode)
	}
}

func TestMigrateCreatesItemFilterIndexes(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "idx.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}

	m := db.Migrator()
	for _, field := range []string{"Base", "Category", "Subcategory", "Date", "Type"} {
		if !m.HasIndex(&model.Item{}, field) {
			t.Fatalf("expected an index covering items.%s", field)
		}
	}
}

func TestMigrateThenSeedRoleQuery(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`INSERT INTO role(id,date,title,name,images,remark,base)
		VALUES(1,NULL,'4k=stream',';4k;stream;','4k@4k.jpg;stream@stream.jpg','remark','role')`).Error; err != nil {
		t.Fatal(err)
	}
	repo := repository.NewRoleRepository(db)
	roles, err := repo.ListForTagNames([]string{"4k"})
	if err != nil {
		t.Fatal(err)
	}
	if len(roles) != 1 {
		t.Fatalf("expected 1 role, got %d", len(roles))
	}
}

// TestMigrateItemsFTSBackfillsPreexistingRows guards the production path: an
// items table that already holds rows BEFORE the FTS index is created. The index
// must be backfilled so keyword/tag MATCH finds those rows. (Regression: the
// backfill used to be gated on a SELECT against the external-content FTS table,
// which always reported rows and so skipped the backfill, leaving MATCH empty.)
func TestMigrateItemsFTSBackfillsPreexistingRows(t *testing.T) {
	dir := t.TempDir()
	db, err := Open(filepath.Join(dir, "backfill.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()

	// Mirror the real schema: id is a table-constraint primary key, table made
	// outside GORM, and rows exist before any FTS objects.
	if err := db.Exec(`CREATE TABLE items (
		id INTEGER, base TEXT, category TEXT, subcategory TEXT, name TEXT,
		created_at TEXT, updated_at TEXT, title TEXT, date TEXT, thumbnail TEXT,
		roll TEXT, trailer TEXT, tag TEXT, tag2 TEXT, tag3 TEXT, extra TEXT,
		content TEXT, images TEXT, type INTEGER, favi INTEGER,
		PRIMARY KEY(id))`).Error; err != nil {
		t.Fatal(err)
	}
	seed := []string{
		`INSERT INTO items(id,name,title,content,tag,tag2,tag3) VALUES (1,'n','Hello World','body text',';alpha;beta;','','')`,
		`INSERT INTO items(id,name,title,content,tag,tag2,tag3) VALUES (2,'n','蓝色天空','晴朗的天空',';风景;','','')`,
	}
	for _, s := range seed {
		if err := db.Exec(s).Error; err != nil {
			t.Fatal(err)
		}
	}

	if err := MigrateItemsFTS(db); err != nil {
		t.Fatal(err)
	}

	match := func(q string) int64 {
		var n int64
		if err := db.Raw(`SELECT count(*) FROM items WHERE id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH ?)`, q).Scan(&n).Error; err != nil {
			t.Fatalf("match %q: %v", q, err)
		}
		return n
	}
	if got := match(`"World"`); got != 1 {
		t.Errorf(`keyword "World" not backfilled: got %d want 1`, got)
	}
	if got := match(`"蓝色天"`); got != 1 {
		t.Errorf("cjk keyword not backfilled: got %d want 1", got)
	}
	if got := match(`{tag tag2 tag3} : ";alpha;"`); got != 1 {
		t.Errorf("tag not backfilled: got %d want 1", got)
	}

	// Idempotent: a second migration must neither wipe nor duplicate the index.
	if err := MigrateItemsFTS(db); err != nil {
		t.Fatal(err)
	}
	if got := match(`"World"`); got != 1 {
		t.Errorf("after second migrate: got %d want 1", got)
	}
}
