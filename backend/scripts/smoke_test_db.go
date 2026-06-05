//go:build ignore

// Usage (from backend/): go run scripts/smoke_test_db.go [path-to-db]
// Default path: LSDB_DB_PATH from .env (see .env.example).
package main

import (
	"fmt"
	"os"

	"lsdb-go/backend/internal/config"
	"lsdb-go/backend/internal/database"
	"lsdb-go/backend/internal/model"
	"lsdb-go/backend/internal/repository"
)

func main() {
	path := config.Load().DBPath
	if len(os.Args) > 1 {
		path = os.Args[1]
	}
	db, err := database.Open(path)
	if err != nil {
		panic(err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()

	repo := repository.NewItemRepository(db)
	res, err := repo.List(model.ItemQuery{UserID: 1, Page: 1, PageSize: 5})
	if err != nil {
		panic(err)
	}
	fmt.Printf("list ok: total=%d rows=%d\n", res.Total, len(res.Items))
	if len(res.Items) > 0 {
		fmt.Printf("first item id=%d created_at=%v updated_at=%v\n",
			res.Items[0].ID, res.Items[0].CreatedAt, res.Items[0].UpdatedAt)
	}

	favi := repository.NewFavoriteRepository(db)
	if err := favi.Add(1, fmt.Sprint(res.Items[0].ID)); err != nil {
		fmt.Println("favorite add:", err)
	} else {
		fmt.Println("favorite add ok")
	}
}
