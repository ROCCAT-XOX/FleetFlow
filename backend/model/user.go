// backend/model/user.go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

// UserRole repräsentiert die Rolle eines Benutzers
type UserRole string

// UserStatus repräsentiert den Status eines Benutzers
type UserStatus string

const (
	// Benutzerrollen
	RoleAdmin   UserRole = "admin"
	RoleManager UserRole = "manager"
	RoleUser    UserRole = "user"

	// Benutzerstatus
	StatusActive   UserStatus = "active"
	StatusInactive UserStatus = "inactive"
)

// User repräsentiert einen Benutzer im System
type User struct {
	ID            primitive.ObjectID  `bson:"_id,omitempty" json:"id,omitempty"`
	FirstName     string              `bson:"firstName" json:"firstName"`
	LastName      string              `bson:"lastName" json:"lastName"`
	Email         string              `bson:"email" json:"email"`
	Phone         string              `bson:"phone,omitempty" json:"phone,omitempty"`
	Department    string              `bson:"department,omitempty" json:"department,omitempty"`
	Position      string              `bson:"position,omitempty" json:"position,omitempty"`
	Role          UserRole            `bson:"role" json:"role"`     // Geändert von string zu UserRole
	Status        UserStatus          `bson:"status" json:"status"` // Geändert von string zu UserStatus
	Password      string              `bson:"password" json:"-"`
	ProfilePicture *primitive.ObjectID `bson:"profilePicture,omitempty" json:"profilePicture,omitempty"`
	CreatedAt     time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt     time.Time           `bson:"updatedAt" json:"updatedAt"`
}

// HashPassword verschlüsselt das Passwort mit bcrypt
func (u *User) HashPassword() error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword überprüft, ob das eingegebene Passwort mit dem gespeicherten Hash übereinstimmt
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

// SetPassword hasht und setzt das Passwort für den Benutzer
func (u *User) SetPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}
