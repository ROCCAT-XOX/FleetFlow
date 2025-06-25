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

// Strukturen für Finanzierungsstatistiken
type FinancingStatistics struct {
	TotalMonthlyCosts     float64            `json:"totalMonthlyCosts"`
	AverageCostPerVehicle float64            `json:"averageCostPerVehicle"`
	Breakdown             FinancingBreakdown `json:"breakdown"`
	ExpiringContracts     []ExpiringContract `json:"expiringContracts"`
}

type FinancingBreakdown struct {
	PurchasedCount int     `json:"purchasedCount"`
	FinancedCount  int     `json:"financedCount"`
	LeasedCount    int     `json:"leasedCount"`
	FinancedCosts  float64 `json:"financedCosts"`
	LeasedCosts    float64 `json:"leasedCosts"`
}

type ExpiringContract struct {
	VehicleID    string    `json:"vehicleId"`
	VehicleName  string    `json:"vehicleName"`
	ContractType string    `json:"contractType"`
	EndDate      time.Time `json:"endDate"`
	DaysLeft     int       `json:"daysLeft"`
}

// GetCompleteDashboardData liefert alle Daten für das Dashboard
func (h *DashboardHandler) GetCompleteDashboardData(c *gin.Context) {
	// Basisstatistiken
	vehicles, _ := h.vehicleRepo.FindAll()
	var totalVehicles, availableVehicles, inUseVehicles, maintenanceVehicles, reservedVehicles int64

	totalVehicles = int64(len(vehicles))
	for _, v := range vehicles {
		switch v.Status {
		case model.VehicleStatusAvailable:
			availableVehicles++
		case model.VehicleStatusInUse:
			inUseVehicles++
		case model.VehicleStatusMaintenance:
			maintenanceVehicles++
		case model.VehicleStatusReserved:
			reservedVehicles++
		}
	}

	// Finanzierungsstatistiken berechnen
	financingStats := h.calculateFinancingStatistics(vehicles)

	// Letzte Fahrzeuge (max 6)
	recentVehicles := vehicles
	if len(recentVehicles) > 6 {
		recentVehicles = recentVehicles[:6]
	}

	// Fahrer-Statistiken
	drivers, _ := h.driverRepo.FindAll()
	recentDrivers := drivers
	if len(recentDrivers) > 5 {
		recentDrivers = recentDrivers[:5]
	}

	// Aktive Fahrer zählen (verfügbar oder im Dienst)
	var activeDrivers int64
	for _, driver := range drivers {
		if driver.Status == model.DriverStatusAvailable || driver.Status == model.DriverStatusOnDuty {
			activeDrivers++
		}
	}

	// Anstehende Wartungen (nur nächster Monat)
	upcomingMaintenance := h.getUpcomingMaintenanceNextMonth()

	// Letzte Aktivitäten
	recentActivities := h.getRecentActivityList()

	// Kraftstoffkosten nach Fahrzeug (Top 5)
	fuelCostData := h.getFuelCostsByVehicleData()

	// Wartungskosten der letzten 12 Monate
	maintenanceCostData := h.getMaintenanceCostData()

	// Historische Kostenübersicht (12 Monate)
	historicalCostData := h.getHistoricalCostData()

	// Fahrzeugstatus-Verteilung für Dashboard-Charts
	vehicleStatusData := h.getVehicleStatusDistribution(vehicles)

	// Fahrzeugtypen-Verteilung
	vehicleTypesData := h.getVehicleTypesDistribution(vehicles)

	// Fahrer-Status-Verteilung
	driverStatusData := h.getDriverStatusDistribution(drivers)

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
		"title":                 "Dashboard",
		"user":                  userName,
		"userRole":              userRole,
		"currentDate":           currentDate,
		"year":                  time.Now().Year(),
		"totalVehicles":         totalVehicles,
		"availableVehicles":     availableVehicles,
		"inUseVehicles":         inUseVehicles,
		"maintenanceVehicles":   maintenanceVehicles,
		"reservedVehicles":      reservedVehicles,
		"activeDrivers":         activeDrivers,
		"totalDrivers":          int64(len(drivers)),
		"recentVehicles":        recentVehicles,
		"recentDrivers":         recentDrivers,
		"upcomingMaintenance":   upcomingMaintenance,
		"recentActivities":      recentActivities,
		"fuelCostVehicleLabels": fuelCostData.Labels,
		"fuelCostVehicleData":   fuelCostData.Data,
		// Finanzierungsstatistiken (kombiniert Finanzierung + Leasing)
		"totalFinancingCosts":   financingStats.TotalMonthlyCosts,
		"financingBreakdown":    financingStats.Breakdown,
		"averageCostPerVehicle": financingStats.AverageCostPerVehicle,
		"expiringContracts":     financingStats.ExpiringContracts,
		// Wartungskosten
		"maintenanceCostLabels": maintenanceCostData.Labels,
		"maintenanceCostData":   maintenanceCostData.Data,
		"totalMaintenanceCosts": maintenanceCostData.Total,
		// Neue historische Kostendaten
		"historicalCostLabels":      historicalCostData.Labels,
		"historicalMaintenanceData": historicalCostData.MaintenanceData,
		"historicalFuelData":        historicalCostData.FuelData,
		"historicalLeasingData":     historicalCostData.LeasingData,
		"historicalFinancingData":   historicalCostData.FinancingData,
		// Zusätzliche Chart-Daten
		"vehicleStatusLabels":       vehicleStatusData.Labels,
		"vehicleStatusData":         vehicleStatusData.Data,
		"totalActiveVehicles":       vehicleStatusData.Total,
		"vehicleTypesLabels":        vehicleTypesData.Labels,
		"vehicleTypesData":          vehicleTypesData.Data,
		"driverStatusLabels":        driverStatusData.Labels,
		"driverStatusData":          driverStatusData.Data,
	})
}

