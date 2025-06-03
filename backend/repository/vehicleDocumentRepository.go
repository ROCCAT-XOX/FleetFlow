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

// VehicleDocumentRepository enthält alle Datenbankoperationen für Fahrzeugdokumente
type VehicleDocumentRepository struct {
	collection *mongo.Collection
}

// NewVehicleDocumentRepository erstellt ein neues VehicleDocumentRepository
func NewVehicleDocumentRepository() *VehicleDocumentRepository {
	return &VehicleDocumentRepository{
		collection: db.GetCollection("vehicle_documents"),
	}
}

// Create erstellt ein neues Fahrzeugdokument
func (r *VehicleDocumentRepository) Create(document *model.VehicleDocument) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	document.CreatedAt = time.Now()
	document.UpdatedAt = time.Now()
	document.UploadedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, document)
	if err != nil {
		return err
	}

	document.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet ein Dokument anhand seiner ID
func (r *VehicleDocumentRepository) FindByID(id string) (*model.VehicleDocument, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var document model.VehicleDocument
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&document)
	if err != nil {
		return nil, err
	}

	return &document, nil
}

// FindByVehicle findet alle Dokumente für ein bestimmtes Fahrzeug
func (r *VehicleDocumentRepository) FindByVehicle(vehicleID string) ([]*model.VehicleDocument, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, err
	}

	opts := options.Find().SetSort(bson.D{{Key: "uploadedAt", Value: -1}})

	var documents []*model.VehicleDocument
	cursor, err := r.collection.Find(ctx, bson.M{"vehicleId": objID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var document model.VehicleDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		documents = append(documents, &document)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return documents, nil
}

// FindByVehicleAndType findet Dokumente für ein Fahrzeug nach Typ
func (r *VehicleDocumentRepository) FindByVehicleAndType(vehicleID string, docType model.DocumentType) ([]*model.VehicleDocument, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, err
	}

	opts := options.Find().SetSort(bson.D{{Key: "uploadedAt", Value: -1}})

	var documents []*model.VehicleDocument
	cursor, err := r.collection.Find(ctx, bson.M{
		"vehicleId": objID,
		"type":      docType,
	}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var document model.VehicleDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		documents = append(documents, &document)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return documents, nil
}

// Update aktualisiert ein Dokument
func (r *VehicleDocumentRepository) Update(document *model.VehicleDocument) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	document.UpdatedAt = time.Now()

	updateDoc := bson.M{
		"$set": bson.M{
			"type":       document.Type,
			"name":       document.Name,
			"expiryDate": document.ExpiryDate,
			"notes":      document.Notes,
			"updatedAt":  document.UpdatedAt,
		},
	}

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": document.ID},
		updateDoc,
	)

	return err
}

// Delete löscht ein Dokument
func (r *VehicleDocumentRepository) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

// FindExpiring findet alle Dokumente, die in den nächsten Tagen ablaufen
func (r *VehicleDocumentRepository) FindExpiring(days int) ([]*model.VehicleDocument, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	expiryDate := time.Now().AddDate(0, 0, days)

	var documents []*model.VehicleDocument
	cursor, err := r.collection.Find(ctx, bson.M{
		"expiryDate": bson.M{
			"$gte": time.Now(),
			"$lte": expiryDate,
		},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var document model.VehicleDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		documents = append(documents, &document)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return documents, nil
}

// CountByVehicle zählt die Dokumente für ein Fahrzeug
func (r *VehicleDocumentRepository) CountByVehicle(vehicleID string) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return 0, err
	}

	count, err := r.collection.CountDocuments(ctx, bson.M{"vehicleId": objID})
	return count, err
}
