package repository

import (
	"gorm.io/gorm"

	"lsdb-go/backend/internal/model"
)

type UserRepository struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) *UserRepository { return &UserRepository{db: db} }

func (r *UserRepository) Create(username, passwordHash string) (int64, error) {
	u := model.User{Username: username, PasswordHash: passwordHash}
	result := r.db.Create(&u)
	return u.ID, result.Error
}

func (r *UserRepository) FindByUsername(username string) (model.User, error) {
	var u model.User
	err := r.db.Where("username = ?", username).First(&u).Error
	return u, err
}
