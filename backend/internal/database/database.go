package database

import (
	"database/sql"

	_ "modernc.org/sqlite"
)

func Open(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	return db, nil
}

func Migrate(db *sql.DB) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS "user" (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at TEXT DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime')),
		updated_at TEXT DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime'))
	)`); err != nil {
		return err
	}
	hasUID, hasUserID, err := itemfaviColumns(db)
	if err != nil {
		return err
	}
	if hasUID && !hasUserID {
		_, err = db.Exec(`ALTER TABLE itemfavi RENAME COLUMN uId TO userId`)
	}
	return err
}

func itemfaviColumns(db *sql.DB) (bool, bool, error) {
	rows, err := db.Query(`PRAGMA table_info(itemfavi)`)
	if err != nil {
		return false, false, err
	}
	defer rows.Close()
	var hasUID, hasUserID bool
	for rows.Next() {
		var cid, notnull, pk int
		var name, typ string
		var dflt any
		if err := rows.Scan(&cid, &name, &typ, &notnull, &dflt, &pk); err != nil {
			return false, false, err
		}
		hasUID = hasUID || name == "uId"
		hasUserID = hasUserID || name == "userId"
	}
	return hasUID, hasUserID, rows.Err()
}
