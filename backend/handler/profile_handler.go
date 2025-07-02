// backend/handler/profile_handler.go - Erweiterte Version
package handler

import (
	"FleetFlow/backend/db"
	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
)

// ProfileHandler verwaltet die Profiloperationen
type ProfileHandler struct {
	userRepo    *repository.UserRepository
	bookingRepo *repository.VehicleUsageRepository // Neu: für Buchungen/Nutzungen
	vehicleRepo *repository.VehicleRepository      // Neu: für Statistiken
}

// NewProfileHandler erstellt einen neuen ProfileHandler
func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{
		userRepo:    repository.NewUserRepository(),
		bookingRepo: repository.NewVehicleUsageRepository(),
		vehicleRepo: repository.NewVehicleRepository(),
	}
}

// ProfileUpdateInput repräsentiert die Eingabedaten für die Profilaktualisierung
type ProfileUpdateInput struct {
	FirstName  string `json:"firstName" binding:"required"`
	LastName   string `json:"lastName" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Phone      string `json:"phone"`
	Department string `json:"department"`
	Position   string `json:"position"`
}

// PasswordChangeInput repräsentiert die Eingabedaten für die Passwortänderung
type PasswordChangeInput struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}

// GetMyActiveBookings gibt die aktiven Buchungen des aktuellen Benutzers zurück
func (h *ProfileHandler) GetMyActiveBookings(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	user, ok := userInterface.(*model.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Verarbeiten der Benutzerdaten"})
		return
	}

	// Hole alle Nutzungen für den aktuellen Benutzer
	usages, err := h.bookingRepo.FindByDriver(user.ID.Hex())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Buchungen"})
		return
	}

	// Filtere nur aktive Buchungen
	var activeBookings []gin.H
	for _, usage := range usages {
		if usage.Status == model.UsageStatusActive {
			// Fahrzeugdetails abrufen
			vehicle, err := h.vehicleRepo.FindByID(usage.VehicleID.Hex())
			vehicleName := "Unbekannt"
			if err == nil && vehicle != nil {
				vehicleName = vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"
			}

			activeBookings = append(activeBookings, gin.H{
				"id":          usage.ID.Hex(),
				"vehicleName": vehicleName,
				"startDate":   usage.StartDate,
				"endDate":     usage.EndDate,
				"status":      usage.Status,
				"purpose":     usage.Purpose,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"bookings": activeBookings})
}

// GetProfileStats gibt Statistiken für den Benutzer zurück
func (h *ProfileHandler) GetProfileStats(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	user, ok := userInterface.(*model.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Verarbeiten der Benutzerdaten"})
		return
	}

	// Hole alle Nutzungen für den aktuellen Benutzer
	usages, err := h.bookingRepo.FindByDriver(user.ID.Hex())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Statistiken"})
		return
	}

	// Zähle gebuchte Fahrten
	bookedRides := len(usages)

	// Zähle aktive Fahrzeuge
	activeVehicles := 0
	for _, usage := range usages {
		if usage.Status == model.UsageStatusActive {
			activeVehicles++
		}
	}

	// Offene Tankmeldungen (beispielhafte Implementierung - muss angepasst werden)
	pendingFuelReports := 0

	c.JSON(http.StatusOK, gin.H{
		"stats": gin.H{
			"bookedRides":        bookedRides,
			"activeVehicles":     activeVehicles,
			"pendingFuelReports": pendingFuelReports,
		},
	})
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
	user.Phone = input.Phone
	user.Department = input.Department
	user.Position = input.Position

	// Benutzer in der Datenbank aktualisieren
	if err := h.userRepo.Update(user); err != nil {
		log.Printf("Fehler beim Aktualisieren des Profils: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Profils"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Profil erfolgreich aktualisiert",
		"firstName":  user.FirstName,
		"lastName":   user.LastName,
		"email":      user.Email,
		"phone":      user.Phone,
		"department": user.Department,
		"position":   user.Position,
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

// GetNotificationSettings holt die Benachrichtigungseinstellungen des Benutzers
func (h *ProfileHandler) GetNotificationSettings(c *gin.Context) {
	// Hier würden normalerweise die Benachrichtigungseinstellungen aus der Datenbank geladen
	// Beispielhafte Implementierung:
	settings := gin.H{
		"emailNotifications": true,
		"bookingReminders":   true,
		"fuelReminders":      true,
		"maintenanceAlerts":  false,
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateNotificationSettings aktualisiert die Benachrichtigungseinstellungen
func (h *ProfileHandler) UpdateNotificationSettings(c *gin.Context) {
	var settings map[string]bool
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Eingabedaten"})
		return
	}

	// Hier würden die Einstellungen in der Datenbank gespeichert
	// Beispielhafte Implementierung:
	log.Printf("Benachrichtigungseinstellungen aktualisiert: %v", settings)

	c.JSON(http.StatusOK, gin.H{
		"message": "Benachrichtigungseinstellungen erfolgreich gespeichert",
	})
}

// UploadProfilePicture behandelt das Hochladen von Profilbildern
func (h *ProfileHandler) UploadProfilePicture(c *gin.Context) {
	// Benutzer aus dem Kontext holen
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	user, ok := userInterface.(*model.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Verarbeiten der Benutzerdaten"})
		return
	}

	// File vom Request holen
	file, header, err := c.Request.FormFile("profilePicture")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Keine Datei gefunden"})
		return
	}
	defer file.Close()

	// Validierung der Dateigröße (max 5MB)
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datei ist zu groß. Maximale Größe: 5MB"})
		return
	}

	// Validierung des Dateityps
	contentType := header.Header.Get("Content-Type")
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/jpg" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiger Dateityp. Nur JPEG und PNG sind erlaubt"})
		return
	}

	// Altes Profilbild löschen falls vorhanden
	if user.ProfilePicture != nil {
		h.deleteProfilePictureFile(*user.ProfilePicture)
	}

	// GridFS Bucket erstellen
	bucket, err := gridfs.NewBucket(db.DBClient.Database("FleetFlow"))
	if err != nil {
		log.Printf("Fehler beim Erstellen des GridFS Buckets: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Speichern der Datei"})
		return
	}

	// Datei in GridFS hochladen
	uploadStream, err := bucket.OpenUploadStream("profile_picture_"+user.ID.Hex())
	if err != nil {
		log.Printf("Fehler beim Öffnen des Upload Streams: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Speichern der Datei"})
		return
	}
	defer uploadStream.Close()

	// Datei kopieren
	_, err = io.Copy(uploadStream, file)
	if err != nil {
		log.Printf("Fehler beim Kopieren der Datei: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Speichern der Datei"})
		return
	}

	// File ID holen
	fileID := uploadStream.FileID.(primitive.ObjectID)

	// User Profil mit neuer Bild-ID aktualisieren
	user.ProfilePicture = &fileID
	if err := h.userRepo.Update(user); err != nil {
		log.Printf("Fehler beim Aktualisieren des Benutzers: %v", err)
		// Hochgeladene Datei löschen da User Update fehlgeschlagen
		h.deleteProfilePictureFile(fileID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Profils"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profilbild erfolgreich hochgeladen",
		"fileID":  fileID.Hex(),
	})
}

// GetProfilePicture liefert das Profilbild des aktuellen Benutzers
func (h *ProfileHandler) GetProfilePicture(c *gin.Context) {
	// Benutzer aus dem Kontext holen
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	user, ok := userInterface.(*model.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Verarbeiten der Benutzerdaten"})
		return
	}

	// Prüfen ob Profilbild existiert
	if user.ProfilePicture == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kein Profilbild gefunden"})
		return
	}

	// GridFS Bucket erstellen
	bucket, err := gridfs.NewBucket(db.DBClient.Database("FleetFlow"))
	if err != nil {
		log.Printf("Fehler beim Erstellen des GridFS Buckets: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Datei"})
		return
	}

	// Datei aus GridFS laden
	downloadStream, err := bucket.OpenDownloadStream(*user.ProfilePicture)
	if err != nil {
		log.Printf("Fehler beim Öffnen des Download Streams: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Profilbild nicht gefunden"})
		return
	}
	defer downloadStream.Close()

	// Content-Type setzen
	c.Header("Content-Type", "image/jpeg") // Default, könnte aus Metadaten gelesen werden
	c.Header("Cache-Control", "public, max-age=3600")

	// Datei streamen
	_, err = io.Copy(c.Writer, downloadStream)
	if err != nil {
		log.Printf("Fehler beim Streamen der Datei: %v", err)
		return
	}
}

// DeleteProfilePicture löscht das Profilbild des aktuellen Benutzers
func (h *ProfileHandler) DeleteProfilePicture(c *gin.Context) {
	// Benutzer aus dem Kontext holen
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	user, ok := userInterface.(*model.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Verarbeiten der Benutzerdaten"})
		return
	}

	// Prüfen ob Profilbild existiert
	if user.ProfilePicture == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kein Profilbild zum Löschen gefunden"})
		return
	}

	// Datei löschen
	fileID := *user.ProfilePicture
	if err := h.deleteProfilePictureFile(fileID); err != nil {
		log.Printf("Fehler beim Löschen der Datei: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Löschen der Datei"})
		return
	}

	// User Profil aktualisieren
	user.ProfilePicture = nil
	if err := h.userRepo.Update(user); err != nil {
		log.Printf("Fehler beim Aktualisieren des Benutzers: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Profils"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profilbild erfolgreich gelöscht",
	})
}

// deleteProfilePictureFile ist eine Hilfsfunktion zum Löschen von Dateien aus GridFS
func (h *ProfileHandler) deleteProfilePictureFile(fileID primitive.ObjectID) error {
	bucket, err := gridfs.NewBucket(db.DBClient.Database("FleetFlow"))
	if err != nil {
		return err
	}

	return bucket.Delete(fileID)
}
