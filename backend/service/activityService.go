// backend/service/activityService.go
package service

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ActivityService ist ein zentraler Service für die Protokollierung von Aktivitäten
type ActivityService struct {
	activityRepo *repository.ActivityRepository
}

// NewActivityService erstellt einen neuen ActivityService
func NewActivityService() *ActivityService {
	return &ActivityService{
		activityRepo: repository.NewActivityRepository(),
	}
}

// LogVehicleActivity protokolliert eine fahrzeugbezogene Aktivität
func (s *ActivityService) LogVehicleActivity(
	activityType model.ActivityType,
	userID primitive.ObjectID,
	vehicleID primitive.ObjectID,
	description string,
	details map[string]interface{},
) error {
	activity := &model.Activity{
		Type:        activityType,
		Timestamp:   time.Now(),
		UserID:      userID,
		VehicleID:   vehicleID,
		Description: description,
		Details:     details,
	}
	return s.activityRepo.Create(activity)
}

// LogDriverActivity protokolliert eine fahrerbezogene Aktivität
func (s *ActivityService) LogDriverActivity(
	activityType model.ActivityType,
	userID primitive.ObjectID,
	driverID primitive.ObjectID,
	description string,
	details map[string]interface{},
) error {
	activity := &model.Activity{
		Type:        activityType,
		Timestamp:   time.Now(),
		UserID:      userID,
		DriverID:    driverID,
		Description: description,
		Details:     details,
	}
	return s.activityRepo.Create(activity)
}

// LogMaintenanceActivity protokolliert eine wartungsbezogene Aktivität
func (s *ActivityService) LogMaintenanceActivity(
	activityType model.ActivityType,
	userID primitive.ObjectID,
	vehicleID primitive.ObjectID,
	maintenanceID primitive.ObjectID,
	description string,
	details map[string]interface{},
) error {
	activity := &model.Activity{
		Type:        activityType,
		Timestamp:   time.Now(),
		UserID:      userID,
		VehicleID:   vehicleID,
		RelatedID:   maintenanceID,
		Description: description,
		Details:     details,
	}
	return s.activityRepo.Create(activity)
}

// LogUsageActivity protokolliert eine nutzungsbezogene Aktivität
func (s *ActivityService) LogUsageActivity(
	activityType model.ActivityType,
	userID primitive.ObjectID,
	vehicleID primitive.ObjectID,
	driverID primitive.ObjectID,
	usageID primitive.ObjectID,
	description string,
	details map[string]interface{},
) error {
	activity := &model.Activity{
		Type:        activityType,
		Timestamp:   time.Now(),
		UserID:      userID,
		VehicleID:   vehicleID,
		DriverID:    driverID,
		RelatedID:   usageID,
		Description: description,
		Details:     details,
	}
	return s.activityRepo.Create(activity)
}

// GetUserIDFromContext hilft, die Benutzer-ID aus dem Gin-Kontext zu extrahieren
func GetUserIDFromContext(userIDStr interface{}) (primitive.ObjectID, error) {
	if userIDStr == nil {
		return primitive.NilObjectID, nil
	}

	if idStr, ok := userIDStr.(string); ok {
		return primitive.ObjectIDFromHex(idStr)
	}

	return primitive.NilObjectID, nil
}

// ExtractChanges erstellt eine Map mit Änderungen zwischen alten und neuen Werten
func ExtractChanges(changes map[string]interface{}, fieldName string, oldValue, newValue interface{}) {
	if oldValue != newValue {
		changes[fieldName] = map[string]interface{}{
			"old": oldValue,
			"new": newValue,
		}
	}
}
