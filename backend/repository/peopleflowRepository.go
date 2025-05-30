// backend/repository/peopleflowRepository.go
package repository

import (
	"context"
	"time"

	"FleetDrive/backend/db"
	"FleetDrive/backend/model"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// PeopleFlowRepository enthält alle Datenbankoperationen für PeopleFlow-Integration
type PeopleFlowRepository struct {
	integrationCollection *mongo.Collection
	employeeCollection    *mongo.Collection
	syncLogCollection     *mongo.Collection
}

// NewPeopleFlowRepository erstellt ein neues PeopleFlowRepository
func NewPeopleFlowRepository() *PeopleFlowRepository {
	return &PeopleFlowRepository{
		integrationCollection: db.GetCollection("peopleflow_integration"),
		employeeCollection:    db.GetCollection("peopleflow_employees"),
		syncLogCollection:     db.GetCollection("peopleflow_sync_logs"),
	}
}

// === Integration Configuration Methods ===

// GetIntegration holt die aktuelle PeopleFlow-Integration-Konfiguration
func (r *PeopleFlowRepository) GetIntegration() (*model.PeopleFlowIntegration, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var integration model.PeopleFlowIntegration
	err := r.integrationCollection.FindOne(ctx, bson.M{}).Decode(&integration)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Keine Integration konfiguriert
		}
		return nil, err
	}

	return &integration, nil
}

// SaveIntegration speichert oder aktualisiert die PeopleFlow-Integration-Konfiguration
func (r *PeopleFlowRepository) SaveIntegration(integration *model.PeopleFlowIntegration) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	integration.UpdatedAt = time.Now()

	if integration.ID.IsZero() {
		// Neue Integration erstellen
		integration.CreatedAt = time.Now()
		result, err := r.integrationCollection.InsertOne(ctx, integration)
		if err != nil {
			return err
		}
		integration.ID = result.InsertedID.(primitive.ObjectID)
	} else {
		// Bestehende Integration aktualisieren
		_, err := r.integrationCollection.UpdateOne(
			ctx,
			bson.M{"_id": integration.ID},
			bson.M{"$set": integration},
		)
		return err
	}

	return nil
}

// UpdateIntegrationStatus aktualisiert den Status der Integration
func (r *PeopleFlowRepository) UpdateIntegrationStatus(isActive bool, lastSync time.Time, status string, syncedEmployees int) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.integrationCollection.UpdateOne(
		ctx,
		bson.M{},
		bson.M{
			"$set": bson.M{
				"isActive":        isActive,
				"lastSync":        lastSync,
				"lastSyncStatus":  status,
				"syncedEmployees": syncedEmployees,
				"updatedAt":       time.Now(),
			},
		},
	)

	return err
}

// === Employee Methods ===

// SaveEmployee speichert oder aktualisiert einen PeopleFlow-Mitarbeiter
func (r *PeopleFlowRepository) SaveEmployee(employee *model.PeopleFlowEmployee) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	employee.UpdatedAt = time.Now()

	// Prüfen, ob Mitarbeiter bereits existiert (nach E-Mail)
	existingEmployee, err := r.FindEmployeeByEmail(employee.Email)
	if err == nil && existingEmployee != nil {
		// Mitarbeiter aktualisieren
		employee.ID = existingEmployee.ID
		employee.CreatedAt = existingEmployee.CreatedAt

		_, err := r.employeeCollection.UpdateOne(
			ctx,
			bson.M{"_id": employee.ID},
			bson.M{"$set": employee},
		)
		return err
	} else {
		// Neuer Mitarbeiter
		employee.CreatedAt = time.Now()
		result, err := r.employeeCollection.InsertOne(ctx, employee)
		if err != nil {
			return err
		}
		employee.ID = result.InsertedID.(primitive.ObjectID)
	}

	return nil
}

// FindEmployeeByEmail findet einen PeopleFlow-Mitarbeiter anhand der E-Mail
func (r *PeopleFlowRepository) FindEmployeeByEmail(email string) (*model.PeopleFlowEmployee, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var employee model.PeopleFlowEmployee
	err := r.employeeCollection.FindOne(ctx, bson.M{"email": email}).Decode(&employee)
	if err != nil {
		return nil, err
	}

	return &employee, nil
}

