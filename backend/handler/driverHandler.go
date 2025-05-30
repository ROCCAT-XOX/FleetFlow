// backend/handler/driverHandler.go
package handler

import (
	"fmt"
	"net/http"
	"strings"

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

	// Debug-Ausgabe für jeden Fahrer
	fmt.Printf("=== GetDrivers Debug ===\n")
	for _, driver := range drivers {
		fmt.Printf("Driver: %s %s (ID: %s)\n", driver.FirstName, driver.LastName, driver.ID.Hex())
		fmt.Printf("  AssignedVehicleID: %s\n", driver.AssignedVehicleID.Hex())
		fmt.Printf("  Status: %s\n", driver.Status)
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
				fmt.Printf("  VehicleName: %s\n", dwd.VehicleName)
			} else {
				fmt.Printf("  Error loading vehicle: %v\n", err)
			}
		} else {
			fmt.Printf("  No vehicle assigned\n")
		}

		result = append(result, dwd)
	}

	// Cache-Control Header setzen
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

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

	// Debug-Ausgabe
	fmt.Printf("UpdateDriver: DriverID=%s, AssignedVehicleID='%s'\n", id, req.AssignedVehicleID)

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
		// Keine Fahrzeugzuweisung
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

// AssignVehicleRequest repräsentiert die Anfrage zum Zuweisen eines Fahrzeugs
type AssignVehicleRequest struct {
	VehicleID string `json:"vehicleId"`
}

// AssignVehicle behandelt die Anfrage, einem Fahrer ein Fahrzeug zuzuweisen
func (h *DriverHandler) AssignVehicle(c *gin.Context) {
	driverID := c.Param("id")

	// Prüfen, ob der Fahrer existiert
	driver, err := h.driverRepo.FindByID(driverID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
		return
	}

	var req AssignVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("=== ASSIGN VEHICLE DEBUG ===\n")
	fmt.Printf("DriverID: %s\n", driverID)
	fmt.Printf("Requested VehicleID: '%s'\n", req.VehicleID)
	fmt.Printf("VehicleID length: %d\n", len(req.VehicleID))

	// WICHTIG: Explizite Behandlung von leerem String
	if req.VehicleID == "" || strings.TrimSpace(req.VehicleID) == "" {
		fmt.Printf("Empty VehicleID detected - calling unassignVehicle\n")
		h.unassignVehicle(c, driver)
		return
	}

	// Rest der Funktion für Fahrzeugzuweisung...
	vehicleID, err := primitive.ObjectIDFromHex(req.VehicleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrzeug-ID"})
		return
	}

	vehicle, err := h.vehicleRepo.FindByID(req.VehicleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
		return
	}

	// Prüfen, ob das Fahrzeug bereits einem anderen Fahrer zugewiesen ist
	if !vehicle.CurrentDriverID.IsZero() && vehicle.CurrentDriverID.Hex() != driverID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Das Fahrzeug ist bereits einem anderen Fahrer zugewiesen"})
		return
	}

	// Altes Fahrzeug zurücksetzen, falls vorhanden
	if !driver.AssignedVehicleID.IsZero() {
		oldVehicle, err := h.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
		if err == nil && oldVehicle.CurrentDriverID.Hex() == driverID {
			oldVehicle.CurrentDriverID = primitive.ObjectID{}
			oldVehicle.Status = model.VehicleStatusAvailable
			h.vehicleRepo.Update(oldVehicle)
		}
	}

	// Neue Zuweisung setzen
	driver.AssignedVehicleID = vehicleID
	driver.Status = model.DriverStatusOnDuty

	vehicle.CurrentDriverID = driver.ID
	vehicle.Status = model.VehicleStatusInUse

	// Beide Objekte aktualisieren
	if err := h.driverRepo.Update(driver); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Fahrers"})
		return
	}

	if err := h.vehicleRepo.Update(vehicle); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Fahrzeugs"})
		return
	}

	vehicleName := vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"

	c.JSON(http.StatusOK, gin.H{
		"driver":      driver,
		"vehicleName": vehicleName,
		"message":     "Fahrzeug erfolgreich zugewiesen",
	})
}

// unassignVehicle entfernt die Fahrzeugzuweisung von einem Fahrer
func (h *DriverHandler) unassignVehicle(c *gin.Context, driver *model.Driver) {
	fmt.Printf("=== UNASSIGN VEHICLE DEBUG ===\n")
	fmt.Printf("DriverID: %s\n", driver.ID.Hex())
	fmt.Printf("Current AssignedVehicleID: %s\n", driver.AssignedVehicleID.Hex())
	fmt.Printf("Driver Status: %s\n", driver.Status)

	// Fahrzeug zurücksetzen, falls vorhanden
	if !driver.AssignedVehicleID.IsZero() {
		vehicle, err := h.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
		if err == nil {
			fmt.Printf("Found vehicle: %s %s (%s)\n", vehicle.Brand, vehicle.Model, vehicle.LicensePlate)
			fmt.Printf("Vehicle CurrentDriverID: %s\n", vehicle.CurrentDriverID.Hex())

			if vehicle.CurrentDriverID == driver.ID {
				fmt.Printf("Releasing vehicle...\n")

				vehicle.CurrentDriverID = primitive.ObjectID{}
				vehicle.Status = model.VehicleStatusAvailable

				if updateErr := h.vehicleRepo.Update(vehicle); updateErr != nil {
					fmt.Printf("ERROR updating vehicle: %v\n", updateErr)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Fahrzeugs"})
					return
				}
				fmt.Printf("Vehicle updated successfully\n")
			} else {
				fmt.Printf("Vehicle not assigned to this driver (CurrentDriverID: %s vs DriverID: %s)\n",
					vehicle.CurrentDriverID.Hex(), driver.ID.Hex())
			}
		} else {
			fmt.Printf("ERROR finding vehicle: %v\n", err)
		}
	}

	// Fahrer zurücksetzen - WICHTIG: Neues ObjectID erstellen
	fmt.Printf("Updating driver...\n")
	fmt.Printf("Before: AssignedVehicleID=%s, Status=%s\n", driver.AssignedVehicleID.Hex(), driver.Status)

	driver.AssignedVehicleID = primitive.NilObjectID
	driver.Status = model.DriverStatusAvailable

	fmt.Printf("After assignment: AssignedVehicleID=%s, Status=%s\n", driver.AssignedVehicleID.Hex(), driver.Status)

	if err := h.driverRepo.Update(driver); err != nil {
		fmt.Printf("ERROR updating driver: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Fahrers"})
		return
	}

	fmt.Printf("Driver updated successfully\n")

	// Verification: Driver nochmal laden um zu prüfen
	updatedDriver, verifyErr := h.driverRepo.FindByID(driver.ID.Hex())
	if verifyErr == nil {
		fmt.Printf("VERIFICATION - Updated driver AssignedVehicleID: %s\n", updatedDriver.AssignedVehicleID.Hex())
		fmt.Printf("VERIFICATION - Updated driver Status: %s\n", updatedDriver.Status)
	}

	c.JSON(http.StatusOK, gin.H{
		"driver":      driver,
		"vehicleName": "",
		"message":     "Fahrzeugzuweisung erfolgreich entfernt",
	})
}
