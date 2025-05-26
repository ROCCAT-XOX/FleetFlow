// backend/router.go
package backend

import (
	"FleetDrive/backend/handler"
	"FleetDrive/backend/middleware"
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"FleetDrive/backend/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// InitializeRoutes setzt alle Routen für die Anwendung auf
func InitializeRoutes(router *gin.Engine) {
	// Public routes (keine Authentifizierung erforderlich)
	setupPublicRoutes(router)

	// Auth middleware für geschützte Routen
	authorized := router.Group("/")
	authorized.Use(middleware.AuthMiddleware())
	{
		setupAuthorizedRoutes(authorized)
		setupAPIRoutes(authorized.Group("/api"))
	}
}

// setupPublicRoutes konfiguriert die öffentlichen Routen
func setupPublicRoutes(router *gin.Engine) {
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

	// Root-Pfad zum Dashboard umleiten
	router.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/dashboard")
	})

}

// setupAuthorizedRoutes konfiguriert die geschützten Seitenrouten
func setupAuthorizedRoutes(group *gin.RouterGroup) {
	currentYear := time.Now().Year()

	group.GET("/dashboard", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "dashboard.html", gin.H{
			"year": currentYear,
			"user": user.(*model.User).FirstName + " " + user.(*model.User).LastName,
		})
	})

	group.GET("/settings", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "settings.html", gin.H{
			"title":    "Einstellungen",
			"user":     user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"userRole": user.(*model.User).Role,
			"year":     currentYear,
		})
	})

	// Profile route
	group.GET("/profile", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "profile.html", gin.H{
			"title":   "Mein Profil",
			"user":    user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"profile": user.(*model.User),
			"year":    currentYear,
		})
	})

	// Fahrzeugübersicht
	group.GET("/vehicles", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "vehicles.html", gin.H{
			"title": "Fahrzeugübersicht",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
		})
	})

	// Neues Fahrzeug hinzufügen - Formular
	group.GET("/vehicles/new", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "vehicle-form.html", gin.H{
			"title": "Neues Fahrzeug hinzufügen",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
			"isNew": true,
		})
	})

	// Fahrzeug bearbeiten - Formular
	group.GET("/vehicles/edit/:id", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "vehicle-form.html", gin.H{
			"title": "Fahrzeug bearbeiten",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
			"isNew": false,
		})
	})

	// Fahrzeugdetails anzeigen
	group.GET("/vehicle-details/:id", func(c *gin.Context) {
		user, _ := c.Get("user")
		vehicleID := c.Param("id")

		// Repositories initialisieren
		vehicleRepo := repository.NewVehicleRepository()
		driverRepo := repository.NewDriverRepository()
		maintenanceRepo := repository.NewMaintenanceRepository()
		usageRepo := repository.NewVehicleUsageRepository()
		fuelCostRepo := repository.NewFuelCostRepository()

		// Fahrzeugdaten laden
		vehicle, err := vehicleRepo.FindByID(vehicleID)
		if err != nil {
			c.HTML(http.StatusNotFound, "error.html", gin.H{
				"title": "Fehler",
				"error": "Fahrzeug nicht gefunden",
				"year":  currentYear,
			})
			return
		}

		// Fahrer laden falls zugewiesen
		var driverName string
		if !vehicle.CurrentDriverID.IsZero() {
			driver, err := driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
			if err == nil {
				driverName = driver.FirstName + " " + driver.LastName
			}
		}

		// Tab aus Query Parameter
		tab := c.DefaultQuery("tab", "basic")

		// Fahrzeugdaten als Map für Template
		vehicleData := gin.H{
			"id":                 vehicle.ID.Hex(),
			"licensePlate":       vehicle.LicensePlate,
			"brand":              vehicle.Brand,
			"model":              vehicle.Model,
			"year":               vehicle.Year,
			"color":              vehicle.Color,
			"vehicleId":          vehicle.VehicleID,
			"vin":                vehicle.VIN,
			"fuelType":           vehicle.FuelType,
			"mileage":            vehicle.Mileage,
			"status":             vehicle.Status,
			"registrationDate":   vehicle.RegistrationDate,
			"registrationExpiry": vehicle.RegistrationExpiry,
			"insuranceCompany":   vehicle.InsuranceCompany,
			"insuranceNumber":    vehicle.InsuranceNumber,
			"insuranceType":      vehicle.InsuranceType,
			"insuranceExpiry":    vehicle.InsuranceExpiry,
			"insuranceCost":      vehicle.InsuranceCost,
			"nextInspectionDate": vehicle.NextInspectionDate,
		}

		// Basis-Template-Daten
		templateData := gin.H{
			"title":      "Fahrzeugdetails",
			"user":       user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":       currentYear,
			"vehicle":    vehicleData,
			"driverName": driverName,
			"tab":        tab,
		}

		// Tab-spezifische Daten laden
		switch tab {
		case "usage":
			// Aktuelle Nutzung
			activeUsage, _ := usageRepo.FindActiveUsage(vehicleID)
			if activeUsage != nil && !activeUsage.DriverID.IsZero() {
				driver, _ := driverRepo.FindByID(activeUsage.DriverID.Hex())
				if driver != nil {
					templateData["currentUsage"] = gin.H{
						"driverName": driver.FirstName + " " + driver.LastName,
						"startDate":  activeUsage.StartDate,
						"endDate":    activeUsage.EndDate,
						"purpose":    activeUsage.Purpose,
						"department": activeUsage.Department,
					}
				}
			}

			// Nutzungshistorie
			usageHistory, _ := usageRepo.FindByVehicle(vehicleID)
			var usageList []gin.H
			for _, usage := range usageHistory {
				driverName := "Unbekannt"
				if !usage.DriverID.IsZero() {
					driver, _ := driverRepo.FindByID(usage.DriverID.Hex())
					if driver != nil {
						driverName = driver.FirstName + " " + driver.LastName
					}
				}
				usageList = append(usageList, gin.H{
					"startDate":    usage.StartDate,
					"endDate":      usage.EndDate,
					"driverName":   driverName,
					"purpose":      usage.Purpose,
					"startMileage": usage.StartMileage,
					"endMileage":   usage.EndMileage,
				})
			}
			if len(usageList) > 0 {
				templateData["usageHistory"] = usageList
			}

		case "maintenance":
			maintenanceEntries, _ := maintenanceRepo.FindByVehicle(vehicleID)
			var maintenanceList []gin.H
			for _, entry := range maintenanceEntries {
				maintenanceList = append(maintenanceList, gin.H{
					"date":     entry.Date,
					"type":     entry.Type,
					"mileage":  entry.Mileage,
					"cost":     entry.Cost,
					"workshop": entry.Workshop,
					"notes":    entry.Notes,
				})
			}
			if len(maintenanceList) > 0 {
				templateData["maintenanceEntries"] = maintenanceList
			}

		case "fuel":
			fuelCosts, _ := fuelCostRepo.FindByVehicle(vehicleID)
			var fuelList []gin.H
			for _, fuel := range fuelCosts {
				fuelList = append(fuelList, gin.H{
					"date":         fuel.Date,
					"fuelType":     fuel.FuelType,
					"amount":       fuel.Amount,
					"pricePerUnit": fuel.PricePerUnit,
					"totalCost":    fuel.TotalCost,
					"mileage":      fuel.Mileage,
					"location":     fuel.Location,
				})
			}
			if len(fuelList) > 0 {
				templateData["fuelCosts"] = fuelList
			}
		}

		c.HTML(http.StatusOK, "vehicle/details.html", templateData)
	})

	// Fahrerübersicht
	group.GET("/drivers", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "drivers.html", gin.H{
			"title": "Fahrerübersicht",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
		})
	})

	// Neuen Fahrer hinzufügen - Formular
	group.GET("/drivers/new", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "driver-form.html", gin.H{
			"title": "Neuen Fahrer hinzufügen",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
			"isNew": true,
		})
	})

	// Fahrer bearbeiten - Formular
	group.GET("/drivers/edit/:id", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "driver-form.html", gin.H{
			"title": "Fahrer bearbeiten",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
			"isNew": false,
		})
	})

	// Neue Fahrzeugzuweisung - Formular
	group.GET("/assignments/new", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "assignment-form.html", gin.H{
			"title": "Neue Fahrzeugzuweisung",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
			"isNew": true,
		})
	})

	// Fahrzeugzuweisung bearbeiten - Formular
	group.GET("/assignments/edit/:id", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "assignment-form.html", gin.H{
			"title": "Fahrzeugzuweisung bearbeiten",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
			"isNew": false,
		})
	})

	// Neue Inspektion/Service hinzufügen - Formular
	group.GET("/service/new", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "service-form.html", gin.H{
			"title": "Neue Inspektion erfassen",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
			"isNew": true,
		})
	})

	// Inspektion/Service bearbeiten - Formular
	group.GET("/service/edit/:id", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "service-form.html", gin.H{
			"title": "Inspektion bearbeiten",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
			"isNew": false,
		})
	})

	// Tankkosten
	group.GET("/fuel-costs", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "fuel-costs.html", gin.H{
			"title": "Tankkosten",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
		})
	})

	// Fahrzeug Tankkosten
	group.GET("/vehicle/:id/fuel-costs", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "vehicle-fuel-costs.html", gin.H{
			"title": "Fahrzeug Tankkosten",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
		})
	})

	// Neue Routen für Aktivitäten
	group.GET("/activities", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "activities.html", gin.H{
			"title": "Aktivitätsübersicht",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
		})
	})

	// Fahrzeugaktivitäten
	group.GET("/vehicle/:id/activities", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "vehicle-activities.html", gin.H{
			"title": "Fahrzeugaktivitäten",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
		})
	})

	// Fahreraktivitäten
	group.GET("/driver/:id/activities", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "driver-activities.html", gin.H{
			"title": "Fahreraktivitäten",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
		})
	})
}

