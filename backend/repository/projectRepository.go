// backend/repository/projectRepository.go
package repository

import (
	"context"
	"time"

	"FleetDrive/backend/db"
	"FleetDrive/backend/model"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// ProjectRepository enthält alle Datenbankoperationen für das Project-Modell
type ProjectRepository struct {
	collection *mongo.Collection
}

// NewProjectRepository erstellt ein neues ProjectRepository
func NewProjectRepository() *ProjectRepository {
	return &ProjectRepository{
		collection: db.GetCollection("projects"),
	}
}

// Create erstellt ein neues Projekt
func (r *ProjectRepository) Create(project *model.Project) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	project.CreatedAt = time.Now()
	project.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, project)
	if err != nil {
		return err
	}

	project.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet ein Projekt anhand seiner ID
func (r *ProjectRepository) FindByID(id string) (*model.Project, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var project model.Project
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&project)
	if err != nil {
		return nil, err
	}

	return &project, nil
}

// FindByName findet ein Projekt anhand seines Namens
func (r *ProjectRepository) FindByName(name string) (*model.Project, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var project model.Project
	err := r.collection.FindOne(ctx, bson.M{"name": name}).Decode(&project)
	if err != nil {
		return nil, err
	}

	return &project, nil
}

// FindAll findet alle Projekte
func (r *ProjectRepository) FindAll() ([]*model.Project, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var projects []*model.Project
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var project model.Project
		if err := cursor.Decode(&project); err != nil {
			return nil, err
		}
		projects = append(projects, &project)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return projects, nil
}

// FindByStatus findet alle Projekte mit einem bestimmten Status
func (r *ProjectRepository) FindByStatus(status model.ProjectStatus) ([]*model.Project, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var projects []*model.Project
	cursor, err := r.collection.Find(ctx, bson.M{"status": status})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var project model.Project
		if err := cursor.Decode(&project); err != nil {
			return nil, err
		}
		projects = append(projects, &project)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return projects, nil
}

// Update aktualisiert ein Projekt
func (r *ProjectRepository) Update(project *model.Project) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	project.UpdatedAt = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": project.ID},
		bson.M{"$set": project},
	)
	return err
}

// Delete löscht ein Projekt
func (r *ProjectRepository) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}
