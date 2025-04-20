// backend/handler/profile_handler.go
package handler

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ProfileHandler verwaltet die Profiloperationen
type ProfileHandler struct {
	userRepo *repository.UserRepository
}

// NewProfileHandler erstellt einen neuen ProfileHandler
func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{
		userRepo: repository.NewUserRepository(),
	}
}

// ProfileUpdateInput repräsentiert die Eingabedaten für die Profilaktualisierung
type ProfileUpdateInput struct {
	FirstName string `json:"first-name" binding:"required"`
	LastName  string `json:"last-name" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Phone     string `json:"phone"`
}

// PasswordChangeInput repräsentiert die Eingabedaten für die Passwortänderung
type PasswordChangeInput struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}

// UpdateProfile aktualisiert die Profildaten des angemeldeten Benutzers
func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	// Benutzer aus dem Kontext holen
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	// Benutzer-Typ assertion
	user, ok := userInterface.(*model.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Verarbeiten der Benutzerdaten"})
		return
	}

	// Eingabedaten parsen
	var input ProfileUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Eingabedaten"})
		return
	}

	// Prüfen, ob die E-Mail-Adresse bereits von einem anderen Benutzer verwendet wird
	if user.Email != input.Email {
		// Rufen Sie alle Benutzer ab und prüfen Sie manuell
		users, err := h.userRepo.GetAll()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Überprüfen der E-Mail"})
			return
		}

		for _, existingUser := range users {
			if existingUser.Email == input.Email && existingUser.ID != user.ID {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Diese E-Mail-Adresse wird bereits verwendet"})
				return
			}
		}
	}

	// Benutzerdaten aktualisieren
	user.FirstName = input.FirstName
	user.LastName = input.LastName
	user.Email = input.Email

	// Wenn Ihre User-Struktur einen Phone-Feld hat, fügen Sie es hinzu
	// Ansonsten auskommentieren oder entfernen:
	// user.Phone = input.Phone

	// Benutzer in der Datenbank aktualisieren
	if err := h.userRepo.Update(user); err != nil {
		log.Printf("Fehler beim Aktualisieren des Profils: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Profils"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Profil erfolgreich aktualisiert",
		"firstName": user.FirstName,
		"lastName":  user.LastName,
		"email":     user.Email,
		// "phone":     user.Phone, // Nur wenn Phone-Feld existiert
	})
}

// ChangePassword ändert das Passwort des angemeldeten Benutzers
func (h *ProfileHandler) ChangePassword(c *gin.Context) {
	// Benutzer aus dem Kontext holen
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	// Benutzer-Typ assertion
	user, ok := userInterface.(*model.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Verarbeiten der Benutzerdaten"})
		return
	}

	// Eingabedaten parsen
	var input PasswordChangeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Eingabedaten"})
		return
	}

	// Aktuelles Passwort überprüfen
	if !user.CheckPassword(input.CurrentPassword) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aktuelles Passwort ist falsch"})
		return
	}

	// Neues Passwort setzen
	if err := user.SetPassword(input.NewPassword); err != nil {
		log.Printf("Fehler beim Setzen des neuen Passworts: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Ändern des Passworts"})
		return
	}

	// Benutzer in der Datenbank aktualisieren
	if err := h.userRepo.Update(user); err != nil {
		log.Printf("Fehler beim Speichern des neuen Passworts: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Speichern des neuen Passworts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Passwort erfolgreich geändert",
	})
}
