package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ReportType repräsentiert den Typ einer Fahrzeugmeldung
type ReportType string

// ReportPriority repräsentiert die Priorität einer Meldung
type ReportPriority string

// ReportStatus repräsentiert den Status einer Meldung
type ReportStatus string

const (
	// Meldungstypen
	ReportTypeEngineLight    ReportType = "engine_light"     // Motorkontrollleuchte
	ReportTypeInspection     ReportType = "inspection"       // Inspektion fällig
	ReportTypeTireChange     ReportType = "tire_change"      // Reifenwechsel
	ReportTypeFuelIssue      ReportType = "fuel_issue"       // Tankproblem
	ReportTypeCleaning       ReportType = "cleaning"         // Reinigung erforderlich
	ReportTypeRepair         ReportType = "repair"           // Allgemeine Reparatur
	ReportTypeAccident       ReportType = "accident"         // Unfall
	ReportTypeBrakeIssue     ReportType = "brake_issue"      // Bremsproblem
	ReportTypeElectrical     ReportType = "electrical"       // Elektrisches Problem
	ReportTypeAirConditioning ReportType = "air_conditioning" // Klimaanlage
	ReportTypeNoise          ReportType = "noise"            // Geräusche/Lärm
	ReportTypeOther          ReportType = "other"            // Sonstiges

	// Prioritäten
	ReportPriorityLow      ReportPriority = "low"      // Niedrig
	ReportPriorityMedium   ReportPriority = "medium"   // Mittel
	ReportPriorityHigh     ReportPriority = "high"     // Hoch
	ReportPriorityUrgent   ReportPriority = "urgent"   // Dringend

	// Status
	ReportStatusOpen       ReportStatus = "open"       // Offen
	ReportStatusInProgress ReportStatus = "in_progress" // In Bearbeitung
	ReportStatusResolved   ReportStatus = "resolved"   // Behoben
	ReportStatusClosed     ReportStatus = "closed"     // Geschlossen
)

// VehicleReport repräsentiert eine Fahrzeugmeldung von einem Fahrer
type VehicleReport struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	VehicleID   primitive.ObjectID `bson:"vehicleId" json:"vehicleId"`
	ReporterID  primitive.ObjectID `bson:"reporterId" json:"reporterId"`   // Fahrer der die Meldung erstellt hat
	Type        ReportType         `bson:"type" json:"type"`
	Priority    ReportPriority     `bson:"priority" json:"priority"`
	Status      ReportStatus       `bson:"status" json:"status"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description" json:"description"`
	Location    string             `bson:"location,omitempty" json:"location"`       // Standort wenn relevant
	Mileage     *int               `bson:"mileage,omitempty" json:"mileage"`         // Kilometerstand
	AssignedTo  *primitive.ObjectID `bson:"assignedTo,omitempty" json:"assignedTo"`  // Wem die Meldung zugewiesen wurde
	ResolvedBy  *primitive.ObjectID `bson:"resolvedBy,omitempty" json:"resolvedBy"`  // Wer die Meldung behoben hat
	ResolvedAt  *time.Time         `bson:"resolvedAt,omitempty" json:"resolvedAt"`   // Wann die Meldung behoben wurde
	Resolution  string             `bson:"resolution,omitempty" json:"resolution"`   // Beschreibung der Lösung
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// GetTypeDisplayName gibt den Anzeigenamen für den Meldungstyp zurück
func (r *VehicleReport) GetTypeDisplayName() string {
	switch r.Type {
	case ReportTypeEngineLight:
		return "Motorkontrollleuchte"
	case ReportTypeInspection:
		return "Inspektion fällig"
	case ReportTypeTireChange:
		return "Reifenwechsel"
	case ReportTypeFuelIssue:
		return "Tankproblem"
	case ReportTypeCleaning:
		return "Reinigung erforderlich"
	case ReportTypeRepair:
		return "Allgemeine Reparatur"
	case ReportTypeAccident:
		return "Unfall"
	case ReportTypeBrakeIssue:
		return "Bremsproblem"
	case ReportTypeElectrical:
		return "Elektrisches Problem"
	case ReportTypeAirConditioning:
		return "Klimaanlage"
	case ReportTypeNoise:
		return "Geräusche/Lärm"
	case ReportTypeOther:
		return "Sonstiges"
	default:
		return string(r.Type)
	}
}

// GetPriorityDisplayName gibt den Anzeigenamen für die Priorität zurück
func (r *VehicleReport) GetPriorityDisplayName() string {
	switch r.Priority {
	case ReportPriorityLow:
		return "Niedrig"
	case ReportPriorityMedium:
		return "Mittel"
	case ReportPriorityHigh:
		return "Hoch"
	case ReportPriorityUrgent:
		return "Dringend"
	default:
		return string(r.Priority)
	}
}

// GetStatusDisplayName gibt den Anzeigenamen für den Status zurück
func (r *VehicleReport) GetStatusDisplayName() string {
	switch r.Status {
	case ReportStatusOpen:
		return "Offen"
	case ReportStatusInProgress:
		return "In Bearbeitung"
	case ReportStatusResolved:
		return "Behoben"
	case ReportStatusClosed:
		return "Geschlossen"
	default:
		return string(r.Status)
	}
}

// IsUrgent prüft ob die Meldung dringend ist
func (r *VehicleReport) IsUrgent() bool {
	return r.Priority == ReportPriorityUrgent || r.Type == ReportTypeAccident || r.Type == ReportTypeBrakeIssue
}