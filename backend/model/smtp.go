package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SMTPConfig repräsentiert die SMTP-Konfiguration
type SMTPConfig struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Host     string             `bson:"host" json:"host"`
	Port     int                `bson:"port" json:"port"`
	Username string             `bson:"username" json:"username"`
	Password string             `bson:"password" json:"password"`
	FromName string             `bson:"fromName" json:"fromName"`
	FromEmail string            `bson:"fromEmail" json:"fromEmail"`
	UseTLS   bool               `bson:"useTLS" json:"useTLS"`
	UseSSL   bool               `bson:"useSSL" json:"useSSL"`
	IsActive bool               `bson:"isActive" json:"isActive"`
	
	// Audit fields
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

// EmailTemplate repräsentiert eine E-Mail-Vorlage
type EmailTemplate struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name     string             `bson:"name" json:"name"`
	Subject  string             `bson:"subject" json:"subject"`
	Body     string             `bson:"body" json:"body"`
	BodyHTML string             `bson:"bodyHTML" json:"bodyHTML"`
	Type     EmailTemplateType  `bson:"type" json:"type"`
	IsActive bool               `bson:"isActive" json:"isActive"`
	
	// Audit fields
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

// EmailTemplateType definiert die verfügbaren E-Mail-Vorlagen-Typen
type EmailTemplateType string

const (
	EmailTemplateUserCreated      EmailTemplateType = "user_created"
	EmailTemplatePasswordReset    EmailTemplateType = "password_reset"
	EmailTemplateWelcome         EmailTemplateType = "welcome"
	EmailTemplateBookingReminder EmailTemplateType = "booking_reminder"
	EmailTemplateMaintenanceAlert EmailTemplateType = "maintenance_alert"
)

// EmailLog repräsentiert ein E-Mail-Versand-Log
type EmailLog struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	To        string             `bson:"to" json:"to"`
	Subject   string             `bson:"subject" json:"subject"`
	Body      string             `bson:"body" json:"body"`
	Status    EmailStatus        `bson:"status" json:"status"`
	Error     string             `bson:"error,omitempty" json:"error,omitempty"`
	SentAt    *time.Time         `bson:"sentAt,omitempty" json:"sentAt,omitempty"`
	
	// Template info
	TemplateType EmailTemplateType `bson:"templateType,omitempty" json:"templateType,omitempty"`
	
	// Audit fields
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}

// EmailStatus definiert den Status einer E-Mail
type EmailStatus string

const (
	EmailStatusPending EmailStatus = "pending"
	EmailStatusSent    EmailStatus = "sent"
	EmailStatusFailed  EmailStatus = "failed"
)

// NotificationSettings repräsentiert die Benachrichtigungseinstellungen eines Benutzers
type NotificationSettings struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID             primitive.ObjectID `bson:"userId" json:"userId"`
	EmailNotifications bool               `bson:"emailNotifications" json:"emailNotifications"`
	BookingReminders   bool               `bson:"bookingReminders" json:"bookingReminders"`
	FuelReminders      bool               `bson:"fuelReminders" json:"fuelReminders"`
	MaintenanceAlerts  bool               `bson:"maintenanceAlerts" json:"maintenanceAlerts"`
	
	// Audit fields
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}