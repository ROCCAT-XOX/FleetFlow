// backend/handler/vehicleHandler.go
package handler

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"FleetDrive/backend/service"
	"fmt"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"math/rand"
	"net/http"
	"time"
)

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

// VehicleHandler repräsentiert den Handler für Fahrzeug-Operationen
type VehicleHandler struct {
	vehicleRepo     *repository.VehicleRepository
	driverRepo      *repository.DriverRepository
	activityService *service.ActivityService
}

// NewVehicleHandler erstellt einen neuen VehicleHandler
func NewVehicleHandler() *VehicleHandler {
	return &VehicleHandler{
		vehicleRepo:     repository.NewVehicleRepository(),
		driverRepo:      repository.NewDriverRepository(),
		activityService: service.NewActivityService(),
	}
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
	var registrationDate, registrationExpiry, insuranceExpiry, nextInspectionDate time.Time
	if req.RegistrationDate != "" {
		var err error
		registrationDate, err = time.Parse("2006-01-02", req.RegistrationDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Zulassungsdatum"})
			return
		}
	}

	if req.RegistrationExpiry != "" {
		var err error
		registrationExpiry, err = time.Parse("2006-01-02", req.RegistrationExpiry)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Ablaufdatum der Zulassung"})
			return
		}
	}

	if req.InsuranceExpiry != "" {
		var err error
		insuranceExpiry, err = time.Parse("2006-01-02", req.InsuranceExpiry)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Ablaufdatum der Versicherung"})
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

	// Status standardmäßig auf verfügbar setzen, wenn nicht angegeben
	status := req.Status
	if status == "" {
		status = model.VehicleStatusAvailable
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
		RegistrationExpiry: registrationExpiry,
		InsuranceCompany:   req.InsuranceCompany,
		InsuranceNumber:    req.InsuranceNumber,
		InsuranceType:      req.InsuranceType,
		InsuranceExpiry:    insuranceExpiry,
		NextInspectionDate: nextInspectionDate,
		Status:             status,
	}

	// Fahrzeug in der Datenbank speichern
	if err := h.vehicleRepo.Create(vehicle); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Erstellen des Fahrzeugs"})
		return
	}

	// Aktivität protokollieren mit dem ActivityService
	userId, exists := c.Get("userId")
	if exists {
		userID, err := service.GetUserIDFromContext(userId)
		if err == nil {
			details := map[string]interface{}{
				"brand":        vehicle.Brand,
				"model":        vehicle.Model,
				"licensePlate": vehicle.LicensePlate,
				"year":         vehicle.Year,
				"vehicleId":    vehicleID,
			}
			description := "Fahrzeug erstellt: " + vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"

			h.activityService.LogVehicleActivity(
				model.ActivityTypeVehicleCreated,
				userID,
				vehicle.ID,
				description,
				details,
			)
		}
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

	// Alte Werte speichern für die Aktivitätsprotokollierung
	oldBrand := vehicle.Brand
	oldModel := vehicle.Model
	oldLicensePlate := vehicle.LicensePlate
	oldColor := vehicle.Color
	oldStatus := vehicle.Status
	oldMileage := vehicle.Mileage

	// Daten aktualisieren
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

	// Fahrzeug in der Datenbank aktualisieren
	if err := h.vehicleRepo.Update(vehicle); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Fahrzeugs"})
		return
	}

	// Aktivität protokollieren mit dem ActivityService
	userId, exists := c.Get("userId")
	if exists {
		userID, err := service.GetUserIDFromContext(userId)
		if err == nil {
			// Nutze die Hilfsfunktion zum Extrahieren von Änderungen
			changes := make(map[string]interface{})
			service.ExtractChanges(changes, "brand", oldBrand, vehicle.Brand)
			service.ExtractChanges(changes, "model", oldModel, vehicle.Model)
			service.ExtractChanges(changes, "licensePlate", oldLicensePlate, vehicle.LicensePlate)
			service.ExtractChanges(changes, "color", oldColor, vehicle.Color)
			service.ExtractChanges(changes, "status", oldStatus, vehicle.Status)
			service.ExtractChanges(changes, "mileage", oldMileage, vehicle.Mileage)

			description := "Fahrzeug aktualisiert: " + vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"

			h.activityService.LogVehicleActivity(
				model.ActivityTypeVehicleUpdated,
				userID,
				vehicle.ID,
				description,
				changes,
			)
		}
	}

	c.JSON(http.StatusOK, gin.H{"vehicle": vehicle})
}

