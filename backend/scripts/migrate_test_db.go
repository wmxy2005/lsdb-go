//go:build ignore

// One-time SQLite schema fix for test.db. Does not modify application code.
// Usage (from backend/): go run scripts/migrate_test_db.go [path-to-db]
// Default path: LSDB_DB_PATH from .env (see .env.example).
package main

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/glebarez/sqlite"

	"lsdb-go/backend/internal/config"
)

func main() {
	path := config.Load().DBPath
	if len(os.Args) > 1 {
		path = os.Args[1]
	}
	db, err := sql.Open(sqlite.DriverName, path)
	if err != nil {
		fatal(err)
	}
	defer db.Close()

	cols := tableColumns(db)
	migrateItems(db, cols["items"])
	migrateItemfavi(db, cols["itemfavi"])

	fmt.Println("migration done")
	printTable(db, "items")
	printTable(db, "itemfavi")
}

func migrateItems(db *sql.DB, cols map[string]bool) {
	fmt.Println("=== migrate items ===")
	switch {
	case cols["createAt"]:
		exec(db, `ALTER TABLE items RENAME COLUMN createAt TO created_at`)
	case !cols["created_at"]:
		exec(db, `ALTER TABLE items ADD COLUMN created_at TEXT`)
	}
	switch {
	case cols["updateAt"]:
		exec(db, `ALTER TABLE items RENAME COLUMN updateAt TO updated_at`)
	case !cols["updated_at"]:
		exec(db, `ALTER TABLE items ADD COLUMN updated_at TEXT`)
	}
}

func migrateItemfavi(db *sql.DB, cols map[string]bool) {
	fmt.Println("=== migrate itemfavi ===")
	switch {
	case cols["uId"]:
		exec(db, `ALTER TABLE itemfavi RENAME COLUMN uId TO user_id`)
	case cols["userId"]:
		exec(db, `ALTER TABLE itemfavi RENAME COLUMN userId TO user_id`)
	}
	if cols["itemId"] {
		exec(db, `ALTER TABLE itemfavi RENAME COLUMN itemId TO item_id`)
	}
	if cols["datetime"] {
		exec(db, `ALTER TABLE itemfavi RENAME COLUMN datetime TO updated_at`)
	}
	if !cols["created_at"] {
		exec(db, `ALTER TABLE itemfavi ADD COLUMN created_at TEXT`)
		exec(db, `UPDATE itemfavi SET created_at = updated_at WHERE created_at IS NULL`)
	}
	ensureItemfaviUniqueIndex(db)
}

func ensureItemfaviUniqueIndex(db *sql.DB) {
	fmt.Println("=== itemfavi unique index ===")
	exec(db, `DELETE FROM itemfavi WHERE id IN (
		SELECT f1.id FROM itemfavi f1
		INNER JOIN itemfavi f2
			ON f1.user_id = f2.user_id AND f1.item_id = f2.item_id AND f1.id < f2.id
	)`)
	exec(db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_itemfavi_user_item ON itemfavi(user_id, item_id)`)
}

func tableColumns(db *sql.DB) map[string]map[string]bool {
	tables := []string{"items", "itemfavi"}
	out := map[string]map[string]bool{}
	for _, table := range tables {
		out[table] = map[string]bool{}
		rows, err := db.Query(`SELECT name FROM pragma_table_info(?)`, table)
		if err != nil {
			fatal(err)
		}
		for rows.Next() {
			var name string
			if err := rows.Scan(&name); err != nil {
				fatal(err)
			}
			out[table][name] = true
		}
		rows.Close()
	}
	return out
}

func exec(db *sql.DB, stmt string) {
	fmt.Println(" ", stmt)
	if _, err := db.Exec(stmt); err != nil {
		fatal(err)
	}
}

func printTable(db *sql.DB, table string) {
	fmt.Printf("--- %s columns ---\n", table)
	rows, err := db.Query(`SELECT cid, name, type FROM pragma_table_info(?)`, table)
	if err != nil {
		fatal(err)
	}
	for rows.Next() {
		var cid int
		var name, typ string
		rows.Scan(&cid, &name, &typ)
		fmt.Printf("  %d %s %s\n", cid, name, typ)
	}
	rows.Close()
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
