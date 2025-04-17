// backend/model/fuelCost.go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FuelType repräsentiert den Kraftstofftyp
type FuelType string

const (
	FuelTypeDiesel   FuelType = "Diesel"
	FuelTypePetrol   FuelType = "Benzin"
	FuelTypeElectric FuelType = "Elektro"
	FuelTypeGas      FuelType = "Gas"
)

// FuelCost repräsentiert einen Tankkosteneintrag im System
type FuelCost struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	VehicleID     primitive.ObjectID `bson:"vehicleId" json:"vehicleId"`
	DriverID      primitive.ObjectID `bson:"driverId,omitempty" json:"driverId"`
	Date          time.Time          `bson:"date" json:"date"`
	FuelType      FuelType           `bson:"fuelType" json:"fuelType"`
	Amount        float64            `bson:"amount" json:"amount"`             // Liter/kWh
	PricePerUnit  float64            `bson:"pricePerUnit" json:"pricePerUnit"` // Preis pro Liter/kWh
	TotalCost     float64            `bson:"totalCost" json:"totalCost"`       // Gesamtkosten
	Mileage       int                `bson:"mileage" json:"mileage"`           // Kilometerstand
	Location      string             `bson:"location" json:"location"`         // Tankstelle/Ort
	ReceiptNumber string             `bson:"receiptNumber" json:"receiptNumber"`
	Notes         string             `bson:"notes" json:"notes"`
	CreatedAt     time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updatedAt" json:"updatedAt"`
}
