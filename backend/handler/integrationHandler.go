// backend/handler/integrationHandler.go
package handler

import (
	"FleetDrive/backend/service"
	"github.com/gin-gonic/gin"
	"net/http"
)

// IntegrationHandler verwaltet alle Integrationen
type IntegrationHandler struct {
	peopleFlowService *service.PeopleFlowService
}

// NewIntegrationHandler erstellt einen neuen IntegrationHandler
func NewIntegrationHandler() *IntegrationHandler {
	return &IntegrationHandler{
		peopleFlowService: service.NewPeopleFlowService(),
	}
}

// GetIntegrationStatus gibt den Status aller Integrationen zurück
func (h *IntegrationHandler) GetIntegrationStatus(c *gin.Context) {
	status := gin.H{
		"peopleflow": gin.H{
			"connected": false,
		},
	}

	// PeopleFlow Status hinzufügen
	peopleFlowStatus, err := h.peopleFlowService.GetIntegrationStatus()
	if err == nil {
		status["peopleflow"] = peopleFlowStatus
	}

	c.JSON(http.StatusOK, status)
}
