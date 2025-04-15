// backend/handler/driverHandler.go
package handler

import (
	"net/http"

	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DriverHandler repräsentiert den Handler für Fahrer-Operationen
type DriverHandler struct {
	driverRepo  *repository.DriverRepository
	vehicleRepo *repository.VehicleRepository
}

// NewDriverHandler erstellt einen neuen DriverHandler
func NewDriverHandler() *DriverHandler {
	return &DriverHandler{
		driverRepo:  repository.NewDriverRepository(),
		vehicleRepo: repository.NewVehicleRepository(),
	}
}

// CreateDriverRequest repräsentiert die Anfrage zum Erstellen eines Fahrers
type CreateDriverRequest struct {
	FirstName         string               `json:"firstName" binding:"required"`
	LastName          string               `json:"lastName" binding:"required"`
	Email             string               `json:"email" binding:"required,email"`
	Phone             string               `json:"phone"`
	Status            model.DriverStatus   `json:"status"`
	AssignedVehicleID string               `json:"assignedVehicleId"`
	LicenseClasses    []model.LicenseClass `json:"licenseClasses"`
	Notes             string               `json:"notes"`
}

// GetDrivers behandelt die Anfrage, alle Fahrer abzurufen
func (h *DriverHandler) GetDrivers(c *gin.Context) {
	// Statusfilter prüfen
	statusFilter := c.Query("status")
	var drivers []*model.Driver
	var err error

	if statusFilter != "" {
		// Fahrer nach Status filtern
		drivers, err = h.driverRepo.FindByStatus(model.DriverStatus(statusFilter))
	} else {
		// Alle Fahrer abrufen
		drivers, err = h.driverRepo.FindAll()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Fahrer"})
		return
	}

	// Fahrzeugdetails anreichern, falls vorhanden
	type DriverWithVehicle struct {
		*model.Driver
		VehicleName string `json:"vehicleName,omitempty"`
	}

	var result []DriverWithVehicle
	for _, driver := range drivers {
		dwd := DriverWithVehicle{Driver: driver}

		// Wenn ein Fahrzeug zugewiesen ist, die Details abrufen
		if !driver.AssignedVehicleID.IsZero() {
			vehicle, err := h.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
			if err == nil {
				dwd.VehicleName = vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"
			}
		}

		result = append(result, dwd)
	}

	c.JSON(http.StatusOK, gin.H{"drivers": result})
}

// GetDriver behandelt die Anfrage, einen Fahrer anhand seiner ID abzurufen
func (h *DriverHandler) GetDriver(c *gin.Context) {
	id := c.Param("id")

	driver, err := h.driverRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
		return
	}

	// Fahrzeugdetails anreichern, falls vorhanden
	var vehicleName string
	if !driver.AssignedVehicleID.IsZero() {
		vehicle, err := h.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
		if err == nil {
			vehicleName = vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"driver":      driver,
		"vehicleName": vehicleName,
	})
}

// CreateDriver behandelt die Anfrage, einen neuen Fahrer zu erstellen
func (h *DriverHandler) CreateDriver(c *gin.Context) {
	var req CreateDriverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prüfen, ob ein Fahrer mit dieser E-Mail-Adresse bereits existiert
	existingDriver, _ := h.driverRepo.FindByEmail(req.Email)
	if existingDriver != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ein Fahrer mit dieser E-Mail-Adresse existiert bereits"})
		return
	}

	// Neuen Fahrer erstellen
	driver := &model.Driver{
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		Email:          req.Email,
		Phone:          req.Phone,
		Status:         req.Status,
		LicenseClasses: req.LicenseClasses,
		Notes:          req.Notes,
	}

	// Fahrzeugzuweisung prüfen
	if req.AssignedVehicleID != "" {
		vehicleID, err := primitive.ObjectIDFromHex(req.AssignedVehicleID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrzeug-ID"})
			return
		}

		// Prüfen, ob das Fahrzeug existiert
		vehicle, err := h.vehicleRepo.FindByID(req.AssignedVehicleID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Fahrzeug nicht gefunden"})
			return
		}

		// Prüfen, ob das Fahrzeug bereits einem anderen Fahrer zugewiesen ist
		if !vehicle.CurrentDriverID.IsZero() && vehicle.CurrentDriverID != driver.ID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Das Fahrzeug ist bereits einem anderen Fahrer zugewiesen"})
			return
		}

		driver.AssignedVehicleID = vehicleID

		// Fahrzeug aktualisieren
		vehicle.CurrentDriverID = driver.ID
		vehicle.Status = model.VehicleStatusInUse
		h.vehicleRepo.Update(vehicle)
	}

	// Fahrer in der Datenbank speichern
	if err := h.driverRepo.Create(driver); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Erstellen des Fahrers"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"driver": driver})
}

