// backend/handler/dashboard.go
package handler

import (
	"fmt"
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

// GetCompleteDashboardData liefert alle Daten für das Dashboard
func (h *DashboardHandler) GetCompleteDashboardData(c *gin.Context) {
	// Basisstatistiken
	vehicles, _ := h.vehicleRepo.FindAll()
	var totalVehicles, availableVehicles, inUseVehicles, maintenanceVehicles int64

	totalVehicles = int64(len(vehicles))
	for _, v := range vehicles {
		switch v.Status {
		case model.VehicleStatusAvailable:
			availableVehicles++
		case model.VehicleStatusInUse:
			inUseVehicles++
		case model.VehicleStatusMaintenance:
			maintenanceVehicles++
		}
	}

	// Letzte Fahrzeuge (max 6)
	recentVehicles := vehicles
	if len(recentVehicles) > 6 {
		recentVehicles = recentVehicles[:6]
	}

	// Letzte Fahrer (max 5)
	drivers, _ := h.driverRepo.FindAll()
	recentDrivers := drivers
	if len(recentDrivers) > 5 {
		recentDrivers = recentDrivers[:5]
	}

	// Anstehende Wartungen
	upcomingMaintenance := h.getUpcomingMaintenanceList()

	// Letzte Aktivitäten
	recentActivities := h.getRecentActivityList()

	// Flottenaktivität für Chart (letzte 7 Tage)
	fleetActivityData := h.getFleetActivityData()

	// Kraftstoffkosten nach Fahrzeug
	fuelCostData := h.getFuelCostsByVehicleData()

	// Fahrzeugauslastung
	utilizationData := []int64{availableVehicles, inUseVehicles, maintenanceVehicles}

	// Benutzerrolle aus Context
	userRole := "admin" // Default
	if role, exists := c.Get("userRole"); exists {
		userRole = role.(string)
	}

	// Benutzername
	user, _ := c.Get("user")
	userName := ""
	if u, ok := user.(*model.User); ok {
		userName = u.FirstName + " " + u.LastName
	}

	// Aktuelles Datum
	currentDate := time.Now().Format("Montag, 02. Januar 2006")

	c.HTML(http.StatusOK, "dashboard.html", gin.H{
		"title":                    "Dashboard",
		"user":                     userName,
		"userRole":                 userRole,
		"currentDate":              currentDate,
		"year":                     time.Now().Year(),
		"totalVehicles":            totalVehicles,
		"availableVehicles":        availableVehicles,
		"inUseVehicles":            inUseVehicles,
		"maintenanceVehicles":      maintenanceVehicles,
		"recentVehicles":           recentVehicles,
		"recentDrivers":            recentDrivers,
		"upcomingMaintenance":      upcomingMaintenance,
		"recentActivities":         recentActivities,
		"fleetActivityLabels":      fleetActivityData.Labels,
		"fleetActivityInUse":       fleetActivityData.InUse,
		"fleetActivityMaintenance": fleetActivityData.Maintenance,
		"fuelCostVehicleLabels":    fuelCostData.Labels,
		"fuelCostVehicleData":      fuelCostData.Data,
		"vehicleUtilizationData":   utilizationData,
	})
}

// Hilfsmethoden für spezifische Daten

func (h *DashboardHandler) getUpcomingMaintenanceList() []gin.H {
	vehicles, _ := h.vehicleRepo.FindAll()
	now := time.Now()
	var upcoming []gin.H

	for _, vehicle := range vehicles {
		if !vehicle.NextInspectionDate.IsZero() && vehicle.NextInspectionDate.After(now) {
			upcoming = append(upcoming, gin.H{
				"vehicleId":     vehicle.ID.Hex(),
				"vehicleName":   vehicle.Brand + " " + vehicle.Model,
				"licensePlate":  vehicle.LicensePlate,
				"nextDueDate":   vehicle.NextInspectionDate,
				"daysRemaining": int(vehicle.NextInspectionDate.Sub(now).Hours() / 24),
			})
		}
	}

	// Nach Datum sortieren
	for i := 0; i < len(upcoming)-1; i++ {
		for j := 0; j < len(upcoming)-i-1; j++ {
			date1 := upcoming[j]["nextDueDate"].(time.Time)
			date2 := upcoming[j+1]["nextDueDate"].(time.Time)
			if date1.After(date2) {
				upcoming[j], upcoming[j+1] = upcoming[j+1], upcoming[j]
			}
		}
	}

	// Limit auf 5
	if len(upcoming) > 5 {
		upcoming = upcoming[:5]
	}

	return upcoming
}

func (h *DashboardHandler) getRecentActivityList() []gin.H {
	var activities []gin.H

	// Letzte Buchungen
	usages, _ := h.usageRepo.FindAll()
	for i, usage := range usages {
		if i >= 3 { // Nur die letzten 3
			break
		}

		vehicleName := "Unbekannt"
		if vehicle, err := h.vehicleRepo.FindByID(usage.VehicleID.Hex()); err == nil {
			vehicleName = vehicle.Brand + " " + vehicle.Model
		}

		driverName := "Unbekannt"
		if driver, err := h.driverRepo.FindByID(usage.DriverID.Hex()); err == nil {
			driverName = driver.FirstName + " " + driver.LastName
		}

		iconClass := "bg-blue-100"
		iconSVG := `<svg class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
		</svg>`

		if usage.Status == model.UsageStatusCompleted {
			iconClass = "bg-green-100"
			iconSVG = `<svg class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>`
		}

		message := driverName + " nutzt " + vehicleName
		if usage.Status == model.UsageStatusCompleted {
			message = driverName + " hat " + vehicleName + " zurückgegeben"
		}

		activities = append(activities, gin.H{
			"Message":     message,
			"Time":        h.formatTimeAgo(usage.StartDate),
			"IconBgClass": iconClass,
			"IconSVG":     iconSVG,
			"IsLast":      i == len(usages)-1 || i == 2,
		})
	}

	// Letzte Wartungen
	maintenances, _ := h.maintenanceRepo.FindAll()
	for i, maintenance := range maintenances {
		if len(activities) >= 5 || i >= 2 { // Insgesamt max 5 Aktivitäten
			break
		}

		vehicleName := "Unbekannt"
		if vehicle, err := h.vehicleRepo.FindByID(maintenance.VehicleID.Hex()); err == nil {
			vehicleName = vehicle.Brand + " " + vehicle.Model
		}

		activities = append(activities, gin.H{
			"Message":     "Wartung durchgeführt für " + vehicleName,
			"Time":        h.formatTimeAgo(maintenance.Date),
			"IconBgClass": "bg-yellow-100",
			"IconSVG": `<svg class="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
			</svg>`,
			"IsLast": len(activities) == 4,
		})
	}

	return activities
}

func (h *DashboardHandler) getFleetActivityData() struct {
	Labels      []string
	InUse       []int
	Maintenance []int
} {
	result := struct {
		Labels      []string
		InUse       []int
		Maintenance []int
	}{}

	// Letzte 7 Tage
	for i := 6; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i)
		dayName := h.getDayName(date)
		result.Labels = append(result.Labels, dayName)

		// Zähle Fahrzeuge in Nutzung an diesem Tag
		nextDay := date.AddDate(0, 0, 1)
		inUseCount, _ := h.usageRepo.CountActiveUsagesByDateRange(date, nextDay)
		result.InUse = append(result.InUse, int(inUseCount))

		// Zähle Fahrzeuge in Wartung (vereinfacht)
		maintenanceCount := 0
		vehicles, _ := h.vehicleRepo.FindByStatus(model.VehicleStatusMaintenance)
		for _, v := range vehicles {
			if v.UpdatedAt.Before(nextDay) && v.UpdatedAt.After(date.AddDate(0, 0, -1)) {
				maintenanceCount++
			}
		}
		result.Maintenance = append(result.Maintenance, maintenanceCount)
	}

	return result
}

