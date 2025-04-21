package handler

import (
	"net/http"
	"strconv"
	"time"

	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"github.com/gin-gonic/gin"
)

// DashboardHandler enthält alle Handler für Dashboard-bezogene Anfragen
type DashboardHandler struct {
	vehicleRepo     *repository.VehicleRepository
	driverRepo      *repository.DriverRepository
	maintenanceRepo *repository.MaintenanceRepository
	usageRepo       *repository.VehicleUsageRepository
	fuelCostRepo    *repository.FuelCostRepository
	activityRepo    *repository.ActivityRepository
}

// NewDashboardHandler erstellt einen neuen DashboardHandler
func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{
		vehicleRepo:     repository.NewVehicleRepository(),
		driverRepo:      repository.NewDriverRepository(),
		maintenanceRepo: repository.NewMaintenanceRepository(),
		usageRepo:       repository.NewVehicleUsageRepository(),
		fuelCostRepo:    repository.NewFuelCostRepository(),
		activityRepo:    repository.NewActivityRepository(),
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

	// Get all vehicles
	vehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Statistiken"})
		return
	}

	// Count total vehicles
	stats.TotalVehicles = int64(len(vehicles))

	// Count by status
	for _, vehicle := range vehicles {
		switch vehicle.Status {
		case model.VehicleStatusAvailable:
			stats.AvailableVehicles++
		case model.VehicleStatusMaintenance:
			stats.MaintenanceVehicles++
		case model.VehicleStatusInUse:
			stats.InUseVehicles++
		}
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

	vehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Fahrzeuge"})
		return
	}

	// Limit to requested number
	if len(vehicles) > limit {
		vehicles = vehicles[:limit]
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

	drivers, err := h.driverRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Fahrer"})
		return
	}

	// Limit to requested number
	if len(drivers) > limit {
		drivers = drivers[:limit]
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

	// Get all vehicles
	vehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Wartungen"})
		return
	}

	// Create a list of upcoming maintenance based on next inspection dates
	now := time.Now()
	var upcomingMaintenance []map[string]interface{}

	for _, vehicle := range vehicles {
		if !vehicle.NextInspectionDate.IsZero() && vehicle.NextInspectionDate.After(now) {
			maintenance := map[string]interface{}{
				"vehicleId":    vehicle.ID.Hex(),
				"vehicleName":  vehicle.Brand + " " + vehicle.Model,
				"licensePlate": vehicle.LicensePlate,
				"nextDueDate":  vehicle.NextInspectionDate,
				"type":         "inspection",
			}
			upcomingMaintenance = append(upcomingMaintenance, maintenance)
		}
	}

	// Sort by date (simple bubble sort since we expect a small number of items)
	for i := 0; i < len(upcomingMaintenance)-1; i++ {
		for j := 0; j < len(upcomingMaintenance)-i-1; j++ {
			date1 := upcomingMaintenance[j]["nextDueDate"].(time.Time)
			date2 := upcomingMaintenance[j+1]["nextDueDate"].(time.Time)
			if date1.After(date2) {
				upcomingMaintenance[j], upcomingMaintenance[j+1] = upcomingMaintenance[j+1], upcomingMaintenance[j]
			}
		}
	}

	// Limit to requested number
	if len(upcomingMaintenance) > limit {
		upcomingMaintenance = upcomingMaintenance[:limit]
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

	// For now, we'll create a simple list of recent activities
	// In a real application, this would come from an activity log table
	var activities []map[string]interface{}

	// Get recent vehicle usages
	recentUsage, err := h.usageRepo.FindAll()
	if err == nil {
		for _, usage := range recentUsage {
			if len(activities) >= limit {
				break
			}

			// Try to get vehicle name
			vehicleName := "Unbekanntes Fahrzeug"
			vehicle, err := h.vehicleRepo.FindByID(usage.VehicleID.Hex())
			if err == nil {
				vehicleName = vehicle.Brand + " " + vehicle.Model
			}

			// Try to get driver name
			driverName := "Unbekannter Fahrer"
			driver, err := h.driverRepo.FindByID(usage.DriverID.Hex())
			if err == nil {
				driverName = driver.FirstName + " " + driver.LastName
			}

			activity := map[string]interface{}{
				"id":          usage.ID.Hex(),
				"type":        "booking",
				"description": driverName + " hat " + vehicleName + " gebucht",
				"vehicleId":   usage.VehicleID.Hex(),
				"vehicleName": vehicleName,
				"driverId":    usage.DriverID.Hex(),
				"driverName":  driverName,
				"timestamp":   usage.StartDate,
			}
			activities = append(activities, activity)
		}
	}

	// Get recent maintenance entries
	recentMaintenance, err := h.maintenanceRepo.FindAll()
	if err == nil {
		for _, maintenance := range recentMaintenance {
			if len(activities) >= limit {
				break
			}

			// Try to get vehicle name
			vehicleName := "Unbekanntes Fahrzeug"
			vehicle, err := h.vehicleRepo.FindByID(maintenance.VehicleID.Hex())
			if err == nil {
				vehicleName = vehicle.Brand + " " + vehicle.Model
			}

			activity := map[string]interface{}{
				"id":          maintenance.ID.Hex(),
				"type":        "maintenance",
				"description": "Wartung durchgeführt für " + vehicleName,
				"vehicleId":   maintenance.VehicleID.Hex(),
				"vehicleName": vehicleName,
				"timestamp":   maintenance.Date,
			}
			activities = append(activities, activity)
		}
	}

	// Limit to requested number
	if len(activities) > limit {
		activities = activities[:limit]
	}

	c.JSON(http.StatusOK, gin.H{"activities": activities})
}

