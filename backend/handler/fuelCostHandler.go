// backend/handler/fuelCostHandler.go
package handler

import (
	"net/http"
	"time"

	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"FleetFlow/backend/service"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FuelCostHandler repräsentiert den Handler für Tankkosten-Operationen
type FuelCostHandler struct {
	fuelCostRepo   *repository.FuelCostRepository
	vehicleRepo    *repository.VehicleRepository
	driverRepo     *repository.DriverRepository
	mileageService *service.VehicleMileageService
}

// NewFuelCostHandler erstellt einen neuen FuelCostHandler
func NewFuelCostHandler() *FuelCostHandler {
	return &FuelCostHandler{
		fuelCostRepo:   repository.NewFuelCostRepository(),
		vehicleRepo:    repository.NewVehicleRepository(),
		driverRepo:     repository.NewDriverRepository(),
		mileageService: service.NewVehicleMileageService(),
	}
}

// CreateFuelCostRequest repräsentiert die Anfrage zum Erstellen eines Tankkosteneintrags
type CreateFuelCostRequest struct {
	VehicleID     string         `json:"vehicleId" binding:"required"`
	DriverID      string         `json:"driverId"`
	Date          string         `json:"date" binding:"required"`
	FuelType      model.FuelType `json:"fuelType" binding:"required"`
	Amount        float64        `json:"amount" binding:"required"`
	PricePerUnit  float64        `json:"pricePerUnit" binding:"required"`
	TotalCost     float64        `json:"totalCost"`
	Mileage       int            `json:"mileage" binding:"required"`
	Location      string         `json:"location"`
	ReceiptNumber string         `json:"receiptNumber"`
	Notes         string         `json:"notes"`
}

// GetFuelCosts behandelt die Anfrage, alle Tankkosteneinträge abzurufen
func (h *FuelCostHandler) GetFuelCosts(c *gin.Context) {
	entries, err := h.fuelCostRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Tankkosteneinträge"})
		return
	}

	// Fahrzeug- und Fahrerdetails anreichern
	type FuelCostWithDetails struct {
		*model.FuelCost
		VehicleName string `json:"vehicleName"`
		DriverName  string `json:"driverName,omitempty"`
	}

	var result []FuelCostWithDetails
	for _, entry := range entries {
		fcwd := FuelCostWithDetails{FuelCost: entry}

		// Fahrzeugdetails abrufen
		vehicle, err := h.vehicleRepo.FindByID(entry.VehicleID.Hex())
		if err == nil {
			fcwd.VehicleName = vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"
		}

		// Fahrerdetails abrufen, falls vorhanden
		if !entry.DriverID.IsZero() {
			driver, err := h.driverRepo.FindByID(entry.DriverID.Hex())
			if err == nil {
				fcwd.DriverName = driver.FirstName + " " + driver.LastName
			}
		}

		result = append(result, fcwd)
	}

	c.JSON(http.StatusOK, gin.H{"fuelCosts": result})
}

// GetVehicleFuelCosts behandelt die Anfrage, alle Tankkosteneinträge für ein Fahrzeug abzurufen
func (h *FuelCostHandler) GetVehicleFuelCosts(c *gin.Context) {
	vehicleID := c.Param("vehicleId")

	// Prüfen, ob das Fahrzeug existiert
	vehicle, err := h.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
		return
	}

	entries, err := h.fuelCostRepo.FindByVehicle(vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Tankkosteneinträge"})
		return
	}

	// Fahrerdetails anreichern
	type FuelCostWithDriver struct {
		*model.FuelCost
		DriverName string `json:"driverName,omitempty"`
	}

	var result []FuelCostWithDriver
	for _, entry := range entries {
		fcwd := FuelCostWithDriver{FuelCost: entry}

		// Fahrerdetails abrufen, falls vorhanden
		if !entry.DriverID.IsZero() {
			driver, err := h.driverRepo.FindByID(entry.DriverID.Hex())
			if err == nil {
				fcwd.DriverName = driver.FirstName + " " + driver.LastName
			}
		}

		result = append(result, fcwd)
	}

	c.JSON(http.StatusOK, gin.H{
		"vehicle":   vehicle,
		"fuelCosts": result,
	})
}

// GetFuelCost behandelt die Anfrage, einen Tankkosteneintrag anhand seiner ID abzurufen
func (h *FuelCostHandler) GetFuelCost(c *gin.Context) {
	id := c.Param("id")

	entry, err := h.fuelCostRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tankkosteneintrag nicht gefunden"})
		return
	}

	// Fahrzeug- und Fahrerdetails abrufen
	vehicle, _ := h.vehicleRepo.FindByID(entry.VehicleID.Hex())

	var driver *model.Driver
	if !entry.DriverID.IsZero() {
		driver, _ = h.driverRepo.FindByID(entry.DriverID.Hex())
	}

	c.JSON(http.StatusOK, gin.H{
		"fuelCost": entry,
		"vehicle":  vehicle,
		"driver":   driver,
	})
}

