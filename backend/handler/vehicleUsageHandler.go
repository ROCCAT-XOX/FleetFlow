// backend/handler/vehicleUsageHandler.go
package handler

import (
	"net/http"
	"time"

	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VehicleUsageHandler repräsentiert den Handler für Fahrzeugnutzungs-Operationen
type VehicleUsageHandler struct {
	usageRepo   *repository.VehicleUsageRepository
	vehicleRepo *repository.VehicleRepository
	driverRepo  *repository.DriverRepository
}

// NewVehicleUsageHandler erstellt einen neuen VehicleUsageHandler
func NewVehicleUsageHandler() *VehicleUsageHandler {
	return &VehicleUsageHandler{
		usageRepo:   repository.NewVehicleUsageRepository(),
		vehicleRepo: repository.NewVehicleRepository(),
		driverRepo:  repository.NewDriverRepository(),
	}
}

// CreateUsageRequest repräsentiert die Anfrage zum Erstellen eines Nutzungseintrags
type CreateUsageRequest struct {
	VehicleID    string            `json:"vehicleId" binding:"required"`
	DriverID     string            `json:"driverId" binding:"required"`
	StartDate    string            `json:"startDate" binding:"required"`
	StartTime    string            `json:"startTime" binding:"required"`
	EndDate      string            `json:"endDate"`
	EndTime      string            `json:"endTime"`
	StartMileage int               `json:"startMileage" binding:"required"`
	EndMileage   int               `json:"endMileage"`
	Department   string            `json:"department"`
	Purpose      string            `json:"purpose"`
	Status       model.UsageStatus `json:"status"`
	Notes        string            `json:"notes"`
}

// GetUsageEntries behandelt die Anfrage, alle Nutzungseinträge abzurufen
func (h *VehicleUsageHandler) GetUsageEntries(c *gin.Context) {
	entries, err := h.usageRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Nutzungseinträge"})
		return
	}

	// Fahrzeug- und Fahrerdetails anreichern
	type UsageWithDetails struct {
		*model.VehicleUsage
		VehicleName string `json:"vehicleName"`
		DriverName  string `json:"driverName"`
	}

	var result []UsageWithDetails
	for _, entry := range entries {
		uwd := UsageWithDetails{VehicleUsage: entry}

		// Fahrzeugdetails abrufen
		vehicle, err := h.vehicleRepo.FindByID(entry.VehicleID.Hex())
		if err == nil {
			uwd.VehicleName = vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"
		}

		// Fahrerdetails abrufen
		driver, err := h.driverRepo.FindByID(entry.DriverID.Hex())
		if err == nil {
			uwd.DriverName = driver.FirstName + " " + driver.LastName
		}

		result = append(result, uwd)
	}

	c.JSON(http.StatusOK, gin.H{"usage": result})
}

// GetVehicleUsageEntries behandelt die Anfrage, alle Nutzungseinträge für ein Fahrzeug abzurufen
func (h *VehicleUsageHandler) GetVehicleUsageEntries(c *gin.Context) {
	vehicleID := c.Param("vehicleId")

	// Prüfen, ob das Fahrzeug existiert
	vehicle, err := h.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
		return
	}

	entries, err := h.usageRepo.FindByVehicle(vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Nutzungseinträge"})
		return
	}

	// Fahrerdetails anreichern
	type UsageWithDriver struct {
		*model.VehicleUsage
		DriverName string `json:"driverName"`
	}

	var result []UsageWithDriver
	for _, entry := range entries {
		uwd := UsageWithDriver{VehicleUsage: entry}

		// Fahrerdetails abrufen
		driver, err := h.driverRepo.FindByID(entry.DriverID.Hex())
		if err == nil {
			uwd.DriverName = driver.FirstName + " " + driver.LastName
		}

		result = append(result, uwd)
	}

	c.JSON(http.StatusOK, gin.H{
		"vehicle": vehicle,
		"usage":   result,
	})
}

