package repository

import (
	"FleetDrive/backend/db"
	"FleetDrive/backend/model"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// SMTPRepository verwaltet SMTP-Konfigurationsdaten
type SMTPRepository struct {
	collection         *mongo.Collection
	templateCollection *mongo.Collection
	logCollection      *mongo.Collection
	settingsCollection *mongo.Collection
}

// NewSMTPRepository erstellt ein neues SMTPRepository
func NewSMTPRepository() *SMTPRepository {
	return &SMTPRepository{
		collection:         db.GetCollection("smtp_config"),
		templateCollection: db.GetCollection("email_templates"),
		logCollection:      db.GetCollection("email_logs"),
		settingsCollection: db.GetCollection("notification_settings"),
	}
}

// SMTP Config Methods

// SaveSMTPConfig speichert oder aktualisiert die SMTP-Konfiguration
func (r *SMTPRepository) SaveSMTPConfig(config *model.SMTPConfig) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()
	
	// Es sollte nur eine SMTP-Konfiguration geben
	filter := bson.M{}
	update := bson.M{
		"$set": bson.M{
			"host":      config.Host,
			"port":      config.Port,
			"username":  config.Username,
			"password":  config.Password,
			"fromName":  config.FromName,
			"fromEmail": config.FromEmail,
			"useTLS":    config.UseTLS,
			"useSSL":    config.UseSSL,
			"isActive":  config.IsActive,
			"updatedAt": now,
		},
		"$setOnInsert": bson.M{
			"createdAt": now,
		},
	}

	opts := options.Update().SetUpsert(true)
	result, err := r.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return err
	}

	if result.UpsertedID != nil {
		config.ID = result.UpsertedID.(primitive.ObjectID)
	}

	return nil
}

// GetSMTPConfig holt die aktuelle SMTP-Konfiguration
func (r *SMTPRepository) GetSMTPConfig() (*model.SMTPConfig, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var config model.SMTPConfig
	err := r.collection.FindOne(ctx, bson.M{}).Decode(&config)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Keine Konfiguration gefunden
		}
		return nil, err
	}

	return &config, nil
}

// TestSMTPConnection testet die SMTP-Verbindung
func (r *SMTPRepository) TestSMTPConnection(config *model.SMTPConfig) error {
	// TODO: Implementiere SMTP-Verbindungstest
	return nil
}

// Email Template Methods

// SaveEmailTemplate speichert oder aktualisiert eine E-Mail-Vorlage
func (r *SMTPRepository) SaveEmailTemplate(template *model.EmailTemplate) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()
	template.UpdatedAt = now

	if template.ID.IsZero() {
		template.ID = primitive.NewObjectID()
		template.CreatedAt = now
		_, err := r.templateCollection.InsertOne(ctx, template)
		return err
	}

	filter := bson.M{"_id": template.ID}
	update := bson.M{"$set": template}
	_, err := r.templateCollection.UpdateOne(ctx, filter, update)
	return err
}

// GetEmailTemplate holt eine E-Mail-Vorlage nach Typ
func (r *SMTPRepository) GetEmailTemplate(templateType model.EmailTemplateType) (*model.EmailTemplate, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var template model.EmailTemplate
	filter := bson.M{"type": templateType, "isActive": true}
	err := r.templateCollection.FindOne(ctx, filter).Decode(&template)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &template, nil
}

// GetAllEmailTemplates holt alle E-Mail-Vorlagen
func (r *SMTPRepository) GetAllEmailTemplates() ([]*model.EmailTemplate, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := r.templateCollection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var templates []*model.EmailTemplate
	for cursor.Next(ctx) {
		var template model.EmailTemplate
		if err := cursor.Decode(&template); err != nil {
			continue
		}
		templates = append(templates, &template)
	}

	return templates, nil
}

// Email Log Methods

// LogEmail protokolliert einen E-Mail-Versand
func (r *SMTPRepository) LogEmail(log *model.EmailLog) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.ID = primitive.NewObjectID()
	log.CreatedAt = time.Now()

	_, err := r.logCollection.InsertOne(ctx, log)
	return err
}

// GetEmailLogs holt E-Mail-Logs mit Paginierung
func (r *SMTPRepository) GetEmailLogs(limit, offset int) ([]*model.EmailLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := r.logCollection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []*model.EmailLog
	for cursor.Next(ctx) {
		var log model.EmailLog
		if err := cursor.Decode(&log); err != nil {
			continue
		}
		logs = append(logs, &log)
	}

	return logs, nil
}

