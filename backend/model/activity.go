// backend/model/activity.go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ActivityType repräsentiert den Typ einer Aktivität
type ActivityType string

const (
	// Aktivitätstypen
	ActivityTypeVehicleCreated       ActivityType = "vehicle-created"
	ActivityTypeVehicleUpdated       ActivityType = "vehicle-updated"
	ActivityTypeVehicleDeleted       ActivityType = "vehicle-deleted"
	ActivityTypeDriverCreated        ActivityType = "driver-created"
	ActivityTypeDriverUpdated        ActivityType = "driver-updated"
	ActivityTypeDriverDeleted        ActivityType = "driver-deleted"
	ActivityTypeVehicleUsageStarted  ActivityType = "usage-started"
	ActivityTypeVehicleUsageEnded    ActivityType = "usage-ended"
	ActivityTypeMaintenancePerformed ActivityType = "maintenance-performed"
	ActivityTypeFuelCostAdded        ActivityType = "fuel-cost-added"
	// Weitere Aktivitätstypen nach Bedarf
	// Dokument-Aktivitäten
	ActivityTypeDocumentUploaded ActivityType = "document_uploaded"
	ActivityTypeDocumentUpdated  ActivityType = "document_updated"
	ActivityTypeDocumentDeleted  ActivityType = "document_deleted"
)

// Activity repräsentiert eine Aktivität im System
type Activity struct {
	ID          primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	Type        ActivityType           `bson:"type" json:"type"`
	Timestamp   time.Time              `bson:"timestamp" json:"timestamp"`
	UserID      primitive.ObjectID     `bson:"userId,omitempty" json:"userId"`
	VehicleID   primitive.ObjectID     `bson:"vehicleId,omitempty" json:"vehicleId"`
	DriverID    primitive.ObjectID     `bson:"driverId,omitempty" json:"driverId"`
	RelatedID   primitive.ObjectID     `bson:"relatedId,omitempty" json:"relatedId"`
	Details     map[string]interface{} `bson:"details" json:"details"`
	Description string                 `bson:"description" json:"description"`
}
