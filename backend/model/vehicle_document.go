package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DocumentType repräsentiert den Typ eines Fahrzeugdokuments
type DocumentType string

const (
	DocumentTypeVehicleRegistration DocumentType = "vehicle_registration" // Fahrzeugbrief
	DocumentTypeVehicleLicense      DocumentType = "vehicle_license"      // Fahrzeugschein
	DocumentTypeInspection          DocumentType = "inspection"           // HU/AU
	DocumentTypeInsurance           DocumentType = "insurance"            // Versicherungsunterlagen
	DocumentTypeInvoice             DocumentType = "invoice"              // Rechnungen
	DocumentTypeWarranty            DocumentType = "warranty"             // Garantieunterlagen
	DocumentTypeOther               DocumentType = "other"                // Sonstige
)

// VehicleDocument repräsentiert ein Fahrzeugdokument
type VehicleDocument struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	VehicleID   primitive.ObjectID `bson:"vehicleId" json:"vehicleId"`
	Type        DocumentType       `bson:"type" json:"type"`
	Name        string             `bson:"name" json:"name"`
	FileName    string             `bson:"fileName" json:"fileName"`
	ContentType string             `bson:"contentType" json:"contentType"`
	Size        int64              `bson:"size" json:"size"`
	Data        []byte             `bson:"data" json:"-"` // Daten werden nicht im JSON zurückgegeben
	UploadedBy  primitive.ObjectID `bson:"uploadedBy" json:"uploadedBy"`
	UploadedAt  time.Time          `bson:"uploadedAt" json:"uploadedAt"`
	ExpiryDate  *time.Time         `bson:"expiryDate,omitempty" json:"expiryDate,omitempty"`
	Notes       string             `bson:"notes" json:"notes"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// DocumentTypeText gibt den deutschen Text für einen Dokumenttyp zurück
func DocumentTypeText(docType DocumentType) string {
	types := map[DocumentType]string{
		DocumentTypeVehicleRegistration: "Fahrzeugbrief",
		DocumentTypeVehicleLicense:      "Fahrzeugschein",
		DocumentTypeInspection:          "HU/AU",
		DocumentTypeInsurance:           "Versicherung",
		DocumentTypeInvoice:             "Rechnung",
		DocumentTypeWarranty:            "Garantie",
		DocumentTypeOther:               "Sonstiges",
	}

	if text, ok := types[docType]; ok {
		return text
	}
	return string(docType)
}

// IsExpiringSoon prüft, ob das Dokument in den nächsten 30 Tagen abläuft
func (d *VehicleDocument) IsExpiringSoon() bool {
	if d.ExpiryDate == nil {
		return false
	}
	return d.ExpiryDate.Before(time.Now().AddDate(0, 0, 30))
}

// IsExpired prüft, ob das Dokument bereits abgelaufen ist
func (d *VehicleDocument) IsExpired() bool {
	if d.ExpiryDate == nil {
		return false
	}
	return d.ExpiryDate.Before(time.Now())
}
