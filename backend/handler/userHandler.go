// backend/handler/userHandler.go
package handler

import (
	"net/http"

	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"github.com/gin-gonic/gin"
)

// UserHandler repräsentiert den Handler für Benutzer-Operationen
type UserHandler struct {
	userRepo *repository.UserRepository
}

// NewUserHandler erstellt einen neuen UserHandler
func NewUserHandler() *UserHandler {
	return &UserHandler{
		userRepo: repository.NewUserRepository(),
	}
}

// CreateUserRequest repräsentiert die Anfrage zum Erstellen eines Benutzers
type CreateUserRequest struct {
	FirstName string           `json:"firstName" binding:"required"`
	LastName  string           `json:"lastName" binding:"required"`
	Email     string           `json:"email" binding:"required,email"`
	Password  string           `json:"password" binding:"required,min=6"`
	Role      model.UserRole   `json:"role"`
	Status    model.UserStatus `json:"status"`
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

	// Neuen Benutzer erstellen
	user := &model.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Password:  req.Password,
		Role:      role,
		Status:    status,
	}

	// Benutzer in der Datenbank speichern
	if err := h.userRepo.Create(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Erstellen des Benutzers"})
		return
	}

	// Passwort aus der Antwort entfernen
	c.JSON(http.StatusCreated, gin.H{
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

// UpdateUserRequest repräsentiert die Anfrage zum Aktualisieren eines Benutzers
type UpdateUserRequest struct {
	FirstName string           `json:"firstName"`
	LastName  string           `json:"lastName"`
	Email     string           `json:"email"`
	Password  string           `json:"password"`
	Role      model.UserRole   `json:"role"`
	Status    model.UserStatus `json:"status"`
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
		user.Role = req.Role
	}
	if req.Status != "" {
		user.Status = req.Status
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
