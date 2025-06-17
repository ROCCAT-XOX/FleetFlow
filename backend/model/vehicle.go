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

// AcquisitionType repräsentiert die Art des Fahrzeugerwerbs
type AcquisitionType string

const (
	// Fahrzeugstatus
	VehicleStatusAvailable   VehicleStatus = "available"
	VehicleStatusInUse       VehicleStatus = "inuse"
	VehicleStatusMaintenance VehicleStatus = "maintenance"
	VehicleStatusReserved    VehicleStatus = "reserved"

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

	// Erwerbsarten
	AcquisitionTypePurchased AcquisitionType = "purchased"
	AcquisitionTypeFinanced  AcquisitionType = "financed"
	AcquisitionTypeLeased    AcquisitionType = "leased"
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
	CardNumber         string             `bson:"cardNumber" json:"cardNumber"`
	FuelType           FuelType           `bson:"fuelType" json:"fuelType"`
	Mileage            int                `bson:"mileage" json:"mileage"`
	RegistrationDate   time.Time          `bson:"registrationDate" json:"registrationDate"`
	RegistrationExpiry time.Time          `bson:"registrationExpiry" json:"registrationExpiry"`
	InsuranceCompany   string             `bson:"insuranceCompany" json:"insuranceCompany"`
	InsuranceNumber    string             `bson:"insuranceNumber" json:"insuranceNumber"`
	InsuranceType      InsuranceType      `bson:"insuranceType" json:"insuranceType"`
	InsuranceExpiry    time.Time          `bson:"insuranceExpiry" json:"insuranceExpiry"`
	InsuranceCost      float64            `bson:"insuranceCost" json:"insuranceCost"`
	NextInspectionDate time.Time          `bson:"nextInspectionDate" json:"nextInspectionDate"`
	Status             VehicleStatus      `bson:"status" json:"status"`
	CurrentDriverID    primitive.ObjectID `bson:"currentDriverId,omitempty" json:"currentDriverId"`

	// Neue technische Felder
	VehicleType        string  `bson:"vehicleType" json:"vehicleType"`               // Art des Fahrzeugs
	EngineDisplacement int     `bson:"engineDisplacement" json:"engineDisplacement"` // Hubraum in cm³
	PowerRating        float64 `bson:"powerRating" json:"powerRating"`               // Nennleistung in kW
	NumberOfAxles      int     `bson:"numberOfAxles" json:"numberOfAxles"`           // Anzahl der Achsen
	TireSize           string  `bson:"tireSize" json:"tireSize"`                     // Reifengröße
	RimType            string  `bson:"rimType" json:"rimType"`                       // Felgentyp
	GrossWeight        int     `bson:"grossWeight" json:"grossWeight"`               // Gesamtmasse in kg
	TechnicalMaxWeight int     `bson:"technicalMaxWeight" json:"technicalMaxWeight"` // Technisch zulässige Gesamtmasse in kg
	Length             int     `bson:"length" json:"length"`                         // Länge in mm
	Width              int     `bson:"width" json:"width"`                           // Breite in mm
	Height             int     `bson:"height" json:"height"`                         // Höhe in mm
	EmissionClass      string  `bson:"emissionClass" json:"emissionClass"`           // Schadstoffklasse
	CurbWeight         int     `bson:"curbWeight" json:"curbWeight"`                 // Leermasse in kg
	MaxSpeed           int     `bson:"maxSpeed" json:"maxSpeed"`                     // Höchstgeschwindigkeit in km/h
	TowingCapacity     int     `bson:"towingCapacity" json:"towingCapacity"`         // Zulässige Anhängelast in kg
	SpecialFeatures    string  `bson:"specialFeatures" json:"specialFeatures"`       // Besonderheiten

	// Finanzierungsinformationen
	AcquisitionType AcquisitionType `bson:"acquisitionType" json:"acquisitionType"`

	// Kauf-spezifische Felder
	PurchaseDate   time.Time `bson:"purchaseDate" json:"purchaseDate"`
	PurchasePrice  float64   `bson:"purchasePrice" json:"purchasePrice"`
	PurchaseVendor string    `bson:"purchaseVendor" json:"purchaseVendor"`

	// Finanzierungs-spezifische Felder
	FinanceStartDate    time.Time `bson:"financeStartDate" json:"financeStartDate"`
	FinanceEndDate      time.Time `bson:"financeEndDate" json:"financeEndDate"`
	FinanceMonthlyRate  float64   `bson:"financeMonthlyRate" json:"financeMonthlyRate"`
	FinanceInterestRate float64   `bson:"financeInterestRate" json:"financeInterestRate"`
	FinanceDownPayment  float64   `bson:"financeDownPayment" json:"financeDownPayment"`
	FinanceTotalAmount  float64   `bson:"financeTotalAmount" json:"financeTotalAmount"`
	FinanceBank         string    `bson:"financeBank" json:"financeBank"`

	// Leasing-spezifische Felder
	LeaseStartDate         time.Time `bson:"leaseStartDate" json:"leaseStartDate"`
	LeaseEndDate           time.Time `bson:"leaseEndDate" json:"leaseEndDate"`
	LeaseMonthlyRate       float64   `bson:"leaseMonthlyRate" json:"leaseMonthlyRate"`
	LeaseMileageLimit      int       `bson:"leaseMileageLimit" json:"leaseMileageLimit"`
	LeaseExcessMileageCost float64   `bson:"leaseExcessMileageCost" json:"leaseExcessMileageCost"`
	LeaseCompany           string    `bson:"leaseCompany" json:"leaseCompany"`
	LeaseContractNumber    string    `bson:"leaseContractNumber" json:"leaseContractNumber"`
	LeaseResidualValue     float64   `bson:"leaseResidualValue" json:"leaseResidualValue"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
