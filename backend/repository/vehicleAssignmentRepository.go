// backend/repository/vehicleAssignmentRepository.go
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

// VehicleAssignmentRepository enthält alle Datenbankoperationen für VehicleAssignment
type VehicleAssignmentRepository struct {
	collection *mongo.Collection
}

// NewVehicleAssignmentRepository erstellt ein neues VehicleAssignmentRepository
func NewVehicleAssignmentRepository() *VehicleAssignmentRepository {
	return &VehicleAssignmentRepository{
		collection: db.GetCollection("vehicleAssignments"),
	}
}

// Create erstellt einen neuen Zuweisungseintrag
func (r *VehicleAssignmentRepository) Create(assignment *model.VehicleAssignment) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	assignment.CreatedAt = time.Now()
	assignment.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, assignment)
	if err != nil {
		return err
	}

	assignment.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// Update aktualisiert einen Zuweisungseintrag
func (r *VehicleAssignmentRepository) Update(assignment *model.VehicleAssignment) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	assignment.UpdatedAt = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": assignment.ID},
		bson.M{"$set": assignment},
	)
	return err
}

// FindByDriverID findet alle Zuweisungen für einen Fahrer
func (r *VehicleAssignmentRepository) FindByDriverID(driverID string) ([]*model.VehicleAssignment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return nil, err
	}

	opts := options.Find().SetSort(bson.D{{Key: "assignedAt", Value: -1}})

	var assignments []*model.VehicleAssignment
	cursor, err := r.collection.Find(ctx, bson.M{"driverId": objID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var assignment model.VehicleAssignment
		if err := cursor.Decode(&assignment); err != nil {
			return nil, err
		}
		assignments = append(assignments, &assignment)
	}

	return assignments, cursor.Err()
}

// FindByVehicleID findet alle Zuweisungen für ein Fahrzeug
func (r *VehicleAssignmentRepository) FindByVehicleID(vehicleID string) ([]*model.VehicleAssignment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, err
	}

	opts := options.Find().SetSort(bson.D{{Key: "assignedAt", Value: -1}})

	var assignments []*model.VehicleAssignment
	cursor, err := r.collection.Find(ctx, bson.M{"vehicleId": objID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var assignment model.VehicleAssignment
		if err := cursor.Decode(&assignment); err != nil {
			return nil, err
		}
		assignments = append(assignments, &assignment)
	}

	return assignments, cursor.Err()
}

// FindActiveAssignmentByDriver findet die aktuelle aktive Zuweisung eines Fahrers
func (r *VehicleAssignmentRepository) FindActiveAssignmentByDriver(driverID string) (*model.VehicleAssignment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return nil, err
	}

	var assignment model.VehicleAssignment
	err = r.collection.FindOne(ctx, bson.M{
		"driverId":     objID,
		"unassignedAt": bson.M{"$exists": false},
	}).Decode(&assignment)

	if err != nil {
		return nil, err
	}

	return &assignment, nil
}

// CloseAssignment schließt eine aktive Zuweisung ab
func (r *VehicleAssignmentRepository) CloseAssignment(assignmentID primitive.ObjectID, unassignedAt time.Time) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Zuerst die aktuelle Zuweisung laden um die Dauer zu berechnen
	var assignment model.VehicleAssignment
	err := r.collection.FindOne(ctx, bson.M{"_id": assignmentID}).Decode(&assignment)
	if err != nil {
		return err
	}

	// Dauer berechnen
	duration := unassignedAt.Sub(assignment.AssignedAt)

	// Update durchführen
	_, err = r.collection.UpdateOne(
		ctx,
		bson.M{"_id": assignmentID},
		bson.M{
			"$set": bson.M{
				"unassignedAt": unassignedAt,
				"duration":     duration,
				"updatedAt":    time.Now(),
			},
		},
	)

	return err
}

// FindRecentAssignments findet die letzten Zuweisungen systemweit
func (r *VehicleAssignmentRepository) FindRecentAssignments(limit int) ([]*model.VehicleAssignment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().
		SetSort(bson.D{{Key: "assignedAt", Value: -1}}).
		SetLimit(int64(limit))

	var assignments []*model.VehicleAssignment
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var assignment model.VehicleAssignment
		if err := cursor.Decode(&assignment); err != nil {
			return nil, err
		}
		assignments = append(assignments, &assignment)
	}

	return assignments, cursor.Err()
}
