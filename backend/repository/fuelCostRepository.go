// backend/repository/fuelCostRepository.go
package repository

import (
	"context"
	"time"

	"FleetFlow/backend/db"
	"FleetFlow/backend/model"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// FuelCostRepository enthält alle Datenbankoperationen für das FuelCost-Modell
type FuelCostRepository struct {
	collection *mongo.Collection
}

// NewFuelCostRepository erstellt ein neues FuelCostRepository
func NewFuelCostRepository() *FuelCostRepository {
	return &FuelCostRepository{
		collection: db.GetCollection("fuelCosts"),
	}
}

// Create erstellt einen neuen Tankkosteneintrag
func (r *FuelCostRepository) Create(fuelCost *model.FuelCost) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	fuelCost.CreatedAt = time.Now()
	fuelCost.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, fuelCost)
	if err != nil {
		return err
	}

	fuelCost.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet einen Tankkosteneintrag anhand seiner ID
func (r *FuelCostRepository) FindByID(id string) (*model.FuelCost, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var fuelCost model.FuelCost
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&fuelCost)
	if err != nil {
		return nil, err
	}

	return &fuelCost, nil
}

// FindAll findet alle Tankkosteneinträge
func (r *FuelCostRepository) FindAll() ([]*model.FuelCost, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var fuelCosts []*model.FuelCost

	// Nach Datum absteigend sortieren (neueste zuerst)
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})

	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var fuelCost model.FuelCost
		if err := cursor.Decode(&fuelCost); err != nil {
			return nil, err
		}
		fuelCosts = append(fuelCosts, &fuelCost)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return fuelCosts, nil
}

// FindByVehicle findet alle Tankkosteneinträge für ein bestimmtes Fahrzeug
func (r *FuelCostRepository) FindByVehicle(vehicleID string) ([]*model.FuelCost, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, err
	}

	// Nach Datum absteigend sortieren (neueste zuerst)
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})

	var fuelCosts []*model.FuelCost
	cursor, err := r.collection.Find(ctx, bson.M{"vehicleId": objID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var fuelCost model.FuelCost
		if err := cursor.Decode(&fuelCost); err != nil {
			return nil, err
		}
		fuelCosts = append(fuelCosts, &fuelCost)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return fuelCosts, nil
}

// Update aktualisiert einen Tankkosteneintrag
func (r *FuelCostRepository) Update(fuelCost *model.FuelCost) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	fuelCost.UpdatedAt = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": fuelCost.ID},
		bson.M{"$set": fuelCost},
	)
	return err
}

// Delete löscht einen Tankkosteneintrag
func (r *FuelCostRepository) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

// HasAnyFuelCosts prüft ob überhaupt Tankkosten-Einträge vorhanden sind

func (r *FuelCostRepository) HasAnyFuelCosts() (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// FindByDateRange findet Tankkosten in einem bestimmten Zeitraum
func (r *FuelCostRepository) FindByDateRange(startDate, endDate time.Time) ([]*model.FuelCost, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var fuelCosts []*model.FuelCost

	filter := bson.M{
		"date": bson.M{
			"$gte": startDate,
			"$lte": endDate,
		},
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var fuelCost model.FuelCost
		if err := cursor.Decode(&fuelCost); err != nil {
			return nil, err
		}
		fuelCosts = append(fuelCosts, &fuelCost)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return fuelCosts, nil
}