// UpdateDriver behandelt die Anfrage, einen Fahrer zu aktualisieren
func (h *DriverHandler) UpdateDriver(c *gin.Context) {
	id := c.Param("id")

	// Fahrer aus der Datenbank abrufen
	driver, err := h.driverRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
		return
	}

	var req CreateDriverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prüfen, ob ein anderer Fahrer mit der gleichen E-Mail-Adresse existiert
	if req.Email != driver.Email {
		existingDriver, _ := h.driverRepo.FindByEmail(req.Email)
		if existingDriver != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ein anderer Fahrer mit dieser E-Mail-Adresse existiert bereits"})
			return
		}
	}

	// Alte Fahrzeugzuweisung prüfen und ggf. aufheben
	if !driver.AssignedVehicleID.IsZero() {
		oldVehicle, err := h.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
		if err == nil && oldVehicle.CurrentDriverID == driver.ID {
			oldVehicle.CurrentDriverID = primitive.ObjectID{}
			if oldVehicle.Status == model.VehicleStatusInUse {
				oldVehicle.Status = model.VehicleStatusAvailable
			}
			h.vehicleRepo.Update(oldVehicle)
		}
	}

	// Fahrer aktualisieren
	driver.FirstName = req.FirstName
	driver.LastName = req.LastName
	driver.Email = req.Email
	driver.Phone = req.Phone
	driver.Status = req.Status
	driver.LicenseClasses = req.LicenseClasses
	driver.Notes = req.Notes

	// Neue Fahrzeugzuweisung prüfen
	if req.AssignedVehicleID != "" {
		vehicleID, err := primitive.ObjectIDFromHex(req.AssignedVehicleID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrzeug-ID"})
			return
		}

		// Prüfen, ob das Fahrzeug existiert
		vehicle, err := h.vehicleRepo.FindByID(req.AssignedVehicleID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Fahrzeug nicht gefunden"})
			return
		}

		// Prüfen, ob das Fahrzeug bereits einem anderen Fahrer zugewiesen ist
		if !vehicle.CurrentDriverID.IsZero() && vehicle.CurrentDriverID != driver.ID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Das Fahrzeug ist bereits einem anderen Fahrer zugewiesen"})
			return
		}

		driver.AssignedVehicleID = vehicleID

		// Fahrzeug aktualisieren
		vehicle.CurrentDriverID = driver.ID
		vehicle.Status = model.VehicleStatusInUse
		h.vehicleRepo.Update(vehicle)
	} else {
		driver.AssignedVehicleID = primitive.ObjectID{}
	}

	// Fahrer in der Datenbank aktualisieren
	if err := h.driverRepo.Update(driver); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Fahrers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"driver": driver})
}

// DeleteDriver behandelt die Anfrage, einen Fahrer zu löschen
func (h *DriverHandler) DeleteDriver(c *gin.Context) {
	id := c.Param("id")

	// Prüfen, ob der Fahrer existiert
	driver, err := h.driverRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
		return
	}

	// Wenn dem Fahrer ein Fahrzeug zugewiesen ist, die Zuweisung aufheben
	if !driver.AssignedVehicleID.IsZero() {
		vehicle, err := h.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
		if err == nil && vehicle.CurrentDriverID == driver.ID {
			vehicle.CurrentDriverID = primitive.ObjectID{}
			if vehicle.Status == model.VehicleStatusInUse {
				vehicle.Status = model.VehicleStatusAvailable
			}
			h.vehicleRepo.Update(vehicle)
		}
	}

	// Fahrer aus der Datenbank löschen
	if err := h.driverRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Löschen des Fahrers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Fahrer erfolgreich gelöscht"})
}
