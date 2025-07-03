// backend/handler/userHandler.go
package handler

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"

	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"FleetFlow/backend/service"
	"github.com/gin-gonic/gin"
)

// UserHandler repräsentiert den Handler für Benutzer-Operationen
type UserHandler struct {
	userRepo     *repository.UserRepository
	emailService *service.EmailService
}

// NewUserHandler erstellt einen neuen UserHandler
func NewUserHandler() *UserHandler {
	return &UserHandler{
		userRepo:     repository.NewUserRepository(),
		emailService: service.NewEmailService(),
	}
}

// CreateUserRequest repräsentiert die Anfrage zum Erstellen eines Benutzers
type CreateUserRequest struct {
	FirstName    string           `json:"firstName" binding:"required"`
	LastName     string           `json:"lastName" binding:"required"`
	Email        string           `json:"email" binding:"required,email"`
	Password     string           `json:"password"`
	Role         model.UserRole   `json:"role"`   // Geändert von string zu model.UserRole
	Status       model.UserStatus `json:"status"` // Geändert von string zu model.UserStatus
	SendEmail    bool             `json:"sendEmail"`    // Ob E-Mail gesendet werden soll
	GeneratePass bool             `json:"generatePass"` // Ob Passwort generiert werden soll
}

// GetUsers behandelt die Anfrage, alle Benutzer abzurufen
func (h *UserHandler) GetUsers(c *gin.Context) {
	users, err := h.userRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Benutzer"})
		return
	}

	// Passwörter aus der Antwort entfernen
	var result []gin.H
	for _, user := range users {
		result = append(result, gin.H{
			"id":        user.ID.Hex(),
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"email":     user.Email,
			"role":      user.Role,
			"status":    user.Status,
			"createdAt": user.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"users": result})
}

// GetUser behandelt die Anfrage, einen Benutzer anhand seiner ID abzurufen
func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")

	user, err := h.userRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Benutzer nicht gefunden"})
		return
	}

	// Passwort aus der Antwort entfernen
	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":        user.ID.Hex(),
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"email":     user.Email,
			"role":      user.Role,
			"status":    user.Status,
			"createdAt": user.CreatedAt,
		},
	})
}

// CreateUser behandelt die Anfrage, einen neuen Benutzer zu erstellen
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prüfen, ob ein Benutzer mit dieser E-Mail-Adresse bereits existiert
	existingUser, _ := h.userRepo.FindByEmail(req.Email)
	if existingUser != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits"})
		return
	}

	// Standardwerte für Rolle und Status, falls nicht angegeben
	role := req.Role
	if role == "" {
		role = model.RoleUser
	}

	status := req.Status
	if status == "" {
		status = model.StatusActive
	}

	// Passwort verarbeiten
	password := req.Password
	var tempPassword string
	
	if req.GeneratePass || password == "" {
		// Temporäres Passwort generieren
		generatedPassword, err := h.generateTemporaryPassword()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Generieren des Passworts"})
			return
		}
		password = generatedPassword
		tempPassword = generatedPassword
	}

	// Neuen Benutzer erstellen
	user := &model.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Password:  password,
		Role:      role,   // Direkt verwenden, da es bereits den richtigen Typ hat
		Status:    status, // Direkt verwenden, da es bereits den richtigen Typ hat
	}

	// Benutzer in der Datenbank speichern
	if err := h.userRepo.Create(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Erstellen des Benutzers"})
		return
	}

	// E-Mail-Benachrichtigung senden, wenn gewünscht
	if req.SendEmail && tempPassword != "" {
		err := h.emailService.SendUserCreatedEmail(user, tempPassword)
		if err != nil {
			// E-Mail-Fehler protokollieren, aber Benutzer-Erstellung nicht fehlschlagen lassen
			fmt.Printf("Fehler beim Senden der Begrüßungs-E-Mail für %s: %v\n", user.Email, err)
		}
	}

	// Antwort zusammenstellen
	response := gin.H{
		"user": gin.H{
			"id":        user.ID.Hex(),
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"email":     user.Email,
			"role":      user.Role,
			"status":    user.Status,
			"createdAt": user.CreatedAt,
		},
	}

	// Temporäres Passwort nur bei manueller Erstellung zurückgeben (nicht bei E-Mail-Versand)
	if tempPassword != "" && !req.SendEmail {
		response["tempPassword"] = tempPassword
	}

	c.JSON(http.StatusCreated, response)
}

// generateTemporaryPassword generiert ein sicheres temporäres Passwort
func (h *UserHandler) generateTemporaryPassword() (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	const length = 12

	password := make([]byte, length)
	for i := range password {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		password[i] = charset[num.Int64()]
	}

	return string(password), nil
}

// UpdateUserRequest repräsentiert die Anfrage zum Aktualisieren eines Benutzers
type UpdateUserRequest struct {
	FirstName string           `json:"firstName"`
	LastName  string           `json:"lastName"`
	Email     string           `json:"email"`
	Password  string           `json:"password"`
	Role      model.UserRole   `json:"role"`   // Geändert von string zu model.UserRole
	Status    model.UserStatus `json:"status"` // Geändert von string zu model.UserStatus
}

// UpdateUser behandelt die Anfrage, einen Benutzer zu aktualisieren
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")

	// Benutzer aus der Datenbank abrufen
	user, err := h.userRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Benutzer nicht gefunden"})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prüfen, ob ein anderer Benutzer mit der gleichen E-Mail-Adresse existiert
	if req.Email != "" && req.Email != user.Email {
		existingUser, _ := h.userRepo.FindByEmail(req.Email)
		if existingUser != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ein anderer Benutzer mit dieser E-Mail-Adresse existiert bereits"})
			return
		}
		user.Email = req.Email
	}

	// Benutzer aktualisieren
	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.Password != "" {
		user.Password = req.Password
		// Passwort wird während der Update-Operation gehasht
	}
	if req.Role != "" {
		user.Role = req.Role // Direkt zuweisen, da Role jetzt den richtigen Typ hat
	}
	if req.Status != "" {
		user.Status = req.Status // Direkt zuweisen, da Status jetzt den richtigen Typ hat
	}

	// Benutzer in der Datenbank aktualisieren
	if err := h.userRepo.Update(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Benutzers"})
		return
	}

	// Passwort aus der Antwort entfernen
	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":        user.ID.Hex(),
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"email":     user.Email,
			"role":      user.Role,
			"status":    user.Status,
			"updatedAt": user.UpdatedAt,
		},
	})
}

// DeleteUser behandelt die Anfrage, einen Benutzer zu löschen
func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")

	// Prüfen, ob der Benutzer existiert
	_, err := h.userRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Benutzer nicht gefunden"})
		return
	}

	// Prüfen, ob der Benutzer sich selbst löschen will
	currentUserId, exists := c.Get("userId")
	if exists && currentUserId == id {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Sie können Ihren eigenen Benutzer nicht löschen"})
		return
	}

	// Benutzer aus der Datenbank löschen
	if err := h.userRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Löschen des Benutzers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Benutzer erfolgreich gelöscht"})
}
