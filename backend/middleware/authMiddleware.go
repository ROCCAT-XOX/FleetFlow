// backend/middleware/authMiddleware.go
package middleware

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"FleetDrive/backend/utils"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware ist eine Middleware für die Benutzerauthentifizierung
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Token aus dem Cookie oder Auth-Header extrahieren
		tokenString, err := extractToken(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		// Token validieren
		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Ungültiges Token"})
			c.Abort()
			return
		}

		// Benutzer aus der Datenbank abrufen
		userRepo := repository.NewUserRepository()
		user, err := userRepo.FindByID(claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Benutzer nicht gefunden"})
			c.Abort()
			return
		}

		// Überprüfen, ob der Benutzer aktiv ist
		if user.Status != model.StatusActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "Ihr Konto ist inaktiv"})
			c.Abort()
			return
		}

		// Benutzer und Claims an den Kontext weitergeben
		c.Set("user", user)
		c.Set("userId", claims.UserID)
		c.Set("userRole", claims.Role)

		c.Next()
	}
}

// AdminMiddleware ist eine Middleware für administrative Operationen
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("userRole")
		if !exists || role != string(model.RoleAdmin) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Nur Administratoren dürfen diese Aktion ausführen"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// backend/middleware/authMiddleware.go (Fortsetzung)
// extractToken extrahiert das JWT-Token aus dem Cookie oder Header
func extractToken(c *gin.Context) (string, error) {
	// Zuerst nach Cookie suchen
	token, err := c.Cookie("token")
	if err == nil && token != "" {
		return token, nil
	}

	// Dann nach Authorization Header suchen
	bearerToken := c.GetHeader("Authorization")
	if bearerToken != "" && strings.HasPrefix(bearerToken, "Bearer ") {
		return strings.TrimPrefix(bearerToken, "Bearer "), nil
	}

	return "", errors.New("kein Token gefunden")
}
