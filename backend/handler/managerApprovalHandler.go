package handler

import (
	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"FleetFlow/backend/service"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// ManagerApprovalHandler verwaltet die Manager-Genehmigungsseite
type ManagerApprovalHandler struct {
	reservationService *service.ReservationService
	vehicleRepo        *repository.VehicleRepository
	driverRepo         *repository.DriverRepository
}

// NewManagerApprovalHandler erstellt einen neuen ManagerApprovalHandler
func NewManagerApprovalHandler() *ManagerApprovalHandler {
	return &ManagerApprovalHandler{
		reservationService: service.NewReservationService(),
		vehicleRepo:        repository.NewVehicleRepository(),
		driverRepo:         repository.NewDriverRepository(),
	}
}

// ReservationWithDetails erweitert das Reservierungs-Model für die Approval-Seite
type ReservationWithDetails struct {
	model.VehicleReservation
	Vehicle *model.Vehicle `json:"vehicle,omitempty"`
	Driver  *model.Driver  `json:"driver,omitempty"`
}

// ShowManagerApprovalPage zeigt die Manager-Genehmigungsseite an
func (h *ManagerApprovalHandler) ShowManagerApprovalPage(c *gin.Context) {
	// Benutzer aus dem Kontext extrahieren
	user, exists := c.Get("user")
	if !exists {
		c.HTML(http.StatusUnauthorized, "error.html", gin.H{
			"title": "Fehler",
			"error": "Benutzer nicht authentifiziert",
		})
		return
	}

	currentUser := user.(*model.User)

	// Ausstehende Reservierungen laden
	pendingReservations, err := h.reservationService.GetPendingReservations()
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"title": "Fehler",
			"error": "Fehler beim Laden der ausstehenden Reservierungen",
		})
		return
	}

	// Reservierungen mit Fahrzeug- und Fahrer-Details anreichern
	var reservationsWithDetails []ReservationWithDetails
	for _, reservation := range pendingReservations {
		details := ReservationWithDetails{VehicleReservation: reservation}

		// Fahrzeug-Details laden
		if vehicle, err := h.vehicleRepo.FindByID(reservation.VehicleID.Hex()); err == nil {
			details.Vehicle = vehicle
		}

		// Fahrer-Details laden
		if driver, err := h.driverRepo.FindByID(reservation.DriverID.Hex()); err == nil {
			details.Driver = driver
		}

		reservationsWithDetails = append(reservationsWithDetails, details)
	}

	c.HTML(http.StatusOK, "manager-approvals.html", gin.H{
		"title":               "Reservierungen genehmigen",
		"user":                currentUser.FirstName + " " + currentUser.LastName,
		"PendingReservations": reservationsWithDetails,
		"active":              "approvals",
		"currentDate":         time.Now().Format("Montag, 02. Januar 2006"),
		"year":                time.Now().Year(),
	})
}