// backend/repository/driverDocumentRepository.go
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

// DriverDocumentRepository enthält alle Datenbankoperationen für Fahrerdokumente
type DriverDocumentRepository struct {
	collection *mongo.Collection
}

// NewDriverDocumentRepository erstellt ein neues DriverDocumentRepository
func NewDriverDocumentRepository() *DriverDocumentRepository {
	return &DriverDocumentRepository{
		collection: db.GetCollection("driver_documents"),
	}
}

// Create erstellt ein neues Fahrerdokument
func (r *DriverDocumentRepository) Create(document *model.DriverDocument) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	document.UploadedAt = time.Now()
	document.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, document)
	if err != nil {
		return err
	}

	document.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet ein Dokument anhand seiner ID
func (r *DriverDocumentRepository) FindByID(id string) (*model.DriverDocument, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var document model.DriverDocument
	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&document)
	if err != nil {
		return nil, err
	}

	return &document, nil
}

// FindByDriver findet alle Dokumente für einen Fahrer
func (r *DriverDocumentRepository) FindByDriver(driverID string) ([]*model.DriverDocument, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return nil, err
	}

	opts := options.Find().SetSort(bson.D{{Key: "uploadedAt", Value: -1}})
	cursor, err := r.collection.Find(ctx, bson.M{"driverId": objID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var documents []*model.DriverDocument
	for cursor.Next(ctx) {
		var document model.DriverDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		documents = append(documents, &document)
	}

	return documents, cursor.Err()
}

// FindByDriverAndType findet alle Dokumente eines bestimmten Typs für einen Fahrer
func (r *DriverDocumentRepository) FindByDriverAndType(driverID string, docType model.DriverDocumentType) ([]*model.DriverDocument, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return nil, err
	}

	filter := bson.M{
		"driverId": objID,
		"type":     docType,
	}

	opts := options.Find().SetSort(bson.D{{Key: "uploadedAt", Value: -1}})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var documents []*model.DriverDocument
	for cursor.Next(ctx) {
		var document model.DriverDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		documents = append(documents, &document)
	}

	return documents, cursor.Err()
}

// Update aktualisiert ein Dokument (ohne Datei-Daten)
func (r *DriverDocumentRepository) Update(document *model.DriverDocument) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	document.UpdatedAt = time.Now()

	update := bson.M{
		"$set": bson.M{
			"type":             document.Type,
			"name":             document.Name,
			"expiryDate":       document.ExpiryDate,
			"issueDate":        document.IssueDate,
			"licenseNumber":    document.LicenseNumber,
			"issuingAuthority": document.IssuingAuthority,
			"notes":            document.Notes,
			"updatedAt":        document.UpdatedAt,
		},
	}

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": document.ID},
		update,
	)

	return err
}

// Delete löscht ein Dokument
func (r *DriverDocumentRepository) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

// CountByDriver zählt die Anzahl der Dokumente für einen Fahrer
func (r *DriverDocumentRepository) CountByDriver(driverID string) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return 0, err
	}

	count, err := r.collection.CountDocuments(ctx, bson.M{"driverId": objID})
	if err != nil {
		return 0, err
	}

	return count, nil
}

// FindExpiringLicenses findet alle Führerscheine, die in den nächsten 30 Tagen ablaufen
func (r *DriverDocumentRepository) FindExpiringLicenses(days int) ([]*model.DriverDocument, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	expiryThreshold := time.Now().AddDate(0, 0, days)

	filter := bson.M{
		"type": model.DriverDocumentTypeLicense,
		"expiryDate": bson.M{
			"$gte": time.Now(),
			"$lte": expiryThreshold,
		},
	}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var documents []*model.DriverDocument
	for cursor.Next(ctx) {
		var document model.DriverDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		documents = append(documents, &document)
	}

	return documents, cursor.Err()
}
