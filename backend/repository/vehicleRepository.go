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
	fmt.Printf("CardNumber: '%s'\n", vehicle.CardNumber)
	fmt.Printf("CurrentDriverID: %s\n", vehicle.CurrentDriverID.Hex())
	fmt.Printf("Status: %s\n", vehicle.Status)
	fmt.Printf("IsZero CurrentDriverID: %v\n", vehicle.CurrentDriverID.IsZero())

	// Zwei separate Updates - erst die normalen Felder, dann currentDriverId separat

	// SCHRITT 1: Alle Felder außer currentDriverId updaten
	updateDoc := bson.M{
		"$set": bson.M{
			"licensePlate":           vehicle.LicensePlate,
			"brand":                  vehicle.Brand,
			"model":                  vehicle.Model,
			"year":                   vehicle.Year,
			"color":                  vehicle.Color,
			"vehicleId":              vehicle.VehicleID,
			"vin":                    vehicle.VIN,
			"cardNumber":             vehicle.CardNumber,
			"fuelType":               vehicle.FuelType,
			"mileage":                vehicle.Mileage,
			"registrationDate":       vehicle.RegistrationDate,
			"insuranceCompany":       vehicle.InsuranceCompany,
			"insuranceNumber":        vehicle.InsuranceNumber,
			"insuranceType":          vehicle.InsuranceType,
			"insuranceExpiry":        vehicle.InsuranceExpiry,
			"insuranceCost":          vehicle.InsuranceCost,
			"nextInspectionDate":     vehicle.NextInspectionDate,
			"status":                 vehicle.Status,
			"vehicleType":            vehicle.VehicleType,
			"engineDisplacement":     vehicle.EngineDisplacement,
			"powerRating":            vehicle.PowerRating,
			"numberOfAxles":          vehicle.NumberOfAxles,
			"tireSize":               vehicle.TireSize,
			"rimType":                vehicle.RimType,
			"grossWeight":            vehicle.GrossWeight,
			"technicalMaxWeight":     vehicle.TechnicalMaxWeight,
			"length":                 vehicle.Length,
			"width":                  vehicle.Width,
			"height":                 vehicle.Height,
			"emissionClass":          vehicle.EmissionClass,
			"curbWeight":             vehicle.CurbWeight,
			"maxSpeed":               vehicle.MaxSpeed,
			"towingCapacity":         vehicle.TowingCapacity,
			"specialFeatures":        vehicle.SpecialFeatures,
			"acquisitionType":        vehicle.AcquisitionType,
			"purchaseDate":           vehicle.PurchaseDate,
			"purchasePrice":          vehicle.PurchasePrice,
			"purchaseVendor":         vehicle.PurchaseVendor,
			"financeStartDate":       vehicle.FinanceStartDate,
			"financeEndDate":         vehicle.FinanceEndDate,
			"financeMonthlyRate":     vehicle.FinanceMonthlyRate,
			"financeInterestRate":    vehicle.FinanceInterestRate,
			"financeDownPayment":     vehicle.FinanceDownPayment,
			"financeTotalAmount":     vehicle.FinanceTotalAmount,
			"financeBank":            vehicle.FinanceBank,
			"leaseStartDate":         vehicle.LeaseStartDate,
			"leaseEndDate":           vehicle.LeaseEndDate,
			"leaseMonthlyRate":       vehicle.LeaseMonthlyRate,
			"leaseMileageLimit":      vehicle.LeaseMileageLimit,
			"leaseExcessMileageCost": vehicle.LeaseExcessMileageCost,
			"leaseCompany":           vehicle.LeaseCompany,
			"leaseContractNumber":    vehicle.LeaseContractNumber,
			"leaseResidualValue":     vehicle.LeaseResidualValue,
			"updatedAt":              vehicle.UpdatedAt,
		},
	}

	// Erstes Update: Alle Felder außer currentDriverId
	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": vehicle.ID},
		updateDoc,
	)

	if err != nil {
		fmt.Printf("ERROR updating vehicle (step 1): %v\n", err)
		return err
	}

	fmt.Printf("Vehicle update step 1 result - MatchedCount: %d, ModifiedCount: %d\n", result.MatchedCount, result.ModifiedCount)

	// SCHRITT 2: currentDriverId separat behandeln
	var driverUpdateDoc bson.M
	if vehicle.CurrentDriverID.IsZero() {
		// Feld komplett entfernen
		driverUpdateDoc = bson.M{
			"$unset": bson.M{"currentDriverId": ""},
		}
		fmt.Printf("Using $unset for currentDriverId\n")
	} else {
		// Feld setzen
		driverUpdateDoc = bson.M{
			"$set": bson.M{"currentDriverId": vehicle.CurrentDriverID},
		}
		fmt.Printf("Using $set for currentDriverId: %s\n", vehicle.CurrentDriverID.Hex())
	}

	// Zweites Update: nur currentDriverId
	result2, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": vehicle.ID},
		driverUpdateDoc,
	)

	if err != nil {
		fmt.Printf("ERROR updating vehicle currentDriverId (step 2): %v\n", err)
		return err
	}

	fmt.Printf("Vehicle update step 2 result - MatchedCount: %d, ModifiedCount: %d\n", result2.MatchedCount, result2.ModifiedCount)

	// Kurz warten für MongoDB Konsistenz
	time.Sleep(200 * time.Millisecond)

	// Verification mit mehreren Versuchen
	for i := 0; i < 5; i++ {
		var verifyVehicle model.Vehicle
		verifyErr := r.collection.FindOne(ctx, bson.M{"_id": vehicle.ID}).Decode(&verifyVehicle)
		if verifyErr == nil {
			fmt.Printf("VEHICLE VERIFICATION attempt %d:\n", i+1)
			fmt.Printf("  CurrentDriverID: %s\n", verifyVehicle.CurrentDriverID.Hex())
			fmt.Printf("  Status: %s\n", verifyVehicle.Status)
			fmt.Printf("  IsZero: %v\n", verifyVehicle.CurrentDriverID.IsZero())

			// Erfolg prüfen
			if vehicle.CurrentDriverID.IsZero() && verifyVehicle.CurrentDriverID.IsZero() {
				fmt.Printf("✓ Verification successful: CurrentDriverID is properly cleared\n")
				break
			} else if !vehicle.CurrentDriverID.IsZero() && verifyVehicle.CurrentDriverID == vehicle.CurrentDriverID {
				fmt.Printf("✓ Verification successful: CurrentDriverID is properly set\n")
				break
			} else if i == 4 {
				fmt.Printf("✗ Verification failed after 5 attempts\n")
				fmt.Printf("  Expected: %s (IsZero: %v)\n", vehicle.CurrentDriverID.Hex(), vehicle.CurrentDriverID.IsZero())
				fmt.Printf("  Actual: %s (IsZero: %v)\n", verifyVehicle.CurrentDriverID.Hex(), verifyVehicle.CurrentDriverID.IsZero())
			}
		} else {
			fmt.Printf("ERROR in verification attempt %d: %v\n", i+1, verifyErr)
		}

		if i < 4 {
			time.Sleep(300 * time.Millisecond) // Länger warten zwischen Versuchen
		}
	}

	return nil
}

// Hilfsfunktion zum Debugging
func getMapKeys(m bson.M) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
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
