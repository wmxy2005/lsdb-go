package database

import (
	"os"
	"path/filepath"
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
