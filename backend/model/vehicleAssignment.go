package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AssignmentType repräsentiert den Typ einer Zuweisung
type AssignmentType string

const (
	AssignmentTypeAssigned   AssignmentType = "assigned"   // Fahrzeug zugewiesen
	AssignmentTypeUnassigned AssignmentType = "unassigned" // Fahrzeug entfernt
	AssignmentTypeReassigned AssignmentType = "reassigned" // Fahrzeug neu zugewiesen
)

// VehicleAssignment repräsentiert eine Fahrzeugzuweisung in der Historie
type VehicleAssignment struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	DriverID     primitive.ObjectID `bson:"driverId" json:"driverId"`
	VehicleID    primitive.ObjectID `bson:"vehicleId,omitempty" json:"vehicleId"`
	Type         AssignmentType     `bson:"type" json:"type"`
	AssignedAt   time.Time          `bson:"assignedAt" json:"assignedAt"`
	UnassignedAt *time.Time         `bson:"unassignedAt,omitempty" json:"unassignedAt"`
	Duration     *time.Duration     `bson:"duration,omitempty" json:"duration"`
	Notes        string             `bson:"notes,omitempty" json:"notes"`
	AssignedBy   primitive.ObjectID `bson:"assignedBy,omitempty" json:"assignedBy"` // Welcher User die Zuweisung gemacht hat
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}
