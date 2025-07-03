package handler

import (
	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"FleetFlow/backend/service"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DriverDashboardHandler verwaltet das Fahrer-Dashboard
type DriverDashboardHandler struct {
	vehicleRepo     *repository.VehicleRepository
	reservationRepo *repository.VehicleReservationRepository
	reportRepo      *repository.VehicleReportRepository
	activityService *service.ActivityService
}

// NewDriverDashboardHandler erstellt einen neuen Handler
func NewDriverDashboardHandler() *DriverDashboardHandler {
	return &DriverDashboardHandler{
		vehicleRepo:     repository.NewVehicleRepository(),
		reservationRepo: repository.NewVehicleReservationRepository(),
		reportRepo:      repository.NewVehicleReportRepository(),
		activityService: service.NewActivityService(),
	}
}

// ShowDashboard zeigt das mobile Fahrer-Dashboard
func (h *DriverDashboardHandler) ShowDashboard(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.Redirect(http.StatusFound, "/login")
		return
	}

	driverUser := user.(*model.User)
	if driverUser.Role != model.RoleDriver {
		c.JSON(http.StatusForbidden, gin.H{"error": "Nur Fahrer dürfen auf das Dashboard zugreifen"})
		return
	}

	// Dashboard-Daten laden
	dashboardData, err := h.getDashboardData(driverUser.ID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Fehler beim Laden der Dashboard-Daten",
		})
		return
	}

	// Template-Daten vorbereiten
	templateData := gin.H{
		"User":                 driverUser,
		"CurrentReservations":  dashboardData.CurrentReservations,
		"PendingReservations":  len(dashboardData.PendingReservations),
		"RecentReports":        dashboardData.RecentReports,
		"Title":                "Fahrer Dashboard",
	}

	c.HTML(http.StatusOK, "driver-dashboard.html", templateData)
}

// ShowReservations zeigt die Reservierungsübersicht für Fahrer
func (h *DriverDashboardHandler) ShowReservations(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.Redirect(http.StatusFound, "/login")
		return
	}

	driverUser := user.(*model.User)
	if driverUser.Role != model.RoleDriver {
		c.JSON(http.StatusForbidden, gin.H{"error": "Nur Fahrer dürfen Reservierungen einsehen"})
		return
	}

	// Reservierungen des Fahrers laden
	reservations, err := h.reservationRepo.FindByDriver(driverUser.ID)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Fehler beim Laden der Reservierungen",
		})
		return
	}

	// Fahrzeugdaten für Reservierungen laden
	enrichedReservations, err := h.enrichReservationsWithVehicles(reservations)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Fehler beim Laden der Fahrzeugdaten",
		})
		return
	}

	// Verfügbare Fahrzeuge für neue Reservierungen laden
	availableVehicles, err := h.vehicleRepo.FindAvailable()
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Fehler beim Laden der verfügbaren Fahrzeuge",
		})
		return
	}

	templateData := gin.H{
		"User":               driverUser,
		"Reservations":       enrichedReservations,
		"AvailableVehicles":  availableVehicles,
		"Title":              "Meine Reservierungen",
	}

	c.HTML(http.StatusOK, "driver-reservations.html", templateData)
}

// ShowReports zeigt die Meldungsübersicht für Fahrer
func (h *DriverDashboardHandler) ShowReports(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.Redirect(http.StatusFound, "/login")
		return
	}

	driverUser := user.(*model.User)
	if driverUser.Role != model.RoleDriver {
		c.JSON(http.StatusForbidden, gin.H{"error": "Nur Fahrer dürfen Meldungen einsehen"})
		return
	}

	// Meldungen des Fahrers laden
	reports, err := h.reportRepo.FindByReporter(driverUser.ID, 0) // 0 = alle
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Fehler beim Laden der Meldungen",
		})
		return
	}

	// Fahrzeugdaten für Meldungen laden
	enrichedReports, err := h.enrichReportsWithVehicles(reports)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Fehler beim Laden der Fahrzeugdaten",
		})
		return
	}

	// Verfügbare Fahrzeuge für neue Meldungen laden
	availableVehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error": "Fehler beim Laden der Fahrzeuge",
		})
		return
	}

	templateData := gin.H{
		"User":               driverUser,
		"Reports":            enrichedReports,
		"Vehicles":           availableVehicles,
		"ReportTypes":        getReportTypes(),
		"ReportPriorities":   getReportPriorities(),
		"Title":              "Meine Meldungen",
	}

	c.HTML(http.StatusOK, "driver-reports.html", templateData)
}

// DashboardData hält alle Daten für das Dashboard
type DashboardData struct {
	CurrentReservations  []*ReservationWithVehicle
	PendingReservations  []*ReservationWithVehicle
	RecentReports        []*ReportWithVehicle
}

// ReservationWithVehicle kombiniert Reservierung mit Fahrzeugdaten
type ReservationWithVehicle struct {
	*model.VehicleReservation
	Vehicle *model.Vehicle `json:"vehicle"`
}

