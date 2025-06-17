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

// VehicleReservationRepository enthält alle Datenbankoperationen für das VehicleReservation-Modell
type VehicleReservationRepository struct {
	collection *mongo.Collection
}

// NewVehicleReservationRepository erstellt ein neues VehicleReservationRepository
func NewVehicleReservationRepository() *VehicleReservationRepository {
	return &VehicleReservationRepository{
		collection: db.GetCollection("vehicle_reservations"),
	}
}

// Create erstellt eine neue Reservierung
func (r *VehicleReservationRepository) Create(reservation *model.VehicleReservation) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	reservation.CreatedAt = time.Now()
	reservation.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, reservation)
	if err != nil {
		return err
	}

	reservation.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet eine Reservierung anhand ihrer ID
func (r *VehicleReservationRepository) FindByID(id string) (*model.VehicleReservation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var reservation model.VehicleReservation
	err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&reservation)
	if err != nil {
		return nil, err
	}

	return &reservation, nil
}

// FindAll findet alle Reservierungen
func (r *VehicleReservationRepository) FindAll() ([]model.VehicleReservation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reservations []model.VehicleReservation
	if err = cursor.All(ctx, &reservations); err != nil {
		return nil, err
	}

	return reservations, nil
}

// FindByVehicleID findet alle Reservierungen für ein bestimmtes Fahrzeug
func (r *VehicleReservationRepository) FindByVehicleID(vehicleID string) ([]model.VehicleReservation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, err
	}

	cursor, err := r.collection.Find(ctx, bson.M{"vehicleId": objectID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reservations []model.VehicleReservation
	if err = cursor.All(ctx, &reservations); err != nil {
		return nil, err
	}

	return reservations, nil
}

// FindByDriverID findet alle Reservierungen für einen bestimmten Fahrer
func (r *VehicleReservationRepository) FindByDriverID(driverID string) ([]model.VehicleReservation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return nil, err
	}

	cursor, err := r.collection.Find(ctx, bson.M{"driverId": objectID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reservations []model.VehicleReservation
	if err = cursor.All(ctx, &reservations); err != nil {
		return nil, err
	}

	return reservations, nil
}

// CheckConflict prüft ob es einen Terminkonflikt gibt
func (r *VehicleReservationRepository) CheckConflict(vehicleID string, startTime, endTime time.Time, excludeID *string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return false, err
	}

	filter := bson.M{
		"vehicleId": objectID,
		"status": bson.M{
			"$in": []string{string(model.ReservationStatusPending), string(model.ReservationStatusActive)},
		},
		"$or": []bson.M{
			{
				"startTime": bson.M{"$lt": endTime},
				"endTime":   bson.M{"$gt": startTime},
			},
		},
	}

	// Ausschließen einer bestimmten ID (für Updates)
	if excludeID != nil {
		excludeObjectID, err := primitive.ObjectIDFromHex(*excludeID)
		if err != nil {
			return false, err
		}
		filter["_id"] = bson.M{"$ne": excludeObjectID}
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// FindActiveReservations findet alle aktiven Reservierungen
func (r *VehicleReservationRepository) FindActiveReservations() ([]model.VehicleReservation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()
	filter := bson.M{
		"status":    string(model.ReservationStatusActive),
		"startTime": bson.M{"$lte": now},
		"endTime":   bson.M{"$gte": now},
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reservations []model.VehicleReservation
	if err = cursor.All(ctx, &reservations); err != nil {
		return nil, err
	}

	return reservations, nil
}

// Update aktualisiert eine Reservierung
func (r *VehicleReservationRepository) Update(reservation *model.VehicleReservation) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	reservation.UpdatedAt = time.Now()

	filter := bson.M{"_id": reservation.ID}
	update := bson.M{"$set": reservation}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

// Delete löscht eine Reservierung
func (r *VehicleReservationRepository) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	return err
}

// FindUpcomingReservations findet anstehende Reservierungen (für Benachrichtigungen)
func (r *VehicleReservationRepository) FindUpcomingReservations(hours int) ([]model.VehicleReservation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()
	upcoming := now.Add(time.Duration(hours) * time.Hour)

	filter := bson.M{
		"status":    string(model.ReservationStatusPending),
		"startTime": bson.M{"$gte": now, "$lte": upcoming},
	}

	opts := options.Find().SetSort(bson.D{{"startTime", 1}})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reservations []model.VehicleReservation
	if err = cursor.All(ctx, &reservations); err != nil {
		return nil, err
	}

	return reservations, nil
}