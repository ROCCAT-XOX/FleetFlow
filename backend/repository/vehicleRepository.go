// backend/repository/vehicleRepository.go
package repository

import (
	"context"
	"fmt"
	"time"

	"FleetDrive/backend/db"
	"FleetDrive/backend/model"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// VehicleRepository enthält alle Datenbankoperationen für das Vehicle-Modell
type VehicleRepository struct {
	collection *mongo.Collection
}

// NewVehicleRepository erstellt ein neues VehicleRepository
func NewVehicleRepository() *VehicleRepository {
	return &VehicleRepository{
		collection: db.GetCollection("vehicles"),
	}
}

// Create erstellt ein neues Fahrzeug
func (r *VehicleRepository) Create(vehicle *model.Vehicle) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	vehicle.CreatedAt = time.Now()
	vehicle.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, vehicle)
	if err != nil {
		return err
	}

	vehicle.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet ein Fahrzeug anhand seiner ID
func (r *VehicleRepository) FindByID(id string) (*model.Vehicle, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var vehicle model.Vehicle
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&vehicle)
	if err != nil {
		return nil, err
	}

	return &vehicle, nil
}

// FindByLicensePlate findet ein Fahrzeug anhand seines Kennzeichens
func (r *VehicleRepository) FindByLicensePlate(licensePlate string) (*model.Vehicle, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var vehicle model.Vehicle
	err := r.collection.FindOne(ctx, bson.M{"licensePlate": licensePlate}).Decode(&vehicle)
	if err != nil {
		return nil, err
	}

	return &vehicle, nil
}

// FindAll findet alle Fahrzeuge
func (r *VehicleRepository) FindAll() ([]*model.Vehicle, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var vehicles []*model.Vehicle
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var vehicle model.Vehicle
		if err := cursor.Decode(&vehicle); err != nil {
			return nil, err
		}
		vehicles = append(vehicles, &vehicle)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return vehicles, nil
}

// Update aktualisiert ein Fahrzeug
func (r *VehicleRepository) Update(vehicle *model.Vehicle) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	vehicle.UpdatedAt = time.Now()

	// Debug-Ausgabe
	fmt.Printf("=== VehicleRepository.Update DEBUG ===\n")
	fmt.Printf("Updating vehicle ID: %s\n", vehicle.ID.Hex())
	fmt.Printf("Brand/Model: %s %s (%s)\n", vehicle.Brand, vehicle.Model, vehicle.LicensePlate)
	fmt.Printf("CurrentDriverID: %s\n", vehicle.CurrentDriverID.Hex())
	fmt.Printf("Status: %s\n", vehicle.Status)
	fmt.Printf("IsZero CurrentDriverID: %v\n", vehicle.CurrentDriverID.IsZero())

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": vehicle.ID},
		bson.M{"$set": vehicle},
	)

	if err != nil {
		fmt.Printf("ERROR updating vehicle: %v\n", err)
		return err
	}

	fmt.Printf("Vehicle update result - MatchedCount: %d, ModifiedCount: %d\n", result.MatchedCount, result.ModifiedCount)

	// Verification
	var verifyVehicle model.Vehicle
	verifyErr := r.collection.FindOne(ctx, bson.M{"_id": vehicle.ID}).Decode(&verifyVehicle)
	if verifyErr == nil {
		fmt.Printf("VEHICLE VERIFICATION after update:\n")
		fmt.Printf("  CurrentDriverID: %s\n", verifyVehicle.CurrentDriverID.Hex())
		fmt.Printf("  Status: %s\n", verifyVehicle.Status)
		fmt.Printf("  IsZero: %v\n", verifyVehicle.CurrentDriverID.IsZero())
	}

	return err
}

// Delete löscht ein Fahrzeug
func (r *VehicleRepository) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

// FindByStatus findet alle Fahrzeuge mit einem bestimmten Status
func (r *VehicleRepository) FindByStatus(status model.VehicleStatus) ([]*model.Vehicle, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var vehicles []*model.Vehicle
	cursor, err := r.collection.Find(ctx, bson.M{"status": status})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var vehicle model.Vehicle
		if err := cursor.Decode(&vehicle); err != nil {
			return nil, err
		}
		vehicles = append(vehicles, &vehicle)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return vehicles, nil
}

// CountByStatusAndDate zählt Fahrzeuge mit einem bestimmten Status an einem bestimmten Datum
func (r *VehicleRepository) CountByStatusAndDate(status model.VehicleStatus, date time.Time) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Wir suchen nach Fahrzeugen, die am angegebenen Datum den angegebenen Status hatten
	// Dies ist eine Annäherung, da wir keine Historie des Status speichern
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"status": status,
		"updatedAt": bson.M{
			"$lte": date,
		},
	})

	return count, err
}
