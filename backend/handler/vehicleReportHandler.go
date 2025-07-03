package handler

import (
	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"FleetFlow/backend/service"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VehicleReportHandler verwaltet Fahrzeugmeldungen
type VehicleReportHandler struct {
	reportRepo      *repository.VehicleReportRepository
	vehicleRepo     *repository.VehicleRepository
	activityService *service.ActivityService
}

// NewVehicleReportHandler erstellt einen neuen Handler
func NewVehicleReportHandler() *VehicleReportHandler {
	return &VehicleReportHandler{
		reportRepo:      repository.NewVehicleReportRepository(),
		vehicleRepo:     repository.NewVehicleRepository(),
		activityService: service.NewActivityService(),
	}
}

// CreateReport erstellt eine neue Fahrzeugmeldung
func (h *VehicleReportHandler) CreateReport(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	reporterUser := user.(*model.User)

	var requestData struct {
		VehicleID   string `json:"vehicleId" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Priority    string `json:"priority" binding:"required"`
		Title       string `json:"title" binding:"required"`
		Description string `json:"description" binding:"required"`
		Location    string `json:"location"`
		Mileage     *int   `json:"mileage"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Eingabedaten: " + err.Error()})
		return
	}

	// VehicleID validieren
	vehicleID, err := primitive.ObjectIDFromHex(requestData.VehicleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrzeug-ID"})
		return
	}

	// Fahrzeug existiert prüfen
	vehicle, err := h.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
		return
	}

	// Meldungstyp validieren
	reportType := model.ReportType(requestData.Type)
	if !h.isValidReportType(reportType) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiger Meldungstyp"})
		return
	}

	// Priorität validieren
	priority := model.ReportPriority(requestData.Priority)
	if !h.isValidPriority(priority) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Priorität"})
		return
	}

	// Automatische Priorität bei kritischen Meldungen
	if reportType == model.ReportTypeAccident || reportType == model.ReportTypeBrakeIssue {
		priority = model.ReportPriorityUrgent
	}

	// Neue Meldung erstellen
	report := &model.VehicleReport{
		VehicleID:   vehicleID,
		ReporterID:  reporterUser.ID,
		Type:        reportType,
		Priority:    priority,
		Status:      model.ReportStatusOpen,
		Title:       requestData.Title,
		Description: requestData.Description,
		Location:    requestData.Location,
		Mileage:     requestData.Mileage,
	}

	// Meldung in Datenbank speichern
	if err := h.reportRepo.Create(report); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Erstellen der Meldung"})
		return
	}

	// Aktivität protokollieren
	h.activityService.LogActivity(
		reporterUser.ID,
		"vehicle_report_created",
		"Fahrzeugmeldung erstellt",
		map[string]interface{}{
			"reportId":    report.ID,
			"vehicleId":   vehicleID,
			"type":        string(reportType),
			"priority":    string(priority),
			"vehicleInfo": vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")",
		},
	)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Meldung erfolgreich erstellt",
		"report":  report,
	})
}

// GetReports gibt alle Meldungen zurück (für Admins/Manager)
func (h *VehicleReportHandler) GetReports(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	userRole := user.(*model.User).Role

	// Nur Admins und Manager dürfen alle Meldungen sehen
	if userRole != model.RoleAdmin && userRole != model.RoleManager {
		c.JSON(http.StatusForbidden, gin.H{"error": "Keine Berechtigung"})
		return
	}

	// Paginierung
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// Status-Filter
	status := c.Query("status")
	
	var reports []*model.VehicleReport
	var err error

	if status != "" {
		reports, err = h.reportRepo.FindByStatus(model.ReportStatus(status))
	} else {
		reports, err = h.reportRepo.FindAll(page, limit)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Meldungen"})
		return
	}

	// Statistiken hinzufügen
	stats, _ := h.reportRepo.GetStatistics()

	c.JSON(http.StatusOK, gin.H{
		"reports":    reports,
		"page":       page,
		"limit":      limit,
		"statistics": stats,
	})
}

// GetReportsByDriver gibt Meldungen eines Fahrers zurück
func (h *VehicleReportHandler) GetReportsByDriver(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	reporterUser := user.(*model.User)

	// Limit für Anzahl der Meldungen
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	reports, err := h.reportRepo.FindByReporter(reporterUser.ID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Meldungen"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reports": reports,
	})
}

// GetReport gibt eine spezifische Meldung zurück
func (h *VehicleReportHandler) GetReport(c *gin.Context) {
	reportIDStr := c.Param("id")
	reportID, err := primitive.ObjectIDFromHex(reportIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Meldungs-ID"})
		return
	}

	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	requestUser := user.(*model.User)

	report, err := h.reportRepo.FindByID(reportID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meldung nicht gefunden"})
		return
	}

	// Berechtigung prüfen: Nur Reporter, Admins und Manager dürfen Meldung sehen
	if requestUser.Role != model.RoleAdmin && 
	   requestUser.Role != model.RoleManager && 
	   report.ReporterID != requestUser.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Keine Berechtigung"})
		return
	}

	// Fahrzeugdaten hinzufügen
	vehicle, err := h.vehicleRepo.FindByID(report.VehicleID)
	if err == nil {
		c.JSON(http.StatusOK, gin.H{
			"report":  report,
			"vehicle": vehicle,
		})
	} else {
		c.JSON(http.StatusOK, gin.H{
			"report": report,
		})
	}
}