// GetDriverUsageEntries behandelt die Anfrage, alle Nutzungseinträge für einen Fahrer abzurufen
func (h *VehicleUsageHandler) GetDriverUsageEntries(c *gin.Context) {
	driverID := c.Param("driverId")

	// Prüfen, ob der Fahrer existiert
	driver, err := h.driverRepo.FindByID(driverID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
		return
	}

	entries, err := h.usageRepo.FindByDriver(driverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Nutzungseinträge"})
		return
	}

	// Fahrzeugdetails anreichern
	type UsageWithVehicle struct {
		*model.VehicleUsage
		VehicleName string `json:"vehicleName"`
	}

	var result []UsageWithVehicle
	for _, entry := range entries {
		uwv := UsageWithVehicle{VehicleUsage: entry}

		// Fahrzeugdetails abrufen
		vehicle, err := h.vehicleRepo.FindByID(entry.VehicleID.Hex())
		if err == nil {
			uwv.VehicleName = vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"
		}

		result = append(result, uwv)
	}

	c.JSON(http.StatusOK, gin.H{
		"driver": driver,
		"usage":  result,
	})
}

// GetUsageEntry behandelt die Anfrage, einen Nutzungseintrag anhand seiner ID abzurufen
func (h *VehicleUsageHandler) GetUsageEntry(c *gin.Context) {
	id := c.Param("id")

	entry, err := h.usageRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nutzungseintrag nicht gefunden"})
		return
	}

	// Fahrzeug- und Fahrerdetails abrufen
	vehicle, _ := h.vehicleRepo.FindByID(entry.VehicleID.Hex())
	driver, _ := h.driverRepo.FindByID(entry.DriverID.Hex())

	c.JSON(http.StatusOK, gin.H{
		"usage":   entry,
		"vehicle": vehicle,
		"driver":  driver,
	})
}

// CreateUsageEntry behandelt die Anfrage, einen neuen Nutzungseintrag zu erstellen
func (h *VehicleUsageHandler) CreateUsageEntry(c *gin.Context) {
	var req CreateUsageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prüfen, ob das Fahrzeug existiert
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

	// Prüfen, ob der Fahrer existiert
	driverID, err := primitive.ObjectIDFromHex(req.DriverID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrer-ID"})
		return
	}

	driver, err := h.driverRepo.FindByID(req.DriverID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
		return
	}

	// Prüfen, ob das Fahrzeug bereits in aktiver Nutzung ist
	existingUsage, _ := h.usageRepo.FindActiveUsage(req.VehicleID)
	if existingUsage != nil && req.Status == model.UsageStatusActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Das Fahrzeug ist bereits in aktiver Nutzung"})
		return
	}

	// Startdatum und -zeit parsen
	startDateTime, err := time.Parse("2006-01-02 15:04", req.StartDate+" "+req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Startdatum oder -zeit"})
		return
	}

	// Enddatum und -zeit parsen, falls vorhanden
	var endDateTime time.Time
	if req.EndDate != "" && req.EndTime != "" {
		endDateTime, err = time.Parse("2006-01-02 15:04", req.EndDate+" "+req.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Enddatum oder -zeit"})
			return
		}

		// Prüfen, ob das Enddatum nach dem Startdatum liegt
		if endDateTime.Before(startDateTime) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Das Enddatum muss nach dem Startdatum liegen"})
			return
		}
	}

	// Neuen Nutzungseintrag erstellen
	entry := &model.VehicleUsage{
		VehicleID:    vehicleID,
		DriverID:     driverID,
		StartDate:    startDateTime,
		EndDate:      endDateTime,
		StartMileage: req.StartMileage,
		EndMileage:   req.EndMileage,
		Department:   req.Department,
		Purpose:      req.Purpose,
		Status:       req.Status,
		Notes:        req.Notes,
	}

	// Nutzungseintrag in der Datenbank speichern
	if err := h.usageRepo.Create(entry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Erstellen des Nutzungseintrags"})
		return
	}

	// Wenn Status aktiv, Fahrzeug- und Fahrerstatus aktualisieren
	if req.Status == model.UsageStatusActive {
		vehicle.Status = model.VehicleStatusInUse
		vehicle.CurrentDriverID = driverID
		h.vehicleRepo.Update(vehicle)

		driver.Status = model.DriverStatusOnDuty
		driver.AssignedVehicleID = vehicleID
		h.driverRepo.Update(driver)
	}

	// Wenn Nutzung abgeschlossen ist, Kilometerstand aktualisieren
	if req.Status == model.UsageStatusCompleted && req.EndMileage > 0 && req.EndMileage > vehicle.Mileage {
		vehicle.Mileage = req.EndMileage
		h.vehicleRepo.Update(vehicle)
	}

	c.JSON(http.StatusCreated, gin.H{"usage": entry})
}