func (h *DashboardHandler) getFuelCostsByVehicleData() struct {
	Labels []string
	Data   []float64
} {
	result := struct {
		Labels []string
		Data   []float64
	}{}

	// Kraftstoffkosten der letzten 30 Tage nach Fahrzeug
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	fuelCosts, _ := h.fuelCostRepo.FindByDateRange(thirtyDaysAgo, time.Now())

	vehicleCosts := make(map[string]float64)
	vehicleNames := make(map[string]string)

	for _, cost := range fuelCosts {
		vehicleID := cost.VehicleID.Hex()
		vehicleCosts[vehicleID] += cost.TotalCost

		if _, exists := vehicleNames[vehicleID]; !exists {
			if vehicle, err := h.vehicleRepo.FindByID(vehicleID); err == nil {
				vehicleNames[vehicleID] = vehicle.Brand + " " + vehicle.Model
			}
		}
	}

	// Top 5 Fahrzeuge nach Kosten
	type kv struct {
		Key   string
		Value float64
	}
	var sortedCosts []kv
	for k, v := range vehicleCosts {
		sortedCosts = append(sortedCosts, kv{k, v})
	}

	// Sortieren
	for i := 0; i < len(sortedCosts); i++ {
		for j := i + 1; j < len(sortedCosts); j++ {
			if sortedCosts[j].Value > sortedCosts[i].Value {
				sortedCosts[i], sortedCosts[j] = sortedCosts[j], sortedCosts[i]
			}
		}
	}

	// Top 5 oder weniger
	limit := 5
	if len(sortedCosts) < limit {
		limit = len(sortedCosts)
	}

	for i := 0; i < limit; i++ {
		result.Labels = append(result.Labels, vehicleNames[sortedCosts[i].Key])
		result.Data = append(result.Data, sortedCosts[i].Value)
	}

	// Falls keine Daten vorhanden
	if len(result.Labels) == 0 {
		result.Labels = []string{"Keine Daten"}
		result.Data = []float64{0}
	}

	return result
}

