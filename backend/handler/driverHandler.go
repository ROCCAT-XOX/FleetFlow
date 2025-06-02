// backend/handler/driverHandler.go
package handler

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"FleetDrive/backend/service"
	"fmt"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"net/http"
)

// DriverHandler repräsentiert den Handler für Fahrer-Operationen
type DriverHandler struct {
	driverRepo        *repository.DriverRepository
	vehicleRepo       *repository.VehicleRepository
	assignmentService *service.AssignmentService
}

// NewDriverHandler erstellt einen neuen DriverHandler
func NewDriverHandler() *DriverHandler {
	return &DriverHandler{
		driverRepo:        repository.NewDriverRepository(),
		vehicleRepo:       repository.NewVehicleRepository(),
		assignmentService: service.NewAssignmentService(),
	}
}

// CreateDriverRequest repräsentiert die Anfrage zum Erstellen eines Fahrers
type CreateDriverRequest struct {
	FirstName         string               `json:"firstName" binding:"required"`
	LastName          string               `json:"lastName" binding:"required"`
	Email             string               `json:"email" binding:"required,email"`
	Phone             string               `json:"phone"`
	Status            model.DriverStatus   `json:"status"`
	AssignedVehicleID string               `json:"assignedVehicleId"` // Hinzugefügtes Feld
	LicenseClasses    []model.LicenseClass `json:"licenseClasses"`
	Notes             string               `json:"notes"`
}

// AssignVehicleRequest repräsentiert die Anfrage zum Zuweisen eines Fahrzeugs
type AssignVehicleRequest struct {
	VehicleID string `json:"vehicleId"`
}

