package main

import (
	"log"

	"lsdb-go/backend/internal/app"
)

func main() {
	server, err := app.New()
	if err != nil {
		log.Fatal(err)
	}
	if err := server.Run(); err != nil {
		log.Fatal(err)
	}
}
