package repository

import (
	"database/sql"

	"lsdb-go/backend/internal/model"
)

type UserRepository struct{ db *sql.DB }

func NewUserRepository(db *sql.DB) *UserRepository { return &UserRepository{db: db} }

func (r *UserRepository) Create(username, passwordHash string) (int64, error) {
	res, err := r.db.Exec(`INSERT INTO "user"(username, password_hash) VALUES(?, ?)`, username, passwordHash)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *UserRepository) FindByUsername(username string) (model.User, error) {
	var u model.User
	err := r.db.QueryRow(`SELECT id, username, password_hash FROM "user" WHERE username = ?`, username).Scan(&u.ID, &u.Username, &u.PasswordHash)
	return u, err
}
