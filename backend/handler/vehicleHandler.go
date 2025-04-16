package handler

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"fmt"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"math/rand"
	"net/http"
	"time"
)

// VehicleHandler repräsentiert den Handler für Fahrzeug-Operationen
type VehicleHandler struct {
	vehicleRepo *repository.VehicleRepository
	driverRepo  *repository.DriverRepository
}

// NewVehicleHandler erstellt einen neuen VehicleHandler
func NewVehicleHandler() *VehicleHandler {
	return &VehicleHandler{
		vehicleRepo: repository.NewVehicleRepository(),
		driverRepo:  repository.NewDriverRepository(),
	}
}

// CreateVehicleRequest repräsentiert die Anfrage zum Erstellen eines Fahrzeugs
type CreateVehicleRequest struct {
	LicensePlate       string              `json:"licensePlate" binding:"required"`
	Brand              string              `json:"brand" binding:"required"`
	Model              string              `json:"model" binding:"required"`
	Year               int                 `json:"year" binding:"required"`
	Color              string              `json:"color"`
	VehicleID          string              `json:"vehicleId"`
	VIN                string              `json:"vin"`
	FuelType           model.FuelType      `json:"fuelType"`
	Mileage            int                 `json:"mileage"`
	RegistrationDate   string              `json:"registrationDate"`
	RegistrationExpiry string              `json:"registrationExpiry"` // Neues Feld
	InsuranceCompany   string              `json:"insuranceCompany"`
	InsuranceNumber    string              `json:"insuranceNumber"`
	InsuranceType      model.InsuranceType `json:"insuranceType"`
	InsuranceExpiry    string              `json:"insuranceExpiry"` // Neues Feld
	NextInspectionDate string              `json:"nextInspectionDate"`
	Status             model.VehicleStatus `json:"status"`
}

// GetVehicles behandelt die Anfrage, alle Fahrzeuge abzurufen
func (h *VehicleHandler) GetVehicles(c *gin.Context) {
	// Statusfilter prüfen
	statusFilter := c.Query("status")
	var vehicles []*model.Vehicle
	var err error

	if statusFilter != "" {
		// Fahrzeuge nach Status filtern
		vehicles, err = h.vehicleRepo.FindByStatus(model.VehicleStatus(statusFilter))
	} else {
		// Alle Fahrzeuge abrufen
		vehicles, err = h.vehicleRepo.FindAll()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Fahrzeuge"})
		return
	}

	// Fahrerdetails anreichern, falls vorhanden
	type VehicleWithDriver struct {
		*model.Vehicle
		DriverName string `json:"driverName,omitempty"`
	}

	var result []VehicleWithDriver
	for _, vehicle := range vehicles {
		vwd := VehicleWithDriver{Vehicle: vehicle}

		// Wenn ein Fahrer zugewiesen ist, den Namen abrufen
		if !vehicle.CurrentDriverID.IsZero() {
			driver, err := h.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
			if err == nil {
				vwd.DriverName = driver.FirstName + " " + driver.LastName
			}
		}

		result = append(result, vwd)
	}

	c.JSON(http.StatusOK, gin.H{"vehicles": result})
}

// GetVehicle behandelt die Anfrage, ein Fahrzeug anhand seiner ID abzurufen
func (h *VehicleHandler) GetVehicle(c *gin.Context) {
	id := c.Param("id")

	vehicle, err := h.vehicleRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
		return
	}

	// Fahrerdetails anreichern, falls vorhanden
	var driverName string
	if !vehicle.CurrentDriverID.IsZero() {
		driver, err := h.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
		if err == nil {
			driverName = driver.FirstName + " " + driver.LastName
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"vehicle":    vehicle,
		"driverName": driverName,
	})
}

// CreateVehicle behandelt die Anfrage, ein neues Fahrzeug zu erstellen
func (h *VehicleHandler) CreateVehicle(c *gin.Context) {
	var req CreateVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prüfen, ob ein Fahrzeug mit diesem Kennzeichen bereits existiert
	existingVehicle, _ := h.vehicleRepo.FindByLicensePlate(req.LicensePlate)
	if existingVehicle != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ein Fahrzeug mit diesem Kennzeichen existiert bereits"})
		return
	}

	// Generiere automatisch eine Fahrzeug-ID, wenn keine angegeben wurde
	vehicleID := req.VehicleID
	if vehicleID == "" {
		// Format: FD-JAHR-RANDOMNR (z.B. FD-2025-12345)
		year := time.Now().Year()
		randomPart := rand.Intn(90000) + 10000 // 5-stellige Zufallszahl
		vehicleID = fmt.Sprintf("FD-%d-%05d", year, randomPart)

	}

	// Datum parsen, wenn vorhanden
	var registrationDate, nextInspectionDate time.Time
	if req.RegistrationDate != "" {
		var err error
		registrationDate, err = time.Parse("2006-01-02", req.RegistrationDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Zulassungsdatum"})
			return
		}
	}

	if req.NextInspectionDate != "" {
		var err error
		nextInspectionDate, err = time.Parse("2006-01-02", req.NextInspectionDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges HU/AU-Datum"})
			return
		}
	}

	// Neues Fahrzeug erstellen
	vehicle := &model.Vehicle{
		LicensePlate:       req.LicensePlate,
		Brand:              req.Brand,
		Model:              req.Model,
		Year:               req.Year,
		Color:              req.Color,
		VehicleID:          vehicleID,
		VIN:                req.VIN,
		FuelType:           req.FuelType,
		Mileage:            req.Mileage,
		RegistrationDate:   registrationDate,
		InsuranceCompany:   req.InsuranceCompany,
		InsuranceNumber:    req.InsuranceNumber,
		InsuranceType:      req.InsuranceType,
		NextInspectionDate: nextInspectionDate,
		Status:             req.Status,
	}

	// Fahrzeug in der Datenbank speichern
	if err := h.vehicleRepo.Create(vehicle); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Erstellen des Fahrzeugs"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"vehicle": vehicle})
}

