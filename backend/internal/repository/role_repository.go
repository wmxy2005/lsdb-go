package repository

import (
	"database/sql"

	"lsdb-go/backend/internal/model"
)

type RoleRepository struct{ db *sql.DB }

func NewRoleRepository(db *sql.DB) *RoleRepository { return &RoleRepository{db: db} }

func (r *RoleRepository) Get(id string) (model.Role, error) {
	row := r.db.QueryRow(`SELECT id,date,title,name,images,remark,base FROM role WHERE id = ?`, id)
	return scanRole(row)
}

func (r *RoleRepository) List() ([]model.Role, string, error) {
	sqlText := `SELECT id,date,title,name,images,remark,base FROM role ORDER BY id DESC`
	rows, err := r.db.Query(sqlText)
	if err != nil {
		return nil, sqlText + ";", err
	}
	defer rows.Close()
	var roles []model.Role
	for rows.Next() {
		role, err := scanRole(rows)
		if err != nil {
			return nil, sqlText + ";", err
		}
		roles = append(roles, role)
	}
	return roles, sqlText + ";", rows.Err()
}

func scanRole(r scanner) (model.Role, error) {
	var role model.Role
	var date, title, name, images, remark, base sql.NullString
	if err := r.Scan(&role.ID, &date, &title, &name, &images, &remark, &base); err != nil {
		return role, err
	}
	role.Date = nullStringPtr(date)
	role.Title = nullString(title)
	role.Name = nullString(name)
	role.Images = nullString(images)
	role.Remark = nullString(remark)
	role.Base = nullString(base)
	return role, nil
}
