package handler

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/middleware"
	"lsdb-go/backend/internal/model"
	"lsdb-go/backend/internal/response"
	"lsdb-go/backend/internal/service"
)

type ItemHandler struct {
	items     *service.ItemService
	favorites *service.FavoriteService
}

func NewItemHandler(items *service.ItemService, favorites *service.FavoriteService) *ItemHandler {
	return &ItemHandler{items: items, favorites: favorites}
}

func (h *ItemHandler) List(c *gin.Context) {
	data, err := h.items.List(itemQuery(c))
	if err != nil {
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}
	response.OK(c, data)
}

func (h *ItemHandler) Get(c *gin.Context) {
	data, err := h.items.Get(c.Param("id"), middleware.CurrentUserID(c))
	if err != nil {
		status := http.StatusInternalServerError
		code := 500
		msg := err.Error()
		if errors.Is(err, sql.ErrNoRows) {
			status, code, msg = http.StatusNotFound, 404, "item not found"
		}
		response.Fail(c, status, code, msg)
		return
	}
	response.OK(c, data)
}

func (h *ItemHandler) Create(c *gin.Context) {
	var req model.ItemWrite
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "invalid request")
		return
	}
	data, err := h.items.Create(req, middleware.CurrentUserID(c))
	if err != nil {
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}
	response.OK(c, data)
}

func (h *ItemHandler) Update(c *gin.Context) {
	var req model.ItemWrite
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "invalid request")
		return
	}
	data, err := h.items.Update(c.Param("id"), req, middleware.CurrentUserID(c))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			response.Fail(c, http.StatusBadRequest, 400, "no fields to update")
			return
		}
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}
	response.OK(c, data)
}

func (h *ItemHandler) Favorites(c *gin.Context) {
	c.Request.URL.RawQuery = mergeQuery(c.Request.URL.RawQuery, "favi=true")
	h.List(c)
}

func (h *ItemHandler) AddFavorite(c *gin.Context) {
	itemID := c.Param("id")
	if err := h.favorites.Add(middleware.CurrentUserID(c), itemID); err != nil {
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}
	response.OK(c, gin.H{"itemId": itemID, "isFavi": true})
}

func (h *ItemHandler) RemoveFavorite(c *gin.Context) {
	itemID := c.Param("id")
	if err := h.favorites.Remove(middleware.CurrentUserID(c), itemID); err != nil {
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}
	response.OK(c, gin.H{"itemId": itemID, "isFavi": false})
}

func itemQuery(c *gin.Context) model.ItemQuery {
	pageSize := positiveInt(c.DefaultQuery("pageSize", "20"), 20)
	if pageSize > 100 {
		pageSize = 100
	}
	page := c.DefaultQuery("page", c.DefaultQuery("current", "1"))
	return model.ItemQuery{
		UserID:      middleware.CurrentUserID(c),
		Base:        c.Query("base"),
		Category:    splitQueryValues(c.QueryArray("category"), c.Query("category")),
		Subcategory: c.Query("subcategory"),
		Keyword:     splitQueryValues(c.QueryArray("keyword"), c.Query("keyword")),
		Tag:         splitQueryValues(c.QueryArray("tag"), c.Query("tag")),
		DateFrom:    c.Query("dateFrom"),
		DateTo:      c.Query("dateTo"),
		MatchMode:   c.Query("matchMode"),
		Favi:        parseBool(c.Query("favi")),
		Type:        c.Query("type"),
		Sort:        c.Query("sort"),
		Page:        positiveInt(page, 1),
		PageSize:    pageSize,
	}
}

func splitQueryValues(values []string, single string) []string {
	all := append([]string{}, values...)
	if single != "" && len(values) == 0 {
		all = append(all, single)
	}
	var out []string
	seen := map[string]bool{}
	for _, v := range all {
		for _, part := range strings.FieldsFunc(v, func(r rune) bool { return r == ',' || r == ';' }) {
			part = strings.TrimSpace(part)
			if part != "" && !seen[part] {
				out = append(out, part)
				seen[part] = true
			}
		}
	}
	return out
}

func positiveInt(v string, fallback int) int {
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}

func parseBool(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "y":
		return true
	default:
		return false
	}
}

func mergeQuery(raw, add string) string {
	if raw == "" {
		return add
	}
	return raw + "&" + add
}
