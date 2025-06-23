package handler

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SMTPHandler verwaltet SMTP-bezogene Anfragen
type SMTPHandler struct {
	emailService *service.EmailService
}

// NewSMTPHandler erstellt einen neuen SMTPHandler
func NewSMTPHandler() *SMTPHandler {
	return &SMTPHandler{
		emailService: service.NewEmailService(),
	}
}

// GetSMTPConfig holt die aktuelle SMTP-Konfiguration
func (h *SMTPHandler) GetSMTPConfig(c *gin.Context) {
	config, err := h.emailService.GetSMTPConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der SMTP-Konfiguration"})
		return
	}

	if config == nil {
		c.JSON(http.StatusOK, gin.H{"config": nil})
		return
	}

	// Passwort für Antwort entfernen
	response := gin.H{
		"id":        config.ID.Hex(),
		"host":      config.Host,
		"port":      config.Port,
		"username":  config.Username,
		"fromName":  config.FromName,
		"fromEmail": config.FromEmail,
		"useTLS":    config.UseTLS,
		"useSSL":    config.UseSSL,
		"isActive":  config.IsActive,
		"createdAt": config.CreatedAt,
		"updatedAt": config.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{"config": response})
}

// SaveSMTPConfig speichert die SMTP-Konfiguration
func (h *SMTPHandler) SaveSMTPConfig(c *gin.Context) {
	var request struct {
		Host      string `json:"host" binding:"required"`
		Port      int    `json:"port" binding:"required,min=1,max=65535"`
		Username  string `json:"username"`
		Password  string `json:"password"`
		FromName  string `json:"fromName" binding:"required"`
		FromEmail string `json:"fromEmail" binding:"required,email"`
		UseTLS    bool   `json:"useTLS"`
		UseSSL    bool   `json:"useSSL"`
		IsActive  bool   `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config := &model.SMTPConfig{
		Host:      request.Host,
		Port:      request.Port,
		Username:  request.Username,
		Password:  request.Password,
		FromName:  request.FromName,
		FromEmail: request.FromEmail,
		UseTLS:    request.UseTLS,
		UseSSL:    request.UseSSL,
		IsActive:  request.IsActive,
	}

	if err := h.emailService.SaveSMTPConfig(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Speichern der SMTP-Konfiguration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "SMTP-Konfiguration erfolgreich gespeichert"})
}

// TestSMTPConfig testet die SMTP-Konfiguration
func (h *SMTPHandler) TestSMTPConfig(c *gin.Context) {
	var request struct {
		Host      string `json:"host" binding:"required"`
		Port      int    `json:"port" binding:"required,min=1,max=65535"`
		Username  string `json:"username"`
		Password  string `json:"password"`
		FromName  string `json:"fromName" binding:"required"`
		FromEmail string `json:"fromEmail" binding:"required,email"`
		UseTLS    bool   `json:"useTLS"`
		UseSSL    bool   `json:"useSSL"`
		TestEmail string `json:"testEmail" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config := &model.SMTPConfig{
		Host:      request.Host,
		Port:      request.Port,
		Username:  request.Username,
		Password:  request.Password,
		FromName:  request.FromName,
		FromEmail: request.FromEmail,
		UseTLS:    request.UseTLS,
		UseSSL:    request.UseSSL,
		IsActive:  true,
	}

	if err := h.emailService.TestSMTPConfig(config, request.TestEmail); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "SMTP-Test fehlgeschlagen: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "SMTP-Test erfolgreich! Test-E-Mail wurde gesendet."})
}

// GetEmailTemplates holt alle E-Mail-Vorlagen
func (h *SMTPHandler) GetEmailTemplates(c *gin.Context) {
	templates, err := h.emailService.GetEmailTemplates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der E-Mail-Vorlagen"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"templates": templates})
}

// SaveEmailTemplate speichert eine E-Mail-Vorlage
func (h *SMTPHandler) SaveEmailTemplate(c *gin.Context) {
	var template model.EmailTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.emailService.SaveEmailTemplate(&template); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Speichern der E-Mail-Vorlage"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "E-Mail-Vorlage erfolgreich gespeichert"})
}

// GetEmailLogs holt E-Mail-Logs mit Paginierung
func (h *SMTPHandler) GetEmailLogs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}

	logs, err := h.emailService.GetEmailLogs(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der E-Mail-Logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

// GetNotificationSettings holt Benachrichtigungseinstellungen für den aktuellen Benutzer
func (h *SMTPHandler) GetNotificationSettings(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Benutzer nicht authentifiziert"})
		return
	}

	settings, err := h.emailService.GetNotificationSettings(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Benachrichtigungseinstellungen"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

// SaveNotificationSettings speichert Benachrichtigungseinstellungen für den aktuellen Benutzer
func (h *SMTPHandler) SaveNotificationSettings(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Benutzer nicht authentifiziert"})
		return
	}

	var request struct {
		EmailNotifications bool `json:"emailNotifications"`
		BookingReminders   bool `json:"bookingReminders"`
		FuelReminders      bool `json:"fuelReminders"`
		MaintenanceAlerts  bool `json:"maintenanceAlerts"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userObjectID, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Benutzer-ID"})
		return
	}

	settings := &model.NotificationSettings{
		UserID:             userObjectID,
		EmailNotifications: request.EmailNotifications,
		BookingReminders:   request.BookingReminders,
		FuelReminders:      request.FuelReminders,
		MaintenanceAlerts:  request.MaintenanceAlerts,
	}

	if err := h.emailService.SaveNotificationSettings(settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Speichern der Benachrichtigungseinstellungen"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Benachrichtigungseinstellungen erfolgreich gespeichert"})
}

// SendTestEmail sendet eine Test-E-Mail
func (h *SMTPHandler) SendTestEmail(c *gin.Context) {
	var request struct {
		To      string `json:"to" binding:"required,email"`
		Subject string `json:"subject" binding:"required"`
		Body    string `json:"body" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.emailService.SendEmail(request.To, request.Subject, request.Body, ""); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Senden der E-Mail: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "E-Mail erfolgreich gesendet"})
}