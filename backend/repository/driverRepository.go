// backend/repository/driverRepository.go
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

// DriverRepository enthält alle Datenbankoperationen für das Driver-Modell
type DriverRepository struct {
	collection *mongo.Collection
}

// NewDriverRepository erstellt ein neues DriverRepository
func NewDriverRepository() *DriverRepository {
	return &DriverRepository{
		collection: db.GetCollection("drivers"),
	}
}

// Create erstellt einen neuen Fahrer
func (r *DriverRepository) Create(driver *model.Driver) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	driver.CreatedAt = time.Now()
	driver.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, driver)
	if err != nil {
		return err
	}

	driver.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet einen Fahrer anhand seiner ID
func (r *DriverRepository) FindByID(id string) (*model.Driver, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var driver model.Driver
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&driver)
	if err != nil {
		return nil, err
	}

	return &driver, nil
}

// FindByEmail findet einen Fahrer anhand seiner E-Mail
func (r *DriverRepository) FindByEmail(email string) (*model.Driver, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var driver model.Driver
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&driver)
	if err != nil {
		return nil, err
	}

	return &driver, nil
}

// FindAll findet alle Fahrer
func (r *DriverRepository) FindAll() ([]*model.Driver, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var drivers []*model.Driver
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var driver model.Driver
		if err := cursor.Decode(&driver); err != nil {
			return nil, err
		}
		drivers = append(drivers, &driver)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return drivers, nil
}

// FindByStatus findet alle Fahrer mit einem bestimmten Status
func (r *DriverRepository) FindByStatus(status model.DriverStatus) ([]*model.Driver, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var drivers []*model.Driver
	cursor, err := r.collection.Find(ctx, bson.M{"status": status})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var driver model.Driver
		if err := cursor.Decode(&driver); err != nil {
			return nil, err
		}
		drivers = append(drivers, &driver)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return drivers, nil
}

// FindByVehicle findet den Fahrer, dem ein bestimmtes Fahrzeug zugewiesen ist
func (r *DriverRepository) FindByVehicle(vehicleID primitive.ObjectID) (*model.Driver, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var driver model.Driver
	err := r.collection.FindOne(ctx, bson.M{"assignedVehicleId": vehicleID}).Decode(&driver)
	if err != nil {
		return nil, err
	}

	return &driver, nil
}

// Update aktualisiert einen Fahrer
func (r *DriverRepository) Update(driver *model.Driver) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	driver.UpdatedAt = time.Now()

	// Debug-Ausgabe vor Update
	fmt.Printf("=== DriverRepository.Update DEBUG ===\n")
	fmt.Printf("Updating driver ID: %s\n", driver.ID.Hex())
	fmt.Printf("AssignedVehicleID: %s\n", driver.AssignedVehicleID.Hex())
	fmt.Printf("Status: %s\n", driver.Status)

	// Explizites Update mit allen Feldern
	updateDoc := bson.M{
		"$set": bson.M{
			"firstName":         driver.FirstName,
			"lastName":          driver.LastName,
			"email":             driver.Email,
			"phone":             driver.Phone,
			"status":            driver.Status,
			"assignedVehicleId": driver.AssignedVehicleID,
			"licenseClasses":    driver.LicenseClasses,
			"notes":             driver.Notes,
			"updatedAt":         driver.UpdatedAt,
		},
	}

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": driver.ID},
		updateDoc,
	)

	if err != nil {
		fmt.Printf("ERROR in UpdateOne: %v\n", err)
		return err
	}

	fmt.Printf("Update result - MatchedCount: %d, ModifiedCount: %d\n", result.MatchedCount, result.ModifiedCount)

	// Verification: Dokument nochmal laden
	var verifyDriver model.Driver
	verifyErr := r.collection.FindOne(ctx, bson.M{"_id": driver.ID}).Decode(&verifyDriver)
	if verifyErr == nil {
		fmt.Printf("VERIFICATION after update:\n")
		fmt.Printf("  AssignedVehicleID: %s\n", verifyDriver.AssignedVehicleID.Hex())
		fmt.Printf("  Status: %s\n", verifyDriver.Status)
	}

	return err
}

// Delete löscht einen Fahrer
func (r *DriverRepository) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}
