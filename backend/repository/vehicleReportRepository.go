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

// VehicleReportRepository verwaltet Fahrzeugmeldungen
type VehicleReportRepository struct {
	collection *mongo.Collection
}

// NewVehicleReportRepository erstellt eine neue Repository-Instanz
func NewVehicleReportRepository() *VehicleReportRepository {
	return &VehicleReportRepository{
		collection: db.GetDatabase().Collection("vehicleReports"),
	}
}

// Create erstellt eine neue Fahrzeugmeldung
func (r *VehicleReportRepository) Create(report *model.VehicleReport) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	report.CreatedAt = time.Now()
	report.UpdatedAt = time.Now()

	if report.Status == "" {
		report.Status = model.ReportStatusOpen
	}

	result, err := r.collection.InsertOne(ctx, report)
	if err != nil {
		return err
	}

	report.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet eine Meldung anhand der ID
func (r *VehicleReportRepository) FindByID(id primitive.ObjectID) (*model.VehicleReport, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var report model.VehicleReport
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&report)
	if err != nil {
		return nil, err
	}

	return &report, nil
}

// FindByReporter findet alle Meldungen eines Fahrers
func (r *VehicleReportRepository) FindByReporter(reporterID primitive.ObjectID, limit int) ([]*model.VehicleReport, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}

	cursor, err := r.collection.Find(ctx, bson.M{"reporterId": reporterID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reports []*model.VehicleReport
	for cursor.Next(ctx) {
		var report model.VehicleReport
		if err := cursor.Decode(&report); err != nil {
			return nil, err
		}
		reports = append(reports, &report)
	}

	return reports, cursor.Err()
}

// FindByVehicle findet alle Meldungen für ein Fahrzeug
func (r *VehicleReportRepository) FindByVehicle(vehicleID primitive.ObjectID) ([]*model.VehicleReport, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := r.collection.Find(ctx, bson.M{"vehicleId": vehicleID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reports []*model.VehicleReport
	for cursor.Next(ctx) {
		var report model.VehicleReport
		if err := cursor.Decode(&report); err != nil {
			return nil, err
		}
		reports = append(reports, &report)
	}

	return reports, cursor.Err()
}

// FindByStatus findet alle Meldungen mit einem bestimmten Status
func (r *VehicleReportRepository) FindByStatus(status model.ReportStatus) ([]*model.VehicleReport, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := r.collection.Find(ctx, bson.M{"status": status}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reports []*model.VehicleReport
	for cursor.Next(ctx) {
		var report model.VehicleReport
		if err := cursor.Decode(&report); err != nil {
			return nil, err
		}
		reports = append(reports, &report)
	}

	return reports, cursor.Err()
}

// FindAll findet alle Meldungen mit Paginierung
func (r *VehicleReportRepository) FindAll(page, limit int) ([]*model.VehicleReport, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reports []*model.VehicleReport
	for cursor.Next(ctx) {
		var report model.VehicleReport
		if err := cursor.Decode(&report); err != nil {
			return nil, err
		}
		reports = append(reports, &report)
	}

	return reports, cursor.Err()
}

// FindUrgent findet alle dringenden Meldungen
func (r *VehicleReportRepository) FindUrgent() ([]*model.VehicleReport, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{
		"$or": []bson.M{
			{"priority": model.ReportPriorityUrgent},
			{"type": model.ReportTypeAccident},
			{"type": model.ReportTypeBrakeIssue},
		},
		"status": bson.M{"$in": []string{string(model.ReportStatusOpen), string(model.ReportStatusInProgress)}},
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reports []*model.VehicleReport
	for cursor.Next(ctx) {
		var report model.VehicleReport
		if err := cursor.Decode(&report); err != nil {
			return nil, err
		}
		reports = append(reports, &report)
	}

	return reports, cursor.Err()
}

// Update aktualisiert eine Meldung
func (r *VehicleReportRepository) Update(id primitive.ObjectID, update bson.M) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	update["updatedAt"] = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)

	return err
}

// UpdateStatus ändert den Status einer Meldung
func (r *VehicleReportRepository) UpdateStatus(id primitive.ObjectID, status model.ReportStatus, updatedBy primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	update := bson.M{
		"status":    status,
		"updatedAt": time.Now(),
	}

	// Spezielle Felder je nach Status setzen
	switch status {
	case model.ReportStatusResolved:
		update["resolvedBy"] = updatedBy
		update["resolvedAt"] = time.Now()
	case model.ReportStatusInProgress:
		update["assignedTo"] = updatedBy
	}

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)

	return err
}

// AssignTo weist eine Meldung einem Bearbeiter zu
func (r *VehicleReportRepository) AssignTo(id primitive.ObjectID, assignedTo primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	update := bson.M{
		"assignedTo": assignedTo,
		"status":     model.ReportStatusInProgress,
		"updatedAt":  time.Now(),
	}

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)

	return err
}

// Resolve markiert eine Meldung als behoben
func (r *VehicleReportRepository) Resolve(id primitive.ObjectID, resolvedBy primitive.ObjectID, resolution string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	update := bson.M{
		"status":     model.ReportStatusResolved,
		"resolvedBy": resolvedBy,
		"resolvedAt": time.Now(),
		"resolution": resolution,
		"updatedAt":  time.Now(),
	}

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)

	return err
}

// Delete löscht eine Meldung
func (r *VehicleReportRepository) Delete(id primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// CountByStatus zählt Meldungen nach Status
func (r *VehicleReportRepository) CountByStatus(status model.ReportStatus) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{"status": status})
	return count, err
}

// CountByReporter zählt Meldungen eines Fahrers
func (r *VehicleReportRepository) CountByReporter(reporterID primitive.ObjectID) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{"reporterId": reporterID})
	return count, err
}

// GetStatistics liefert Statistiken über Meldungen
func (r *VehicleReportRepository) GetStatistics() (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pipeline := []bson.M{
		{
			"$group": bson.M{
				"_id": "$status",
				"count": bson.M{"$sum": 1},
			},
		},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	stats := make(map[string]interface{})
	stats["total"] = int64(0)

	for cursor.Next(ctx) {
		var result struct {
			ID    string `bson:"_id"`
			Count int64  `bson:"count"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}

		stats[result.ID] = result.Count
		stats["total"] = stats["total"].(int64) + result.Count
	}

	return stats, cursor.Err()
}