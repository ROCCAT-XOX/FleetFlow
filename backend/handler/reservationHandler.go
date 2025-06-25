package handler

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"FleetDrive/backend/service"
	"FleetDrive/backend/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// ReservationHandler verwaltet alle Reservierungs-bezogenen HTTP-Anfragen
type ReservationHandler struct {
	reservationService *service.ReservationService
	vehicleRepo        *repository.VehicleRepository
	driverRepo         *repository.DriverRepository
}

// NewReservationHandler erstellt einen neuen ReservationHandler
func NewReservationHandler() *ReservationHandler {
	return &ReservationHandler{
		reservationService: service.NewReservationService(),
		vehicleRepo:        repository.NewVehicleRepository(),
		driverRepo:         repository.NewDriverRepository(),
	}
}

// CreateReservationRequest repräsentiert die Anfrage zum Erstellen einer Reservierung
type CreateReservationRequest struct {
	VehicleID string `json:"vehicleId" binding:"required"`
	DriverID  string `json:"driverId" binding:"required"`
	StartTime string `json:"startTime" binding:"required"`
	EndTime   string `json:"endTime" binding:"required"`
	Purpose   string `json:"purpose"`
	Notes     string `json:"notes"`
}

// UpdateReservationRequest repräsentiert die Anfrage zum Aktualisieren einer Reservierung
type UpdateReservationRequest struct {
	StartTime string `json:"startTime" binding:"required"`
	EndTime   string `json:"endTime" binding:"required"`
	Purpose   string `json:"purpose"`
	Notes     string `json:"notes"`
}

// ReservationResponse erweitert das Reservierungs-Model für API-Antworten
type ReservationResponse struct {
	model.VehicleReservation
	Vehicle *model.Vehicle `json:"vehicle,omitempty"`
	Driver  *model.Driver  `json:"driver,omitempty"`
}

// ShowReservationsPage zeigt die Reservierungsseite an
func (h *ReservationHandler) ShowReservationsPage(c *gin.Context) {
	// Alle Fahrzeuge für die Auswahl laden
	vehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"title": "Fehler",
			"error": "Fehler beim Laden der Fahrzeuge",
		})
		return
	}

	// Alle Fahrer für die Auswahl laden
	drivers, err := h.driverRepo.FindAll()
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"title": "Fehler",
			"error": "Fehler beim Laden der Fahrer",
		})
		return
	}

	// Nur aktive Reservierungen laden (ohne abgeschlossene)
	reservations, err := h.reservationService.GetActiveReservations()
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"title": "Fehler",
			"error": "Fehler beim Laden der Reservierungen",
		})
		return
	}

	// Reservierungen mit Fahrzeug- und Fahrer-Details anreichern
	var reservationResponses []ReservationResponse
	for _, reservation := range reservations {
		response := ReservationResponse{VehicleReservation: reservation}

		// Fahrzeug-Details laden
		if vehicle, err := h.vehicleRepo.FindByID(reservation.VehicleID.Hex()); err == nil {
			response.Vehicle = vehicle
		}

		// Fahrer-Details laden
		if driver, err := h.driverRepo.FindByID(reservation.DriverID.Hex()); err == nil {
			response.Driver = driver
		}

		reservationResponses = append(reservationResponses, response)
	}

	// Benutzer aus dem Kontext extrahieren
	user, exists := c.Get("user")
	if !exists {
		c.HTML(http.StatusUnauthorized, "error.html", gin.H{
			"title": "Fehler",
			"error": "Benutzer nicht authentifiziert",
		})
		return
	}

	currentUser := user.(*model.User)

	c.HTML(http.StatusOK, "reservations.html", gin.H{
		"title":        "Fahrzeug-Reservierungen",
		"user":         currentUser.FirstName + " " + currentUser.LastName,
		"vehicles":     vehicles,
		"drivers":      drivers,
		"reservations": reservationResponses,
		"active":       "reservations",
		"currentDate":  time.Now().Format("Montag, 02. Januar 2006"),
		"year":         time.Now().Year(),
	})
}

