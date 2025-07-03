package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ReservationStatus repräsentiert den Status einer Reservierung
type ReservationStatus string

const (
	ReservationStatusPending   ReservationStatus = "pending"   // Reservierung anstehend
	ReservationStatusApproved  ReservationStatus = "approved"  // Reservierung genehmigt
	ReservationStatusRejected  ReservationStatus = "rejected"  // Reservierung abgelehnt
	ReservationStatusActive    ReservationStatus = "active"    // Reservierung aktiv
	ReservationStatusCompleted ReservationStatus = "completed" // Reservierung abgeschlossen
	ReservationStatusCancelled ReservationStatus = "cancelled" // Reservierung storniert
)

// VehicleReservation repräsentiert eine Fahrzeug-Reservierung
type VehicleReservation struct {
	ID            primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	VehicleID     primitive.ObjectID  `bson:"vehicleId" json:"vehicleId"`
	DriverID      primitive.ObjectID  `bson:"driverId" json:"driverId"`
	StartTime     time.Time           `bson:"startTime" json:"startTime"`
	EndTime       time.Time           `bson:"endTime" json:"endTime"`
	Status        ReservationStatus   `bson:"status" json:"status"`
	Purpose       string              `bson:"purpose,omitempty" json:"purpose"`             // Zweck der Reservierung
	Notes         string              `bson:"notes,omitempty" json:"notes"`                 // Zusätzliche Notizen
	CreatedBy     primitive.ObjectID  `bson:"createdBy" json:"createdBy"`                   // Wer die Reservierung erstellt hat
	ApprovedBy    *primitive.ObjectID `bson:"approvedBy,omitempty" json:"approvedBy"`       // Wer die Reservierung genehmigt hat
	ApprovedAt    *time.Time          `bson:"approvedAt,omitempty" json:"approvedAt"`       // Wann die Reservierung genehmigt wurde
	RejectedBy    *primitive.ObjectID `bson:"rejectedBy,omitempty" json:"rejectedBy"`       // Wer die Reservierung abgelehnt hat
	RejectedAt    *time.Time          `bson:"rejectedAt,omitempty" json:"rejectedAt"`       // Wann die Reservierung abgelehnt wurde
	RejectionNote string              `bson:"rejectionNote,omitempty" json:"rejectionNote"` // Grund für Ablehnung
	CreatedAt     time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt     time.Time           `bson:"updatedAt" json:"updatedAt"`
}

// IsActive prüft ob die Reservierung aktuell aktiv ist
func (r *VehicleReservation) IsActive() bool {
	now := time.Now()
	return r.Status == ReservationStatusActive && now.After(r.StartTime) && now.Before(r.EndTime)
}

// IsPending prüft ob die Reservierung noch ansteht
func (r *VehicleReservation) IsPending() bool {
	now := time.Now()
	return r.Status == ReservationStatusPending && now.Before(r.StartTime)
}

// IsOverdue prüft ob die Reservierung überfällig ist
func (r *VehicleReservation) IsOverdue() bool {
	now := time.Now()
	return (r.Status == ReservationStatusPending || r.Status == ReservationStatusActive) && now.After(r.EndTime)
}