// Hilfsmethoden
func (h *DashboardHandler) formatTimeAgo(t time.Time) string {
	duration := time.Since(t)

	if duration.Hours() < 1 {
		minutes := int(duration.Minutes())
		if minutes < 1 {
			return "gerade eben"
		}
		return fmt.Sprintf("vor %d Minuten", minutes)
	} else if duration.Hours() < 24 {
		hours := int(duration.Hours())
		if hours == 1 {
			return "vor 1 Stunde"
		}
		return fmt.Sprintf("vor %d Stunden", hours)
	} else if duration.Hours() < 48 {
		return "gestern"
	} else {
		days := int(duration.Hours() / 24)
		if days == 1 {
			return "vor 1 Tag"
		}
		return fmt.Sprintf("vor %d Tagen", days)
	}
}

func (h *DashboardHandler) getDayName(date time.Time) string {
	days := []string{"So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"}
	return days[date.Weekday()]
}

// backend/handler/dashboard.go - Fehlende Methoden hinzufügen

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

// GetFuelCostsByVehicle liefert Kraftstoffkosten gruppiert nach Fahrzeug
func (h *DashboardHandler) GetFuelCostsByVehicle(c *gin.Context) {
	// Aktuelles Datum und 30 Tage zurück
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30)

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

	// Fuel Costs für die letzten 30 Tage laden
	fuelCosts, err := h.fuelCostRepo.FindByDateRange(startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Tankkosten"})
		return
	}

	// Kosten nach Fahrzeug gruppieren
	vehicleCosts := make(map[string]float64)
	for _, cost := range fuelCosts {
		vehicleID := cost.VehicleID.Hex()
		vehicleCosts[vehicleID] += cost.TotalCost
	}

	// Daten für das Chart vorbereiten
	var labels []string
	var data []float64

	// Sortiere nach Kosten (höchste zuerst)
	type kv struct {
		VehicleID string
		Cost      float64
	}

	var sortedCosts []kv
	for vehicleID, cost := range vehicleCosts {
		sortedCosts = append(sortedCosts, kv{vehicleID, cost})
	}

	// Bubble Sort für Sortierung
	for i := 0; i < len(sortedCosts); i++ {
		for j := i + 1; j < len(sortedCosts); j++ {
			if sortedCosts[j].Cost > sortedCosts[i].Cost {
				sortedCosts[i], sortedCosts[j] = sortedCosts[j], sortedCosts[i]
			}
		}
	}

	// Top 5 Fahrzeuge
	limit := 5
	if len(sortedCosts) < limit {
		limit = len(sortedCosts)
	}

	for i := 0; i < limit; i++ {
		vehicleName := vehicleNames[sortedCosts[i].VehicleID]
		if vehicleName == "" {
			vehicleName = "Unbekanntes Fahrzeug"
		}
		labels = append(labels, vehicleName)
		data = append(data, sortedCosts[i].Cost)
	}

	// Falls keine Daten vorhanden
	if len(labels) == 0 {
		labels = []string{"Keine Daten"}
		data = []float64{0}
	}

	c.JSON(http.StatusOK, gin.H{
		"labels": labels,
		"data":   data,
	})
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
