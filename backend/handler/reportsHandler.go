package handler

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
)

// ReportsHandler repräsentiert den Handler für Reports und Statistiken
type ReportsHandler struct {
	vehicleRepo     *repository.VehicleRepository
	driverRepo      *repository.DriverRepository
	maintenanceRepo *repository.MaintenanceRepository
	fuelCostRepo    *repository.FuelCostRepository
	usageRepo       *repository.VehicleUsageRepository
}

// NewReportsHandler erstellt einen neuen ReportsHandler
func NewReportsHandler() *ReportsHandler {
	return &ReportsHandler{
		vehicleRepo:     repository.NewVehicleRepository(),
		driverRepo:      repository.NewDriverRepository(),
		maintenanceRepo: repository.NewMaintenanceRepository(),
		fuelCostRepo:    repository.NewFuelCostRepository(),
		usageRepo:       repository.NewVehicleUsageRepository(),
	}
}

// VehicleStats repräsentiert Fahrzeugstatistiken
type VehicleStats struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	LicensePlate     string  `json:"licensePlate"`
	Brand            string  `json:"brand"`
	Model            string  `json:"model"`
	Mileage          int     `json:"mileage"`
	FuelCosts        float64 `json:"fuelCosts"`
	MaintenanceCosts float64 `json:"maintenanceCosts"`
	CostPerKm        float64 `json:"costPerKm"`
	Utilization      float64 `json:"utilization"`
	Trips            int     `json:"trips"`
}

// DriverStats repräsentiert Fahrerstatistiken
type DriverStats struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Status          string  `json:"status"`
	TotalKilometers int     `json:"totalKilometers"`
	TotalTrips      int     `json:"totalTrips"`
	AvgKmPerTrip    float64 `json:"avgKmPerTrip"`
}

// GetReportsStats liefert die Hauptstatistiken für die Reports-Seite
func (h *ReportsHandler) GetReportsStats(c *gin.Context) {
	// Parameter auslesen
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")
	vehicleID := c.Query("vehicleId")
	driverID := c.Query("driverId")

	// Zeitraum bestimmen
	var startDate, endDate time.Time
	if startDateStr != "" && endDateStr != "" {
		var err error
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Startdatum"})
			return
		}
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Enddatum"})
			return
		}
	} else {
		// Standard: Aktueller Monat
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 1, -1)
	}

	// Fahrzeuge laden
	vehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Fahrzeuge"})
		return
	}

	// Fahrer laden
	drivers, err := h.driverRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Fahrer"})
		return
	}

	// Tankkosten laden (FindByDateRange existiert bereits)
	fuelCosts, err := h.fuelCostRepo.FindByDateRange(startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Tankkosten"})
		return
	}

	// Wartungskosten laden
	maintenanceEntries, err := h.maintenanceRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Wartungseinträge"})
		return
	}

	// Fahrzeugnutzung laden
	usageEntries, err := h.usageRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Nutzungseinträge"})
		return
	}

	// Statistiken berechnen
	stats := h.calculateStats(vehicles, drivers, fuelCosts, maintenanceEntries, usageEntries, startDate, endDate, vehicleID, driverID)

	// Zusätzliche Flags für leere Datensätze
	stats["hasVehicles"] = len(vehicles) > 0
	stats["hasDrivers"] = len(drivers) > 0
	stats["hasFuelCosts"] = len(fuelCosts) > 0
	stats["hasMaintenanceData"] = len(maintenanceEntries) > 0
	stats["hasUsageData"] = len(usageEntries) > 0
	stats["hasEnoughDataForAnalysis"] = len(vehicles) > 0 && (len(usageEntries) > 0 || len(fuelCosts) > 0)

	c.JSON(http.StatusOK, stats)
}

// GetVehicleRanking liefert das Fahrzeug-Ranking
func (h *ReportsHandler) GetVehicleRanking(c *gin.Context) {
	vehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Fahrzeuge"})
		return
	}

	// Prüfen ob genügend Daten vorhanden sind
	if len(vehicles) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"vehicles": []VehicleStats{},
			"hasData":  false,
			"message":  "Keine Fahrzeuge verfügbar",
		})
		return
	}

	// Alle Tankkosten laden (nicht zeitgefiltert für Ranking)
	fuelCosts, err := h.fuelCostRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Tankkosten"})
		return
	}

	maintenanceEntries, err := h.maintenanceRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Wartungseinträge"})
		return
	}

	usageEntries, err := h.usageRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Nutzungseinträge"})
		return
	}

	// Fahrzeugstatistiken berechnen
	var vehicleStats []VehicleStats
	for _, vehicle := range vehicles {
		stats := h.calculateVehicleStats(vehicle, fuelCosts, maintenanceEntries, usageEntries)
		vehicleStats = append(vehicleStats, stats)
	}

	// Nach Effizienz sortieren (niedrigste Kosten pro km zuerst)
	sort.Slice(vehicleStats, func(i, j int) bool {
		return vehicleStats[i].CostPerKm < vehicleStats[j].CostPerKm
	})

	hasEnoughData := len(fuelCosts) > 0 || len(usageEntries) > 0

	var message string
	if !hasEnoughData {
		message = "Zu wenige Daten für eine detaillierte Auswertung"
	}

	c.JSON(http.StatusOK, gin.H{
		"vehicles": vehicleStats,
		"hasData":  hasEnoughData,
		"message":  message,
	})
}

