//go:build ignore

// Usage (from backend/): go run scripts/verify_test_db.go [path-to-db]
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
		panic(err)
	}
	defer db.Close()

	var itemCount, faviCount int
	db.QueryRow(`SELECT COUNT(*) FROM items`).Scan(&itemCount)
	db.QueryRow(`SELECT COUNT(*) FROM itemfavi`).Scan(&faviCount)
	fmt.Printf("items=%d itemfavi=%d\n", itemCount, faviCount)

	rows, err := db.Query(`SELECT id, created_at, updated_at FROM items LIMIT 3`)
	if err != nil {
		panic(err)
	}
	for rows.Next() {
		var id int
		var created, updated sql.NullString
		rows.Scan(&id, &created, &updated)
		fmt.Printf("item %d created_at=%v updated_at=%v\n", id, created.String, updated.String)
	}
	rows.Close()

	rows, err = db.Query(`SELECT id, user_id, item_id, created_at, updated_at, expired FROM itemfavi LIMIT 3`)
	if err != nil {
		panic(err)
	}
	for rows.Next() {
		var id, userID, itemID, expired int
		var created, updated sql.NullString
		rows.Scan(&id, &userID, &itemID, &created, &updated, &expired)
		fmt.Printf("favi %d user_id=%d item_id=%d created_at=%v updated_at=%v expired=%d\n",
			id, userID, itemID, created.String, updated.String, expired)
	}
	rows.Close()
}
