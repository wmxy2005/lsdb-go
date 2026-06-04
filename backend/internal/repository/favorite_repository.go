package repository

import (
	"database/sql"
	"errors"
)

type FavoriteRepository struct{ db *sql.DB }

func NewFavoriteRepository(db *sql.DB) *FavoriteRepository { return &FavoriteRepository{db: db} }

func (r *FavoriteRepository) Add(userID int64, itemID string) error {
	var id int64
	err := r.db.QueryRow(`SELECT id FROM itemfavi WHERE userId = ? AND itemId = ?`, userID, itemID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		_, err = r.db.Exec(`INSERT INTO itemfavi(userId, itemId, expired) VALUES(?, ?, 0)`, userID, itemID)
	} else if err == nil {
		_, err = r.db.Exec(`UPDATE itemfavi SET expired = 0, datetime = datetime(CURRENT_TIMESTAMP,'localtime') WHERE id = ?`, id)
	}
	return err
}

func (r *FavoriteRepository) Remove(userID int64, itemID string) error {
	_, err := r.db.Exec(`UPDATE itemfavi SET expired = 1 WHERE userId = ? AND itemId = ?`, userID, itemID)
	return err
}