// Notification Settings Methods

// SaveNotificationSettings speichert oder aktualisiert Benachrichtigungseinstellungen
func (r *SMTPRepository) SaveNotificationSettings(settings *model.NotificationSettings) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()
	
	filter := bson.M{"userId": settings.UserID}
	update := bson.M{
		"$set": bson.M{
			"emailNotifications": settings.EmailNotifications,
			"bookingReminders":   settings.BookingReminders,
			"fuelReminders":      settings.FuelReminders,
			"maintenanceAlerts":  settings.MaintenanceAlerts,
			"updatedAt":          now,
		},
		"$setOnInsert": bson.M{
			"userId":    settings.UserID,
			"createdAt": now,
		},
	}

	opts := options.Update().SetUpsert(true)
	result, err := r.settingsCollection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return err
	}

	if result.UpsertedID != nil {
		settings.ID = result.UpsertedID.(primitive.ObjectID)
	}

	return nil
}

// GetNotificationSettings holt Benachrichtigungseinstellungen für einen Benutzer
func (r *SMTPRepository) GetNotificationSettings(userID primitive.ObjectID) (*model.NotificationSettings, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var settings model.NotificationSettings
	filter := bson.M{"userId": userID}
	err := r.settingsCollection.FindOne(ctx, filter).Decode(&settings)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// Standardeinstellungen zurückgeben
			return &model.NotificationSettings{
				UserID:             userID,
				EmailNotifications: true,
				BookingReminders:   true,
				FuelReminders:      true,
				MaintenanceAlerts:  false,
			}, nil
		}
		return nil, err
	}

	return &settings, nil
}

// CreateDefaultEmailTemplates erstellt Standard-E-Mail-Vorlagen
func (r *SMTPRepository) CreateDefaultEmailTemplates() error {
	templates := []*model.EmailTemplate{
		{
			Name:     "Neuer Benutzer erstellt",
			Subject:  "Willkommen bei FleetFlow - Ihr Zugang wurde erstellt",
			Body:     "Hallo {{.FirstName}} {{.LastName}},\n\nIhr FleetFlow-Zugang wurde erfolgreich erstellt.\n\nBenutzername: {{.Email}}\nTemporäres Passwort: {{.Password}}\n\nBitte loggen Sie sich ein und ändern Sie Ihr Passwort.\n\nMit freundlichen Grüßen\nIhr FleetFlow-Team",
			BodyHTML: `<h2>Willkommen bei FleetFlow</h2><p>Hallo {{.FirstName}} {{.LastName}},</p><p>Ihr FleetFlow-Zugang wurde erfolgreich erstellt.</p><p><strong>Benutzername:</strong> {{.Email}}<br><strong>Temporäres Passwort:</strong> {{.Password}}</p><p>Bitte loggen Sie sich ein und ändern Sie Ihr Passwort.</p><p>Mit freundlichen Grüßen<br>Ihr FleetFlow-Team</p>`,
			Type:     model.EmailTemplateUserCreated,
			IsActive: true,
		},
		{
			Name:     "Passwort zurücksetzen",
			Subject:  "FleetFlow - Passwort zurücksetzen",
			Body:     "Hallo {{.FirstName}} {{.LastName}},\n\nSie haben eine Passwort-Zurücksetzung angefordert.\n\nIhr neues temporäres Passwort: {{.Password}}\n\nBitte loggen Sie sich ein und ändern Sie Ihr Passwort.\n\nMit freundlichen Grüßen\nIhr FleetFlow-Team",
			BodyHTML: `<h2>Passwort zurücksetzen</h2><p>Hallo {{.FirstName}} {{.LastName}},</p><p>Sie haben eine Passwort-Zurücksetzung angefordert.</p><p><strong>Ihr neues temporäres Passwort:</strong> {{.Password}}</p><p>Bitte loggen Sie sich ein und ändern Sie Ihr Passwort.</p><p>Mit freundlichen Grüßen<br>Ihr FleetFlow-Team</p>`,
			Type:     model.EmailTemplatePasswordReset,
			IsActive: true,
		},
	}

	for _, template := range templates {
		// Prüfen, ob Template bereits existiert
		existing, _ := r.GetEmailTemplate(template.Type)
		if existing == nil {
			if err := r.SaveEmailTemplate(template); err != nil {
				return err
			}
		}
	}

	return nil
}