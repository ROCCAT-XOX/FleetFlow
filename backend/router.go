// backend/router.go (Hinzufügen zum bestehenden Code)
package backend

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/utils"
	"net/http"
	"time"

	"FleetDrive/backend/db"
	"FleetDrive/backend/handler"
	"FleetDrive/backend/middleware"

	"github.com/gin-gonic/gin"
)

// InitializeRoutes setzt alle Routen für die Anwendung auf
func InitializeRoutes(router *gin.Engine) {
	// Stelle sicher, dass die Datenbankverbindung hergestellt ist
	if err := db.ConnectDB(); err != nil {
		panic("Fehler beim Verbinden zur Datenbank")
	}

	// Public routes (keine Authentifizierung erforderlich)
	router.GET("/login", func(c *gin.Context) {
		// Token aus dem Cookie extrahieren
		tokenString, err := c.Cookie("token")
		if err == nil && tokenString != "" {
			// Token validieren
			_, err := utils.ValidateJWT(tokenString)
			if err == nil {
				// Gültiges Token, zum Dashboard umleiten
				c.Redirect(http.StatusFound, "/dashboard")
				return
			}
		}

		// Kein Token oder ungültiges Token, Login-Seite anzeigen
		c.HTML(http.StatusOK, "login.html", gin.H{
			"year": time.Now().Year(),
		})
	})

	// Auth-Handler erstellen
	authHandler := handler.NewAuthHandler()
	router.POST("/auth", authHandler.Login)
	router.GET("/logout", authHandler.Logout)

	// Auth middleware für geschützte Routen
	authorized := router.Group("/")
	authorized.Use(middleware.AuthMiddleware())
	{
		currentYear := time.Now().Year()
		// Root-Pfad zum Dashboard umleiten
		router.GET("/", func(c *gin.Context) {
			c.Redirect(http.StatusFound, "/dashboard")
		})

		authorized.GET("/dashboard", func(c *gin.Context) {
			user, _ := c.Get("user")
			c.HTML(http.StatusOK, "home.html", gin.H{
				"year": currentYear,
				"user": user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			})
		})

		authorized.GET("/settings", func(c *gin.Context) {
			c.HTML(http.StatusOK, "settings.html", gin.H{
				"title": "Fahrerübersicht",
				"user":  c.MustGet("user"),
				"year":  currentYear,
			})
		})

		// Fahrzeugübersicht
		authorized.GET("/vehicles", func(c *gin.Context) {
			c.HTML(http.StatusOK, "vehicles.html", gin.H{
				"title": "Fahrzeugübersicht",
				"user":  c.MustGet("user"),
				"year":  currentYear,
			})
		})

		// Neues Fahrzeug hinzufügen - Formular
		authorized.GET("/vehicles/new", func(c *gin.Context) {
			c.HTML(http.StatusOK, "vehicle-form.html", gin.H{
				"title": "Neues Fahrzeug hinzufügen",
				"user":  c.MustGet("user"),
				"year":  currentYear,
				"isNew": true,
			})
		})

		// Fahrzeug bearbeiten - Formular
		authorized.GET("/vehicles/edit/:id", func(c *gin.Context) {

			c.HTML(http.StatusOK, "vehicle-form.html", gin.H{
				"title": "Fahrzeug bearbeiten",
				"user":  c.MustGet("user"),
				"year":  currentYear,
				"isNew": false,
			})
		})

		// Fahrzeugdetails anzeigen
		// Fahrzeugdetails anzeigen
		authorized.GET("/vehicle-details/:id", func(c *gin.Context) {
			c.HTML(http.StatusOK, "vehicle/details.html", gin.H{
				"title": "Fahrzeugdetails",
				"user":  c.MustGet("user"),
				"year":  currentYear,
			})
		})

		// Fahrerübersicht
		authorized.GET("/drivers", func(c *gin.Context) {
			c.HTML(http.StatusOK, "drivers.html", gin.H{
				"title": "Fahrerübersicht",
				"user":  c.MustGet("user"),
				"year":  currentYear,
			})
		})

		// Neuen Fahrer hinzufügen - Formular
		authorized.GET("/drivers/new", func(c *gin.Context) {
			c.HTML(http.StatusOK, "driver-form.html", gin.H{
				"title": "Neuen Fahrer hinzufügen",
				"user":  c.MustGet("user"),
				"year":  currentYear,
				"isNew": true,
			})
		})

		// Fahrer bearbeiten - Formular
		authorized.GET("/drivers/edit/:id", func(c *gin.Context) {

			c.HTML(http.StatusOK, "driver-form.html", gin.H{
				"title": "Fahrer bearbeiten",
				"user":  c.MustGet("user"),
				"year":  currentYear,
				"isNew": false,
			})
		})

		// Neue Fahrzeugzuweisung - Formular
		authorized.GET("/assignments/new", func(c *gin.Context) {

			c.HTML(http.StatusOK, "assignment-form.html", gin.H{
				"title": "Neue Fahrzeugzuweisung",
				"user":  c.MustGet("user"),
				"year":  currentYear,
				"isNew": true,
			})
		})

		// Fahrzeugzuweisung bearbeiten - Formular
		authorized.GET("/assignments/edit/:id", func(c *gin.Context) {

			c.HTML(http.StatusOK, "assignment-form.html", gin.H{
				"title": "Fahrzeugzuweisung bearbeiten",
				"user":  c.MustGet("user"),
				"year":  currentYear,
				"isNew": false,
			})
		})

		// Neue Inspektion/Service hinzufügen - Formular
		authorized.GET("/service/new", func(c *gin.Context) {

			c.HTML(http.StatusOK, "service-form.html", gin.H{
				"title": "Neue Inspektion erfassen",
				"user":  c.MustGet("user"),
				"year":  currentYear,
				"isNew": true,
			})
		})

		// Inspektion/Service bearbeiten - Formular
		authorized.GET("/service/edit/:id", func(c *gin.Context) {

			c.HTML(http.StatusOK, "service-form.html", gin.H{
				"title": "Inspektion bearbeiten",
				"user":  c.MustGet("user"),
				"year":  currentYear,
				"isNew": false,
			})
		})

		// Hinzufügen der Route für die Projektseite
		authorized.GET("/projects", func(c *gin.Context) {
			c.HTML(http.StatusOK, "projects.html", gin.H{
				"title": "Projektübersicht",
				"user":  c.MustGet("user"),
				"year":  currentYear,
			})
		})

		// API-Routen für Backend-Operationen
		api := authorized.Group("/api")
		{
			// Benutzer-API
			userHandler := handler.NewUserHandler()
			users := api.Group("/users")
			{
				users.GET("", userHandler.GetUsers)
				users.GET("/:id", userHandler.GetUser)
				users.POST("", middleware.AdminMiddleware(), userHandler.CreateUser)
				users.PUT("/:id", middleware.AdminMiddleware(), userHandler.UpdateUser)
				users.DELETE("/:id", middleware.AdminMiddleware(), userHandler.DeleteUser)
			}

			// Fahrzeug-API
			vehicleHandler := handler.NewVehicleHandler()
			vehicles := api.Group("/vehicles")
			{
				vehicles.GET("", vehicleHandler.GetVehicles)
				vehicles.GET("/:id", vehicleHandler.GetVehicle)
				vehicles.POST("", vehicleHandler.CreateVehicle)
				vehicles.PUT("/:id", vehicleHandler.UpdateVehicle)
				vehicles.DELETE("/:id", middleware.AdminMiddleware(), vehicleHandler.DeleteVehicle)
			}

			// Fahrer-API
			driverHandler := handler.NewDriverHandler()
			drivers := api.Group("/drivers")
			{
				drivers.GET("", driverHandler.GetDrivers)
				drivers.GET("/:id", driverHandler.GetDriver)
				drivers.POST("", driverHandler.CreateDriver)
				drivers.PUT("/:id", driverHandler.UpdateDriver)
				drivers.DELETE("/:id", middleware.AdminMiddleware(), driverHandler.DeleteDriver)
			}

			// Wartungs-API
			maintenanceHandler := handler.NewMaintenanceHandler()
			maintenance := api.Group("/maintenance")
			{
				maintenance.GET("", maintenanceHandler.GetMaintenanceEntries)
				maintenance.GET("/vehicle/:vehicleId", maintenanceHandler.GetVehicleMaintenanceEntries)
				maintenance.GET("/:id", maintenanceHandler.GetMaintenanceEntry)
				maintenance.POST("", maintenanceHandler.CreateMaintenanceEntry)
				maintenance.PUT("/:id", maintenanceHandler.UpdateMaintenanceEntry)
				maintenance.DELETE("/:id", maintenanceHandler.DeleteMaintenanceEntry)
			}

			// Fahrzeugnutzungs-API
			usageHandler := handler.NewVehicleUsageHandler()
			usage := api.Group("/usage")
			{
				usage.GET("", usageHandler.GetUsageEntries)
				usage.GET("/vehicle/:vehicleId", usageHandler.GetVehicleUsageEntries)
				usage.GET("/driver/:driverId", usageHandler.GetDriverUsageEntries)
				usage.GET("/:id", usageHandler.GetUsageEntry)
				usage.POST("", usageHandler.CreateUsageEntry)
				usage.PUT("/:id", usageHandler.UpdateUsageEntry)
				usage.DELETE("/:id", usageHandler.DeleteUsageEntry)
			}
		}

		projectHandler := handler.NewProjectHandler()
		projects := api.Group("/projects")
		{
			projects.GET("", projectHandler.GetProjects)
			projects.GET("/:id", projectHandler.GetProject)
			projects.POST("", projectHandler.CreateProject)
			projects.PUT("/:id", projectHandler.UpdateProject)
			projects.DELETE("/:id", middleware.AdminMiddleware(), projectHandler.DeleteProject)
		}
	}
}
