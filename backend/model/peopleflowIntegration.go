// backend/model/peopleflowIntegration.go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PeopleFlowIntegration repräsentiert die PeopleFlow-Integration-Konfiguration
type PeopleFlowIntegration struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	IsActive        bool               `bson:"isActive" json:"isActive"`
	BaseURL         string             `bson:"baseUrl" json:"baseUrl"`
	Username        string             `bson:"username" json:"username"`
	Password        string             `bson:"password" json:"password"` // Verschlüsselt gespeichert
	AutoSync        bool               `bson:"autoSync" json:"autoSync"`
	SyncInterval    int                `bson:"syncInterval" json:"syncInterval"` // Minuten
	LastSync        time.Time          `bson:"lastSync" json:"lastSync"`
	LastSyncStatus  string             `bson:"lastSyncStatus" json:"lastSyncStatus"`
	SyncedEmployees int                `bson:"syncedEmployees" json:"syncedEmployees"`
	FailedAttempts  int                `bson:"failedAttempts" json:"failedAttempts"`
	CreatedAt       time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// PeopleFlowEmployee repräsentiert einen Mitarbeiter aus PeopleFlow
type PeopleFlowEmployee struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PeopleFlowID   string             `bson:"peopleFlowId" json:"peopleFlowId"`
	Email          string             `bson:"email" json:"email"` // Identifikator
	FirstName      string             `bson:"firstName" json:"firstName"`
	LastName       string             `bson:"lastName" json:"lastName"`
	Phone          string             `bson:"phone" json:"phone"`
	Department     string             `bson:"department" json:"department"`
	Position       string             `bson:"position" json:"position"`
	EmployeeNumber string             `bson:"employeeNumber" json:"employeeNumber"`
	HireDate       time.Time          `bson:"hireDate" json:"hireDate"`
	Status         string             `bson:"status" json:"status"`
	Manager        string             `bson:"manager" json:"manager"`
	Location       string             `bson:"location" json:"location"`
	CostCenter     string             `bson:"costCenter" json:"costCenter"`

	// Führerschein-relevante Informationen
	LicenseClasses  []LicenseClass `bson:"licenseClasses" json:"licenseClasses"`
	LicenseExpiry   time.Time      `bson:"licenseExpiry" json:"licenseExpiry"`
	HasValidLicense bool           `bson:"hasValidLicense" json:"hasValidLicense"`

	// Sync-Informationen
	LastSyncedAt     time.Time `bson:"lastSyncedAt" json:"lastSyncedAt"`
	SyncStatus       string    `bson:"syncStatus" json:"syncStatus"`
	IsDriverEligible bool      `bson:"isDriverEligible" json:"isDriverEligible"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

// PeopleFlowSyncLog repräsentiert einen Synchronisations-Log-Eintrag
type PeopleFlowSyncLog struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	SyncType           string             `bson:"syncType" json:"syncType"` // "manual", "automatic", "initial"
	StartTime          time.Time          `bson:"startTime" json:"startTime"`
	EndTime            time.Time          `bson:"endTime" json:"endTime"`
	Status             string             `bson:"status" json:"status"` // "success", "error", "partial"
	EmployeesProcessed int                `bson:"employeesProcessed" json:"employeesProcessed"`
	EmployeesCreated   int                `bson:"employeesCreated" json:"employeesCreated"`
	EmployeesUpdated   int                `bson:"employeesUpdated" json:"employeesUpdated"`
	Errors             []string           `bson:"errors" json:"errors"`
	ErrorMessage       string             `bson:"errorMessage" json:"errorMessage"`
	CreatedAt          time.Time          `bson:"createdAt" json:"createdAt"`
}
