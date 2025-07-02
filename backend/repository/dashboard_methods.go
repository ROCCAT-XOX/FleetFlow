// backend/repository/dashboard_methods.go
package repository

import (
	"context"
	"time"

	"FleetFlow/backend/model" // Korrigiert von models zu model
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Add these methods to the VehicleRepository

func (r *VehicleRepository) CountByStatus(status model.VehicleStatus) (int64, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{"status": status})
	return count, err
}

func (r *VehicleRepository) FindAllWithLimit(limit int) ([]*model.Vehicle, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	opts := options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "createdAt", Value: -1}})

	var vehicles []*model.Vehicle
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
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

// Zusätzliche Methode um zu prüfen ob Fahrzeuge existieren
func (r *VehicleRepository) HasAnyVehicles() (bool, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Add these methods to the DriverRepository

func (r *DriverRepository) FindAllWithLimit(limit int) ([]*model.Driver, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	opts := options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "createdAt", Value: -1}})

	var drivers []*model.Driver
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
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

// Zusätzliche Methode um zu prüfen ob Fahrer existieren
func (r *DriverRepository) HasAnyDrivers() (bool, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Add these methods to the MaintenanceRepository

func (r *MaintenanceRepository) FindUpcomingWithLimit(endDate time.Time, limit int) ([]*model.Maintenance, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	now := time.Now()

	opts := options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "date", Value: 1}})

	var maintenanceEntries []*model.Maintenance
	cursor, err := r.collection.Find(ctx, bson.M{
		"date": bson.M{
			"$gte": now,
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
		maintenanceEntries = append(maintenanceEntries, &maintenance)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return maintenanceEntries, nil
}

func (r *MaintenanceRepository) FindRecentWithLimit(limit int) ([]*model.Maintenance, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	opts := options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "date", Value: -1}})

	var maintenanceEntries []*model.Maintenance
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)

	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var maintenance model.Maintenance
		if err := cursor.Decode(&maintenance); err != nil {
			return nil, err
		}
		maintenanceEntries = append(maintenanceEntries, &maintenance)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return maintenanceEntries, nil
}

// Zusätzliche Methode um zu prüfen ob Wartungseinträge existieren
func (r *MaintenanceRepository) HasAnyMaintenance() (bool, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Add these methods to the VehicleUsageRepository

func (r *VehicleUsageRepository) FindRecentWithLimit(limit int) ([]*model.VehicleUsage, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	opts := options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "startDate", Value: -1}})

	var usageEntries []*model.VehicleUsage
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
		usageEntries = append(usageEntries, &usage)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return usageEntries, nil
}

// Zusätzliche Methode um zu prüfen ob Nutzungseinträge existieren
func (r *VehicleUsageRepository) HasAnyUsage() (bool, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Methode um aktive Nutzungen zu zählen
func (r *VehicleUsageRepository) CountActiveUsage() (int64, error) {
	ctx, cancel := r.getContext()
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{
		"status": model.UsageStatusActive,
	})
	return count, err
}

// Add to existing repositories a helper method for context creation
func (r *VehicleRepository) getContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (r *DriverRepository) getContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (r *MaintenanceRepository) getContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (r *VehicleUsageRepository) getContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}
