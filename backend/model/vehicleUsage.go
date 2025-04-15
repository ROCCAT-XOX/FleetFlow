// backend/model/vehicleUsage.go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UsageStatus repräsentiert den Status einer Fahrzeugnutzung
type UsageStatus string

const (
	// Nutzungsstatus
	UsageStatusActive    UsageStatus = "active"
	UsageStatusCompleted UsageStatus = "completed"
	UsageStatusCancelled UsageStatus = "cancelled"
)

// VehicleUsage repräsentiert eine Fahrzeugnutzung im System
type VehicleUsage struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	VehicleID    primitive.ObjectID `bson:"vehicleId" json:"vehicleId"`
	DriverID     primitive.ObjectID `bson:"driverId" json:"driverId"`
	StartDate    time.Time          `bson:"startDate" json:"startDate"`
	EndDate      time.Time          `bson:"endDate,omitempty" json:"endDate"`
	StartMileage int                `bson:"startMileage" json:"startMileage"`
	EndMileage   int                `bson:"endMileage,omitempty" json:"endMileage"`
	Department   string             `bson:"department" json:"department"`
	Project      string             `bson:"project" json:"project"`
	Purpose      string             `bson:"purpose" json:"purpose"`
	Status       UsageStatus        `bson:"status" json:"status"`
	Notes        string             `bson:"notes" json:"notes"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}
