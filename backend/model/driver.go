// backend/model/driver.go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DriverStatus repräsentiert den Status eines Fahrers
type DriverStatus string

// LicenseClass repräsentiert eine Führerscheinklasse
type LicenseClass string

const (
	// Fahrerstatus
	DriverStatusAvailable DriverStatus = "available"
	DriverStatusOnDuty    DriverStatus = "onduty"
	DriverStatusOffDuty   DriverStatus = "offduty"
	DriverStatusReserved  DriverStatus = "reserved"

	// Führerscheinklassen
	LicenseClassA   LicenseClass = "A"
	LicenseClassA1  LicenseClass = "A1"
	LicenseClassB   LicenseClass = "B"
	LicenseClassBE  LicenseClass = "BE"
	LicenseClassC   LicenseClass = "C"
	LicenseClassC1  LicenseClass = "C1"
	LicenseClassCE  LicenseClass = "CE"
	LicenseClassC1E LicenseClass = "C1E"
	LicenseClassD   LicenseClass = "D"
	LicenseClassD1  LicenseClass = "D1"
	LicenseClassDE  LicenseClass = "DE"
	LicenseClassD1E LicenseClass = "D1E"
)

// Driver repräsentiert einen Fahrer im System
type Driver struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	FirstName         string             `bson:"firstName" json:"firstName"`
	LastName          string             `bson:"lastName" json:"lastName"`
	Email             string             `bson:"email" json:"email"`
	Phone             string             `bson:"phone" json:"phone"`
	Status            DriverStatus       `bson:"status" json:"status"`
	AssignedVehicleID primitive.ObjectID `bson:"assignedVehicleId,omitempty" json:"assignedVehicleId"`
	LicenseClasses    []LicenseClass     `bson:"licenseClasses" json:"licenseClasses"`
	Notes             string             `bson:"notes" json:"notes"`
	CreatedAt         time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt         time.Time          `bson:"updatedAt" json:"updatedAt"`
}