// calculateFinancingStatistics berechnet Finanzierungsstatistiken
func (h *DashboardHandler) calculateFinancingStatistics(vehicles []*model.Vehicle) FinancingStatistics {
	stats := FinancingStatistics{
		Breakdown: FinancingBreakdown{},
	}

	var totalMonthlyCosts float64
	var financedCosts, leasedCosts float64
	var expiringContracts []ExpiringContract
	now := time.Now()
	threeMonthsFromNow := now.AddDate(0, 3, 0)

	for _, vehicle := range vehicles {
		switch vehicle.AcquisitionType {
		case model.AcquisitionTypePurchased:
			stats.Breakdown.PurchasedCount++

		case model.AcquisitionTypeFinanced:
			stats.Breakdown.FinancedCount++
			financedCosts += vehicle.FinanceMonthlyRate
			totalMonthlyCosts += vehicle.FinanceMonthlyRate

			// Prüfe auf auslaufende Finanzierungsverträge
			if !vehicle.FinanceEndDate.IsZero() && vehicle.FinanceEndDate.Before(threeMonthsFromNow) && vehicle.FinanceEndDate.After(now) {
				expiringContracts = append(expiringContracts, ExpiringContract{
					VehicleID:    vehicle.ID.Hex(),
					VehicleName:  vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")",
					ContractType: "Finanzierung",
					EndDate:      vehicle.FinanceEndDate,
					DaysLeft:     int(vehicle.FinanceEndDate.Sub(now).Hours() / 24),
				})
			}

		case model.AcquisitionTypeLeased:
			stats.Breakdown.LeasedCount++
			leasedCosts += vehicle.LeaseMonthlyRate
			totalMonthlyCosts += vehicle.LeaseMonthlyRate

			// Prüfe auf auslaufende Leasingverträge
			if !vehicle.LeaseEndDate.IsZero() && vehicle.LeaseEndDate.Before(threeMonthsFromNow) && vehicle.LeaseEndDate.After(now) {
				expiringContracts = append(expiringContracts, ExpiringContract{
					VehicleID:    vehicle.ID.Hex(),
					VehicleName:  vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")",
					ContractType: "Leasing",
					EndDate:      vehicle.LeaseEndDate,
					DaysLeft:     int(vehicle.LeaseEndDate.Sub(now).Hours() / 24),
				})
			}
		}
	}

	stats.TotalMonthlyCosts = totalMonthlyCosts
	stats.Breakdown.FinancedCosts = financedCosts
	stats.Breakdown.LeasedCosts = leasedCosts
	stats.ExpiringContracts = expiringContracts

	// Durchschnittliche Kosten pro Fahrzeug
	if len(vehicles) > 0 {
		stats.AverageCostPerVehicle = totalMonthlyCosts / float64(len(vehicles))
	}

	return stats
}