// ShowCalendarPage zeigt die Kalender-Seite an
func (h *ReservationHandler) ShowCalendarPage(c *gin.Context) {
	// Benutzer aus dem Kontext extrahieren
	user, exists := c.Get("user")
	if !exists {
		c.HTML(http.StatusUnauthorized, "error.html", gin.H{
			"title": "Fehler",
			"error": "Benutzer nicht authentifiziert",
		})
		return
	}

	currentUser := user.(*model.User)

	c.HTML(http.StatusOK, "calendar.html", gin.H{
		"title":       "Reservierungs-Kalender",
		"user":        currentUser.FirstName + " " + currentUser.LastName,
		"active":      "calendar",
		"currentDate": time.Now().Format("Montag, 02. Januar 2006"),
		"year":        time.Now().Year(),
	})
}

// CreateReservation erstellt eine neue Reservierung via API
func (h *ReservationHandler) CreateReservation(c *gin.Context) {
	var req CreateReservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Zeitstempel parsen (als lokale Zeit in Europa/Berlin)
	loc, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Timezone-Fehler"})
		return
	}

	startTime, err := time.ParseInLocation("2006-01-02T15:04", req.StartTime, loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Startzeit-Format"})
		return
	}

	endTime, err := time.ParseInLocation("2006-01-02T15:04", req.EndTime, loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Endzeit-Format"})
		return
	}

	// Benutzer aus JWT-Token extrahieren
	userID, err := utils.ExtractUserIDFromToken(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Reservierung erstellen
	reservation, err := h.reservationService.CreateReservation(
		req.VehicleID,
		req.DriverID,
		startTime,
		endTime,
		req.Purpose,
		req.Notes,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, reservation)
}