// ReportWithVehicle kombiniert Meldung mit Fahrzeugdaten
type ReportWithVehicle struct {
	*model.VehicleReport
	Vehicle *model.Vehicle `json:"vehicle"`
}

// getDashboardData lädt alle Dashboard-Daten für einen Fahrer
func (h *DriverDashboardHandler) getDashboardData(driverID primitive.ObjectID) (*DashboardData, error) {
	// Aktuelle und anstehende Reservierungen laden
	reservations, err := h.reservationRepo.FindByDriver(driverID)
	if err != nil {
		return nil, err
	}

	// Reservierungen nach Status filtern
	var currentReservations []*model.VehicleReservation
	var pendingReservations []*model.VehicleReservation

	now := time.Now()
	for _, reservation := range reservations {
		switch reservation.Status {
		case model.ReservationStatusActive:
			if now.After(reservation.StartTime) && now.Before(reservation.EndTime) {
				currentReservations = append(currentReservations, reservation)
			}
		case model.ReservationStatusApproved:
			if now.Before(reservation.StartTime) {
				currentReservations = append(currentReservations, reservation)
			}
		case model.ReservationStatusPending:
			pendingReservations = append(pendingReservations, reservation)
		}
	}

	// Letzte Meldungen laden (nur die letzten 5)
	recentReports, err := h.reportRepo.FindByReporter(driverID, 5)
	if err != nil {
		return nil, err
	}

	// Fahrzeugdaten anreichern
	enrichedCurrentReservations, err := h.enrichReservationsWithVehicles(currentReservations)
	if err != nil {
		return nil, err
	}

	enrichedPendingReservations, err := h.enrichReservationsWithVehicles(pendingReservations)
	if err != nil {
		return nil, err
	}

	enrichedReports, err := h.enrichReportsWithVehicles(recentReports)
	if err != nil {
		return nil, err
	}

	return &DashboardData{
		CurrentReservations: enrichedCurrentReservations,
		PendingReservations: enrichedPendingReservations,
		RecentReports:       enrichedReports,
	}, nil
}

// enrichReservationsWithVehicles reichert Reservierungen mit Fahrzeugdaten an
func (h *DriverDashboardHandler) enrichReservationsWithVehicles(reservations []*model.VehicleReservation) ([]*ReservationWithVehicle, error) {
	var enriched []*ReservationWithVehicle

	for _, reservation := range reservations {
		vehicle, err := h.vehicleRepo.FindByID(reservation.VehicleID)
		if err != nil {
			continue // Fahrzeug nicht gefunden, trotzdem weitermachen
		}

		enriched = append(enriched, &ReservationWithVehicle{
			VehicleReservation: reservation,
			Vehicle:            vehicle,
		})
	}

	return enriched, nil
}

// enrichReportsWithVehicles reichert Meldungen mit Fahrzeugdaten an
func (h *DriverDashboardHandler) enrichReportsWithVehicles(reports []*model.VehicleReport) ([]*ReportWithVehicle, error) {
	var enriched []*ReportWithVehicle

	for _, report := range reports {
		vehicle, err := h.vehicleRepo.FindByID(report.VehicleID)
		if err != nil {
			continue // Fahrzeug nicht gefunden, trotzdem weitermachen
		}

		enriched = append(enriched, &ReportWithVehicle{
			VehicleReport: report,
			Vehicle:       vehicle,
		})
	}

	return enriched, nil
}

// getReportTypes gibt alle verfügbaren Meldungstypen zurück
func getReportTypes() []map[string]string {
	return []map[string]string{
		{"value": string(model.ReportTypeEngineLight), "label": "Motorkontrollleuchte"},
		{"value": string(model.ReportTypeInspection), "label": "Inspektion fällig"},
		{"value": string(model.ReportTypeTireChange), "label": "Reifenwechsel"},
		{"value": string(model.ReportTypeFuelIssue), "label": "Tankproblem"},
		{"value": string(model.ReportTypeCleaning), "label": "Reinigung erforderlich"},
		{"value": string(model.ReportTypeRepair), "label": "Allgemeine Reparatur"},
		{"value": string(model.ReportTypeAccident), "label": "Unfall"},
		{"value": string(model.ReportTypeBrakeIssue), "label": "Bremsproblem"},
		{"value": string(model.ReportTypeElectrical), "label": "Elektrisches Problem"},
		{"value": string(model.ReportTypeAirConditioning), "label": "Klimaanlage"},
		{"value": string(model.ReportTypeNoise), "label": "Geräusche/Lärm"},
		{"value": string(model.ReportTypeOther), "label": "Sonstiges"},
	}
}

// getReportPriorities gibt alle verfügbaren Prioritäten zurück
func getReportPriorities() []map[string]string {
	return []map[string]string{
		{"value": string(model.ReportPriorityLow), "label": "Niedrig"},
		{"value": string(model.ReportPriorityMedium), "label": "Mittel"},
		{"value": string(model.ReportPriorityHigh), "label": "Hoch"},
		{"value": string(model.ReportPriorityUrgent), "label": "Dringend"},
	}
}