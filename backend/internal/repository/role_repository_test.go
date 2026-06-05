package repository

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestRoleRepositoryListForTagNames(t *testing.T) {
	db := openRoleTestGormDB(t)
	repo := NewRoleRepository(db)

	t.Run("matches tag", func(t *testing.T) {
		roles, err := repo.ListForTagNames([]string{"4k"})
		if err != nil {
			t.Fatal(err)
		}
		if len(roles) != 1 || roles[0].ID != 1 {
			t.Fatalf("roles = %#v", roles)
		}
	})

	t.Run("missing tag", func(t *testing.T) {
		roles, err := repo.ListForTagNames([]string{"missing"})
		if err != nil {
			t.Fatal(err)
		}
		if len(roles) != 0 {
			t.Fatalf("expected no roles, got %#v", roles)
		}
	})

	t.Run("dedupe tags", func(t *testing.T) {
		roles, err := repo.ListForTagNames([]string{"4k", "4k", " stream "})
		if err != nil {
			t.Fatal(err)
		}
		if len(roles) != 1 {
			t.Fatalf("roles = %#v", roles)
		}
	})

	t.Run("empty tags", func(t *testing.T) {
		roles, err := repo.ListForTagNames(nil)
		if err != nil {
			t.Fatal(err)
		}
		if len(roles) != 0 {
			t.Fatalf("roles = %#v", roles)
		}
	})

	t.Run("returns id desc order", func(t *testing.T) {
		roles, err := repo.ListForTagNames([]string{"4k", "other"})
		if err != nil {
			t.Fatal(err)
		}
		if len(roles) != 2 {
			t.Fatalf("expected 2 roles, got %#v", roles)
		}
		if roles[0].ID <= roles[1].ID {
			t.Fatalf("expected DESC order, got ids %d, %d", roles[0].ID, roles[1].ID)
		}
	})
}

func openRoleTestGormDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatal(err)
	}
	stmts := []string{
		`CREATE TABLE role (
			id integer NOT NULL PRIMARY KEY, date datetime, title TEXT, name TEXT, images TEXT, remark TEXT, base TEXT
		)`,
		`INSERT INTO role(id,date,title,name,images,remark,base) VALUES(2,NULL,'other',';other;','other@other.jpg','remark2','role2')`,
		`INSERT INTO role(id,date,title,name,images,remark,base) VALUES(1,NULL,'4k=stream',';4k;stream;','4k@4k.jpg;stream@stream.jpg','remark','role')`,
	}
	rawDB, _ := db.DB()
	for _, stmt := range stmts {
		if _, err := rawDB.Exec(stmt); err != nil {
			t.Fatal(err)
		}
	}
	return db
}
