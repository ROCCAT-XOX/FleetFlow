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

	// Benutzer test@test.de auf driver-Rolle ändern
	filter := bson.M{"email": "test@test.de"}
	update := bson.M{"$set": bson.M{"role": string(model.RoleDriver)}}

	result, err := collection.UpdateOne(context.Background(), filter, update)
	if err != nil {
		log.Fatal("Fehler beim Aktualisieren des Benutzers:", err)
	}

	if result.MatchedCount == 0 {
		fmt.Println("Benutzer test@test.de nicht gefunden")
	} else {
		fmt.Printf("✅ Benutzer test@test.de wurde erfolgreich auf Rolle '%s' aktualisiert\n", model.RoleDriver)
	}

	// Bestätigung: Benutzer erneut abrufen
	var user model.User
	err = collection.FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		log.Fatal("Fehler beim Abrufen des aktualisierten Benutzers:", err)
	}

	fmt.Printf("Bestätigung - Email: %s, Rolle: %s, Name: %s %s\n", 
		user.Email, user.Role, user.FirstName, user.LastName)
}