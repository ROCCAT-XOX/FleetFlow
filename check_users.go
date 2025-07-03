package main

import (
	"FleetFlow/backend/db"
	"FleetFlow/backend/model"
	"context"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	// Datenbankverbindung herstellen
	err := db.ConnectDB()
	if err != nil {
		log.Fatal("Fehler beim Verbinden zur Datenbank:", err)
	}

	// Users Collection abrufen
	collection := db.GetCollection("users")

	// Alle Benutzer abrufen
	cursor, err := collection.Find(context.Background(), bson.M{})
	if err != nil {
		log.Fatal("Fehler beim Abrufen der Benutzer:", err)
	}
	defer cursor.Close(context.Background())

	fmt.Println("=== BENUTZER IN DER DATENBANK ===")
	fmt.Printf("%-30s %-15s %-10s\n", "EMAIL", "ROLLE", "NAME")
	fmt.Println("----------------------------------------")

	for cursor.Next(context.Background()) {
		var user model.User
		if err := cursor.Decode(&user); err != nil {
			log.Printf("Fehler beim Dekodieren des Benutzers: %v", err)
			continue
		}

		name := fmt.Sprintf("%s %s", user.FirstName, user.LastName)
		fmt.Printf("%-30s %-15s %-10s\n", user.Email, user.Role, name)
	}

	if err := cursor.Err(); err != nil {
		log.Fatal("Cursor-Fehler:", err)
	}
}