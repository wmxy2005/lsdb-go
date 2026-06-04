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
	if err := migrateItemTimestamps(db); err != nil {
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

func migrateItemTimestamps(db *sql.DB) error {
	columns, err := tableColumns(db, "items")
	if err != nil {
		return err
	}
	if len(columns) == 0 {
		return nil
	}
	for _, name := range []string{"createAt", "updateAt"} {
		if !columns[name] {
			if _, err := db.Exec(`ALTER TABLE items ADD COLUMN ` + name + ` TEXT`); err != nil {
				return err
			}
		}
	}
	return nil
}

func itemfaviColumns(db *sql.DB) (bool, bool, error) {
	columns, err := tableColumns(db, "itemfavi")
	if err != nil {
		return false, false, err
	}
	return columns["uId"], columns["userId"], nil
}

func tableColumns(db *sql.DB, table string) (map[string]bool, error) {
	rows, err := db.Query(`SELECT name FROM pragma_table_info(?)`, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	columns := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		columns[name] = true
	}
	return columns, rows.Err()
}