// UpdateReservation aktualisiert eine bestehende Reservierung
func (h *ReservationHandler) UpdateReservation(c *gin.Context) {
	reservationID := c.Param("id")

	var req UpdateReservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Zeitstempel parsen (als lokale Zeit in Europa/Berlin)
	loc, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Timezone-Fehler"})
		return
	}

	startTime, err := time.ParseInLocation("2006-01-02T15:04", req.StartTime, loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Startzeit-Format"})
		return
	}

	endTime, err := time.ParseInLocation("2006-01-02T15:04", req.EndTime, loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Endzeit-Format"})
		return
	}

	// Benutzer aus JWT-Token extrahieren
	userID, err := utils.ExtractUserIDFromToken(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Reservierung aktualisieren
	err = h.reservationService.UpdateReservation(
		reservationID,
		startTime,
		endTime,
		req.Purpose,
		req.Notes,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reservierung erfolgreich aktualisiert"})
}

// CancelReservation storniert eine Reservierung
func (h *ReservationHandler) CancelReservation(c *gin.Context) {
	reservationID := c.Param("id")

	// Benutzer aus JWT-Token extrahieren
	userID, err := utils.ExtractUserIDFromToken(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err = h.reservationService.CancelReservation(reservationID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reservierung erfolgreich storniert"})
}

// CompleteReservation schließt eine Reservierung ab
func (h *ReservationHandler) CompleteReservation(c *gin.Context) {
	reservationID := c.Param("id")

	// Benutzer aus JWT-Token extrahieren
	userID, err := utils.ExtractUserIDFromToken(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err = h.reservationService.CompleteReservation(reservationID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reservierung erfolgreich abgeschlossen"})
}

// GetReservations gibt Reservierungen zurück (mit optionalem Filter)
func (h *ReservationHandler) GetReservations(c *gin.Context) {
	includeCompleted := c.DefaultQuery("includeCompleted", "false")
	
	var reservations []model.VehicleReservation
	var err error
	
	if includeCompleted == "true" {
		reservations, err = h.reservationService.GetAllReservations()
	} else {
		reservations, err = h.reservationService.GetActiveReservations()
	}
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Reservierungen mit Details anreichern
	var responses []ReservationResponse
	for _, reservation := range reservations {
		response := ReservationResponse{VehicleReservation: reservation}

		// Fahrzeug-Details laden
		if vehicle, err := h.vehicleRepo.FindByID(reservation.VehicleID.Hex()); err == nil {
			response.Vehicle = vehicle
		}

		// Fahrer-Details laden
		if driver, err := h.driverRepo.FindByID(reservation.DriverID.Hex()); err == nil {
			response.Driver = driver
		}

		responses = append(responses, response)
	}

	c.JSON(http.StatusOK, responses)
}

// GetReservationsByVehicle gibt alle Reservierungen für ein bestimmtes Fahrzeug zurück
func (h *ReservationHandler) GetReservationsByVehicle(c *gin.Context) {
	vehicleID := c.Param("vehicleId")

	reservations, err := h.reservationService.GetReservationsByVehicle(vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, reservations)
}

// GetReservationsByDriver gibt alle Reservierungen für einen bestimmten Fahrer zurück
func (h *ReservationHandler) GetReservationsByDriver(c *gin.Context) {
	driverID := c.Param("driverId")

	reservations, err := h.reservationService.GetReservationsByDriver(driverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, reservations)
}

// GetAvailableVehicles gibt verfügbare Fahrzeuge für einen Zeitraum zurück
func (h *ReservationHandler) GetAvailableVehicles(c *gin.Context) {
	startTimeStr := c.Query("startTime")
	endTimeStr := c.Query("endTime")
	excludeReservationID := c.Query("excludeReservationId") // Optional: für Bearbeitung von Reservierungen

	if startTimeStr == "" || endTimeStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start- und Endzeit sind erforderlich"})
		return
	}

	// Zeitstempel parsen (als lokale Zeit in Europa/Berlin)
	loc, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Timezone-Fehler"})
		return
	}

	startTime, err := time.ParseInLocation("2006-01-02T15:04", startTimeStr, loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Startzeit-Format"})
		return
	}

	endTime, err := time.ParseInLocation("2006-01-02T15:04", endTimeStr, loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Endzeit-Format"})
		return
	}

	// Alle Fahrzeuge laden
	allVehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Verfügbare Fahrzeuge filtern
	var availableVehicles []model.Vehicle
	reservationRepo := repository.NewVehicleReservationRepository()
	
	for _, vehicle := range allVehicles {
		// Fahrzeuge mit nicht-verfügbarem Status überspringen (außer temporär reserviert)
		if vehicle.Status != model.VehicleStatusAvailable && vehicle.Status != model.VehicleStatusReserved {
			continue
		}

		// Prüfen ob Fahrzeug in diesem Zeitraum bereits reserviert ist
		var excludeIDPtr *string
		if excludeReservationID != "" {
			excludeIDPtr = &excludeReservationID
		}
		
		hasConflict, err := reservationRepo.CheckConflict(
			vehicle.ID.Hex(),
			startTime,
			endTime,
			excludeIDPtr,
		)

		if err != nil {
			continue // Fehler beim Prüfen - Fahrzeug überspringen
		}

		// Fahrzeug ist verfügbar wenn es keinen Zeitkonflikt gibt
		if !hasConflict {
			availableVehicles = append(availableVehicles, *vehicle)
		}
	}

	c.JSON(http.StatusOK, availableVehicles)
}

// CheckReservationConflict prüft auf Reservierungskonflikte
func (h *ReservationHandler) CheckReservationConflict(c *gin.Context) {
	vehicleID := c.Query("vehicleId")
	startTimeStr := c.Query("startTime")
	endTimeStr := c.Query("endTime")
	excludeID := c.Query("excludeId")

	if vehicleID == "" || startTimeStr == "" || endTimeStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Fahrzeug-ID, Start- und Endzeit sind erforderlich"})
		return
	}

	// Zeitstempel parsen (als lokale Zeit in Europa/Berlin)
	loc, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Timezone-Fehler"})
		return
	}

	startTime, err := time.ParseInLocation("2006-01-02T15:04", startTimeStr, loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Startzeit-Format"})
		return
	}

	endTime, err := time.ParseInLocation("2006-01-02T15:04", endTimeStr, loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Endzeit-Format"})
		return
	}

	// Konfliktprüfung
	var excludeIDPtr *string
	if excludeID != "" {
		excludeIDPtr = &excludeID
	}

	repo := repository.NewVehicleReservationRepository()
	conflictDetails, err := repo.CheckConflictDetails(vehicleID, startTime, endTime, excludeIDPtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, conflictDetails)
}