// FindEmployeeByPeopleFlowID findet einen Mitarbeiter anhand der PeopleFlow-ID
func (r *PeopleFlowRepository) FindEmployeeByPeopleFlowID(peopleFlowID string) (*model.PeopleFlowEmployee, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var employee model.PeopleFlowEmployee
	err := r.employeeCollection.FindOne(ctx, bson.M{"peopleFlowId": peopleFlowID}).Decode(&employee)
	if err != nil {
		return nil, err
	}

	return &employee, nil
}

// FindAllEmployees findet alle PeopleFlow-Mitarbeiter
func (r *PeopleFlowRepository) FindAllEmployees() ([]*model.PeopleFlowEmployee, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "lastName", Value: 1}, {Key: "firstName", Value: 1}})

	var employees []*model.PeopleFlowEmployee
	cursor, err := r.employeeCollection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var employee model.PeopleFlowEmployee
		if err := cursor.Decode(&employee); err != nil {
			return nil, err
		}
		employees = append(employees, &employee)
	}

	return employees, cursor.Err()
}

// FindDriverEligibleEmployees findet alle Mitarbeiter, die als Fahrer geeignet sind
func (r *PeopleFlowRepository) FindDriverEligibleEmployees() ([]*model.PeopleFlowEmployee, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "lastName", Value: 1}, {Key: "firstName", Value: 1}})

	var employees []*model.PeopleFlowEmployee
	cursor, err := r.employeeCollection.Find(ctx, bson.M{
		"isDriverEligible": true,
		"hasValidLicense":  true,
		"status":           "active",
	}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var employee model.PeopleFlowEmployee
		if err := cursor.Decode(&employee); err != nil {
			return nil, err
		}
		employees = append(employees, &employee)
	}

	return employees, cursor.Err()
}

// UpdateEmployeeSyncStatus aktualisiert den Sync-Status eines Mitarbeiters
func (r *PeopleFlowRepository) UpdateEmployeeSyncStatus(email string, status string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.employeeCollection.UpdateOne(
		ctx,
		bson.M{"email": email},
		bson.M{
			"$set": bson.M{
				"syncStatus":   status,
				"lastSyncedAt": time.Now(),
				"updatedAt":    time.Now(),
			},
		},
	)

	return err
}

// === Sync Log Methods ===

// CreateSyncLog erstellt einen neuen Sync-Log-Eintrag
func (r *PeopleFlowRepository) CreateSyncLog(syncLog *model.PeopleFlowSyncLog) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	syncLog.CreatedAt = time.Now()
	if syncLog.StartTime.IsZero() {
		syncLog.StartTime = time.Now()
	}

	// KORREKTUR: Verwendung der richtigen syncLogCollection statt employeeCollection
	result, err := r.syncLogCollection.InsertOne(ctx, syncLog)
	if err != nil {
		return err
	}

	syncLog.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// UpdateSyncLog aktualisiert einen bestehenden Sync-Log-Eintrag
func (r *PeopleFlowRepository) UpdateSyncLog(syncLog *model.PeopleFlowSyncLog) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if syncLog.EndTime.IsZero() {
		syncLog.EndTime = time.Now()
	}

	_, err := r.syncLogCollection.UpdateOne(
		ctx,
		bson.M{"_id": syncLog.ID},
		bson.M{"$set": syncLog},
	)

	return err
}

// FindRecentSyncLogs findet die letzten Sync-Logs
func (r *PeopleFlowRepository) FindRecentSyncLogs(limit int) ([]*model.PeopleFlowSyncLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().
		SetSort(bson.D{{Key: "startTime", Value: -1}}).
		SetLimit(int64(limit))

	var logs []*model.PeopleFlowSyncLog
	cursor, err := r.syncLogCollection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var log model.PeopleFlowSyncLog
		if err := cursor.Decode(&log); err != nil {
			return nil, err
		}
		logs = append(logs, &log)
	}

	return logs, cursor.Err()
}

// DeleteEmployee löscht einen PeopleFlow-Mitarbeiter
func (r *PeopleFlowRepository) DeleteEmployee(email string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.employeeCollection.DeleteOne(ctx, bson.M{"email": email})
	return err
}

// GetEmployeeCount gibt die Anzahl der synchronisierten Mitarbeiter zurück
func (r *PeopleFlowRepository) GetEmployeeCount() (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := r.employeeCollection.CountDocuments(ctx, bson.M{})
	return count, err
}