// getMaintenanceCostData berechnet Wartungskosten der letzten 12 Monate
func (h *DashboardHandler) getMaintenanceCostData() struct {
	Labels []string
	Data   []float64
	Total  float64
} {
	result := struct {
		Labels []string
		Data   []float64
		Total  float64
	}{}

	// Letzten 12 Monate
	now := time.Now()
	for i := 11; i >= 0; i-- {
		month := now.AddDate(0, -i, 0)
		monthStr := month.Format("Jan 2006")
		result.Labels = append(result.Labels, monthStr)

		// Wartungskosten für diesen Monat berechnen
		startOfMonth := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, month.Location())
		endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Nanosecond)

		maintenanceEntries, _ := h.maintenanceRepo.FindAll()
		var monthlyCost float64

		for _, entry := range maintenanceEntries {
			if entry.Date.After(startOfMonth) && entry.Date.Before(endOfMonth) {
				monthlyCost += entry.Cost
			}
		}

		result.Data = append(result.Data, monthlyCost)
		result.Total += monthlyCost
	}

	return result
}

// getHistoricalCostData berechnet historische Kosten für alle Kategorien
func (h *DashboardHandler) getHistoricalCostData() struct {
	Labels          []string
	MaintenanceData []float64
	FuelData        []float64
	LeasingData     []float64
	FinancingData   []float64
} {
	result := struct {
		Labels          []string
		MaintenanceData []float64
		FuelData        []float64
		LeasingData     []float64
		FinancingData   []float64
	}{}

	vehicles, _ := h.vehicleRepo.FindAll()

	// Leasing- und Finanzierungskosten berechnen
	var totalLeasing, totalFinancing float64
	for _, vehicle := range vehicles {
		if vehicle.AcquisitionType == model.AcquisitionTypeLeased {
			totalLeasing += vehicle.LeaseMonthlyRate
		} else if vehicle.AcquisitionType == model.AcquisitionTypeFinanced {
			totalFinancing += vehicle.FinanceMonthlyRate
		}
	}

	// Letzten 12 Monate
	now := time.Now()
	for i := 11; i >= 0; i-- {
		month := now.AddDate(0, -i, 0)
		monthStr := month.Format("Jan 2006")
		result.Labels = append(result.Labels, monthStr)

		// Zeitraum für diesen Monat
		startOfMonth := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, month.Location())
		endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Nanosecond)

		// Wartungskosten
		maintenanceEntries, _ := h.maintenanceRepo.FindAll()
		var monthlyCostMaintenance float64
		for _, entry := range maintenanceEntries {
			if entry.Date.After(startOfMonth) && entry.Date.Before(endOfMonth) {
				monthlyCostMaintenance += entry.Cost
			}
		}
		result.MaintenanceData = append(result.MaintenanceData, monthlyCostMaintenance)

		// Kraftstoffkosten
		fuelCosts, _ := h.fuelCostRepo.FindByDateRange(startOfMonth, endOfMonth)
		var monthlyCostFuel float64
		for _, cost := range fuelCosts {
			monthlyCostFuel += cost.TotalCost
		}
		result.FuelData = append(result.FuelData, monthlyCostFuel)

		// Leasing- und Finanzierungskosten (monatlich konstant)
		result.LeasingData = append(result.LeasingData, totalLeasing)
		result.FinancingData = append(result.FinancingData, totalFinancing)
	}

	return result
}