// UpdateBasicInfo behandelt die Anfrage, nur die Grunddaten eines Fahrzeugs zu aktualisieren
func (h *VehicleHandler) UpdateBasicInfo(c *gin.Context) {
	id := c.Param("id")

	// Fahrzeug aus der Datenbank abrufen
	vehicle, err := h.vehicleRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
		return
	}

	var req struct {
		LicensePlate string         `json:"licensePlate"`
		Brand        string         `json:"brand"`
		Model        string         `json:"model"`
		Year         int            `json:"year"`
		Color        string         `json:"color"`
		VehicleID    string         `json:"vehicleId"`
		VIN          string         `json:"vin"`
		FuelType     model.FuelType `json:"fuelType"`
		Mileage      int            `json:"mileage"`

		// Neue technische Felder
		VehicleType        string  `json:"vehicleType"`
		EngineDisplacement int     `json:"engineDisplacement"`
		PowerRating        float64 `json:"powerRating"`
		NumberOfAxles      int     `json:"numberOfAxles"`
		TireSize           string  `json:"tireSize"`
		RimType            string  `json:"rimType"`
		GrossWeight        int     `json:"grossWeight"`
		TechnicalMaxWeight int     `json:"technicalMaxWeight"`
		Length             int     `json:"length"`
		Width              int     `json:"width"`
		Height             int     `json:"height"`
		EmissionClass      string  `json:"emissionClass"`
		CurbWeight         int     `json:"curbWeight"`
		MaxSpeed           int     `json:"maxSpeed"`
		TowingCapacity     int     `json:"towingCapacity"`
		SpecialFeatures    string  `json:"specialFeatures"`
	}

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

	// Alte Werte speichern für die Aktivitätsprotokollierung
	oldLicensePlate := vehicle.LicensePlate
	oldBrand := vehicle.Brand
	oldModel := vehicle.Model
	oldColor := vehicle.Color
	oldMileage := vehicle.Mileage
	oldVIN := vehicle.VIN

	// Grunddaten aktualisieren
	vehicle.LicensePlate = req.LicensePlate
	vehicle.Brand = req.Brand
	vehicle.Model = req.Model
	vehicle.Year = req.Year
	vehicle.Color = req.Color
	vehicle.VehicleID = req.VehicleID
	vehicle.VIN = req.VIN
	vehicle.FuelType = req.FuelType
	vehicle.Mileage = req.Mileage

	// Neue technische Felder aktualisieren
	vehicle.VehicleType = req.VehicleType
	vehicle.EngineDisplacement = req.EngineDisplacement
	vehicle.PowerRating = req.PowerRating
	vehicle.NumberOfAxles = req.NumberOfAxles
	vehicle.TireSize = req.TireSize
	vehicle.RimType = req.RimType
	vehicle.GrossWeight = req.GrossWeight
	vehicle.TechnicalMaxWeight = req.TechnicalMaxWeight
	vehicle.Length = req.Length
	vehicle.Width = req.Width
	vehicle.Height = req.Height
	vehicle.EmissionClass = req.EmissionClass
	vehicle.CurbWeight = req.CurbWeight
	vehicle.MaxSpeed = req.MaxSpeed
	vehicle.TowingCapacity = req.TowingCapacity
	vehicle.SpecialFeatures = req.SpecialFeatures

	// Fahrzeug in der Datenbank aktualisieren
	if err := h.vehicleRepo.Update(vehicle); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Fahrzeugs"})
		return
	}

	// Aktivität protokollieren mit dem ActivityService
	userId, exists := c.Get("userId")
	if exists {
		userID, err := service.GetUserIDFromContext(userId)
		if err == nil {
			// Nutze die Hilfsfunktion zum Extrahieren von Änderungen
			changes := make(map[string]interface{})
			service.ExtractChanges(changes, "licensePlate", oldLicensePlate, vehicle.LicensePlate)
			service.ExtractChanges(changes, "brand", oldBrand, vehicle.Brand)
			service.ExtractChanges(changes, "model", oldModel, vehicle.Model)
			service.ExtractChanges(changes, "color", oldColor, vehicle.Color)
			service.ExtractChanges(changes, "mileage", oldMileage, vehicle.Mileage)
			service.ExtractChanges(changes, "vin", oldVIN, vehicle.VIN)

			description := "Grunddaten aktualisiert: " + vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"

			h.activityService.LogVehicleActivity(
				model.ActivityTypeVehicleUpdated,
				userID,
				vehicle.ID,
				description,
				changes,
			)
		}
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

	// Kopieren der Fahrzeugdaten vor dem Löschen für die Aktivitätsprotokollierung
	deletedVehicleInfo := map[string]interface{}{
		"vehicleId":    id,
		"brand":        vehicle.Brand,
		"model":        vehicle.Model,
		"licensePlate": vehicle.LicensePlate,
		"year":         vehicle.Year,
	}

	// Fahrzeug aus der Datenbank löschen
	if err := h.vehicleRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Löschen des Fahrzeugs"})
		return
	}

	// Aktivität protokollieren mit dem ActivityService
	userId, exists := c.Get("userId")
	if exists {
		userID, err := service.GetUserIDFromContext(userId)
		if err == nil {
			description := "Fahrzeug gelöscht: " + vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"

			h.activityService.LogVehicleActivity(
				model.ActivityTypeVehicleDeleted,
				userID,
				primitive.ObjectID{}, // Leere ID, da das Fahrzeug gelöscht wurde
				description,
				deletedVehicleInfo,
			)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Fahrzeug erfolgreich gelöscht"})
}
