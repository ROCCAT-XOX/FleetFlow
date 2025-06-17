// backend/db/mongodb.go
package db

import (
	"context"
	"log"
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
	log.Printf("Verbindung zu MongoDB: %s", mongoURI)

	// Verbindung zur MongoDB herstellen
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Printf("Fehler beim Verbinden zur MongoDB: %v", err)
		return err
	}

	// Ping zur Überprüfung der Verbindung
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Printf("Fehler beim Pingen der MongoDB: %v", err)
		return err
	}

	DBClient = client
	log.Println("Erfolgreich mit MongoDB verbunden")
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
		log.Printf("Fehler beim Trennen der MongoDB-Verbindung: %v", err)
		return err
	}

	log.Println("Verbindung zur MongoDB getrennt")
	return nil
}
