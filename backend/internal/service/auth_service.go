package service

import (
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"lsdb-go/backend/internal/repository"
)

var (
	ErrInvalidInput       = errors.New("username and password length >= 6 are required")
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrUsernameTaken      = errors.New("username already exists")
	ErrWrongPassword      = errors.New("current password is incorrect")
)

type Claims struct {
	UserID int64  `json:"userId"`
	Name   string `json:"username"`
	jwt.RegisteredClaims
}

type AuthService struct {
	users          *repository.UserRepository
	jwtSecret      []byte
	jwtExpireDays  int
	jwtRefreshDays int
}

func NewAuthService(users *repository.UserRepository, jwtSecret []byte, jwtExpireDays, jwtRefreshDays int) *AuthService {
	if jwtExpireDays <= 0 {
		jwtExpireDays = 7
	}
	if jwtRefreshDays <= 0 {
		jwtRefreshDays = 2
	}
	return &AuthService{users: users, jwtSecret: jwtSecret, jwtExpireDays: jwtExpireDays, jwtRefreshDays: jwtRefreshDays}
}

func (s *AuthService) Register(username, password string) (map[string]any, error) {
	username = strings.TrimSpace(username)
	if username == "" || len(password) < 6 {
		return nil, ErrInvalidInput
	}
	_, err := s.users.FindByUsername(username)
	if err == nil {
		return nil, ErrUsernameTaken
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	id, err := s.users.Create(username, string(hash))
	if err != nil {
		return nil, err
	}
	return map[string]any{"id": id, "username": username}, nil
}

func (s *AuthService) Login(username, password string) (map[string]any, error) {
	username = strings.TrimSpace(username)
	user, err := s.users.FindByUsername(username)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}
	token, err := s.SignToken(user.ID, user.Username)
	if err != nil {
		return nil, err
	}
	return map[string]any{"token": token, "user": map[string]any{"id": user.ID, "username": user.Username}}, nil
}

func (s *AuthService) ChangePassword(username, oldPassword, newPassword string) error {
	if len(newPassword) < 6 {
		return ErrInvalidInput
	}
	user, err := s.users.FindByUsername(strings.TrimSpace(username))
	if err != nil {
		return ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return ErrWrongPassword
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.users.UpdatePasswordHash(user.ID, string(hash))
}

func (s *AuthService) SignToken(userID int64, username string) (string, error) {
	return s.signTokenAt(userID, username, time.Now())
}

func (s *AuthService) signTokenAt(userID int64, username string, issuedAt time.Time) (string, error) {
	claims := Claims{
		UserID: userID,
		Name:   username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(issuedAt.Add(time.Duration(s.jwtExpireDays) * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(issuedAt),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
}

func (s *AuthService) RefreshTokenIfNeeded(claims *Claims) (string, bool, error) {
	if claims == nil || claims.IssuedAt == nil {
		return "", false, nil
	}
	refreshAfter := time.Duration(s.jwtRefreshDays) * 24 * time.Hour
	if time.Since(claims.IssuedAt.Time) <= refreshAfter {
		return "", false, nil
	}
	token, err := s.SignToken(claims.UserID, claims.Name)
	if err != nil {
		return "", false, err
	}
	return token, true, nil
}

func (s *AuthService) ParseToken(raw string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
