// backend/middleware/authMiddleware.go
package middleware

import (
	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"FleetFlow/backend/utils"
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
			// Kein Token gefunden, zum Login umleiten
			c.Redirect(http.StatusFound, "/login")
			c.Abort()
			return
		}

		// Token validieren
		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			// Ungültiges Token, zum Login umleiten
			c.Redirect(http.StatusFound, "/login")
			c.Abort()
			return
		}

		// Benutzer aus der Datenbank abrufen
		userRepo := repository.NewUserRepository()
		user, err := userRepo.FindByID(claims.UserID)
		if err != nil {
			// Benutzer nicht gefunden, zum Login umleiten
			c.Redirect(http.StatusFound, "/login")
			c.Abort()
			return
		}

		// Überprüfen, ob der Benutzer aktiv ist
		if user.Status != model.StatusActive {
			// Benutzer inaktiv, zum Login umleiten
			c.Redirect(http.StatusFound, "/login")
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

// ManagerOrAdminMiddleware ist eine Middleware für Manager- und Admin-Operationen
func ManagerOrAdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Keine Berechtigung"})
			c.Abort()
			return
		}
		
		currentUser := user.(*model.User)
		userRole := currentUser.Role
		
		if userRole != model.RoleAdmin && userRole != model.RoleManager {
			c.JSON(http.StatusForbidden, gin.H{"error": "Nur Manager oder Administratoren dürfen diese Aktion ausführen"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// DriverMiddleware ist eine Middleware für Fahrer-Operationen
func DriverMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Keine Berechtigung"})
			c.Abort()
			return
		}
		
		currentUser := user.(*model.User)
		if currentUser.Role != model.RoleDriver {
			c.JSON(http.StatusForbidden, gin.H{"error": "Nur Fahrer dürfen diese Aktion ausführen"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// DriverOrHigherMiddleware erlaubt Fahrer, Manager und Admins
func DriverOrHigherMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Keine Berechtigung"})
			c.Abort()
			return
		}
		
		currentUser := user.(*model.User)
		userRole := currentUser.Role
		
		if userRole != model.RoleDriver && 
		   userRole != model.RoleManager && 
		   userRole != model.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Nicht ausreichende Berechtigung"})
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
