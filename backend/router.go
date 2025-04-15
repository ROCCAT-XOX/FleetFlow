// backend/router.go (Hinzufügen zum bestehenden Code)
package backend

import (
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

	// Jahr für das Copyright im Footer
	currentYear := time.Now().Year()

	// Public routes (keine Authentifizierung erforderlich)
	router.GET("/login", func(c *gin.Context) {
		c.HTML(http.StatusOK, "login.html", gin.H{
			"year": currentYear,
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
		// Bestehende Routen...

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
	}
}
