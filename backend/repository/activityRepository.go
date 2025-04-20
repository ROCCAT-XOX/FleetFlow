// backend/repository/activityRepository.go
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

// ActivityRepository enthält alle Datenbankoperationen für das Activity-Modell
type ActivityRepository struct {
	collection *mongo.Collection
}

// NewActivityRepository erstellt ein neues ActivityRepository
func NewActivityRepository() *ActivityRepository {
	return &ActivityRepository{
		collection: db.GetCollection("activities"),
	}
}

// Create erstellt eine neue Aktivität
func (r *ActivityRepository) Create(activity *model.Activity) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if activity.Timestamp.IsZero() {
		activity.Timestamp = time.Now()
	}

	result, err := r.collection.InsertOne(ctx, activity)
	if err != nil {
		return err
	}

	activity.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet eine Aktivität anhand ihrer ID
func (r *ActivityRepository) FindByID(id string) (*model.Activity, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var activity model.Activity
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&activity)
	if err != nil {
		return nil, err
	}

	return &activity, nil
}

// FindAll findet alle Aktivitäten
func (r *ActivityRepository) FindAll(limit int, skip int) ([]*model.Activity, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(skip))

	var activities []*model.Activity
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var activity model.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, err
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return activities, nil
}

// FindByVehicle findet alle Aktivitäten für ein bestimmtes Fahrzeug
func (r *ActivityRepository) FindByVehicle(vehicleID string, limit int, skip int) ([]*model.Activity, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, err
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(skip))

	var activities []*model.Activity
	cursor, err := r.collection.Find(ctx, bson.M{"vehicleId": objID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var activity model.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, err
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return activities, nil
}

// FindByDriver findet alle Aktivitäten für einen bestimmten Fahrer
func (r *ActivityRepository) FindByDriver(driverID string, limit int, skip int) ([]*model.Activity, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return nil, err
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(skip))

	var activities []*model.Activity
	cursor, err := r.collection.Find(ctx, bson.M{"driverId": objID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var activity model.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, err
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return activities, nil
}

// FindByType findet alle Aktivitäten eines bestimmten Typs
func (r *ActivityRepository) FindByType(activityType model.ActivityType, limit int, skip int) ([]*model.Activity, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(skip))

	var activities []*model.Activity
	cursor, err := r.collection.Find(ctx, bson.M{"type": activityType}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var activity model.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, err
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return activities, nil
}

// FindByDateRange findet alle Aktivitäten in einem bestimmten Zeitraum
func (r *ActivityRepository) FindByDateRange(start time.Time, end time.Time, limit int, skip int) ([]*model.Activity, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(skip))

	var activities []*model.Activity
	cursor, err := r.collection.Find(ctx, bson.M{
		"timestamp": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var activity model.Activity
		if err := cursor.Decode(&activity); err != nil {
			return nil, err
		}
		activities = append(activities, &activity)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return activities, nil
}