// UpdateUsageEntry behandelt die Anfrage, einen Nutzungseintrag zu aktualisieren
func (h *VehicleUsageHandler) UpdateUsageEntry(c *gin.Context) {
	id := c.Param("id")

	// Nutzungseintrag aus der Datenbank abrufen
	entry, err := h.usageRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nutzungseintrag nicht gefunden"})
		return
	}

	var req CreateUsageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Alten Status speichern für spätere Vergleiche
	oldStatus := entry.Status
	oldVehicleID := entry.VehicleID
	oldDriverID := entry.DriverID

	// Prüfen, ob sich das Fahrzeug geändert hat
	var vehicleID primitive.ObjectID
	if req.VehicleID != entry.VehicleID.Hex() {
		var err error
		vehicleID, err = primitive.ObjectIDFromHex(req.VehicleID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrzeug-ID"})
			return
		}

		_, err = h.vehicleRepo.FindByID(req.VehicleID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
			return
		}

		// Prüfen, ob das neue Fahrzeug bereits in aktiver Nutzung ist
		if req.Status == model.UsageStatusActive {
			existingUsage, _ := h.usageRepo.FindActiveUsage(req.VehicleID)
			if existingUsage != nil && existingUsage.ID != entry.ID {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Das neue Fahrzeug ist bereits in aktiver Nutzung"})
				return
			}
		}

		entry.VehicleID = vehicleID
	}

	// Prüfen, ob sich der Fahrer geändert hat
	var driverID primitive.ObjectID
	if req.DriverID != entry.DriverID.Hex() {
		var err error
		driverID, err = primitive.ObjectIDFromHex(req.DriverID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrer-ID"})
			return
		}

		_, err = h.driverRepo.FindByID(req.DriverID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
			return
		}

		entry.DriverID = driverID
	}

	// Startdatum und -zeit parsen
	if req.StartDate != "" && req.StartTime != "" {
		startDateTime, err := time.Parse("2006-01-02 15:04", req.StartDate+" "+req.StartTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Startdatum oder -zeit"})
			return
		}
		entry.StartDate = startDateTime
	}

	// Enddatum und -zeit parsen, falls vorhanden
	if req.EndDate != "" && req.EndTime != "" {
		endDateTime, err := time.Parse("2006-01-02 15:04", req.EndDate+" "+req.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Enddatum oder -zeit"})
			return
		}

		// Prüfen, ob das Enddatum nach dem Startdatum liegt
		if endDateTime.Before(entry.StartDate) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Das Enddatum muss nach dem Startdatum liegen"})
			return
		}

		entry.EndDate = endDateTime
	}

	// Nutzungseintrag aktualisieren
	entry.StartMileage = req.StartMileage
	entry.EndMileage = req.EndMileage
	entry.Department = req.Department
	entry.Purpose = req.Purpose
	entry.Status = req.Status
	entry.Notes = req.Notes

	// Nutzungseintrag in der Datenbank aktualisieren
	if err := h.usageRepo.Update(entry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Nutzungseintrags"})
		return
	}

	// Status-Management: Fahrzeug- und Fahrerstatus aktualisieren

	// Wenn alter Status aktiv war, altes Fahrzeug und Fahrer zurücksetzen
	if oldStatus == model.UsageStatusActive {
		// Altes Fahrzeug zurücksetzen, wenn es noch dem alten Fahrer zugewiesen ist
		oldVehicle, err := h.vehicleRepo.FindByID(oldVehicleID.Hex())
		if err == nil && oldVehicle.CurrentDriverID == oldDriverID {
			oldVehicle.Status = model.VehicleStatusAvailable
			oldVehicle.CurrentDriverID = primitive.ObjectID{}
			h.vehicleRepo.Update(oldVehicle)
		}

		// Alten Fahrer zurücksetzen, wenn ihm noch das alte Fahrzeug zugewiesen ist
		oldDriver, err := h.driverRepo.FindByID(oldDriverID.Hex())
		if err == nil && oldDriver.AssignedVehicleID == oldVehicleID {
			oldDriver.Status = model.DriverStatusAvailable
			oldDriver.AssignedVehicleID = primitive.ObjectID{}
			h.driverRepo.Update(oldDriver)
		}
	}

	// Wenn neuer Status aktiv ist, neues Fahrzeug und Fahrer aktualisieren
	if entry.Status == model.UsageStatusActive {
		// Neues Fahrzeug aktualisieren
		vehicle, err := h.vehicleRepo.FindByID(entry.VehicleID.Hex())
		if err == nil {
			vehicle.Status = model.VehicleStatusInUse
			vehicle.CurrentDriverID = entry.DriverID
			h.vehicleRepo.Update(vehicle)
		}

		// Neuen Fahrer aktualisieren
		driver, err := h.driverRepo.FindByID(entry.DriverID.Hex())
		if err == nil {
			driver.Status = model.DriverStatusOnDuty
			driver.AssignedVehicleID = entry.VehicleID
			h.driverRepo.Update(driver)
		}
	}

	// Wenn Nutzung abgeschlossen ist, Kilometerstand aktualisieren
	if entry.Status == model.UsageStatusCompleted && entry.EndMileage > 0 {
		vehicle, err := h.vehicleRepo.FindByID(entry.VehicleID.Hex())
		if err == nil && entry.EndMileage > vehicle.Mileage {
			vehicle.Mileage = entry.EndMileage
			h.vehicleRepo.Update(vehicle)
		}
	}

	c.JSON(http.StatusOK, gin.H{"usage": entry})
}

