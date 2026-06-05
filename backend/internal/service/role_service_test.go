package service

import (
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"lsdb-go/backend/internal/repository"
)

func TestRoleServiceListForTags(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatal(err)
	}
	rawDB, _ := db.DB()
	if _, err := rawDB.Exec(`CREATE TABLE role (
		id integer NOT NULL PRIMARY KEY, date datetime, title TEXT, name TEXT, images TEXT, remark TEXT, base TEXT
	)`); err != nil {
		t.Fatal(err)
	}
	if _, err := rawDB.Exec(`INSERT INTO role(id,date,title,name,images,remark,base)
		VALUES(1,NULL,'4k=stream',';4k;stream;','4k@4k.jpg;stream@stream.jpg','remark','role')`); err != nil {
		t.Fatal(err)
	}

	svc := NewRoleService(repository.NewRoleRepository(db), NewResourceService(t.TempDir()))
	out, err := svc.ListForTags([]string{"4k"})
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 1 {
		t.Fatalf("out = %#v", out)
	}
	if out[0]["name"] != "4k" || out[0]["tagIndex"] != 1 {
		t.Fatalf("entry = %#v", out[0])
	}
	imageSrc, _ := out[0]["imageSrc"].(string)
	if !strings.Contains(imageSrc, "/api/resource?") || !strings.Contains(imageSrc, "filename=4k.jpg") {
		t.Fatalf("imageSrc = %q", imageSrc)
	}
}
