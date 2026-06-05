package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"lsdb-go/backend/internal/model"
)

type FavoriteRepository struct{ db *gorm.DB }

func NewFavoriteRepository(db *gorm.DB) *FavoriteRepository { return &FavoriteRepository{db: db} }

func (r *FavoriteRepository) Add(userID int64, itemID string) error {
	var favi model.Itemfavi
	err := r.db.Where("user_id = ? AND item_id = ?", userID, itemID).First(&favi).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		now := time.Now().Format("2006-01-02 15:04:05")
		return r.db.Create(&model.Itemfavi{
			UserID:    userID,
			ItemID:    parseItemID(itemID),
			Expired:   0,
			CreatedAt: &now,
			UpdatedAt: &now,
		}).Error
	}
	if err != nil {
		return err
	}
	now := time.Now().Format("2006-01-02 15:04:05")
	return r.db.Model(&favi).Updates(map[string]any{"expired": 0, "updated_at": now}).Error
}

func (r *FavoriteRepository) Remove(userID int64, itemID string) error {
	return r.db.Model(&model.Itemfavi{}).
		Where("user_id = ? AND item_id = ?", userID, itemID).
		Update("expired", 1).Error
}

func parseItemID(s string) int64 {
	var id int64
	for _, c := range s {
		if c >= '0' && c <= '9' {
			id = id*10 + int64(c-'0')
		}
	}
	return id
}