// DeleteUsageEntry behandelt die Anfrage, einen Nutzungseintrag zu löschen
func (h *VehicleUsageHandler) DeleteUsageEntry(c *gin.Context) {
	id := c.Param("id")

	// Nutzungseintrag aus der Datenbank abrufen
	entry, err := h.usageRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nutzungseintrag nicht gefunden"})
		return
	}

	// Wenn der Eintrag aktiv ist, den Fahrzeug- und Fahrerstatus zurücksetzen
	if entry.Status == model.UsageStatusActive {
		// Fahrzeug zurücksetzen
		vehicle, err := h.vehicleRepo.FindByID(entry.VehicleID.Hex())
		if err == nil && vehicle.CurrentDriverID == entry.DriverID {
			vehicle.Status = model.VehicleStatusAvailable
			vehicle.CurrentDriverID = primitive.ObjectID{}
			h.vehicleRepo.Update(vehicle)
		}

		// Fahrer zurücksetzen
		driver, err := h.driverRepo.FindByID(entry.DriverID.Hex())
		if err == nil && driver.AssignedVehicleID == entry.VehicleID {
			driver.Status = model.DriverStatusAvailable
			driver.AssignedVehicleID = primitive.ObjectID{}
			h.driverRepo.Update(driver)
		}
	}

	// Nutzungseintrag aus der Datenbank löschen
	if err := h.usageRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Löschen des Nutzungseintrags"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Nutzungseintrag erfolgreich gelöscht"})
}
