// backend/repository/vehicleUsageRepository.go
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

// VehicleUsageRepository enthält alle Datenbankoperationen für das VehicleUsage-Modell
type VehicleUsageRepository struct {
	collection *mongo.Collection
}

// NewVehicleUsageRepository erstellt ein neues VehicleUsageRepository
func NewVehicleUsageRepository() *VehicleUsageRepository {
	return &VehicleUsageRepository{
		collection: db.GetCollection("vehicleUsage"),
	}
}

// Create erstellt einen neuen Fahrzeugnutzungseintrag
func (r *VehicleUsageRepository) Create(usage *model.VehicleUsage) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	usage.CreatedAt = time.Now()
	usage.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, usage)
	if err != nil {
		return err
	}

	usage.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet einen Fahrzeugnutzungseintrag anhand seiner ID
func (r *VehicleUsageRepository) FindByID(id string) (*model.VehicleUsage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var usage model.VehicleUsage
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&usage)
	if err != nil {
		return nil, err
	}

	return &usage, nil
}

// FindAll findet alle Fahrzeugnutzungseinträge
func (r *VehicleUsageRepository) FindAll() ([]*model.VehicleUsage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Nach Startdatum absteigend sortieren (neueste zuerst)
	opts := options.Find().SetSort(bson.D{{Key: "startDate", Value: -1}})

	var usages []*model.VehicleUsage
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var usage model.VehicleUsage
		if err := cursor.Decode(&usage); err != nil {
			return nil, err
		}
		usages = append(usages, &usage)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return usages, nil
}

// FindByVehicle findet alle Nutzungseinträge für ein bestimmtes Fahrzeug
func (r *VehicleUsageRepository) FindByVehicle(vehicleID string) ([]*model.VehicleUsage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, err
	}

	// Nach Startdatum absteigend sortieren (neueste zuerst)
	opts := options.Find().SetSort(bson.D{{Key: "startDate", Value: -1}})

	var usages []*model.VehicleUsage
	cursor, err := r.collection.Find(ctx, bson.M{"vehicleId": objID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var usage model.VehicleUsage
		if err := cursor.Decode(&usage); err != nil {
			return nil, err
		}
		usages = append(usages, &usage)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return usages, nil
}

// FindByDriver findet alle Nutzungseinträge für einen bestimmten Fahrer
func (r *VehicleUsageRepository) FindByDriver(driverID string) ([]*model.VehicleUsage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return nil, err
	}

	// Nach Startdatum absteigend sortieren (neueste zuerst)
	opts := options.Find().SetSort(bson.D{{Key: "startDate", Value: -1}})

	var usages []*model.VehicleUsage
	cursor, err := r.collection.Find(ctx, bson.M{"driverId": objID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var usage model.VehicleUsage
		if err := cursor.Decode(&usage); err != nil {
			return nil, err
		}
		usages = append(usages, &usage)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return usages, nil
}

// FindActiveUsage findet die aktive Nutzung eines Fahrzeugs
func (r *VehicleUsageRepository) FindActiveUsage(vehicleID string) (*model.VehicleUsage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, err
	}

	var usage model.VehicleUsage
	err = r.collection.FindOne(
		ctx,
		bson.M{
			"vehicleId": objID,
			"status":    model.UsageStatusActive,
		},
	).Decode(&usage)

	if err != nil {
		return nil, err
	}

	return &usage, nil
}

// Update aktualisiert einen Fahrzeugnutzungseintrag
func (r *VehicleUsageRepository) Update(usage *model.VehicleUsage) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	usage.UpdatedAt = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": usage.ID},
		bson.M{"$set": usage},
	)
	return err
}

// Delete löscht einen Fahrzeugnutzungseintrag
func (r *VehicleUsageRepository) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

// CountActiveUsagesByDateRange zählt aktive Fahrzeugnutzungen in einem Zeitraum
func (r *VehicleUsageRepository) CountActiveUsagesByDateRange(startDate, endDate time.Time) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Zähle Fahrzeugnutzungen, die im angegebenen Zeitraum aktiv waren
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"$or": []bson.M{
			{
				// Nutzungen, die im Zeitraum begonnen haben
				"startDate": bson.M{
					"$gte": startDate,
					"$lt":  endDate,
				},
			},
			{
				// Nutzungen, die vor dem Zeitraum begonnen haben und noch aktiv sind
				"startDate": bson.M{"$lt": startDate},
				"$or": []bson.M{
					{"endDate": bson.M{"$gte": startDate}},
					{"status": model.UsageStatusActive},
				},
			},
		},
	})

	return count, err
}
