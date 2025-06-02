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

	// Dashboard Handler erstellen
	dashboardHandler := handler.NewDashboardHandler()

	// Dashboard-Route mit dem neuen Handler
	group.GET("/dashboard", dashboardHandler.GetCompleteDashboardData)

	// backend/router.go - Settings Route Anpassung
	// Ersetze die bestehende Settings-Route in setupAuthorizedRoutes

	group.GET("/settings", func(c *gin.Context) {
		user, _ := c.Get("user")
		currentUser := user.(*model.User)

		// Template-Daten vorbereiten
		templateData := gin.H{
			"title":       "Einstellungen",
			"user":        currentUser.FirstName + " " + currentUser.LastName,
			"userRole":    currentUser.Role,
			"year":        currentYear,
			"users":       []*model.User{}, // Leeres Array als Standard
			"driverCount": 0,
			"adminCount":  0,
		}

		// Nur für Admins: Benutzer laden und Statistiken berechnen
		if currentUser.Role == model.RoleAdmin {
			userRepo := repository.NewUserRepository()
			users, err := userRepo.FindAll()
			if err == nil {
				templateData["users"] = users

				// Statistiken berechnen
				var driverCount, adminCount int
				for _, u := range users {
					switch u.Role {
					case model.RoleUser:
						driverCount++
					case model.RoleAdmin:
						adminCount++
					}
				}
				templateData["driverCount"] = driverCount
				templateData["adminCount"] = adminCount
			}
		}

		c.HTML(http.StatusOK, "settings.html", templateData)
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
			"title":       "Fahrzeugübersicht",
			"user":        user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"currentDate": time.Now().Format("Montag, 02. Januar 2006"),
			"year":        currentYear,
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

		// Repository initialisieren
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

		// Wartungseinträge laden
		maintenanceEntries, _ := maintenanceRepo.FindByVehicle(vehicleID)

		// Nutzungshistorie laden
		usageHistory, _ := usageRepo.FindByVehicle(vehicleID)

		// Für jeden Nutzungseintrag den Fahrernamen hinzufügen
		var enrichedUsageHistory []gin.H
		for _, usage := range usageHistory {
			driverNameForUsage := ""
			if !usage.DriverID.IsZero() {
				driver, err := driverRepo.FindByID(usage.DriverID.Hex())
				if err == nil {
					driverNameForUsage = driver.FirstName + " " + driver.LastName
				}
			}

			enrichedUsageHistory = append(enrichedUsageHistory, gin.H{
				"id":           usage.ID.Hex(),
				"startDate":    usage.StartDate,
				"endDate":      usage.EndDate,
				"startMileage": usage.StartMileage,
				"endMileage":   usage.EndMileage,
				"purpose":      usage.Purpose,
				"status":       usage.Status,
				"notes":        usage.Notes,
				"driverName":   driverNameForUsage,
			})
		}

		// Aktive Nutzung finden
		var activeUsage gin.H
		for _, usage := range usageHistory {
			if usage.Status == model.UsageStatusActive {
				driverNameForActive := ""
				if !usage.DriverID.IsZero() {
					driver, err := driverRepo.FindByID(usage.DriverID.Hex())
					if err == nil {
						driverNameForActive = driver.FirstName + " " + driver.LastName
					}
				}

				activeUsage = gin.H{
					"id":           usage.ID.Hex(),
					"startDate":    usage.StartDate,
					"endDate":      usage.EndDate,
					"startMileage": usage.StartMileage,
					"endMileage":   usage.EndMileage,
					"purpose":      usage.Purpose,
					"department":   usage.Department,
					"status":       usage.Status,
					"notes":        usage.Notes,
					"driverName":   driverNameForActive,
				}
				break
			}
		}

		// Tankkosten laden
		fuelCosts, _ := fuelCostRepo.FindByVehicle(vehicleID)

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
			// Technische Daten
			"vehicleType":        vehicle.VehicleType,
			"engineDisplacement": vehicle.EngineDisplacement,
			"powerRating":        vehicle.PowerRating,
			"numberOfAxles":      vehicle.NumberOfAxles,
			"tireSize":           vehicle.TireSize,
			"rimType":            vehicle.RimType,
			"emissionClass":      vehicle.EmissionClass,
			"maxSpeed":           vehicle.MaxSpeed,
			"towingCapacity":     vehicle.TowingCapacity,
			// Abmessungen
			"length":             vehicle.Length,
			"width":              vehicle.Width,
			"height":             vehicle.Height,
			"curbWeight":         vehicle.CurbWeight,
			"grossWeight":        vehicle.GrossWeight,
			"technicalMaxWeight": vehicle.TechnicalMaxWeight,
			"specialFeatures":    vehicle.SpecialFeatures,
			// Finanzierungsinformationen
			"acquisitionType":        vehicle.AcquisitionType,
			"purchaseDate":           vehicle.PurchaseDate,
			"purchasePrice":          vehicle.PurchasePrice,
			"purchaseVendor":         vehicle.PurchaseVendor,
			"financeStartDate":       vehicle.FinanceStartDate,
			"financeEndDate":         vehicle.FinanceEndDate,
			"financeMonthlyRate":     vehicle.FinanceMonthlyRate,
			"financeInterestRate":    vehicle.FinanceInterestRate,
			"financeDownPayment":     vehicle.FinanceDownPayment,
			"financeTotalAmount":     vehicle.FinanceTotalAmount,
			"financeBank":            vehicle.FinanceBank,
			"leaseStartDate":         vehicle.LeaseStartDate,
			"leaseEndDate":           vehicle.LeaseEndDate,
			"leaseMonthlyRate":       vehicle.LeaseMonthlyRate,
			"leaseMileageLimit":      vehicle.LeaseMileageLimit,
			"leaseExcessMileageCost": vehicle.LeaseExcessMileageCost,
			"leaseCompany":           vehicle.LeaseCompany,
			"leaseContractNumber":    vehicle.LeaseContractNumber,
			"leaseResidualValue":     vehicle.LeaseResidualValue,
		}

		// Template-Daten
		templateData := gin.H{
			"title":              "Fahrzeugdetails",
			"user":               user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":               currentYear,
			"vehicle":            vehicleData,
			"vehicleId":          vehicleID,
			"driverName":         driverName,
			"tab":                tab,
			"maintenanceEntries": maintenanceEntries,
			"usageHistory":       enrichedUsageHistory,
			"activeUsage":        activeUsage,
			"fuelCosts":          fuelCosts,
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
	// Buchungen
	group.GET("/bookings", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "bookings.html", gin.H{
			"title": "Buchungen",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
		})
	})

	// In setupAuthorizedRoutes hinzufügen:
	group.GET("/reports", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "reports.html", gin.H{
			"title": "Fahrzeug- und Fahrerstatistiken",
			"user":  user.(*model.User).FirstName + " " + user.(*model.User).LastName,
			"year":  currentYear,
		})
	})

	// Weitere Routen...
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

	// Weitere Routen für Aktivitäten
	group.GET("/activities", func(c *gin.Context) {
		user, _ := c.Get("user")
		c.HTML(http.StatusOK, "activities.html", gin.H{
			"title": "Aktivitätsübersicht",
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
	reportsHandler := handler.NewReportsHandler()

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
		profile.GET("/notification-settings", profileHandler.GetNotificationSettings)
		profile.PUT("/notification-settings", profileHandler.UpdateNotificationSettings)
		profile.GET("/stats", profileHandler.GetProfileStats)
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
		// Neue Route für Fahrzeugzuordnung
		drivers.PUT("/:id/assign-vehicle", driverHandler.AssignVehicle)
		// In setupAPIRoutes hinzufügen:
		drivers.POST("/cleanup-assignments", middleware.AdminMiddleware(), driverHandler.CleanupInconsistentAssignments)
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

	// Dashboard-API (reduzierte Routen)
	dashboard := api.Group("/dashboard")
	{
		dashboard.GET("/stats", dashboardHandler.GetDashboardStats)
		dashboard.GET("/fuel-costs-by-vehicle", dashboardHandler.GetFuelCostsByVehicle)
		// Entfernt: GetVehicleUsageStats da nicht mehr benötigt
	}

	peopleflow := api.Group("/integrations/peopleflow")
	{
		peopleflowHandler := handler.NewPeopleFlowHandler()

		peopleflow.POST("/save", middleware.AdminMiddleware(), peopleflowHandler.SavePeopleFlowCredentials)
		peopleflow.GET("/test", middleware.AdminMiddleware(), peopleflowHandler.TestPeopleFlowConnection)
		peopleflow.GET("/status", peopleflowHandler.GetPeopleFlowStatus)
		peopleflow.POST("/sync/employees", middleware.AdminMiddleware(), peopleflowHandler.SyncPeopleFlowEmployees)
		peopleflow.POST("/sync/drivers", middleware.AdminMiddleware(), peopleflowHandler.SyncPeopleFlowDrivers)
		peopleflow.DELETE("/remove", middleware.AdminMiddleware(), peopleflowHandler.RemovePeopleFlowIntegration)
		peopleflow.GET("/employees", peopleflowHandler.GetPeopleFlowEmployees)
		peopleflow.GET("/sync-logs", peopleflowHandler.GetPeopleFlowSyncLogs)
		peopleflow.PUT("/auto-sync", middleware.AdminMiddleware(), peopleflowHandler.UpdatePeopleFlowAutoSync)
	}

	reports := api.Group("/reports")
	{
		reports.GET("/stats", reportsHandler.GetReportsStats)
		reports.GET("/vehicle-ranking", reportsHandler.GetVehicleRanking)
		reports.GET("/driver-ranking", reportsHandler.GetDriverRanking)
		reports.GET("/cost-breakdown", reportsHandler.GetCostBreakdown)
	}
}
