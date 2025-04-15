package backend

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware provides a simple authentication middleware
// with fixed credentials (admin/admin)
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip authentication for login page and static resources
		if c.Request.URL.Path == "/login" ||
			c.Request.URL.Path == "/auth" ||
			c.Request.URL.Path == "/assets/css/style.css" ||
			strings.HasPrefix(c.Request.URL.Path, "/static/") ||
			strings.HasPrefix(c.Request.URL.Path, "/assets/") {
			c.Next()
			return
		}

		// Check if user is authenticated via session
		user, err := c.Cookie("user")
		if err != nil || user == "" {
			// If not authenticated, redirect to login page
			c.Redirect(http.StatusSeeOther, "/login")
			c.Abort()
			return
		}

		// Set user in context for this request
		c.Set("user", user)
		c.Next()
	}
}

// Login handles user authentication
func Login(c *gin.Context) {
	username := c.PostForm("username")
	password := c.PostForm("password")

	// Check hardcoded credentials
	if username == "admin" && password == "admin" {
		// Set user in context
		c.Set("user", username)
		// Set cookie or session token
		c.SetCookie("user", username, 3600, "/", "", false, true)
		c.Redirect(http.StatusSeeOther, "/dashboard")
		return
	}

	c.HTML(http.StatusUnauthorized, "login.html", gin.H{
		"error": "Invalid credentials",
	})
}

// Logout handles user logout
func Logout(c *gin.Context) {
	c.SetCookie("user", "", -1, "/", "", false, true)
	c.Redirect(http.StatusSeeOther, "/login")
}

// InitializeRoutes sets up all the routes for the application
// InitializeRoutes sets up all the routes for the application
func InitializeRoutes(router *gin.Engine) {
	// Jahr für das Copyright im Footer
	currentYear := time.Now().Year()

	// Public routes (no authentication required)
	router.GET("/login", func(c *gin.Context) {
		c.HTML(http.StatusOK, "login.html", gin.H{
			"year": currentYear,
		})
	})
	router.POST("/auth", Login)
	router.GET("/logout", Logout)

	// Auth middleware for protected routes
	authorized := router.Group("/")
	authorized.Use(AuthMiddleware())
	{
		// Home page
		authorized.GET("/", func(c *gin.Context) {
			c.HTML(http.StatusOK, "home.html", gin.H{
				"title": "FleetDrive Dashboard",
				"user":  c.MustGet("user"),
				"year":  currentYear,
			})
		})

		// Dashboard
		authorized.GET("/dashboard", func(c *gin.Context) {
			c.HTML(http.StatusOK, "home.html", gin.H{
				"title": "FleetDrive Dashboard",
				"user":  c.MustGet("user"),
				"year":  currentYear,
			})
		})

		authorized.GET("/vehicles", func(c *gin.Context) {
			c.HTML(http.StatusOK, "vehicles.html", gin.H{
				"title": "FleetDrive Dashboard",
				"user":  c.MustGet("user"),
				"year":  currentYear,
			})
		})

		authorized.GET("/drivers", func(c *gin.Context) {
			c.HTML(http.StatusOK, "driver.html", gin.H{
				"title": "FleetDrive Dashboard",
				"user":  c.MustGet("user"),
				"year":  currentYear,
			})
		})

		// API routes for backend operations
		api := authorized.Group("/api")
		{
			// Example API endpoints
			api.GET("/vehicles", func(c *gin.Context) {
				// Placeholder for vehicle data
				vehicles := []gin.H{
					{"id": "1", "name": "Vehicle 1", "status": "Available"},
					{"id": "2", "name": "Vehicle 2", "status": "In Use"},
				}
				c.JSON(http.StatusOK, gin.H{"vehicles": vehicles})
			})

			api.GET("/drivers", func(c *gin.Context) {
				// Placeholder for driver data
				drivers := []gin.H{
					{"id": "1", "name": "Driver 1", "status": "Available"},
					{"id": "2", "name": "Driver 2", "status": "On duty"},
				}
				c.JSON(http.StatusOK, gin.H{"drivers": drivers})
			})

			api.GET("/vehicle-details/:id", func(c *gin.Context) {
				id := c.Param("id")
				// Fahrzeugdaten laden
				// ...
				c.HTML(http.StatusOK, "vehicle-details.html", gin.H{
					"title":   "Fahrzeugdetails",
					"user":    c.MustGet("user"),
					"vehicle": vehicle, // Das geladene Fahrzeugobjekt
				})
			})
		}
	}
}
