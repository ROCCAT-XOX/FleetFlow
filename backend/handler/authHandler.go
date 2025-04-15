// backend/handler/authHandler.go
package handler

import (
	"net/http"
	"time"

	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"FleetDrive/backend/utils"

	"github.com/gin-gonic/gin"
)

// AuthHandler repräsentiert den Handler für Authentifizierungsoperationen
type AuthHandler struct {
	userRepo *repository.UserRepository
}

// NewAuthHandler erstellt einen neuen AuthHandler
func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		userRepo: repository.NewUserRepository(),
	}
}

// LoginRequest repräsentiert die Anfrage für den Login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse repräsentiert die Antwort für einen erfolgreichen Login
type LoginResponse struct {
	ID        string           `json:"id"`
	FirstName string           `json:"firstName"`
	LastName  string           `json:"lastName"`
	Email     string           `json:"email"`
	Role      model.UserRole   `json:"role"`
	Status    model.UserStatus `json:"status"`
	Token     string           `json:"token"`
}

// Login verarbeitet die Login-Anfrage
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Ungültige E-Mail oder Passwort"})
		return
	}

	// Überprüfen, ob das Passwort übereinstimmt
	if !user.CheckPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Ungültige E-Mail oder Passwort"})
		return
	}

	// Überprüfen, ob der Benutzer aktiv ist
	if user.Status != model.StatusActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "Ihr Konto ist inaktiv"})
		return
	}

	// JWT-Token generieren
	token, err := utils.GenerateJWT(user.ID.Hex(), string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Generieren des Tokens"})
		return
	}

	// Cookie setzen
	c.SetCookie(
		"token",
		token,
		int(time.Hour.Seconds()*24), // 24 Stunden
		"/",
		"",
		false,
		true,
	)

	// Antwort senden
	c.JSON(http.StatusOK, LoginResponse{
		ID:        user.ID.Hex(),
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Email:     user.Email,
		Role:      user.Role,
		Status:    user.Status,
		Token:     token,
	})
}

// Logout behandelt die Logout-Anfrage
func (h *AuthHandler) Logout(c *gin.Context) {
	// Token-Cookie löschen
	c.SetCookie(
		"token",
		"",
		-1, // Sofort ablaufen lassen
		"/",
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, gin.H{"message": "Erfolgreich abgemeldet"})
}
