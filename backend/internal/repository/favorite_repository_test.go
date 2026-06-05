package repository

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"lsdb-go/backend/internal/database"
	"lsdb-go/backend/internal/model"
)

func openFavoriteTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := database.Migrate(db); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestFavoriteRepositoryAddSetsTimestamps(t *testing.T) {
	db := openFavoriteTestDB(t)
	rawDB, _ := db.DB()
	defer rawDB.Close()
	if err := db.Exec(`INSERT INTO items(id,base,category,name,title) VALUES(1,'w','c','n','t')`).Error; err != nil {
		t.Fatal(err)
	}
	repo := NewFavoriteRepository(db)
	if err := repo.Add(1, "1"); err != nil {
		t.Fatal(err)
	}
	var createdAt, updatedAt string
	if err := rawDB.QueryRow(`SELECT created_at, updated_at FROM itemfavi WHERE user_id = 1 AND item_id = 1`).
		Scan(&createdAt, &updatedAt); err != nil {
		t.Fatal(err)
	}
	if createdAt == "" || updatedAt == "" {
		t.Fatalf("expected timestamps, got created_at=%q updated_at=%q", createdAt, updatedAt)
	}
}

func TestFavoriteRepositoryRestoreUpdatesUpdatedAt(t *testing.T) {
	db := openFavoriteTestDB(t)
	rawDB, _ := db.DB()
	defer rawDB.Close()
	if err := db.Exec(`INSERT INTO items(id,base,category,name,title) VALUES(1,'w','c','n','t')`).Error; err != nil {
		t.Fatal(err)
	}
	repo := NewFavoriteRepository(db)
	if err := repo.Add(1, "1"); err != nil {
		t.Fatal(err)
	}
	var firstUpdated string
	if err := rawDB.QueryRow(`SELECT updated_at FROM itemfavi WHERE user_id = 1 AND item_id = 1`).Scan(&firstUpdated); err != nil {
		t.Fatal(err)
	}
	if err := repo.Remove(1, "1"); err != nil {
		t.Fatal(err)
	}
	time.Sleep(1100 * time.Millisecond)
	if err := repo.Add(1, "1"); err != nil {
		t.Fatal(err)
	}
	var secondUpdated string
	if err := rawDB.QueryRow(`SELECT updated_at FROM itemfavi WHERE user_id = 1 AND item_id = 1`).Scan(&secondUpdated); err != nil {
		t.Fatal(err)
	}
	if secondUpdated == "" || secondUpdated == firstUpdated {
		t.Fatalf("expected updated_at to change on restore, first=%q second=%q", firstUpdated, secondUpdated)
	}
}

func TestFavoriteRepositoryAddIsIdempotent(t *testing.T) {
	db := openFavoriteTestDB(t)
	rawDB, _ := db.DB()
	defer rawDB.Close()
	if err := db.Exec(`INSERT INTO items(id,base,category,name,title) VALUES(1,'w','c','n','t')`).Error; err != nil {
		t.Fatal(err)
	}
	repo := NewFavoriteRepository(db)
	if err := repo.Add(1, "1"); err != nil {
		t.Fatal(err)
	}
	if err := repo.Add(1, "1"); err != nil {
		t.Fatal(err)
	}
	var count int64
	if err := db.Model(&model.Itemfavi{}).Where("user_id = ? AND item_id = ?", 1, 1).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("expected 1 row after duplicate Add, got %d", count)
	}
	if err := repo.Remove(1, "1"); err != nil {
		t.Fatal(err)
	}
	if err := repo.Add(1, "1"); err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&model.Itemfavi{}).Where("user_id = ? AND item_id = ?", 1, 1).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("expected 1 row after restore Add, got %d", count)
	}
}