// setupAPIRoutes konfiguriert die API-Routen
func setupAPIRoutes(api *gin.RouterGroup) {
	// Handler initialisieren
	userHandler := handler.NewUserHandler()
	vehicleHandler := handler.NewVehicleHandler()
	driverHandler := handler.NewDriverHandler()
	maintenanceHandler := handler.NewMaintenanceHandler()
	usageHandler := handler.NewVehicleUsageHandler()
	fuelCostHandler := handler.NewFuelCostHandler()
	activityHandler := handler.NewActivityHandler()
	profileHandler := handler.NewProfileHandler()
	dashboardHandler := handler.NewDashboardHandler()

	// Benutzer-API
	users := api.Group("/users")
	{
		users.GET("", userHandler.GetUsers)
		users.GET("/:id", userHandler.GetUser)
		users.POST("", middleware.AdminMiddleware(), userHandler.CreateUser)
		users.PUT("/:id", middleware.AdminMiddleware(), userHandler.UpdateUser)
		users.DELETE("/:id", middleware.AdminMiddleware(), userHandler.DeleteUser)
	}

	// Profile-API
	profile := api.Group("/profile")
	{
		profile.PUT("", profileHandler.UpdateProfile)
		profile.POST("/password", profileHandler.ChangePassword)
		profile.GET("/bookings/my-active", profileHandler.GetMyActiveBookings)
		profile.GET("/profile/notification-settings", profileHandler.GetNotificationSettings)
		profile.PUT("/profile/notification-settings", profileHandler.UpdateNotificationSettings)
		profile.PUT("/profile", profileHandler.UpdateProfile)
		profile.POST("/profile/password", profileHandler.ChangePassword)
		profile.GET("/profile/stats", profileHandler.GetProfileStats)
	}

	// Fahrzeug-API
	vehicles := api.Group("/vehicles")
	{
		vehicles.GET("", vehicleHandler.GetVehicles)
		vehicles.GET("/:id", vehicleHandler.GetVehicle)
		vehicles.POST("", vehicleHandler.CreateVehicle)
		vehicles.PUT("/:id", vehicleHandler.UpdateVehicle)
		vehicles.PUT("/:id/basic-info", vehicleHandler.UpdateBasicInfo)
		vehicles.DELETE("/:id", middleware.AdminMiddleware(), vehicleHandler.DeleteVehicle)
	}

	// Fahrer-API
	drivers := api.Group("/drivers")
	{
		drivers.GET("", driverHandler.GetDrivers)
		drivers.GET("/:id", driverHandler.GetDriver)
		drivers.POST("", driverHandler.CreateDriver)
		drivers.PUT("/:id", driverHandler.UpdateDriver)
		drivers.DELETE("/:id", middleware.AdminMiddleware(), driverHandler.DeleteDriver)
	}

	// Wartungs-API
	maintenance := api.Group("/maintenance")
	{
		maintenance.GET("", maintenanceHandler.GetMaintenanceEntries)
		maintenance.GET("/vehicle/:vehicleId", maintenanceHandler.GetVehicleMaintenanceEntries)
		maintenance.GET("/:id", maintenanceHandler.GetMaintenanceEntry)
		maintenance.POST("", maintenanceHandler.CreateMaintenanceEntry)
		maintenance.PUT("/:id", maintenanceHandler.UpdateMaintenanceEntry)
		maintenance.DELETE("/:id", maintenanceHandler.DeleteMaintenanceEntry)
		maintenance.GET("/upcoming", dashboardHandler.GetUpcomingMaintenance)
	}

	// Fahrzeugnutzungs-API
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

	// Tankkosten-API
	fuelCosts := api.Group("/fuelcosts")
	{
		fuelCosts.GET("", fuelCostHandler.GetFuelCosts)
		fuelCosts.GET("/vehicle/:vehicleId", fuelCostHandler.GetVehicleFuelCosts)
		fuelCosts.GET("/:id", fuelCostHandler.GetFuelCost)
		fuelCosts.POST("", fuelCostHandler.CreateFuelCost)
		fuelCosts.PUT("/:id", fuelCostHandler.UpdateFuelCost)
		fuelCosts.DELETE("/:id", fuelCostHandler.DeleteFuelCost)
	}

	// Aktivitäts-API
	activities := api.Group("/activities")
	{
		activities.GET("", activityHandler.GetActivities)
		activities.GET("/vehicle/:vehicleId", activityHandler.GetVehicleActivities)
		activities.GET("/driver/:driverId", activityHandler.GetDriverActivities)
		activities.GET("/recent", dashboardHandler.GetRecentActivities)
	}

	dashboard := api.Group("/dashboard")
	{
		dashboard.GET("/stats", dashboardHandler.GetDashboardStats)
		dashboard.GET("/vehicle-usage-stats", dashboardHandler.GetVehicleUsageStats)
		dashboard.GET("/fuel-costs-by-vehicle", dashboardHandler.GetFuelCostsByVehicle)
	}
}