// GetDrivers behandelt die Anfrage, alle Fahrer abzurufen
func (h *DriverHandler) GetDrivers(c *gin.Context) {
	statusFilter := c.Query("status")
	var drivers []*model.Driver
	var err error

	if statusFilter != "" {
		drivers, err = h.driverRepo.FindByStatus(model.DriverStatus(statusFilter))
	} else {
		drivers, err = h.driverRepo.FindAll()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Fahrer"})
		return
	}

	// Fahrzeugdetails dynamisch hinzufügen
	type DriverWithVehicle struct {
		*model.Driver
		VehicleName       string `json:"vehicleName,omitempty"`
		AssignedVehicleId string `json:"assignedVehicleId,omitempty"` // Für Frontend-Kompatibilität
	}

	var result []DriverWithVehicle
	for _, driver := range drivers {
		dwd := DriverWithVehicle{Driver: driver}

		// Zugewiesenes Fahrzeug über Service ermitteln
		vehicle, err := h.assignmentService.GetAssignedVehicle(driver.ID.Hex())
		if err == nil && vehicle != nil {
			dwd.VehicleName = vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"
			dwd.AssignedVehicleId = vehicle.ID.Hex()
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

	// Fahrzeugdetails dynamisch hinzufügen
	var vehicleName string
	var assignedVehicleId string
	vehicle, err := h.assignmentService.GetAssignedVehicle(id)
	if err == nil && vehicle != nil {
		vehicleName = vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"
		assignedVehicleId = vehicle.ID.Hex()
	}

	c.JSON(http.StatusOK, gin.H{
		"driver": gin.H{
			"id":                driver.ID.Hex(),
			"firstName":         driver.FirstName,
			"lastName":          driver.LastName,
			"email":             driver.Email,
			"phone":             driver.Phone,
			"status":            driver.Status,
			"licenseClasses":    driver.LicenseClasses,
			"notes":             driver.Notes,
			"assignedVehicleId": assignedVehicleId, // Für Frontend-Kompatibilität
		},
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

	// Status standardmäßig auf verfügbar setzen, wenn nicht angegeben
	status := req.Status
	if status == "" {
		status = model.DriverStatusAvailable
	}

	// Neuen Fahrer erstellen
	driver := &model.Driver{
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		Email:          req.Email,
		Phone:          req.Phone,
		Status:         status,
		LicenseClasses: req.LicenseClasses,
		Notes:          req.Notes,
	}

	// Fahrer in der Datenbank speichern
	if err := h.driverRepo.Create(driver); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Erstellen des Fahrers"})
		return
	}

	// SAUBERE LÖSUNG: AssignmentService für Fahrzeugzuweisung verwenden
	if req.AssignedVehicleID != "" {
		if err := h.assignmentService.AssignVehicleToDriver(driver.ID.Hex(), req.AssignedVehicleID); err != nil {
			// Bei Fehler den Fahrer wieder löschen (Rollback)
			h.driverRepo.Delete(driver.ID.Hex())
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
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

	// Status validieren
	status := req.Status
	if status == "" {
		status = model.DriverStatusAvailable
	}

	// Fahrer Grunddaten aktualisieren
	driver.FirstName = req.FirstName
	driver.LastName = req.LastName
	driver.Email = req.Email
	driver.Phone = req.Phone
	driver.Status = status
	driver.LicenseClasses = req.LicenseClasses
	driver.Notes = req.Notes

	// Fahrer in der Datenbank aktualisieren
	if err := h.driverRepo.Update(driver); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Fahrers"})
		return
	}

	// SAUBERE LÖSUNG: AssignmentService für Fahrzeugzuweisung verwenden
	if err := h.assignmentService.AssignVehicleToDriver(id, req.AssignedVehicleID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Aktualisierten Fahrer laden
	updatedDriver, err := h.driverRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der aktualisierten Daten"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"driver": updatedDriver})
	fmt.Printf("=== AFTER UPDATE - DEBUG INFO ===\n")
	h.assignmentService.DebugAllAssignments()
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

// AssignVehicle behandelt die Anfrage, einem Fahrer ein Fahrzeug zuzuweisen
func (h *DriverHandler) AssignVehicle(c *gin.Context) {
	driverID := c.Param("id")

	var req AssignVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("=== ASSIGN VEHICLE API CALL ===\n")
	fmt.Printf("DriverID: %s\n", driverID)
	fmt.Printf("VehicleID: '%s' (length: %d)\n", req.VehicleID, len(req.VehicleID))
	fmt.Printf("Is empty: %v\n", req.VehicleID == "")

	// Debug: Aktuelle Zuweisungen vor der Änderung
	fmt.Printf("BEFORE assignment:\n")
	h.assignmentService.DebugAllAssignments()

	// Service für die Zuweisung verwenden
	if err := h.assignmentService.AssignVehicleToDriver(driverID, req.VehicleID); err != nil {
		fmt.Printf("ERROR in assignment: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Debug: Zuweisungen nach der Änderung
	fmt.Printf("AFTER assignment:\n")
	h.assignmentService.DebugAllAssignments()

	// Konsistenz prüfen
	issues := h.assignmentService.ValidateAllAssignments()
	if len(issues) > 0 {
		fmt.Printf("CONSISTENCY ISSUES FOUND:\n")
		for _, issue := range issues {
			fmt.Printf("  - %s\n", issue)
		}
	} else {
		fmt.Printf("All assignments are consistent\n")
	}

	// Aktualisierte Daten laden
	updatedDriver, err := h.driverRepo.FindByID(driverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der aktualisierten Daten"})
		return
	}

	var vehicleName string
	var message string

	vehicle, err := h.assignmentService.GetAssignedVehicle(driverID)
	if err == nil && vehicle != nil {
		vehicleName = vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"
		message = "Fahrzeug erfolgreich zugewiesen"
	} else {
		vehicleName = ""
		message = "Fahrzeugzuweisung erfolgreich entfernt"
	}

	c.JSON(http.StatusOK, gin.H{
		"driver":      updatedDriver,
		"vehicleName": vehicleName,
		"message":     message,
	})
}

// CleanupInconsistentAssignments bereinigt inkonsistente Fahrzeugzuweisungen
func (h *DriverHandler) CleanupInconsistentAssignments(c *gin.Context) {
	fmt.Printf("=== CLEANUP INCONSISTENT ASSIGNMENTS ===\n")

	// Alle Fahrer und Fahrzeuge laden
	drivers, err := h.driverRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Fahrer"})
		return
	}

	vehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Fahrzeuge"})
		return
	}

	var issues []string
	var fixed int

	// Inkonsistenzen finden und beheben
	for _, currentDriver := range drivers {
		if !currentDriver.AssignedVehicleID.IsZero() {
			// Fahrer hat ein Fahrzeug zugewiesen
			vehicle, err := h.vehicleRepo.FindByID(currentDriver.AssignedVehicleID.Hex())
			if err != nil {
				// Fahrzeug existiert nicht mehr
				issue := fmt.Sprintf("Fahrer %s %s hat nicht-existierendes Fahrzeug %s zugewiesen",
					currentDriver.FirstName, currentDriver.LastName, currentDriver.AssignedVehicleID.Hex())
				issues = append(issues, issue)

				// Fahrer bereinigen
				currentDriver.AssignedVehicleID = primitive.ObjectID{}
				currentDriver.Status = model.DriverStatusAvailable
				h.driverRepo.Update(currentDriver)
				fixed++
			} else if vehicle.CurrentDriverID != currentDriver.ID {
				// Fahrzeug zeigt auf anderen/keinen Fahrer
				issue := fmt.Sprintf("Inkonsistenz: Fahrer %s %s -> Fahrzeug %s %s, aber Fahrzeug -> Fahrer %s",
					currentDriver.FirstName, currentDriver.LastName, vehicle.Brand, vehicle.Model, vehicle.CurrentDriverID.Hex())
				issues = append(issues, issue)

				// Beide Seiten bereinigen
				currentDriver.AssignedVehicleID = primitive.ObjectID{}
				currentDriver.Status = model.DriverStatusAvailable
				vehicle.CurrentDriverID = primitive.ObjectID{}
				vehicle.Status = model.VehicleStatusAvailable
				h.driverRepo.Update(currentDriver)
				h.vehicleRepo.Update(vehicle)
				fixed++
			}
		}
	}

	// Umgekehrt prüfen
	for _, vehicle := range vehicles {
		if !vehicle.CurrentDriverID.IsZero() {
			_, err := h.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
			if err != nil {
				// Fahrer existiert nicht mehr
				issue := fmt.Sprintf("Fahrzeug %s %s hat nicht-existierenden Fahrer %s zugewiesen",
					vehicle.Brand, vehicle.Model, vehicle.CurrentDriverID.Hex())
				issues = append(issues, issue)

				// Fahrzeug bereinigen
				vehicle.CurrentDriverID = primitive.ObjectID{}
				vehicle.Status = model.VehicleStatusAvailable
				h.vehicleRepo.Update(vehicle)
				fixed++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bereinigung abgeschlossen",
		"issues":  issues,
		"fixed":   fixed,
	})
}