// GetDriverRanking liefert das Fahrer-Ranking
func (h *ReportsHandler) GetDriverRanking(c *gin.Context) {
	drivers, err := h.driverRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Fahrer"})
		return
	}

	// Prüfen ob genügend Daten vorhanden sind
	if len(drivers) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"drivers": []DriverStats{},
			"hasData": false,
			"message": "Keine Fahrer verfügbar",
		})
		return
	}

	usageEntries, err := h.usageRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Nutzungseinträge"})
		return
	}

	// Fahrerstatistiken berechnen
	var driverStats []DriverStats
	for _, driver := range drivers {
		stats := h.calculateDriverStats(driver, usageEntries)
		driverStats = append(driverStats, stats)
	}

	// Nach gefahrenen Kilometern sortieren (absteigend)
	sort.Slice(driverStats, func(i, j int) bool {
		return driverStats[i].TotalKilometers > driverStats[j].TotalKilometers
	})

	hasEnoughData := len(usageEntries) > 0

	var message string
	if !hasEnoughData {
		message = "Zu wenige Daten für eine detaillierte Auswertung"
	}

	c.JSON(http.StatusOK, gin.H{
		"drivers": driverStats,
		"hasData": hasEnoughData,
		"message": message,
	})
}

// GetCostBreakdown liefert die Kostenaufstellung
func (h *ReportsHandler) GetCostBreakdown(c *gin.Context) {
	now := time.Now()

	// Aktueller Monat
	thisMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	thisMonthEnd := thisMonthStart.AddDate(0, 1, -1)

	// Letzter Monat
	lastMonthStart := thisMonthStart.AddDate(0, -1, 0)
	lastMonthEnd := thisMonthStart.AddDate(0, 0, -1)

	// Jahr bis heute
	yearStart := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())

	// Tankkosten
	thisMonthFuel := h.getFuelCostsByPeriod(thisMonthStart, thisMonthEnd)
	lastMonthFuel := h.getFuelCostsByPeriod(lastMonthStart, lastMonthEnd)
	yearFuel := h.getFuelCostsByPeriod(yearStart, now)

	// Wartungskosten
	thisMonthMaintenance := h.getMaintenanceCostsByPeriod(thisMonthStart, thisMonthEnd)
	lastMonthMaintenance := h.getMaintenanceCostsByPeriod(lastMonthStart, lastMonthEnd)
	yearMaintenance := h.getMaintenanceCostsByPeriod(yearStart, now)

	// Prüfen ob genügend Daten vorhanden sind
	hasData := thisMonthFuel > 0 || lastMonthFuel > 0 || thisMonthMaintenance > 0 || lastMonthMaintenance > 0

	// Änderungen berechnen
	fuelChange := 0.0
	if lastMonthFuel > 0 {
		fuelChange = ((thisMonthFuel - lastMonthFuel) / lastMonthFuel) * 100
	}

	maintenanceChange := 0.0
	if lastMonthMaintenance > 0 {
		maintenanceChange = ((thisMonthMaintenance - lastMonthMaintenance) / lastMonthMaintenance) * 100
	}

	costBreakdown := []gin.H{
		{
			"category":   "Kraftstoff",
			"thisMonth":  thisMonthFuel,
			"lastMonth":  lastMonthFuel,
			"change":     fuelChange,
			"yearToDate": yearFuel,
		},
		{
			"category":   "Wartung",
			"thisMonth":  thisMonthMaintenance,
			"lastMonth":  lastMonthMaintenance,
			"change":     maintenanceChange,
			"yearToDate": yearMaintenance,
		},
		{
			"category":   "Gesamt",
			"thisMonth":  thisMonthFuel + thisMonthMaintenance,
			"lastMonth":  lastMonthFuel + lastMonthMaintenance,
			"change":     0.0, // Wird später berechnet
			"yearToDate": yearFuel + yearMaintenance,
		},
	}

	var message string
	if !hasData {
		message = "Keine Kostendaten verfügbar"
	}

	c.JSON(http.StatusOK, gin.H{
		"costBreakdown": costBreakdown,
		"hasData":       hasData,
		"message":       message,
	})
}

// Hilfsfunktionen

