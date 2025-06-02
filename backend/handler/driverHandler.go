// backend/handler/driverHandler.go
package handler

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"FleetDrive/backend/service"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
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
	FirstName      string               `json:"firstName" binding:"required"`
	LastName       string               `json:"lastName" binding:"required"`
	Email          string               `json:"email" binding:"required,email"`
	Phone          string               `json:"phone"`
	Status         model.DriverStatus   `json:"status"`
	LicenseClasses []model.LicenseClass `json:"licenseClasses"`
	Notes          string               `json:"notes"`
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
			// Aktuellen Fahrer laden für bessere Fehlermeldung
			currentDriver, err := h.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
			if err == nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": fmt.Sprintf("Das Fahrzeug %s %s (%s) ist bereits dem Fahrer %s %s zugewiesen",
						vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
						currentDriver.FirstName, currentDriver.LastName),
				})
			} else {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Das Fahrzeug ist bereits einem anderen Fahrer zugewiesen"})
			}
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
			// Aktuellen Fahrer laden für bessere Fehlermeldung
			currentDriver, err := h.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
			if err == nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": fmt.Sprintf("Das Fahrzeug %s %s (%s) ist bereits dem Fahrer %s %s zugewiesen",
						vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
						currentDriver.FirstName, currentDriver.LastName),
				})
			} else {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Das Fahrzeug ist bereits einem anderen Fahrer zugewiesen"})
			}
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

// AssignVehicle behandelt die Anfrage, einem Fahrer ein Fahrzeug zuzuweisen

func (h *DriverHandler) AssignVehicle(c *gin.Context) {
	driverID := c.Param("id")

	var req AssignVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Service für die Zuweisung verwenden
	if err := h.assignmentService.AssignVehicleToDriver(driverID, req.VehicleID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
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

// clearAllAssignments löst alle aktuellen Zuweisungen für einen Fahrer auf
func (h *DriverHandler) clearAllAssignments(driver *model.Driver) error {
	fmt.Printf("=== CLEARING ALL ASSIGNMENTS ===\n")

	// 1. Aktuell zugewiesenes Fahrzeug freigeben
	if !driver.AssignedVehicleID.IsZero() {
		fmt.Printf("Releasing vehicle %s from driver\n", driver.AssignedVehicleID.Hex())

		vehicle, err := h.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
		if err == nil {
			fmt.Printf("Found vehicle: %s %s (%s)\n", vehicle.Brand, vehicle.Model, vehicle.LicensePlate)

			// Fahrzeug freigeben
			vehicle.CurrentDriverID = primitive.ObjectID{}
			vehicle.Status = model.VehicleStatusAvailable

			if err := h.vehicleRepo.Update(vehicle); err != nil {
				return fmt.Errorf("fehler beim Freigeben des Fahrzeugs %s %s: %v", vehicle.Brand, vehicle.Model, err)
			}
			fmt.Printf("Vehicle %s released successfully\n", vehicle.LicensePlate)
		} else {
			fmt.Printf("Warning: Could not find vehicle %s: %v\n", driver.AssignedVehicleID.Hex(), err)
		}
	}

	// 2. Fahrer zurücksetzen
	fmt.Printf("Clearing driver assignment\n")
	driver.AssignedVehicleID = primitive.ObjectID{}
	driver.Status = model.DriverStatusAvailable

	if err := h.driverRepo.Update(driver); err != nil {
		return fmt.Errorf("fehler beim Aktualisieren des Fahrers: %v", err)
	}

	fmt.Printf("Driver cleared successfully\n")
	return nil
}

// createNewAssignment erstellt eine neue Fahrzeugzuweisung
func (h *DriverHandler) createNewAssignment(driver *model.Driver, vehicleID string) error {
	fmt.Printf("=== CREATING NEW ASSIGNMENT ===\n")
	fmt.Printf("VehicleID: %s\n", vehicleID)

	// 1. Fahrzeug laden und validieren
	vehicleObjID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return fmt.Errorf("ungültige Fahrzeug-ID: %v", err)
	}

	vehicle, err := h.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		return fmt.Errorf("fahrzeug nicht gefunden")
	}

	fmt.Printf("Target vehicle: %s %s (%s)\n", vehicle.Brand, vehicle.Model, vehicle.LicensePlate)
	fmt.Printf("Vehicle current driver: %s\n", vehicle.CurrentDriverID.Hex())

	// 2. Prüfen ob Fahrzeug bereits zugewiesen ist
	if !vehicle.CurrentDriverID.IsZero() {
		currentDriver, err := h.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
		if err == nil {
			return fmt.Errorf("das Fahrzeug %s %s (%s) ist bereits dem Fahrer %s %s zugewiesen. Bitte entfernen Sie zuerst die Zuweisung bei diesem Fahrer",
				vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
				currentDriver.FirstName, currentDriver.LastName)
		} else {
			return fmt.Errorf("das Fahrzeug %s %s (%s) ist bereits einem anderen Fahrer zugewiesen (ID: %s)",
				vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
				vehicle.CurrentDriverID.Hex())
		}
	}

	// 3. Neue Zuweisung erstellen - WICHTIG: Beide Seiten gleichzeitig
	fmt.Printf("Creating bilateral assignment\n")

	// 3a. Fahrer aktualisieren
	driver.AssignedVehicleID = vehicleObjID
	driver.Status = model.DriverStatusOnDuty

	if err := h.driverRepo.Update(driver); err != nil {
		return fmt.Errorf("fehler beim Zuweisen des Fahrzeugs zum Fahrer: %v", err)
	}
	fmt.Printf("Driver updated with vehicle assignment\n")

	// 3b. Fahrzeug aktualisieren
	vehicle.CurrentDriverID = driver.ID
	vehicle.Status = model.VehicleStatusInUse

	if err := h.vehicleRepo.Update(vehicle); err != nil {
		// ROLLBACK: Fahrer wieder zurücksetzen
		fmt.Printf("ERROR updating vehicle, rolling back driver\n")
		driver.AssignedVehicleID = primitive.ObjectID{}
		driver.Status = model.DriverStatusAvailable
		h.driverRepo.Update(driver) // Rollback

		return fmt.Errorf("fehler beim Zuweisen des Fahrers zum Fahrzeug: %v", err)
	}
	fmt.Printf("Vehicle updated with driver assignment\n")

	// 4. Verifikation der Zuweisung
	fmt.Printf("=== VERIFYING ASSIGNMENT ===\n")
	verifyDriver, err1 := h.driverRepo.FindByID(driver.ID.Hex())
	verifyVehicle, err2 := h.vehicleRepo.FindByID(vehicleID)

	if err1 == nil && err2 == nil {
		fmt.Printf("VERIFICATION SUCCESS:\n")
		fmt.Printf("  Driver.AssignedVehicleID: %s\n", verifyDriver.AssignedVehicleID.Hex())
		fmt.Printf("  Vehicle.CurrentDriverID: %s\n", verifyVehicle.CurrentDriverID.Hex())
		fmt.Printf("  Assignment consistent: %v\n", verifyDriver.AssignedVehicleID == verifyVehicle.ID && verifyVehicle.CurrentDriverID == verifyDriver.ID)
	} else {
		fmt.Printf("VERIFICATION ERROR: Driver=%v, Vehicle=%v\n", err1, err2)
	}

	return nil
}

