// backend/model/maintenance.go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MaintenanceType repräsentiert den Typ einer Wartung
type MaintenanceType string

const (
	// Wartungstypen
	MaintenanceTypeInspection MaintenanceType = "inspection"
	MaintenanceTypeOilChange  MaintenanceType = "oil-change"
	MaintenanceTypeTireChange MaintenanceType = "tire-change"
	MaintenanceTypeRepair     MaintenanceType = "repair"
	MaintenanceTypeOther      MaintenanceType = "other"
)

// Maintenance repräsentiert einen Wartungseintrag im System
type Maintenance struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	VehicleID primitive.ObjectID `bson:"vehicleId" json:"vehicleId"`
	Date      time.Time          `bson:"date" json:"date"`
	Type      MaintenanceType    `bson:"type" json:"type"`
	Mileage   int                `bson:"mileage" json:"mileage"`
	Cost      float64            `bson:"cost" json:"cost"`
	Workshop  string             `bson:"workshop" json:"workshop"`
	Notes     string             `bson:"notes" json:"notes"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}
