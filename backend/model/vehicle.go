// backend/model/vehicle.go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VehicleStatus repräsentiert den Status eines Fahrzeugs
type VehicleStatus string

// FuelType repräsentiert den Kraftstofftyp eines Fahrzeugs
type FuelType string

// InsuranceType repräsentiert den Versicherungstyp eines Fahrzeugs
type InsuranceType string

const (
	// Fahrzeugstatus
	VehicleStatusAvailable   VehicleStatus = "available"
	VehicleStatusInUse       VehicleStatus = "inuse"
	VehicleStatusMaintenance VehicleStatus = "maintenance"

	// Kraftstofftypen
	FuelTypeGasoline     FuelType = "Benzin"
	FuelTypeDiesel       FuelType = "Diesel"
	FuelTypeElectric     FuelType = "Elektro"
	FuelTypeHybridGas    FuelType = "Hybrid (Benzin/Elektro)"
	FuelTypeHybridDiesel FuelType = "Hybrid (Diesel/Elektro)"
	FuelTypeHydrogen     FuelType = "Wasserstoff"

	// Versicherungstypen
	InsuranceTypeLiability     InsuranceType = "Haftpflicht"
	InsuranceTypePartial       InsuranceType = "Teilkasko"
	InsuranceTypeComprehensive InsuranceType = "Vollkasko"
)

// Vehicle repräsentiert ein Fahrzeug im System
type Vehicle struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	LicensePlate       string             `bson:"licensePlate" json:"licensePlate"`
	Brand              string             `bson:"brand" json:"brand"`
	Model              string             `bson:"model" json:"model"`
	Year               int                `bson:"year" json:"year"`
	Color              string             `bson:"color" json:"color"`
	VehicleID          string             `bson:"vehicleId" json:"vehicleId"`
	VIN                string             `bson:"vin" json:"vin"`
	FuelType           FuelType           `bson:"fuelType" json:"fuelType"`
	Mileage            int                `bson:"mileage" json:"mileage"`
	RegistrationDate   time.Time          `bson:"registrationDate" json:"registrationDate"`
	InsuranceCompany   string             `bson:"insuranceCompany" json:"insuranceCompany"`
	InsuranceNumber    string             `bson:"insuranceNumber" json:"insuranceNumber"`
	InsuranceType      InsuranceType      `bson:"insuranceType" json:"insuranceType"`
	NextInspectionDate time.Time          `bson:"nextInspectionDate" json:"nextInspectionDate"`
	Status             VehicleStatus      `bson:"status" json:"status"`
	CurrentDriverID    primitive.ObjectID `bson:"currentDriverId,omitempty" json:"currentDriverId"`
	CreatedAt          time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt          time.Time          `bson:"updatedAt" json:"updatedAt"`
}
