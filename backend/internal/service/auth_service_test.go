package service

import (
	"testing"
	"time"
)

func TestSignTokenUsesConfiguredExpireDays(t *testing.T) {
	svc := NewAuthService(nil, []byte("test-secret"), 2, 1)
	token, err := svc.SignToken(1, "alice")
	if err != nil {
		t.Fatal(err)
	}

	claims, err := svc.ParseToken(token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.IssuedAt == nil || claims.ExpiresAt == nil {
		t.Fatalf("expected issued and expires claims: %#v", claims)
	}
	got := claims.ExpiresAt.Sub(claims.IssuedAt.Time)
	want := 2 * 24 * time.Hour
	if got < want-2*time.Second || got > want+2*time.Second {
		t.Fatalf("token ttl = %s, want about %s", got, want)
	}
}

func TestNewAuthServiceDefaultsExpireDays(t *testing.T) {
	svc := NewAuthService(nil, []byte("test-secret"), 0, 0)
	if svc.jwtExpireDays != 7 {
		t.Fatalf("jwtExpireDays = %d", svc.jwtExpireDays)
	}
	if svc.jwtRefreshDays != 2 {
		t.Fatalf("jwtRefreshDays = %d", svc.jwtRefreshDays)
	}
}

func TestRefreshTokenIfNeeded(t *testing.T) {
	svc := NewAuthService(nil, []byte("test-secret"), 7, 2)

	oldToken, err := svc.signTokenAt(1, "alice", time.Now().Add(-3*24*time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	oldClaims, err := svc.ParseToken(oldToken)
	if err != nil {
		t.Fatal(err)
	}
	newToken, refreshed, err := svc.RefreshTokenIfNeeded(oldClaims)
	if err != nil {
		t.Fatal(err)
	}
	if !refreshed || newToken == "" {
		t.Fatalf("expected refresh, refreshed=%v token=%q", refreshed, newToken)
	}
	newClaims, err := svc.ParseToken(newToken)
	if err != nil {
		t.Fatal(err)
	}
	if newClaims.IssuedAt == nil || time.Since(newClaims.IssuedAt.Time) > 5*time.Second {
		t.Fatalf("new token issuedAt = %#v", newClaims.IssuedAt)
	}

	freshToken, err := svc.signTokenAt(1, "alice", time.Now().Add(-24*time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	freshClaims, err := svc.ParseToken(freshToken)
	if err != nil {
		t.Fatal(err)
	}
	token, refreshed, err := svc.RefreshTokenIfNeeded(freshClaims)
	if err != nil {
		t.Fatal(err)
	}
	if refreshed || token != "" {
		t.Fatalf("expected no refresh, refreshed=%v token=%q", refreshed, token)
	}

	token, refreshed, err = svc.RefreshTokenIfNeeded(&Claims{UserID: 1, Name: "alice"})
	if err != nil {
		t.Fatal(err)
	}
	if refreshed || token != "" {
		t.Fatalf("expected no refresh without issuedAt, refreshed=%v token=%q", refreshed, token)
	}
}
