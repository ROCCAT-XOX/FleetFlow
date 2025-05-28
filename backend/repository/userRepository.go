// backend/repository/userRepository.go
package repository

import (
	"context"
	"go.mongodb.org/mongo-driver/mongo/options"
	"time"

	"FleetDrive/backend/db"
	"FleetDrive/backend/model"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// UserRepository enthält alle Datenbankoperationen für das User-Modell
type UserRepository struct {
	collection *mongo.Collection
}

// NewUserRepository erstellt ein neues UserRepository
func NewUserRepository() *UserRepository {
	return &UserRepository{
		collection: db.GetCollection("users"),
	}
}

// Create erstellt einen neuen Benutzer
func (r *UserRepository) Create(user *model.User) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	// Passwort hashen
	if err := user.HashPassword(); err != nil {
		return err
	}

	result, err := r.collection.InsertOne(ctx, user)
	if err != nil {
		return err
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID findet einen Benutzer anhand seiner ID
func (r *UserRepository) FindByID(id string) (*model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user model.User
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// FindByEmail findet einen Benutzer anhand seiner E-Mail
func (r *UserRepository) FindByEmail(email string) (*model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user model.User
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// FindAll findet alle Benutzer
func (r *UserRepository) FindAll() ([]*model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var users []*model.User
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var user model.User
		if err := cursor.Decode(&user); err != nil {
			return nil, err
		}
		users = append(users, &user)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

// Update aktualisiert einen Benutzer
// Update aktualisiert einen bestehenden Benutzer in der Datenbank
func (r *UserRepository) Update(user *model.User) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Setze UpdatedAt auf die aktuelle Zeit
	user.UpdatedAt = time.Now()

	// Explizit spezifizierte Felder für mehr Kontrolle
	updateData := bson.M{
		"$set": bson.M{
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"email":     user.Email,
			"password":  user.Password,
			"role":      user.Role,
			"status":    user.Status,
			"updatedAt": user.UpdatedAt,
			// Fügen Sie hier weitere Felder hinzu, die aktualisiert werden sollen
			// Dies verhindert, dass unbeabsichtigt Felder überschrieben werden
		},
	}

	result, err := r.collection.UpdateOne(ctx, bson.M{"_id": user.ID}, updateData)
	if err != nil {
		return err
	}

	// Prüfen, ob ein Dokument gefunden wurde
	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// Delete löscht einen Benutzer
func (r *UserRepository) Delete(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

// CreateAdminUserIfNotExists erstellt einen Admin-Benutzer, falls keiner existiert
func (r *UserRepository) CreateAdminUserIfNotExists() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Prüfen, ob bereits ein Admin-Benutzer existiert
	count, err := r.collection.CountDocuments(ctx, bson.M{"role": model.RoleAdmin})
	if err != nil {
		return err
	}

	// Wenn bereits ein Admin existiert, nichts tun
	if count > 0 {
		return nil
	}

	// Admin-Benutzer erstellen
	admin := &model.User{
		FirstName: "Admin",
		LastName:  "User",
		Email:     "admin@FleetFlow.com",
		Password:  "admin",
		Role:      model.RoleAdmin,    // Jetzt kann direkt der Typ verwendet werden
		Status:    model.StatusActive, // Jetzt kann direkt der Typ verwendet werden
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Passwort hashen
	if err := admin.HashPassword(); err != nil {
		return err
	}

	// Admin in der Datenbank speichern
	_, err = r.collection.InsertOne(ctx, admin)
	return err
}

func (r *UserRepository) FindByUsername(username string) (*model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user model.User
	err := r.collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetAll gibt alle Benutzer aus der Datenbank zurück
func (r *UserRepository) GetAll() ([]*model.User, error) {
	return r.GetUsersWithFilter(bson.M{})
}

// GetUsersWithFilter gibt Benutzer basierend auf einem Filter zurück
func (r *UserRepository) GetUsersWithFilter(filter bson.M) ([]*model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var users []*model.User

	// Optionen für Sortierung und Felder
	opts := options.Find().SetSort(bson.D{{"lastName", 1}, {"firstName", 1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var user model.User
		if err := cursor.Decode(&user); err != nil {
			return nil, err
		}
		users = append(users, &user)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

// GetUserByEmail findet einen Benutzer anhand seiner E-Mail-Adresse
func (r *UserRepository) GetUserByEmail(email string) (*model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user model.User
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Kein Benutzer gefunden, aber kein Fehler
		}
		return nil, err
	}

	return &user, nil
}

// Count gibt die Anzahl der Benutzer in der Datenbank zurück
func (r *UserRepository) Count() (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return 0, err
	}

	return count, nil
}