// unassignVehicle entfernt die Fahrzeugzuweisung von einem Fahrer
func (h *DriverHandler) unassignVehicle(c *gin.Context, driver *model.Driver) {
	fmt.Printf("=== UNASSIGN VEHICLE DEBUG ===\n")
	fmt.Printf("DriverID: %s\n", driver.ID.Hex())
	fmt.Printf("Driver Name: %s %s\n", driver.FirstName, driver.LastName)
	fmt.Printf("Current AssignedVehicleID: %s\n", driver.AssignedVehicleID.Hex())
	fmt.Printf("Driver Status: %s\n", driver.Status)

	var vehicleInfo string = "None"

	// KRITISCH: Fahrzeug ZUERST zurücksetzen, bevor wir den Fahrer ändern
	if !driver.AssignedVehicleID.IsZero() {
		fmt.Printf("Driver has assigned vehicle, loading...\n")
		vehicle, err := h.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
		if err == nil {
			vehicleInfo = fmt.Sprintf("%s %s (%s)", vehicle.Brand, vehicle.Model, vehicle.LicensePlate)
			fmt.Printf("Found vehicle: %s\n", vehicleInfo)
			fmt.Printf("Vehicle CurrentDriverID: %s\n", vehicle.CurrentDriverID.Hex())

			// Prüfen ob das Fahrzeug wirklich diesem Fahrer zugewiesen ist
			if vehicle.CurrentDriverID == driver.ID {
				fmt.Printf("Vehicle is assigned to this driver, releasing...\n")

				// WICHTIG: Fahrzeug zuerst freigeben
				vehicle.CurrentDriverID = primitive.ObjectID{}
				vehicle.Status = model.VehicleStatusAvailable

				fmt.Printf("Updating vehicle in database...\n")
				if updateErr := h.vehicleRepo.Update(vehicle); updateErr != nil {
					fmt.Printf("CRITICAL ERROR updating vehicle: %v\n", updateErr)
					c.JSON(http.StatusInternalServerError, gin.H{
						"error": fmt.Sprintf("Fehler beim Freigeben des Fahrzeugs %s: %v", vehicleInfo, updateErr),
					})
					return
				}
				fmt.Printf("Vehicle updated successfully - CurrentDriverID removed\n")

				// Verification: Fahrzeug nochmal laden
				verifyVehicle, verifyErr := h.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
				if verifyErr == nil {
					fmt.Printf("VEHICLE VERIFICATION - CurrentDriverID: %s (should be empty)\n", verifyVehicle.CurrentDriverID.Hex())
					fmt.Printf("VEHICLE VERIFICATION - Status: %s (should be available)\n", verifyVehicle.Status)
					if !verifyVehicle.CurrentDriverID.IsZero() {
						fmt.Printf("WARNING: Vehicle CurrentDriverID was not properly cleared!\n")
					}
				}
			} else {
				fmt.Printf("WARNING: Vehicle is not assigned to this driver (CurrentDriverID: %s vs DriverID: %s)\n",
					vehicle.CurrentDriverID.Hex(), driver.ID.Hex())
			}
		} else {
			fmt.Printf("ERROR finding vehicle: %v\n", err)
			// Trotzdem fortfahren und den Fahrer aktualisieren
		}
	} else {
		fmt.Printf("Driver has no assigned vehicle\n")
	}

	// JETZT den Fahrer aktualisieren
	fmt.Printf("Updating driver...\n")
	fmt.Printf("Before: AssignedVehicleID=%s, Status=%s\n", driver.AssignedVehicleID.Hex(), driver.Status)

	// Fahrer-Zuweisung entfernen
	driver.AssignedVehicleID = primitive.ObjectID{}
	driver.Status = model.DriverStatusAvailable

	fmt.Printf("After assignment: AssignedVehicleID=%s, Status=%s\n", driver.AssignedVehicleID.Hex(), driver.Status)

	fmt.Printf("Updating driver in database...\n")
	if err := h.driverRepo.Update(driver); err != nil {
		fmt.Printf("CRITICAL ERROR updating driver: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Fehler beim Aktualisieren des Fahrers: %v", err),
		})
		return
	}

	fmt.Printf("Driver updated successfully\n")

	// Verification: Driver nochmal laden um zu prüfen
	updatedDriver, verifyErr := h.driverRepo.FindByID(driver.ID.Hex())
	if verifyErr == nil {
		fmt.Printf("DRIVER VERIFICATION - AssignedVehicleID: %s (should be empty)\n", updatedDriver.AssignedVehicleID.Hex())
		fmt.Printf("DRIVER VERIFICATION - Status: %s (should be available)\n", updatedDriver.Status)
		if !updatedDriver.AssignedVehicleID.IsZero() {
			fmt.Printf("WARNING: Driver AssignedVehicleID was not properly cleared!\n")
		}
	} else {
		fmt.Printf("ERROR verifying driver: %v\n", verifyErr)
	}

	fmt.Printf("=== UNASSIGN COMPLETE ===\n")

	c.JSON(http.StatusOK, gin.H{
		"driver":      updatedDriver, // Verwende den verifizierten Fahrer
		"vehicleName": "",
		"message":     fmt.Sprintf("Fahrzeugzuweisung erfolgreich entfernt. Fahrzeug %s ist jetzt verfügbar.", vehicleInfo),
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
	for _, driver := range drivers {
		if !driver.AssignedVehicleID.IsZero() {
			// Fahrer hat ein Fahrzeug zugewiesen
			vehicle, err := h.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
			if err != nil {
				// Fahrzeug existiert nicht mehr
				issue := fmt.Sprintf("Fahrer %s %s hat nicht-existierendes Fahrzeug %s zugewiesen",
					driver.FirstName, driver.LastName, driver.AssignedVehicleID.Hex())
				issues = append(issues, issue)

				// Fahrer bereinigen
				driver.AssignedVehicleID = primitive.ObjectID{}
				driver.Status = model.DriverStatusAvailable
				h.driverRepo.Update(driver)
				fixed++
			} else if vehicle.CurrentDriverID != driver.ID {
				// Fahrzeug zeigt auf anderen/keinen Fahrer
				issue := fmt.Sprintf("Inkonsistenz: Fahrer %s %s -> Fahrzeug %s %s, aber Fahrzeug -> Fahrer %s",
					driver.FirstName, driver.LastName, vehicle.Brand, vehicle.Model, vehicle.CurrentDriverID.Hex())
				issues = append(issues, issue)

				// Beide Seiten bereinigen
				driver.AssignedVehicleID = primitive.ObjectID{}
				driver.Status = model.DriverStatusAvailable
				vehicle.CurrentDriverID = primitive.ObjectID{}
				vehicle.Status = model.VehicleStatusAvailable
				h.driverRepo.Update(driver)
				h.vehicleRepo.Update(vehicle)
				fixed++
			}
		}
	}

	// Umgekehrt prüfen
	for _, vehicle := range vehicles {
		if !vehicle.CurrentDriverID.IsZero() {
			driver, err := h.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
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