// UpdateVehicle behandelt die Anfrage, ein Fahrzeug zu aktualisieren
func (h *VehicleHandler) UpdateVehicle(c *gin.Context) {
	id := c.Param("id")

	// Fahrzeug aus der Datenbank abrufen
	vehicle, err := h.vehicleRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
		return
	}

	var req CreateVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prüfen, ob ein anderes Fahrzeug mit dem gleichen Kennzeichen existiert
	if req.LicensePlate != vehicle.LicensePlate {
		existingVehicle, _ := h.vehicleRepo.FindByLicensePlate(req.LicensePlate)
		if existingVehicle != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ein anderes Fahrzeug mit diesem Kennzeichen existiert bereits"})
			return
		}
	}

	// Daten aktualisieren, aber nur wenn Werte vorhanden sind
	if req.LicensePlate != "" {
		vehicle.LicensePlate = req.LicensePlate
	}
	if req.Brand != "" {
		vehicle.Brand = req.Brand
	}
	if req.Model != "" {
		vehicle.Model = req.Model
	}
	if req.Year > 0 {
		vehicle.Year = req.Year
	}
	if req.Color != "" {
		vehicle.Color = req.Color
	}

	if req.VIN != "" {
		vehicle.VIN = req.VIN
	}
	if req.FuelType != "" {
		vehicle.FuelType = req.FuelType
	}
	if req.Mileage > 0 {
		vehicle.Mileage = req.Mileage
	}
	if req.Status != "" {
		vehicle.Status = req.Status
	}

	// Datum parsen, wenn vorhanden
	if req.RegistrationDate != "" {
		registrationDate, err := time.Parse("2006-01-02", req.RegistrationDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Zulassungsdatum"})
			return
		}
		vehicle.RegistrationDate = registrationDate
	}

	// Ablaufdatum der Zulassung parsen
	if req.RegistrationExpiry != "" {
		registrationExpiry, err := time.Parse("2006-01-02", req.RegistrationExpiry)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Ablaufdatum der Zulassung"})
			return
		}
		vehicle.RegistrationExpiry = registrationExpiry
	}

	// Ablaufdatum der Versicherung parsen
	if req.InsuranceExpiry != "" {
		insuranceExpiry, err := time.Parse("2006-01-02", req.InsuranceExpiry)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Ablaufdatum der Versicherung"})
			return
		}
		vehicle.InsuranceExpiry = insuranceExpiry
	}

	if req.NextInspectionDate != "" {
		nextInspectionDate, err := time.Parse("2006-01-02", req.NextInspectionDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges HU/AU-Datum"})
			return
		}
		vehicle.NextInspectionDate = nextInspectionDate
	}

	// Fahrzeug aktualisieren
	vehicle.LicensePlate = req.LicensePlate
	vehicle.Brand = req.Brand
	vehicle.Model = req.Model
	vehicle.Year = req.Year
	vehicle.Color = req.Color
	vehicle.VIN = req.VIN
	vehicle.FuelType = req.FuelType
	vehicle.Mileage = req.Mileage
	vehicle.InsuranceCompany = req.InsuranceCompany
	vehicle.InsuranceNumber = req.InsuranceNumber
	vehicle.InsuranceType = req.InsuranceType
	vehicle.Status = req.Status

	// Fahrzeug in der Datenbank aktualisieren
	if err := h.vehicleRepo.Update(vehicle); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Fahrzeugs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"vehicle": vehicle})
}

// DeleteVehicle behandelt die Anfrage, ein Fahrzeug zu löschen
func (h *VehicleHandler) DeleteVehicle(c *gin.Context) {
	id := c.Param("id")

	// Prüfen, ob das Fahrzeug existiert
	vehicle, err := h.vehicleRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
		return
	}

	// Wenn das Fahrzeug einem Fahrer zugewiesen ist, die Zuweisung aufheben
	if !vehicle.CurrentDriverID.IsZero() {
		driver, err := h.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
		if err == nil && driver.AssignedVehicleID == vehicle.ID {
			driver.AssignedVehicleID = primitive.ObjectID{}
			h.driverRepo.Update(driver)
		}
	}

	// Fahrzeug aus der Datenbank löschen
	if err := h.vehicleRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Löschen des Fahrzeugs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Fahrzeug erfolgreich gelöscht"})
}