// GetVehicleUsageStats liefert Daten für das Flottenaktivitäts-Chart
func (h *DashboardHandler) GetVehicleUsageStats(c *gin.Context) {
	// Daten für die letzten 7 Tage berechnen
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -6) // 7 Tage inklusive heute

	// Format für die Tagesdarstellung
	dayFormat := "Mo"
	if c.Query("format") == "full" {
		dayFormat = "02.01."
	}

	// Daten für jeden Tag vorbereiten
	var usageData []map[string]interface{}

	// Repo-Zugriffe für Fahrzeugnutzung und Wartung
	for day := 0; day < 7; day++ {
		date := startDate.AddDate(0, 0, day)
		nextDay := date.AddDate(0, 0, 1)

		// Anzahl der am Tag genutzten Fahrzeuge zählen
		vehiclesInUse, err := h.usageRepo.CountActiveUsagesByDateRange(date, nextDay)
		if err != nil {
			vehiclesInUse = 0
		}

		// Anzahl der Fahrzeuge in Wartung zählen
		vehiclesInMaintenance, err := h.vehicleRepo.CountByStatusAndDate(model.VehicleStatusMaintenance, date)
		if err != nil {
			vehiclesInMaintenance = 0
		}

		// Datenpunkt für den Tag erstellen
		dayData := map[string]interface{}{
			"day":              date.Format(dayFormat),
			"date":             date.Format("2006-01-02"),
			"inUseCount":       vehiclesInUse,
			"maintenanceCount": vehiclesInMaintenance,
		}

		usageData = append(usageData, dayData)
	}

	c.JSON(http.StatusOK, gin.H{
		"usageData": usageData,
	})
}

// GetFuelCostsByVehicle liefert Kraftstoffkosten gruppiert nach Fahrzeug für die letzten 12 Monate
func (h *DashboardHandler) GetFuelCostsByVehicle(c *gin.Context) {
	// Aktuelles Datum und 12 Monate zurück
	endDate := time.Now()
	startDate := endDate.AddDate(0, -11, 0) // 12 Monate zurück

	// Format für die Monatsdarstellung
	monthFormat := "Jan"
	if c.Query("format") == "full" {
		monthFormat = "Jan 2006"
	}

	// Alle Fahrzeuge laden
	vehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Fahrzeuge"})
		return
	}

	// Mapping für Fahrzeug-IDs zu Fahrzeugnamen
	vehicleNames := make(map[string]string)
	for _, vehicle := range vehicles {
		vehicleNames[vehicle.ID.Hex()] = vehicle.Brand + " " + vehicle.Model
	}

	// Fuel Costs für die letzten 12 Monate laden
	fuelCosts, err := h.fuelCostRepo.FindByDateRange(startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Tankkosten"})
		return
	}

	// Daten nach Monat und Fahrzeug gruppieren
	monthlyData := make(map[string]map[string]float64)

	for _, fuelCost := range fuelCosts {
		// Monat aus dem Datum ermitteln
		month := fuelCost.Date.Format("2006-01")
		vehicleID := fuelCost.VehicleID.Hex()

		// Sicherstellen, dass das Monats-Map existiert
		if _, exists := monthlyData[month]; !exists {
			monthlyData[month] = make(map[string]float64)
		}

		// Kraftstoffkosten zum Fahrzeug addieren
		monthlyData[month][vehicleID] += fuelCost.TotalCost
	}

	// Daten für das Chart vorbereiten
	var fuelCostsData []map[string]interface{}

	// Für jeden Monat im Zeitraum
	for i := 0; i < 12; i++ {
		targetMonth := startDate.AddDate(0, i, 0)
		monthKey := targetMonth.Format("2006-01")

		vehicleCosts := make(map[string]interface{})
		if monthData, exists := monthlyData[monthKey]; exists {
			for vehicleID, cost := range monthData {
				vehicleName := vehicleNames[vehicleID]
				if vehicleName == "" {
					vehicleName = "Unbekanntes Fahrzeug"
				}

				vehicleCosts[vehicleID] = map[string]interface{}{
					"id":   vehicleID,
					"name": vehicleName,
					"cost": cost,
				}
			}
		}

		monthData := map[string]interface{}{
			"month":        targetMonth.Format(monthFormat),
			"date":         monthKey,
			"vehicleCosts": vehicleCosts,
		}

		fuelCostsData = append(fuelCostsData, monthData)
	}

	c.JSON(http.StatusOK, gin.H{
		"fuelCostsData": fuelCostsData,
	})
}
