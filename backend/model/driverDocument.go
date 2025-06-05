// backend/model/driverDocumentHandler.go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DriverDocumentType repräsentiert den Typ eines Fahrerdokuments
type DriverDocumentType string

const (
	// Dokumenttypen für Fahrer
	DriverDocumentTypeLicense        DriverDocumentType = "driver_license"
	DriverDocumentTypeMedicalCert    DriverDocumentType = "medical_certificate"
	DriverDocumentTypeTrainingCert   DriverDocumentType = "training_certificate"
	DriverDocumentTypeIdentification DriverDocumentType = "identification"
	DriverDocumentTypeOther          DriverDocumentType = "other"
)

// DriverDocument repräsentiert ein Dokument für einen Fahrer
type DriverDocument struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	DriverID         primitive.ObjectID `bson:"driverId" json:"driverId"`
	Type             DriverDocumentType `bson:"type" json:"type"`
	Name             string             `bson:"name" json:"name"`
	FileName         string             `bson:"fileName" json:"fileName"`
	ContentType      string             `bson:"contentType" json:"contentType"`
	Size             int64              `bson:"size" json:"size"`
	Data             []byte             `bson:"data" json:"-"`
	UploadedBy       primitive.ObjectID `bson:"uploadedBy" json:"uploadedBy"`
	UploadedAt       time.Time          `bson:"uploadedAt" json:"uploadedAt"`
	ExpiryDate       *time.Time         `bson:"expiryDate,omitempty" json:"expiryDate"`
	IssueDate        *time.Time         `bson:"issueDate,omitempty" json:"issueDate"`
	LicenseNumber    string             `bson:"licenseNumber,omitempty" json:"licenseNumber"`
	IssuingAuthority string             `bson:"issuingAuthority,omitempty" json:"issuingAuthority"`
	Notes            string             `bson:"notes,omitempty" json:"notes"`
	UpdatedAt        time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// IsExpired prüft, ob das Dokument abgelaufen ist
func (d *DriverDocument) IsExpired() bool {
	if d.ExpiryDate == nil {
		return false
	}
	return time.Now().After(*d.ExpiryDate)
}

// IsExpiringSoon prüft, ob das Dokument in den nächsten 30 Tagen abläuft
func (d *DriverDocument) IsExpiringSoon() bool {
	if d.ExpiryDate == nil {
		return false
	}
	thirtyDaysFromNow := time.Now().AddDate(0, 0, 30)
	return d.ExpiryDate.Before(thirtyDaysFromNow) && !d.IsExpired()
}

// DriverDocumentTypeText gibt den deutschen Text für einen Dokumenttyp zurück
func DriverDocumentTypeText(docType DriverDocumentType) string {
	types := map[DriverDocumentType]string{
		DriverDocumentTypeLicense:        "Führerschein",
		DriverDocumentTypeMedicalCert:    "Ärztliches Attest",
		DriverDocumentTypeTrainingCert:   "Schulungszertifikat",
		DriverDocumentTypeIdentification: "Ausweis",
		DriverDocumentTypeOther:          "Sonstiges",
	}

	if text, ok := types[docType]; ok {
		return text
	}
	return string(docType)
}
