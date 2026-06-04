package app

import (
	"database/sql"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/config"
	"lsdb-go/backend/internal/database"
	"lsdb-go/backend/internal/handler"
	"lsdb-go/backend/internal/middleware"
	"lsdb-go/backend/internal/repository"
	"lsdb-go/backend/internal/service"
)

type Server struct {
	DB     *sql.DB
	Router *gin.Engine
	cfg    config.Config
}

func New() (*Server, error) {
	cfg := config.Load()
	db, err := database.Open(cfg.DBPath)
	if err != nil {
		return nil, err
	}
	if err := database.Migrate(db); err != nil {
		db.Close()
		return nil, err
	}

	userRepo := repository.NewUserRepository(db)
	itemRepo := repository.NewItemRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	favoriteRepo := repository.NewFavoriteRepository(db)

	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpireDays, cfg.JWTRefreshDays)
	commandSvc := service.NewCommandService(cfg.FileRoot)
	resourceSvc := service.NewResourceService(cfg.FileRoot)
	roleSvc := service.NewRoleService(roleRepo, resourceSvc)
	itemSvc := service.NewItemService(itemRepo, roleSvc, resourceSvc)
	favoriteSvc := service.NewFavoriteService(favoriteRepo)

	authHandler := handler.NewAuthHandler(authSvc)
	commandHandler := handler.NewCommandHandler(commandSvc)
	itemHandler := handler.NewItemHandler(itemSvc, favoriteSvc)
	roleHandler := handler.NewRoleHandler(roleSvc)
	resourceHandler := handler.NewResourceHandler(resourceSvc)

	r := gin.Default()
	r.POST("/api/auth/register", authHandler.Register)
	r.POST("/api/auth/login", authHandler.Login)
	r.GET("/api/resource", resourceHandler.Get)

	api := r.Group("/api")
	api.Use(middleware.AuthRequired(authSvc))
	api.GET("/auth/current", authHandler.Current)
	api.POST("/auth/logout", authHandler.Logout)
	api.POST("/cmd/:type", commandHandler.Run)
	api.POST("/resource", resourceHandler.Upload)
	api.DELETE("/resource", resourceHandler.Delete)
	api.GET("/items", itemHandler.List)
	api.GET("/items/:id", itemHandler.Get)
	api.POST("/items", itemHandler.Create)
	api.PUT("/items/:id", itemHandler.Update)
	api.GET("/favorites", itemHandler.Favorites)
	api.POST("/items/:id/favorite", itemHandler.AddFavorite)
	api.DELETE("/items/:id/favorite", itemHandler.RemoveFavorite)
	api.GET("/role/:roleId", roleHandler.Get)

	registerFrontend(r, cfg.FrontendDist)

	return &Server{DB: db, Router: r, cfg: cfg}, nil
}

func (s *Server) Run() error {
	return s.Router.Run(s.cfg.Addr)
}

func registerFrontend(r *gin.Engine, dist string) {
	dist = strings.TrimSpace(dist)
	if dist == "" {
		return
	}
	distAbs, err := filepath.Abs(dist)
	if err != nil {
		return
	}
	info, err := os.Stat(distAbs)
	if err != nil || !info.IsDir() {
		return
	}
	indexPath := filepath.Join(distAbs, "index.html")
	if info, err := os.Stat(indexPath); err != nil || info.IsDir() {
		return
	}

	r.NoRoute(func(c *gin.Context) {
		requestPath := c.Request.URL.Path
		if requestPath == "/api" || strings.HasPrefix(requestPath, "/api/") {
			c.Status(http.StatusNotFound)
			return
		}

		if path, ok := frontendFilePath(distAbs, requestPath); ok {
			http.ServeFile(c.Writer, c.Request, path)
			return
		}
		http.ServeFile(c.Writer, c.Request, indexPath)
	})
}

func frontendFilePath(distAbs, requestPath string) (string, bool) {
	rel := strings.TrimPrefix(requestPath, "/")
	rel = filepath.Clean(filepath.FromSlash(rel))
	if rel == "." {
		return "", false
	}
	if strings.HasPrefix(rel, "..") || filepath.IsAbs(rel) {
		return "", false
	}
	path := filepath.Join(distAbs, rel)
	pathAbs, err := filepath.Abs(path)
	if err != nil {
		return "", false
	}
	within, err := filepath.Rel(distAbs, pathAbs)
	if err != nil || strings.HasPrefix(within, "..") || filepath.IsAbs(within) {
		return "", false
	}
	info, err := os.Stat(pathAbs)
	if err != nil || info.IsDir() {
		return "", false
	}
	return pathAbs, true
}