func (h *ReportsHandler) calculateStats(vehicles []*model.Vehicle, drivers []*model.Driver, fuelCosts []*model.FuelCost, maintenance []*model.Maintenance, usage []*model.VehicleUsage, startDate, endDate time.Time, vehicleFilter, driverFilter string) gin.H {
	totalVehicles := len(vehicles)
	totalDrivers := len(drivers)

	// Gesamtkilometer
	totalKilometers := 0
	for _, vehicle := range vehicles {
		totalKilometers += vehicle.Mileage
	}

	// Tankkosten im Zeitraum
	totalFuelCosts := 0.0
	for _, cost := range fuelCosts {
		if cost.Date.After(startDate) && cost.Date.Before(endDate) {
			totalFuelCosts += cost.TotalCost
		}
	}

	// Wartungskosten im Zeitraum
	totalMaintenanceCosts := 0.0
	for _, m := range maintenance {
		if m.Date.After(startDate) && m.Date.Before(endDate) {
			totalMaintenanceCosts += m.Cost
		}
	}

	return gin.H{
		"totalVehicles":         totalVehicles,
		"totalDrivers":          totalDrivers,
		"totalKilometers":       totalKilometers,
		"totalFuelCosts":        totalFuelCosts,
		"totalMaintenanceCosts": totalMaintenanceCosts,
		"totalCosts":            totalFuelCosts + totalMaintenanceCosts,
	}
}

func (h *ReportsHandler) calculateVehicleStats(vehicle *model.Vehicle, fuelCosts []*model.FuelCost, maintenance []*model.Maintenance, usage []*model.VehicleUsage) VehicleStats {
	vehicleID := vehicle.ID.Hex()

	// Tankkosten für dieses Fahrzeug
	fuelCost := 0.0
	for _, cost := range fuelCosts {
		if cost.VehicleID.Hex() == vehicleID {
			fuelCost += cost.TotalCost
		}
	}

	// Wartungskosten für dieses Fahrzeug
	maintenanceCost := 0.0
	for _, m := range maintenance {
		if m.VehicleID.Hex() == vehicleID {
			maintenanceCost += m.Cost
		}
	}

	// Fahrten zählen
	trips := 0
	for _, u := range usage {
		if u.VehicleID.Hex() == vehicleID && u.Status == model.UsageStatusCompleted {
			trips++
		}
	}

	// Kosten pro Kilometer
	costPerKm := 0.0
	if vehicle.Mileage > 0 {
		costPerKm = (fuelCost + maintenanceCost) / float64(vehicle.Mileage)
	}

	// Auslastung (vereinfacht)
	utilization := 0.0
	if trips > 0 {
		utilization = float64(trips) / 30.0 * 100 // Angenommene 30 Tage
		if utilization > 100 {
			utilization = 100
		}
	}

	return VehicleStats{
		ID:               vehicleID,
		Name:             vehicle.Brand + " " + vehicle.Model,
		LicensePlate:     vehicle.LicensePlate,
		Brand:            vehicle.Brand,
		Model:            vehicle.Model,
		Mileage:          vehicle.Mileage,
		FuelCosts:        fuelCost,
		MaintenanceCosts: maintenanceCost,
		CostPerKm:        costPerKm,
		Utilization:      utilization,
		Trips:            trips,
	}
}

func (h *ReportsHandler) calculateDriverStats(driver *model.Driver, usage []*model.VehicleUsage) DriverStats {
	driverID := driver.ID.Hex()

	totalKilometers := 0
	totalTrips := 0

	// Fahrten für diesen Fahrer
	for _, u := range usage {
		if u.DriverID.Hex() == driverID && u.Status == model.UsageStatusCompleted {
			totalTrips++
			if u.EndMileage > u.StartMileage {
				totalKilometers += u.EndMileage - u.StartMileage
			}
		}
	}

	avgKmPerTrip := 0.0
	if totalTrips > 0 {
		avgKmPerTrip = float64(totalKilometers) / float64(totalTrips)
	}

	return DriverStats{
		ID:              driverID,
		Name:            driver.FirstName + " " + driver.LastName,
		Status:          string(driver.Status),
		TotalKilometers: totalKilometers,
		TotalTrips:      totalTrips,
		AvgKmPerTrip:    avgKmPerTrip,
	}
}

func (h *ReportsHandler) getFuelCostsByPeriod(start, end time.Time) float64 {
	// FindByDateRange existiert bereits
	fuelCosts, err := h.fuelCostRepo.FindByDateRange(start, end)
	if err != nil {
		return 0.0
	}

	total := 0.0
	for _, cost := range fuelCosts {
		total += cost.TotalCost
	}
	return total
}

func (h *ReportsHandler) getMaintenanceCostsByPeriod(start, end time.Time) float64 {
	maintenance, err := h.maintenanceRepo.FindAll()
	if err != nil {
		return 0.0
	}

	total := 0.0
	for _, m := range maintenance {
		if m.Date.After(start) && m.Date.Before(end) {
			total += m.Cost
		}
	}
	return total
}
