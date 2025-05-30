// backend/handler/peopleflowHandler.go
package handler

import (
	"net/http"
	"strconv"

	"FleetDrive/backend/service"

	"github.com/gin-gonic/gin"
)

// PeopleFlowHandler verwaltet die PeopleFlow-Integration-Endpunkte
type PeopleFlowHandler struct {
	service *service.PeopleFlowService
}

// NewPeopleFlowHandler erstellt einen neuen PeopleFlowHandler
func NewPeopleFlowHandler() *PeopleFlowHandler {
	return &PeopleFlowHandler{
		service: service.NewPeopleFlowService(),
	}
}

// SavePeopleFlowCredentials speichert die PeopleFlow-Anmeldedaten
func (h *PeopleFlowHandler) SavePeopleFlowCredentials(c *gin.Context) {
	var req struct {
		BaseURL      string `json:"baseUrl" binding:"required"`
		Username     string `json:"username" binding:"required"`
		Password     string `json:"password" binding:"required"`
		AutoSync     bool   `json:"autoSync"`
		SyncInterval int    `json:"syncInterval"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Ungültige Eingabedaten: " + err.Error(),
		})
		return
	}

	// Sync-Intervall validieren (mindestens 5 Minuten)
	if req.SyncInterval < 5 {
		req.SyncInterval = 5
	}

	// Konfiguration speichern
	err := h.service.SaveIntegrationConfig(
		req.BaseURL,
		req.Username,
		req.Password,
		req.AutoSync,
		req.SyncInterval,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Fehler beim Speichern der Konfiguration: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "PeopleFlow-Integration erfolgreich konfiguriert",
	})
}

// TestPeopleFlowConnection testet die Verbindung zu PeopleFlow
func (h *PeopleFlowHandler) TestPeopleFlowConnection(c *gin.Context) {
	err := h.service.TestConnection()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Verbindung zu PeopleFlow erfolgreich",
	})
}

// GetPeopleFlowStatus gibt den aktuellen Status der PeopleFlow-Integration zurück
func (h *PeopleFlowHandler) GetPeopleFlowStatus(c *gin.Context) {
	status, err := h.service.GetIntegrationStatus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Fehler beim Abrufen des Status: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
	})
}

// SyncPeopleFlowEmployees synchronisiert Mitarbeiter von PeopleFlow
func (h *PeopleFlowHandler) SyncPeopleFlowEmployees(c *gin.Context) {
	// Sync-Typ aus Query-Parameter (default: "manual")
	syncType := c.DefaultQuery("type", "manual")

	// Mitarbeiter synchronisieren
	syncLog, err := h.service.SyncEmployees(syncType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Synchronisation fehlgeschlagen: " + err.Error(),
		})
		return
	}

	// Antwort zusammenstellen
	response := gin.H{
		"success":            syncLog.Status == "success" || syncLog.Status == "partial",
		"message":            h.getSyncMessage(syncLog),
		"employeesProcessed": syncLog.EmployeesProcessed,
		"employeesCreated":   syncLog.EmployeesCreated,
		"employeesUpdated":   syncLog.EmployeesUpdated,
		"status":             syncLog.Status,
		"duration":           syncLog.EndTime.Sub(syncLog.StartTime).String(),
	}

	// Bei Fehlern diese auch mitgeben
	if len(syncLog.Errors) > 0 {
		response["errors"] = syncLog.Errors
		response["errorCount"] = len(syncLog.Errors)
	}

	// HTTP-Status je nach Ergebnis
	if syncLog.Status == "success" {
		c.JSON(http.StatusOK, response)
	} else if syncLog.Status == "partial" {
		c.JSON(http.StatusPartialContent, response)
	} else {
		c.JSON(http.StatusInternalServerError, response)
	}
}

// SyncPeopleFlowDrivers synchronisiert fahrtaugliche Mitarbeiter mit FleetFlow-Fahrern
func (h *PeopleFlowHandler) SyncPeopleFlowDrivers(c *gin.Context) {
	err := h.service.SyncDriverEligibleEmployees()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Fehler beim Synchronisieren der Fahrer: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Fahrtaugliche Mitarbeiter erfolgreich mit FleetFlow-Fahrern synchronisiert",
	})
}

// RemovePeopleFlowIntegration entfernt die PeopleFlow-Integration
func (h *PeopleFlowHandler) RemovePeopleFlowIntegration(c *gin.Context) {
	err := h.service.RemoveIntegration()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Fehler beim Entfernen der Integration: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "PeopleFlow-Integration erfolgreich entfernt",
	})
}

// GetPeopleFlowEmployees gibt alle synchronisierten PeopleFlow-Mitarbeiter zurück
func (h *PeopleFlowHandler) GetPeopleFlowEmployees(c *gin.Context) {
	repo := h.service.Repo // Geändert von h.service.repo zu h.service.Repo

	// Query-Parameter für Filterung
	driverEligibleOnly := c.Query("driver_eligible") == "true"

	var employees interface{}
	var err error

	if driverEligibleOnly {
		employees, err = repo.FindDriverEligibleEmployees()
	} else {
		employees, err = repo.FindAllEmployees()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Fehler beim Abrufen der Mitarbeiter: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    employees,
	})
}

// GetPeopleFlowSyncLogs gibt die letzten Synchronisations-Logs zurück
func (h *PeopleFlowHandler) GetPeopleFlowSyncLogs(c *gin.Context) {
	// Limit aus Query-Parameter (default: 10)
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50 // Maximum 50 Logs
	}

	repo := h.service.Repo // Geändert von h.service.repo zu h.service.Repo
	logs, err := repo.FindRecentSyncLogs(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Fehler beim Abrufen der Sync-Logs: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    logs,
	})
}

// UpdatePeopleFlowAutoSync aktualisiert die automatische Synchronisation
func (h *PeopleFlowHandler) UpdatePeopleFlowAutoSync(c *gin.Context) {
	var req struct {
		AutoSync     bool `json:"autoSync"`
		SyncInterval int  `json:"syncInterval"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Ungültige Eingabedaten: " + err.Error(),
		})
		return
	}

	// Sync-Intervall validieren
	if req.SyncInterval < 5 {
		req.SyncInterval = 5
	}

	repo := h.service.Repo // Geändert von h.service.repo zu h.service.Repo
	integration, err := repo.GetIntegration()
	if err != nil || integration == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Keine PeopleFlow-Integration gefunden",
		})
		return
	}

	// Einstellungen aktualisieren
	integration.AutoSync = req.AutoSync
	integration.SyncInterval = req.SyncInterval

	err = repo.SaveIntegration(integration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Fehler beim Aktualisieren der Einstellungen: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Synchronisations-Einstellungen erfolgreich aktualisiert",
	})
}

// === Helper Methods ===

// getSyncMessage generiert eine benutzerfreundliche Nachricht basierend auf dem Sync-Log
func (h *PeopleFlowHandler) getSyncMessage(syncLog interface{}) string {
	// Hier könnte man je nach syncLog.Status verschiedene Nachrichten zurückgeben
	// Für jetzt eine vereinfachte Version:
	return "Synchronisation abgeschlossen"
}
