// backend/handler/activityHandler.go
package handler

import (
	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ActivityHandler repräsentiert den Handler für Aktivitäts-Operationen
type ActivityHandler struct {
	activityRepo *repository.ActivityRepository
	vehicleRepo  *repository.VehicleRepository
	driverRepo   *repository.DriverRepository
}

// NewActivityHandler erstellt einen neuen ActivityHandler
func NewActivityHandler() *ActivityHandler {
	return &ActivityHandler{
		activityRepo: repository.NewActivityRepository(),
		vehicleRepo:  repository.NewVehicleRepository(),
		driverRepo:   repository.NewDriverRepository(),
	}
}

// GetActivities behandelt die Anfrage, Aktivitäten abzurufen
func (h *ActivityHandler) GetActivities(c *gin.Context) {
	// Parameter für Paginierung
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))

	// Optional: Filter nach Typ
	activityType := c.Query("type")

	var activities []*model.Activity
	var err error

	if activityType != "" {
		activities, err = h.activityRepo.FindByType(model.ActivityType(activityType), limit, skip)
	} else {
		activities, err = h.activityRepo.FindAll(limit, skip)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Aktivitäten"})
		return
	}

	// Fahrzeug- und Fahrerdetails anreichern
	type ActivityWithDetails struct {
		*model.Activity
		VehicleName string `json:"vehicleName,omitempty"`
		DriverName  string `json:"driverName,omitempty"`
		UserName    string `json:"userName,omitempty"`
	}

	var result []ActivityWithDetails
	for _, activity := range activities {
		awd := ActivityWithDetails{Activity: activity}

		// Fahrzeugdetails abrufen, falls vorhanden
		if !activity.VehicleID.IsZero() {
			vehicle, err := h.vehicleRepo.FindByID(activity.VehicleID.Hex())
			if err == nil {
				awd.VehicleName = vehicle.Brand + " " + vehicle.Model + " (" + vehicle.LicensePlate + ")"
			}
		}

		// Fahrerdetails abrufen, falls vorhanden
		if !activity.DriverID.IsZero() {
			driver, err := h.driverRepo.FindByID(activity.DriverID.Hex())
			if err == nil {
				awd.DriverName = driver.FirstName + " " + driver.LastName
			}
		}

		result = append(result, awd)
	}

	c.JSON(http.StatusOK, gin.H{"activities": result})
}

// GetVehicleActivities behandelt die Anfrage, alle Aktivitäten für ein Fahrzeug abzurufen
func (h *ActivityHandler) GetVehicleActivities(c *gin.Context) {
	vehicleID := c.Param("vehicleId")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))

	// Prüfen, ob das Fahrzeug existiert
	vehicle, err := h.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
		return
	}

	activities, err := h.activityRepo.FindByVehicle(vehicleID, limit, skip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Aktivitäten"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"vehicle":    vehicle,
		"activities": activities,
	})
}

// GetDriverActivities behandelt die Anfrage, alle Aktivitäten für einen Fahrer abzurufen
func (h *ActivityHandler) GetDriverActivities(c *gin.Context) {
	driverID := c.Param("driverId")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))

	// Prüfen, ob der Fahrer existiert
	driver, err := h.driverRepo.FindByID(driverID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
		return
	}

	activities, err := h.activityRepo.FindByDriver(driverID, limit, skip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Aktivitäten"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"driver":     driver,
		"activities": activities,
	})
}
