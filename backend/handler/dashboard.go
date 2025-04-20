// backend/handlers/dashboard.go

package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"FleetDrive/backend/repository"
)

type DashboardHandler struct {
	vehicleRepo     *repository.VehicleRepository
	driverRepo      *repository.DriverRepository
	maintenanceRepo *repository.MaintenanceRepository
	usageRepo       *repository.UsageRepository
}

func NewDashboardHandler(db *gorm.DB) *DashboardHandler {
	return &DashboardHandler{
		vehicleRepo:     repository.NewVehicleRepository(db),
		driverRepo:      repository.NewDriverRepository(db),
		maintenanceRepo: repository.NewMaintenanceRepository(db),
		usageRepo:       repository.NewUsageRepository(db),
	}
}

// GetDashboardStats returns general statistics for the dashboard
func (h *DashboardHandler) GetDashboardStats(c *gin.Context) {
	stats := struct {
		TotalVehicles       int64 `json:"totalVehicles"`
		AvailableVehicles   int64 `json:"availableVehicles"`
		MaintenanceVehicles int64 `json:"maintenanceVehicles"`
		InUseVehicles       int64 `json:"inUseVehicles"`
	}{}

	// Get total vehicles count
	var err error
	stats.TotalVehicles, err = h.vehicleRepo.Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Statistiken"})
		return
	}

	// Get count by status
	stats.AvailableVehicles, err = h.vehicleRepo.CountByStatus("available")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Statistiken"})
		return
	}

	stats.MaintenanceVehicles, err = h.vehicleRepo.CountByStatus("maintenance")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Statistiken"})
		return
	}

	stats.InUseVehicles, err = h.vehicleRepo.CountByStatus("inuse")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Statistiken"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetVehiclesOverview returns a limited list of vehicles for the dashboard
func (h *DashboardHandler) GetVehiclesOverview(c *gin.Context) {
	// Get limit from query params, default to 6
	limit := 6
	if limitParam := c.Query("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	vehicles, err := h.vehicleRepo.FindAllWithLimit(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Fahrzeuge"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"vehicles": vehicles})
}

// GetDriversOverview returns a limited list of drivers for the dashboard
func (h *DashboardHandler) GetDriversOverview(c *gin.Context) {
	// Get limit from query params, default to 5
	limit := 5
	if limitParam := c.Query("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	drivers, err := h.driverRepo.FindAllWithLimit(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Fahrer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"drivers": drivers})
}

// GetUpcomingMaintenance returns upcoming maintenance tasks
func (h *DashboardHandler) GetUpcomingMaintenance(c *gin.Context) {
	// Get limit from query params, default to 5
	limit := 5
	if limitParam := c.Query("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Get current date plus 30 days
	endDate := time.Now().AddDate(0, 0, 30)

	upcomingMaintenance, err := h.maintenanceRepo.FindUpcomingWithLimit(endDate, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Wartungen"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"maintenance": upcomingMaintenance})
}

// GetRecentActivities returns recent activities/logs
func (h *DashboardHandler) GetRecentActivities(c *gin.Context) {
	// Get limit from query params, default to 5
	limit := 5
	if limitParam := c.Query("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// This would typically come from an activity log table
	// For now, we'll create a simple combined list from usage and maintenance records
	var activities []map[string]interface{}

	// Get recent usage entries
	recentUsage, err := h.usageRepo.FindRecentWithLimit(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Aktivitäten"})
		return
	}

	// Convert to activity format
	for _, usage := range recentUsage {
		activity := map[string]interface{}{
			"id":          usage.ID,
			"type":        "booking",
			"description": "Fahrzeug in Nutzung genommen",
			"vehicleId":   usage.VehicleID,
			"vehicleName": usage.VehicleName,
			"driverId":    usage.DriverID,
			"driverName":  usage.DriverName,
			"timestamp":   usage.StartDate,
		}
		activities = append(activities, activity)
	}

	// Get recent maintenance entries
	recentMaintenance, err := h.maintenanceRepo.FindRecentWithLimit(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Aktivitäten"})
		return
	}

	// Convert to activity format
	for _, maintenance := range recentMaintenance {
		activity := map[string]interface{}{
			"id":          maintenance.ID,
			"type":        "maintenance",
			"description": "Wartung durchgeführt",
			"vehicleId":   maintenance.VehicleID,
			"vehicleName": maintenance.VehicleName,
			"timestamp":   maintenance.Date,
		}
		activities = append(activities, activity)
	}

	// Sort activities by timestamp (newest first)
	// In a real implementation, you would sort in the database query
	// This is a simplified approach for demonstration

	// Limit to requested number
	if len(activities) > limit {
		activities = activities[:limit]
	}

	c.JSON(http.StatusOK, gin.H{"activities": activities})
}
