package service

import (
	"strconv"
	"strings"

	"lsdb-go/backend/internal/model"
	"lsdb-go/backend/internal/repository"
)

type RoleService struct {
	roles     *repository.RoleRepository
	resources *ResourceService
}

func NewRoleService(roles *repository.RoleRepository, resources *ResourceService) *RoleService {
	return &RoleService{roles: roles, resources: resources}
}

func (s *RoleService) Get(id string) (map[string]any, error) {
	role, err := s.roles.Get(id)
	if err != nil {
		return nil, err
	}
	data := roleBaseMap(role)
	var names []map[string]any
	for i, name := range SplitTags(role.Name) {
		names = append(names, map[string]any{"nameIndex": i + 1, "name": name})
	}
	data["nameList"] = names
	var images []map[string]any
	for i, part := range SplitFiles(role.Images) {
		pieces := strings.SplitN(part, "@", 2)
		if len(pieces) != 2 {
			continue
		}
		images = append(images, map[string]any{
			"nameIndex": i,
			"name":      pieces[0],
			"image":     pieces[1],
			"imageSrc":  s.resources.URL(role.Base, "", "", "e"+strconv.FormatInt(role.ID, 10), pieces[1], true),
		})
	}
	data["imageList"] = images
	return data, nil
}

func (s *RoleService) ListForTags(tags []string) ([]map[string]any, error) {
	roles, err := s.roles.ListForTagNames(tags)
	if err != nil {
		return nil, err
	}
	tagSet := map[string]bool{}
	for _, t := range tags {
		if strings.TrimSpace(t) != "" {
			tagSet[t] = true
		}
	}
	var out []map[string]any
	for _, role := range roles {
		for i, name := range SplitTags(role.Name) {
			if tagSet[name] {
				m := roleBaseMap(role)
				m["name"] = name
				m["tagIndex"] = i + 1
				imgName := roleImageForName(role.Images, name)
				m["image"] = imgName
				if imgName != "" {
					m["imageSrc"] = s.resources.URL(role.Base, "", "", "e"+strconv.FormatInt(role.ID, 10), imgName, true)
				} else {
					m["imageSrc"] = ""
				}
				out = append(out, m)
				break
			}
		}
	}
	return out, nil
}

func roleBaseMap(role model.Role) map[string]any {
	return map[string]any{"id": role.ID, "date": role.Date, "title": role.Title, "name": role.Name, "images": role.Images, "remark": role.Remark, "base": role.Base}
}

func roleImageForName(images, name string) string {
	var defaultImage = ""
	for _, part := range SplitFiles(images) {
		pieces := strings.SplitN(part, "@", 2)
		if len(pieces) == 2 {
			if pieces[0] == name {
				return pieces[1]
			}
			if defaultImage == "" {
				defaultImage = pieces[1]
			}
		}
	}
	return defaultImage
}
