package database

import (
	"runtime"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"lsdb-go/backend/internal/model"
)

// sqlitePragmas are applied to every pooled connection via the DSN.
// WAL enables concurrent readers alongside a single writer; busy_timeout
// makes writers wait for the lock instead of failing with "database is
// locked"; the rest trade a little durability/RAM for throughput.
const sqlitePragmas = "_pragma=journal_mode(WAL)" +
	"&_pragma=busy_timeout(5000)" +
	"&_pragma=synchronous(NORMAL)" +
	"&_pragma=cache_size(-65536)" + // 64MB page cache (negative = KiB)
	"&_pragma=temp_store(MEMORY)" +
	"&_pragma=foreign_keys(ON)"

func Open(path string) (*gorm.DB, error) {
	inMemory := isInMemory(path)
	dsn := path
	if !inMemory {
		dsn = withPragmas(path)
	}
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	if inMemory {
		// Each new connection to an in-memory DB is a *separate* database,
		// so the pool must stay at a single connection.
		sqlDB.SetMaxOpenConns(1)
		return db, nil
	}
	// WAL allows many concurrent readers; writes still serialize and wait
	// out the lock via busy_timeout.
	n := runtime.NumCPU()
	if n < 4 {
		n = 4
	}
	sqlDB.SetMaxOpenConns(n)
	sqlDB.SetMaxIdleConns(n)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)
	return db, nil
}

func withPragmas(path string) string {
	sep := "?"
	if strings.Contains(path, "?") {
		sep = "&"
	}
	return path + sep + sqlitePragmas
}

func isInMemory(path string) bool {
	return strings.Contains(path, ":memory:") ||
		strings.Contains(strings.ToLower(path), "mode=memory")
}

func Migrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&model.User{},
		&model.Item{},
		&model.Role{},
		&model.Itemfavi{},
	); err != nil {
		return err
	}
	return MigrateItemsFTS(db)
}

// itemsFTSDDL builds the trigram FTS5 index over the items text columns plus
// the triggers that keep it in sync. content='items' makes it an external-content
// index (stores the index, not a second copy of the text); the trigram tokenizer
// gives substring matching (including CJK), matching the old LIKE '%term%' search.
var itemsFTSDDL = []string{
	`CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
		name, title, content, extra, tag, tag2, tag3,
		content='items', content_rowid='id', tokenize='trigram'
	)`,
	`CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
		INSERT INTO items_fts(rowid, name, title, content, extra, tag, tag2, tag3)
		VALUES (new.id, new.name, new.title, new.content, new.extra, new.tag, new.tag2, new.tag3);
	END`,
	`CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
		INSERT INTO items_fts(items_fts, rowid, name, title, content, extra, tag, tag2, tag3)
		VALUES ('delete', old.id, old.name, old.title, old.content, old.extra, old.tag, old.tag2, old.tag3);
	END`,
	`CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
		INSERT INTO items_fts(items_fts, rowid, name, title, content, extra, tag, tag2, tag3)
		VALUES ('delete', old.id, old.name, old.title, old.content, old.extra, old.tag, old.tag2, old.tag3);
		INSERT INTO items_fts(rowid, name, title, content, extra, tag, tag2, tag3)
		VALUES (new.id, new.name, new.title, new.content, new.extra, new.tag, new.tag2, new.tag3);
	END`,
}

// MigrateItemsFTS creates the items_fts trigram index and sync triggers, then
// backfills the index once from existing rows. Idempotent: safe to call on every
// startup. The one-time backfill only runs when items exist but the index has no
// documents yet.
func MigrateItemsFTS(db *gorm.DB) error {
	for _, stmt := range itemsFTSDDL {
		if err := db.Exec(stmt).Error; err != nil {
			return err
		}
	}
	itemsExist, err := anyRows(db, "items")
	if err != nil {
		return err
	}
	if !itemsExist {
		return nil
	}
	// Is the index actually populated? A plain "SELECT ... FROM items_fts" reads
	// the external content table, so it reports rows even when the index is empty
	// — useless as a signal. The %_docsize shadow table holds one row per indexed
	// document and is the reliable check (also self-heals an empty index left by
	// an earlier failed/skipped backfill).
	var indexed int64
	if err := db.Raw("SELECT count(*) FROM items_fts_docsize").Scan(&indexed).Error; err != nil {
		return err
	}
	if indexed > 0 {
		return nil // already populated; triggers keep it in sync from here
	}
	// Backfill existing rows exactly the way the AFTER INSERT trigger does.
	// NOTE: do NOT use FTS5 'rebuild' — with this driver's external-content
	// tables it inserts rows but indexes no terms, so MATCH finds nothing.
	return db.Exec(`INSERT INTO items_fts(rowid, name, title, content, extra, tag, tag2, tag3)
		SELECT id, name, title, content, extra, tag, tag2, tag3 FROM items`).Error
}

// anyRows cheaply reports whether table holds at least one row. table is a fixed
// internal identifier (not user input), so interpolation here is safe.
func anyRows(db *gorm.DB, table string) (bool, error) {
	var n int64
	err := db.Raw("SELECT count(*) FROM (SELECT 1 FROM " + table + " LIMIT 1)").Scan(&n).Error
	return n > 0, err
}
