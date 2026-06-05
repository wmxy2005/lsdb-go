package repository

import (
	"strings"

	"gorm.io/gorm"

	"lsdb-go/backend/internal/model"
)

type RoleRepository struct{ db *gorm.DB }

func NewRoleRepository(db *gorm.DB) *RoleRepository { return &RoleRepository{db: db} }

func (r *RoleRepository) Get(id string) (model.Role, error) {
	var role model.Role
	err := r.db.Where("id = ?", id).First(&role).Error
	return role, err
}

func (r *RoleRepository) List() ([]model.Role, error) {
	var roles []model.Role
	err := r.db.Order("id DESC").Find(&roles).Error
	return roles, err
}

func (r *RoleRepository) ListForTagNames(tags []string) ([]model.Role, error) {
	seen := map[string]bool{}
	var conds []string
	var args []any
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag == "" || seen[tag] {
			continue
		}
		seen[tag] = true
		conds = append(conds, "name LIKE ?")
		args = append(args, "%;"+tag+";%")
	}
	if len(conds) == 0 {
		return []model.Role{}, nil
	}
	var roles []model.Role
	err := r.db.Where(strings.Join(conds, " OR "), args...).Order("id DESC").Find(&roles).Error
	return roles, err
}
