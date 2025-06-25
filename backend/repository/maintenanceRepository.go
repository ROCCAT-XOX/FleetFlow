// backend/repository/maintenanceRepository.go
package repository

import (
	"context"
	"go.mongodb.org/mongo-driver/mongo/options"
	"time"

	"FleetDrive/backend/db"
	"FleetDrive/backend/model"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// MaintenanceRepository enthält alle Datenbankoperationen für das Maintenance-Modell
type MaintenanceRepository struct {
	collection *mongo.Collection
}

// NewMaintenanceRepository erstellt ein neues MaintenanceRepository
func NewMaintenanceRepository() *MaintenanceRepository {
	return &MaintenanceRepository{
		collection: db.GetCollection("maintenance"),
	}
}

// Create erstellt einen neuen Wartungseintrag
func (r *MaintenanceRepository) Create(maintenance *model.Maintenance) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	maintenance.CreatedAt = time.Now()
	maintenance.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, maintenance)
	if err != nil {
		return err
	}

	maintenance.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet einen Wartungseintrag anhand seiner ID
func (r *MaintenanceRepository) FindByID(id string) (*model.Maintenance, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var maintenance model.Maintenance
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&maintenance)
	if err != nil {
		return nil, err
	}

	return &maintenance, nil
}

// FindAll findet alle Wartungseinträge
func (r *MaintenanceRepository) FindAll() ([]*model.Maintenance, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var maintenances []*model.Maintenance
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var maintenance model.Maintenance
		if err := cursor.Decode(&maintenance); err != nil {
			return nil, err
		}
		maintenances = append(maintenances, &maintenance)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return maintenances, nil
}

// FindByVehicle findet alle Wartungseinträge für ein bestimmtes Fahrzeug
func (r *MaintenanceRepository) FindByVehicle(vehicleID string) ([]*model.Maintenance, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, err
	}

	var maintenances []*model.Maintenance
	cursor, err := r.collection.Find(ctx, bson.M{"vehicleId": objID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var maintenance model.Maintenance
		if err := cursor.Decode(&maintenance); err != nil {
			return nil, err
		}
		maintenances = append(maintenances, &maintenance)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return maintenances, nil
}

// Update aktualisiert einen Wartungseintrag
func (r *MaintenanceRepository) Update(maintenance *model.Maintenance) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	maintenance.UpdatedAt = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": maintenance.ID},
		bson.M{"$set": maintenance},
	)
	return err
}

// Delete löscht einen Wartungseintrag
func (r *MaintenanceRepository) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

func (r *MaintenanceRepository) FindByDateRange(startDate, endDate time.Time) ([]*model.Maintenance, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var maintenances []*model.Maintenance

	// Nach Datum absteigend sortieren (neueste zuerst)
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})

	cursor, err := r.collection.Find(ctx, bson.M{
		"date": bson.M{
			"$gte": startDate,
			"$lte": endDate,
		},
	}, opts)

	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var maintenance model.Maintenance
		if err := cursor.Decode(&maintenance); err != nil {
			return nil, err
		}
		maintenances = append(maintenances, &maintenance)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return maintenances, nil
}

// FindUpcoming findet alle geplanten Wartungseinträge ab einem bestimmten Datum
func (r *MaintenanceRepository) FindUpcoming(fromDate time.Time, toDate time.Time) ([]*model.Maintenance, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var maintenances []*model.Maintenance

	// Nach Datum aufsteigend sortieren (nächste zuerst)
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: 1}})

	cursor, err := r.collection.Find(ctx, bson.M{
		"date": bson.M{
			"$gte": fromDate,
			"$lte": toDate,
		},
	}, opts)

	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var maintenance model.Maintenance
		if err := cursor.Decode(&maintenance); err != nil {
			return nil, err
		}
		maintenances = append(maintenances, &maintenance)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return maintenances, nil
}
