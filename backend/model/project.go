// backend/model/project.go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ProjectStatus repräsentiert den Status eines Projekts
type ProjectStatus string

const (
	// Projektstatus
	ProjectStatusPlanning ProjectStatus = "planning"
	ProjectStatusActive   ProjectStatus = "active"
	ProjectStatusComplete ProjectStatus = "complete"
	ProjectStatusOnHold   ProjectStatus = "onhold"
)

// Project repräsentiert ein Projekt im System
type Project struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Status      ProjectStatus      `bson:"status" json:"status"`
	Department  string             `bson:"department" json:"department"`
	StartDate   time.Time          `bson:"startDate" json:"startDate"`
	EndDate     time.Time          `bson:"endDate,omitempty" json:"endDate"`
	Manager     string             `bson:"manager" json:"manager"`
	Budget      float64            `bson:"budget" json:"budget"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}