// UpdateReportStatus ändert den Status einer Meldung (für Admins/Manager)
func (h *VehicleReportHandler) UpdateReportStatus(c *gin.Context) {
	reportIDStr := c.Param("id")
	reportID, err := primitive.ObjectIDFromHex(reportIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Meldungs-ID"})
		return
	}

	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	requestUser := user.(*model.User)

	// Nur Admins und Manager dürfen Status ändern
	if requestUser.Role != model.RoleAdmin && requestUser.Role != model.RoleManager {
		c.JSON(http.StatusForbidden, gin.H{"error": "Keine Berechtigung"})
		return
	}

	var requestData struct {
		Status     string `json:"status" binding:"required"`
		Resolution string `json:"resolution"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Eingabedaten"})
		return
	}

	status := model.ReportStatus(requestData.Status)
	if !h.isValidStatus(status) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiger Status"})
		return
	}

	// Meldung laden
	report, err := h.reportRepo.FindByID(reportID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meldung nicht gefunden"})
		return
	}

	// Status spezifische Aktionen
	switch status {
	case model.ReportStatusResolved:
		err = h.reportRepo.Resolve(reportID, requestUser.ID, requestData.Resolution)
	case model.ReportStatusInProgress:
		err = h.reportRepo.AssignTo(reportID, requestUser.ID)
	default:
		err = h.reportRepo.UpdateStatus(reportID, status, requestUser.ID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren der Meldung"})
		return
	}

	// Aktivität protokollieren
	h.activityService.LogActivity(
		requestUser.ID,
		"vehicle_report_status_updated",
		"Meldungsstatus geändert",
		map[string]interface{}{
			"reportId":    reportID,
			"oldStatus":   string(report.Status),
			"newStatus":   requestData.Status,
			"resolution":  requestData.Resolution,
		},
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Meldungsstatus erfolgreich aktualisiert",
	})
}

// DeleteReport löscht eine Meldung (nur für Admins)
func (h *VehicleReportHandler) DeleteReport(c *gin.Context) {
	reportIDStr := c.Param("id")
	reportID, err := primitive.ObjectIDFromHex(reportIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Meldungs-ID"})
		return
	}

	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	requestUser := user.(*model.User)

	// Nur Admins dürfen Meldungen löschen
	if requestUser.Role != model.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Nur Administratoren dürfen Meldungen löschen"})
		return
	}

	// Meldung laden für Aktivitätsprotokoll
	report, err := h.reportRepo.FindByID(reportID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meldung nicht gefunden"})
		return
	}

	// Meldung löschen
	if err := h.reportRepo.Delete(reportID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Löschen der Meldung"})
		return
	}

	// Aktivität protokollieren
	h.activityService.LogActivity(
		requestUser.ID,
		"vehicle_report_deleted",
		"Fahrzeugmeldung gelöscht",
		map[string]interface{}{
			"reportId":   reportID,
			"reportType": string(report.Type),
			"vehicleId":  report.VehicleID,
		},
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Meldung erfolgreich gelöscht",
	})
}

// GetUrgentReports gibt alle dringenden Meldungen zurück
func (h *VehicleReportHandler) GetUrgentReports(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Nicht authentifiziert"})
		return
	}

	userRole := user.(*model.User).Role

	// Nur Admins und Manager dürfen dringende Meldungen sehen
	if userRole != model.RoleAdmin && userRole != model.RoleManager {
		c.JSON(http.StatusForbidden, gin.H{"error": "Keine Berechtigung"})
		return
	}

	reports, err := h.reportRepo.FindUrgent()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der dringenden Meldungen"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"urgentReports": reports,
		"count":         len(reports),
	})
}

// Hilfsfunktionen für Validierung

func (h *VehicleReportHandler) isValidReportType(reportType model.ReportType) bool {
	validTypes := []model.ReportType{
		model.ReportTypeEngineLight,
		model.ReportTypeInspection,
		model.ReportTypeTireChange,
		model.ReportTypeFuelIssue,
		model.ReportTypeCleaning,
		model.ReportTypeRepair,
		model.ReportTypeAccident,
		model.ReportTypeBrakeIssue,
		model.ReportTypeElectrical,
		model.ReportTypeAirConditioning,
		model.ReportTypeNoise,
		model.ReportTypeOther,
	}

	for _, validType := range validTypes {
		if reportType == validType {
			return true
		}
	}
	return false
}

func (h *VehicleReportHandler) isValidPriority(priority model.ReportPriority) bool {
	validPriorities := []model.ReportPriority{
		model.ReportPriorityLow,
		model.ReportPriorityMedium,
		model.ReportPriorityHigh,
		model.ReportPriorityUrgent,
	}

	for _, validPriority := range validPriorities {
		if priority == validPriority {
			return true
		}
	}
	return false
}

func (h *VehicleReportHandler) isValidStatus(status model.ReportStatus) bool {
	validStatuses := []model.ReportStatus{
		model.ReportStatusOpen,
		model.ReportStatusInProgress,
		model.ReportStatusResolved,
		model.ReportStatusClosed,
	}

	for _, validStatus := range validStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}