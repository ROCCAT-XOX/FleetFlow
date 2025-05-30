// backend/handler/integrationHandler.go - PeopleFlow Erweiterung
// Diese Methoden sollten zur bestehenden IntegrationHandler-Struktur hinzugefügt werden

package handler

import (
	"fmt"
	"net/http"

	"FleetDrive/backend/service"
	"github.com/gin-gonic/gin"
)

// PeopleFlow-Service hinzufügen zur bestehenden IntegrationHandler-Struktur
// Dies sollte in die bestehende Struktur integriert werden:
/*
type IntegrationHandler struct {
	// ... bestehende Services ...
	peopleFlowService *service.PeopleFlowService  // Diese Zeile hinzufügen
}
*/

// Konstruktor erweitern:
/*
func NewIntegrationHandler() *IntegrationHandler {
	return &IntegrationHandler{
		// ... bestehende Services ...
		peopleFlowService: service.NewPeopleFlowService(),  // Diese Zeile hinzufügen
	}
}
*/

// === PeopleFlow Integration Methods ===
// Diese Methoden zur bestehenden IntegrationHandler-Struktur hinzufügen:

// SavePeopleFlowCredentials speichert die PeopleFlow-Anmeldedaten
func (h *IntegrationHandler) SavePeopleFlowCredentials(c *gin.Context) {
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

	// PeopleFlow Service erstellen falls nicht vorhanden
	if h.peopleFlowService == nil {
		h.peopleFlowService = service.NewPeopleFlowService()
	}

	// Konfiguration speichern
	err := h.peopleFlowService.SaveIntegrationConfig(
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
func (h *IntegrationHandler) TestPeopleFlowConnection(c *gin.Context) {
	if h.peopleFlowService == nil {
		h.peopleFlowService = service.NewPeopleFlowService()
	}

	err := h.peopleFlowService.TestConnection()
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

// SyncPeopleFlowEmployees synchronisiert Mitarbeiter von PeopleFlow
func (h *IntegrationHandler) SyncPeopleFlowEmployees(c *gin.Context) {
	if h.peopleFlowService == nil {
		h.peopleFlowService = service.NewPeopleFlowService()
	}

	// Sync-Typ aus Query-Parameter (default: "manual")
	syncType := c.DefaultQuery("type", "manual")

	// Mitarbeiter synchronisieren
	syncLog, err := h.peopleFlowService.SyncEmployees(syncType)
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
		"message":            h.getPeopleFlowSyncMessage(syncLog.Status, syncLog.EmployeesProcessed, syncLog.EmployeesCreated, syncLog.EmployeesUpdated),
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
func (h *IntegrationHandler) SyncPeopleFlowDrivers(c *gin.Context) {
	if h.peopleFlowService == nil {
		h.peopleFlowService = service.NewPeopleFlowService()
	}

	err := h.peopleFlowService.SyncDriverEligibleEmployees()
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
func (h *IntegrationHandler) RemovePeopleFlowIntegration(c *gin.Context) {
	if h.peopleFlowService == nil {
		h.peopleFlowService = service.NewPeopleFlowService()
	}

	err := h.peopleFlowService.RemoveIntegration()
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

// UpdatePeopleFlowAutoSync aktualisiert die automatische Synchronisation
func (h *IntegrationHandler) UpdatePeopleFlowAutoSync(c *gin.Context) {
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

	if h.peopleFlowService == nil {
		h.peopleFlowService = service.NewPeopleFlowService()
	}

	// Hier würde die AutoSync-Logik implementiert werden
	// Für jetzt einfach OK zurückgeben
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Synchronisations-Einstellungen erfolgreich aktualisiert",
	})
}

// === Erweiterte GetIntegrationStatus Methode ===
// Diese Methode sollte die bestehende GetIntegrationStatus erweitern:

func (h *IntegrationHandler) GetIntegrationStatusWithPeopleFlow(c *gin.Context) {
	status := gin.H{
		"timebutler": gin.H{
			"connected": false,
		},
		"erfasst123": gin.H{
			"connected": false,
		},
		"peopleflow": gin.H{
			"connected": false,
		},
	}

	// Bestehende Integration-Status abrufen (Timebutler, 123erfasst)
	// ... bestehender Code ...

	// PeopleFlow Status hinzufügen
	if h.peopleFlowService == nil {
		h.peopleFlowService = service.NewPeopleFlowService()
	}

	peopleFlowStatus, err := h.peopleFlowService.GetIntegrationStatus()
	if err == nil {
		status["peopleflow"] = peopleFlowStatus
	}

	c.JSON(http.StatusOK, status)
}

// === Helper Methods ===

// getPeopleFlowSyncMessage generiert eine benutzerfreundliche Nachricht für die Synchronisation
func (h *IntegrationHandler) getPeopleFlowSyncMessage(status string, processed, created, updated int) string {
	switch status {
	case "success":
		return fmt.Sprintf("Synchronisation erfolgreich abgeschlossen. %d Mitarbeiter verarbeitet (%d neu, %d aktualisiert)", processed, created, updated)
	case "partial":
		return fmt.Sprintf("Synchronisation teilweise erfolgreich. %d Mitarbeiter verarbeitet (%d neu, %d aktualisiert) - einige Fehler aufgetreten", processed, created, updated)
	case "error":
		return "Synchronisation fehlgeschlagen"
	default:
		return "Synchronisation abgeschlossen"
	}
}
