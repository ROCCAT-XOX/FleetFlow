// backend/db/mongodb.go
package db

import (
	"context"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// getMongoURI gibt die MongoDB-URI basierend auf der Umgebung zurück
func getMongoURI() string {
	env := os.Getenv("ENV")
	if env == "production" {
		return "mongodb://mongodb:27017"
	}
	// Development (default)
	return "mongodb://localhost:27017"
}

// DBClient ist der shared MongoDB-Client
var DBClient *mongo.Client

// ConnectDB stellt eine Verbindung zur MongoDB her
func ConnectDB() error {
	// Verbindungskontext mit Timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Dynamische URI basierend auf Umgebung
	mongoURI := getMongoURI()

	// Verbindung zur MongoDB herstellen
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		return err
	}

	// Ping zur Überprüfung der Verbindung
	err = client.Ping(ctx, nil)
	if err != nil {
		return err
	}

	DBClient = client
	return nil
}

// GetCollection gibt eine Kollektion aus der Datenbank zurück
func GetCollection(collectionName string) *mongo.Collection {
	return DBClient.Database("FleetFlow").Collection(collectionName)
}

// DisconnectDB trennt die Verbindung zur MongoDB
func DisconnectDB() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := DBClient.Disconnect(ctx); err != nil {
		return err
	}

	return nil
}