// getUpcomingMaintenanceNextMonth gibt nur Wartungen des nächsten Monats zurück
func (h *DashboardHandler) getUpcomingMaintenanceNextMonth() []gin.H {
	vehicles, _ := h.vehicleRepo.FindAll()
	now := time.Now()
	nextMonth := now.AddDate(0, 1, 0)

	// Zeitraum: ab heute bis Ende nächsten Monats
	endOfNextMonth := time.Date(nextMonth.Year(), nextMonth.Month(), 1, 0, 0, 0, 0, nextMonth.Location()).AddDate(0, 1, 0).Add(-time.Nanosecond)

	var upcoming []gin.H
	upcomingMap := make(map[string]gin.H) // Um Duplikate zu vermeiden

	// 1. Fahrzeug-Inspektionstermine prüfen
	for _, vehicle := range vehicles {
		if !vehicle.NextInspectionDate.IsZero() &&
			vehicle.NextInspectionDate.After(now) &&
			vehicle.NextInspectionDate.Before(endOfNextMonth) {
			
			key := vehicle.ID.Hex() + "_inspection"
			upcomingMap[key] = gin.H{
				"vehicleId":     vehicle.ID.Hex(),
				"vehicleName":   vehicle.Brand + " " + vehicle.Model,
				"licensePlate":  vehicle.LicensePlate,
				"nextDueDate":   vehicle.NextInspectionDate,
				"daysRemaining": int(vehicle.NextInspectionDate.Sub(now).Hours() / 24),
				"type":          "Inspektion",
				"source":        "vehicle",
			}
		}
	}

	// 2. Geplante Wartungseinträge prüfen
	maintenanceRepo := repository.NewMaintenanceRepository()
	upcomingMaintenances, err := maintenanceRepo.FindUpcoming(now, endOfNextMonth)
	if err == nil {
		// Vehicle-Map für schnelle Zugriffe erstellen
		vehicleMap := make(map[string]*model.Vehicle)
		for _, vehicle := range vehicles {
			vehicleMap[vehicle.ID.Hex()] = vehicle
		}

		for _, maintenance := range upcomingMaintenances {
			vehicle, exists := vehicleMap[maintenance.VehicleID.Hex()]
			if !exists {
				continue
			}

			// Wartungstyp übersetzen
			var maintenanceTypeText string
			switch maintenance.Type {
			case model.MaintenanceTypeInspection:
				maintenanceTypeText = "Inspektion"
			case model.MaintenanceTypeOilChange:
				maintenanceTypeText = "Ölwechsel"
			case model.MaintenanceTypeTireChange:
				maintenanceTypeText = "Reifenwechsel"
			case model.MaintenanceTypeRepair:
				maintenanceTypeText = "Reparatur"
			case model.MaintenanceTypeOther:
				maintenanceTypeText = "Sonstiges"
			default:
				maintenanceTypeText = string(maintenance.Type)
			}

			key := maintenance.VehicleID.Hex() + "_" + maintenance.ID.Hex()
			upcomingMap[key] = gin.H{
				"vehicleId":       vehicle.ID.Hex(),
				"vehicleName":     vehicle.Brand + " " + vehicle.Model,
				"licensePlate":    vehicle.LicensePlate,
				"nextDueDate":     maintenance.Date,
				"daysRemaining":   int(maintenance.Date.Sub(now).Hours() / 24),
				"type":            maintenanceTypeText,
				"source":          "maintenance",
				"maintenanceId":   maintenance.ID.Hex(),
			}
		}
	}

	// Map zu Slice konvertieren
	for _, item := range upcomingMap {
		upcoming = append(upcoming, item)
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

// Hilfsmethoden für spezifische Daten

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
		
		// Prüfen ob das Fahrzeug noch existiert
		if vehicle, err := h.vehicleRepo.FindByID(vehicleID); err == nil {
			vehicleCosts[vehicleID] += cost.TotalCost
			if _, exists := vehicleNames[vehicleID]; !exists {
				vehicleNames[vehicleID] = vehicle.LicensePlate
			}
		}
		// Wenn das Fahrzeug nicht existiert, ignorieren wir die Kosten
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

// getVehicleStatusDistribution berechnet die Fahrzeugstatus-Verteilung für Charts
func (h *DashboardHandler) getVehicleStatusDistribution(vehicles []*model.Vehicle) struct {
	Labels []string
	Data   []int
	Total  int
} {
	result := struct {
		Labels []string
		Data   []int
		Total  int
	}{
		Labels: []string{"Verfügbar", "In Nutzung", "In Wartung", "Reserviert"},
		Data:   []int{0, 0, 0, 0},
		Total:  len(vehicles),
	}

	for _, vehicle := range vehicles {
		switch vehicle.Status {
		case model.VehicleStatusAvailable:
			result.Data[0]++
		case model.VehicleStatusInUse:
			result.Data[1]++
		case model.VehicleStatusMaintenance:
			result.Data[2]++
		case model.VehicleStatusReserved:
			result.Data[3]++
		}
	}

	return result
}

// getVehicleTypesDistribution berechnet die Fahrzeugtypen-Verteilung für Charts
func (h *DashboardHandler) getVehicleTypesDistribution(vehicles []*model.Vehicle) struct {
	Labels []string
	Data   []int
	Total  int
} {
	typeCount := make(map[string]int)
	
	for _, vehicle := range vehicles {
		if vehicle.VehicleType != "" {
			typeCount[string(vehicle.VehicleType)]++
		} else {
			typeCount["Unbekannt"]++
		}
	}

	result := struct {
		Labels []string
		Data   []int
		Total  int
	}{
		Total: len(vehicles),
	}

	for vehicleType, count := range typeCount {
		result.Labels = append(result.Labels, vehicleType)
		result.Data = append(result.Data, count)
	}

	return result
}

// getDriverStatusDistribution berechnet die Fahrer-Status-Verteilung für Charts
func (h *DashboardHandler) getDriverStatusDistribution(drivers []*model.Driver) struct {
	Labels []string
	Data   []int
	Total  int
} {
	result := struct {
		Labels []string
		Data   []int
		Total  int
	}{
		Labels: []string{"Verfügbar", "Im Dienst", "Außer Dienst", "Reserviert"},
		Data:   []int{0, 0, 0, 0},
		Total:  len(drivers),
	}

	for _, driver := range drivers {
		switch driver.Status {
		case model.DriverStatusAvailable:
			result.Data[0]++
		case model.DriverStatusOnDuty:
			result.Data[1]++
		case model.DriverStatusOffDuty:
			result.Data[2]++
		case model.DriverStatusReserved:
			result.Data[3]++
		}
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

// API-Methoden

// GetDashboardStats returns general statistics for the dashboard
func (h *DashboardHandler) GetDashboardStats(c *gin.Context) {
	stats := struct {
		TotalVehicles       int64 `json:"totalVehicles"`
		AvailableVehicles   int64 `json:"availableVehicles"`
		MaintenanceVehicles int64 `json:"maintenanceVehicles"`
		InUseVehicles       int64 `json:"inUseVehicles"`
		ReservedVehicles    int64 `json:"reservedVehicles"`
		TotalDrivers        int64 `json:"totalDrivers"`
		ActiveDrivers       int64 `json:"activeDrivers"`
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
		case model.VehicleStatusReserved:
			stats.ReservedVehicles++
		}
	}

	// Get all drivers
	drivers, err := h.driverRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Fahrer"})
		return
	}

	// Count total and active drivers
	stats.TotalDrivers = int64(len(drivers))
	for _, driver := range drivers {
		if driver.Status == model.DriverStatusAvailable || driver.Status == model.DriverStatusOnDuty {
			stats.ActiveDrivers++
		}
	}

	c.JSON(http.StatusOK, stats)
}

// GetFinancingStats liefert Finanzierungsstatistiken
func (h *DashboardHandler) GetFinancingStats(c *gin.Context) {
	vehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Fahrzeuge"})
		return
	}

	stats := h.calculateFinancingStatistics(vehicles)
	c.JSON(http.StatusOK, stats)
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

	// Kosten nach Fahrzeug gruppieren (nur existierende Fahrzeuge)
	vehicleCosts := make(map[string]float64)
	for _, cost := range fuelCosts {
		vehicleID := cost.VehicleID.Hex()
		// Prüfen ob das Fahrzeug noch existiert
		if _, exists := vehicleNames[vehicleID]; exists {
			vehicleCosts[vehicleID] += cost.TotalCost
		}
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