// CreateFuelCost behandelt die Anfrage, einen neuen Tankkosteneintrag zu erstellen
func (h *FuelCostHandler) CreateFuelCost(c *gin.Context) {
	var req CreateFuelCostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fahrzeug-ID validieren
	vehicleID, err := primitive.ObjectIDFromHex(req.VehicleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrzeug-ID"})
		return
	}

	// Prüfen, ob das Fahrzeug existiert
	_, err = h.vehicleRepo.FindByID(req.VehicleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
		return
	}

	// Fahrer-ID validieren, falls vorhanden
	var driverID primitive.ObjectID
	if req.DriverID != "" {
		var err error
		driverID, err = primitive.ObjectIDFromHex(req.DriverID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrer-ID"})
			return
		}

		// Prüfen, ob der Fahrer existiert
		_, err = h.driverRepo.FindByID(req.DriverID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
			return
		}
	}

	// Datum parsen
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Datum"})
		return
	}

	// Gesamtkosten berechnen, falls nicht angegeben
	totalCost := req.TotalCost
	if totalCost == 0 {
		totalCost = req.Amount * req.PricePerUnit
	}

	// Tankkosteneintrag erstellen
	fuelCost := &model.FuelCost{
		VehicleID:     vehicleID,
		DriverID:      driverID,
		Date:          date,
		FuelType:      req.FuelType,
		Amount:        req.Amount,
		PricePerUnit:  req.PricePerUnit,
		TotalCost:     totalCost,
		Mileage:       req.Mileage,
		Location:      req.Location,
		ReceiptNumber: req.ReceiptNumber,
		Notes:         req.Notes,
	}

	// Tankkosteneintrag in der Datenbank speichern
	if err := h.fuelCostRepo.Create(fuelCost); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Erstellen des Tankkosteneintrags"})
		return
	}

	// Kilometerstand automatisch aus allen Quellen aktualisieren
	if err := h.mileageService.UpdateVehicleMileageFromAllSources(req.VehicleID); err != nil {
		// Kein kritischer Fehler, nur loggen - der Tankkosteneintrag wurde erfolgreich erstellt
		// log.Printf("Fehler beim Aktualisieren des Kilometerstands: %v", err)
	}

	c.JSON(http.StatusCreated, gin.H{"fuelCost": fuelCost})
}

// UpdateFuelCost behandelt die Anfrage, einen Tankkosteneintrag zu aktualisieren
func (h *FuelCostHandler) UpdateFuelCost(c *gin.Context) {
	id := c.Param("id")

	// Tankkosteneintrag abrufen
	fuelCost, err := h.fuelCostRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tankkosteneintrag nicht gefunden"})
		return
	}

	var req CreateFuelCostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Änderungen am Fahrzeug prüfen
	if req.VehicleID != fuelCost.VehicleID.Hex() {
		vehicleID, err := primitive.ObjectIDFromHex(req.VehicleID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrzeug-ID"})
			return
		}

		// Prüfen, ob das neue Fahrzeug existiert
		_, err = h.vehicleRepo.FindByID(req.VehicleID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
			return
		}

		fuelCost.VehicleID = vehicleID
	}

	// Änderungen am Fahrer prüfen
	if req.DriverID != "" && (fuelCost.DriverID.IsZero() || req.DriverID != fuelCost.DriverID.Hex()) {
		driverID, err := primitive.ObjectIDFromHex(req.DriverID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrer-ID"})
			return
		}

		// Prüfen, ob der neue Fahrer existiert
		_, err = h.driverRepo.FindByID(req.DriverID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
			return
		}

		fuelCost.DriverID = driverID
	} else if req.DriverID == "" {
		// Fahrer entfernen
		fuelCost.DriverID = primitive.ObjectID{}
	}

	// Datum aktualisieren
	if req.Date != "" {
		date, err := time.Parse("2006-01-02", req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Datum"})
			return
		}
		fuelCost.Date = date
	}

	// Andere Felder aktualisieren
	fuelCost.FuelType = req.FuelType
	fuelCost.Amount = req.Amount
	fuelCost.PricePerUnit = req.PricePerUnit

	// Gesamtkosten berechnen oder übernehmen
	if req.TotalCost > 0 {
		fuelCost.TotalCost = req.TotalCost
	} else {
		fuelCost.TotalCost = req.Amount * req.PricePerUnit
	}

	fuelCost.Mileage = req.Mileage
	fuelCost.Location = req.Location
	fuelCost.ReceiptNumber = req.ReceiptNumber
	fuelCost.Notes = req.Notes

	// Tankkosteneintrag in der Datenbank aktualisieren
	if err := h.fuelCostRepo.Update(fuelCost); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Tankkosteneintrags"})
		return
	}

	// Kilometerstand automatisch aus allen Quellen aktualisieren
	if err := h.mileageService.UpdateVehicleMileageFromAllSources(fuelCost.VehicleID.Hex()); err != nil {
		// Kein kritischer Fehler, nur loggen - der Tankkosteneintrag wurde erfolgreich aktualisiert
		// log.Printf("Fehler beim Aktualisieren des Kilometerstands: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{"fuelCost": fuelCost})
}

// DeleteFuelCost behandelt die Anfrage, einen Tankkosteneintrag zu löschen
func (h *FuelCostHandler) DeleteFuelCost(c *gin.Context) {
	id := c.Param("id")

	// Prüfen, ob der Tankkosteneintrag existiert
	_, err := h.fuelCostRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tankkosteneintrag nicht gefunden"})
		return
	}

	// Tankkosteneintrag löschen
	if err := h.fuelCostRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Löschen des Tankkosteneintrags"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tankkosteneintrag erfolgreich gelöscht"})
}
