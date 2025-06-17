// backend/utils/jwt.go
package utils

import (
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

var jwtSecret = []byte("your-secret-key") // In einer Produktionsumgebung sollte dieser Wert aus einer Umgebungsvariable kommen

// Claims repräsentiert die JWT-Claims
type Claims struct {
	UserID string `json:"userId"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateJWT generiert ein JWT-Token für den angegebenen Benutzer
func GenerateJWT(userID, role string) (string, error) {
	// Claims erstellen
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)), // Token läuft nach 24 Stunden ab
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "fleetdrive",
		},
	}

	// Token generieren
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Token signieren
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateJWT validiert ein JWT-Token und gibt die Claims zurück
func ValidateJWT(tokenString string) (*Claims, error) {
	// Token parsen
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	// Claims extrahieren
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// ExtractUserIDFromToken extrahiert die Benutzer-ID aus dem JWT-Token im Gin-Kontext
func ExtractUserIDFromToken(c *gin.Context) (primitive.ObjectID, error) {
	// Token aus dem Cookie extrahieren
	tokenString, err := c.Cookie("token")
	if err != nil {
		return primitive.NilObjectID, err
	}

	// Token validieren
	claims, err := ValidateJWT(tokenString)
	if err != nil {
		return primitive.NilObjectID, err
	}

	// UserID in ObjectID konvertieren
	userID, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		return primitive.NilObjectID, err
	}

	return userID, nil
}
