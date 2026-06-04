package service

import "lsdb-go/backend/internal/repository"

type FavoriteService struct {
	favorites *repository.FavoriteRepository
}

func NewFavoriteService(favorites *repository.FavoriteRepository) *FavoriteService {
	return &FavoriteService{favorites: favorites}
}

func (s *FavoriteService) Add(userID int64, itemID string) error {
	return s.favorites.Add(userID, itemID)
}

func (s *FavoriteService) Remove(userID int64, itemID string) error {
	return s.favorites.Remove(userID, itemID)
}
