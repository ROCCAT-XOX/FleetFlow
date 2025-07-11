package backend

import (
	"FleetFlow/backend/handler"
	"FleetFlow/backend/middleware"
	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"FleetFlow/backend/utils"
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
		// Dashboard-Route mit rollenbasierter Weiterleitung (muss vor anderen Routen stehen)
		authorized.GET("/dashboard", func(c *gin.Context) {
			user, exists := c.Get("user")
			if !exists {
				c.Redirect(http.StatusFound, "/login")
				return
			}
			
			currentUser := user.(*model.User)
			if currentUser.Role == model.RoleDriver {
				c.Redirect(http.StatusFound, "/driver/dashboard")
				return
			}
			
			// Für Manager und Admins: normale Dashboard-Handler aufrufen
			dashboardHandler := handler.NewDashboardHandler()
			dashboardHandler.GetCompleteDashboardData(c)
		})
		
		// Fahrer-spezifische Routen
		setupDriverRoutes(authorized.Group("/driver"))
		
		// Manager/Admin Routen (schützen vor Fahrer-Zugriff)
		managerRoutes := authorized.Group("/")
		managerRoutes.Use(middleware.ManagerOrAdminMiddleware())
		setupAuthorizedRoutes(managerRoutes)
		
		// API Routen mit individueller Berechtigung
		setupAPIRoutes(authorized.Group("/api"))
	}

	// Catch-All für alle anderen Routen: Fahrer zu ihrem Dashboard weiterleiten
	router.NoRoute(func(c *gin.Context) {
		// Prüfen ob der Benutzer authentifiziert ist
		tokenString, err := c.Cookie("token")
		if err == nil && tokenString != "" {
			// Token validieren
			claims, err := utils.ValidateJWT(tokenString)
			if err == nil {
				// Rolle aus Token extrahieren
				if claims.Role == string(model.RoleDriver) {
					c.Redirect(http.StatusFound, "/driver/dashboard")
					return
				}
			}
		}
		
		// Für alle anderen oder nicht authentifizierte Benutzer
		c.HTML(http.StatusNotFound, "error.html", gin.H{
			"title": "Seite nicht gefunden",
			"error": "Die angeforderte Seite existiert nicht",
			"year":  time.Now().Year(),
		})
	})
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

	// Root-Pfad zum Dashboard umleiten (rollenbasiert)
	router.GET("/", func(c *gin.Context) {
		// Token aus dem Cookie extrahieren
		tokenString, err := c.Cookie("token")
		if err != nil {
			c.Redirect(http.StatusFound, "/login")
			return
		}

		// Token validieren
		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			c.Redirect(http.StatusFound, "/login")
			return
		}

		// Benutzer aus der Datenbank abrufen
		userRepo := repository.NewUserRepository()
		user, err := userRepo.FindByID(claims.UserID)
		if err != nil {
			c.Redirect(http.StatusFound, "/login")
			return
		}

		// Rollenbasierte Weiterleitung
		switch user.Role {
		case model.RoleDriver:
			c.Redirect(http.StatusFound, "/driver/dashboard")
		default:
			c.Redirect(http.StatusFound, "/dashboard")
		}
	})
}

// setupAuthorizedRoutes konfiguriert die geschützten Seitenrouten
func setupAuthorizedRoutes(group *gin.RouterGroup) {
	currentYear := time.Now().Year()

	// Dashboard-Route ist bereits oben definiert mit rollenbasierter Weiterleitung

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
		documentRepo := repository.NewVehicleDocumentRepository() // NEU

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

		// Dokumente laden
		documents, _ := documentRepo.FindByVehicle(vehicleID)
		documentCount, _ := documentRepo.CountByVehicle(vehicleID)

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
			"cardNumber":         vehicle.CardNumber,
			"fuelType":           vehicle.FuelType,
			"mileage":            vehicle.Mileage,
			"status":             vehicle.Status,
			"registrationDate":   vehicle.RegistrationDate,
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
			"documents":          documents,
			"documentCount":      documentCount,
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

	// Reservierungen (mit integriertem Kalender)
	reservationHandler := handler.NewReservationHandler()
	group.GET("/reservations", reservationHandler.ShowReservationsPage)
	
	// Manager-Genehmigungsseite (nur für Manager und Admins)
	managerApprovalHandler := handler.NewManagerApprovalHandler()
	group.GET("/manager/approvals", middleware.ManagerOrAdminMiddleware(), managerApprovalHandler.ShowManagerApprovalPage)
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
	documentHandler := handler.NewVehicleDocumentHandler()
	driverDocumentHandler := handler.NewDriverDocumentHandler()
	reservationHandler := handler.NewReservationHandler()

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
		profile.POST("/picture", profileHandler.UploadProfilePicture)
		profile.GET("/picture", profileHandler.GetProfilePicture)
		profile.DELETE("/picture", profileHandler.DeleteProfilePicture)
	}

	// Fahrzeug-API (KORRIGIERT)
	vehicles := api.Group("/vehicles")
	{
		vehicles.GET("", vehicleHandler.GetVehicles)
		vehicles.GET("/:id", vehicleHandler.GetVehicle)
		vehicles.POST("", vehicleHandler.CreateVehicle)
		vehicles.PUT("/:id", vehicleHandler.UpdateVehicle)
		vehicles.PUT("/:id/basic-info", vehicleHandler.UpdateBasicInfo)
		vehicles.DELETE("/:id", middleware.AdminMiddleware(), vehicleHandler.DeleteVehicle)

		// Dokumente-Routen mit konsistenter Wildcard-Benennung
		vehicles.POST("/:id/documents", documentHandler.UploadDocument)
		vehicles.GET("/:id/documents", documentHandler.GetVehicleDocuments)

		// Fahrzeugbild-Route
		vehicles.GET("/:id/image", documentHandler.GetVehicleMainImage)
	}

	// Dokumente-API (separate Gruppe für dokumenten-spezifische Operationen)
	documents := api.Group("/documents")
	{
		documents.GET("/:id/download", documentHandler.DownloadDocument)
		documents.PUT("/:id", documentHandler.UpdateDocument)
		documents.DELETE("/:id", documentHandler.DeleteDocument)
	}

	// Fahrer-API
	drivers := api.Group("/drivers")
	{
		drivers.GET("", driverHandler.GetDrivers)
		drivers.GET("/:id", driverHandler.GetDriver)
		drivers.POST("", driverHandler.CreateDriver)
		drivers.PUT("/:id", driverHandler.UpdateDriver)
		drivers.DELETE("/:id", middleware.AdminMiddleware(), driverHandler.DeleteDriver)
		drivers.PUT("/:id/assign-vehicle", driverHandler.AssignVehicle)
		drivers.POST("/cleanup-assignments", middleware.AdminMiddleware(), driverHandler.CleanupInconsistentAssignments)
		drivers.POST("/:id/documents", driverDocumentHandler.UploadDocument)
		drivers.GET("/:id/documents", driverDocumentHandler.GetDriverDocuments)
		drivers.GET("/:id/license", driverDocumentHandler.GetDriverLicense)
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

	// Driver Documents
	driverDocuments := api.Group("/driver-documents")
	{
		driverDocuments.GET("/:docId/download", driverDocumentHandler.DownloadDocument)
		driverDocuments.GET("/:docId/view", driverDocumentHandler.ViewDocument)
		driverDocuments.PUT("/:docId", driverDocumentHandler.UpdateDocument)
		driverDocuments.DELETE("/:docId", driverDocumentHandler.DeleteDocument)
	}

	// Dashboard-API
	dashboard := api.Group("/dashboard")
	{
		dashboard.GET("/stats", dashboardHandler.GetDashboardStats)
		dashboard.GET("/fuel-costs-by-vehicle", dashboardHandler.GetFuelCostsByVehicle)
	}

	// PeopleFlow Integration
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

	// Reports API
	reports := api.Group("/reports")
	{
		reports.GET("/stats", reportsHandler.GetReportsStats)
		reports.GET("/vehicle-ranking", reportsHandler.GetVehicleRanking)
		reports.GET("/driver-ranking", reportsHandler.GetDriverRanking)
		reports.GET("/cost-breakdown", reportsHandler.GetCostBreakdown)
	}

	// Reservations API
	reservations := api.Group("/reservations")
	{
		reservations.GET("", reservationHandler.GetReservations)
		reservations.POST("", reservationHandler.CreateReservation)
		reservations.PUT("/:id", reservationHandler.UpdateReservation)
		reservations.DELETE("/:id", reservationHandler.CancelReservation)
		reservations.POST("/:id/complete", reservationHandler.CompleteReservation)
		reservations.GET("/vehicle/:vehicleId", reservationHandler.GetReservationsByVehicle)
		reservations.GET("/driver/:driverId", reservationHandler.GetReservationsByDriver)
		reservations.GET("/available-vehicles", reservationHandler.GetAvailableVehicles)
		reservations.GET("/check-conflict", reservationHandler.CheckReservationConflict)
		
		// Genehmigungsrouten für Manager/Admins
		reservations.POST("/:id/approve", middleware.ManagerOrAdminMiddleware(), reservationHandler.ApproveReservation)
		reservations.POST("/:id/reject", middleware.ManagerOrAdminMiddleware(), reservationHandler.RejectReservation)
		reservations.GET("/pending", middleware.ManagerOrAdminMiddleware(), reservationHandler.GetPendingReservations)
	}

	// Vehicle Reports API
	vehicleReportHandler := handler.NewVehicleReportHandler()
	reportsAPI := api.Group("/vehicle-reports")
	{
		reportsAPI.GET("", middleware.ManagerOrAdminMiddleware(), vehicleReportHandler.GetReports)
		reportsAPI.GET("/urgent", middleware.ManagerOrAdminMiddleware(), vehicleReportHandler.GetUrgentReports)
		reportsAPI.GET("/:id", vehicleReportHandler.GetReport)
		reportsAPI.PUT("/:id/status", middleware.ManagerOrAdminMiddleware(), vehicleReportHandler.UpdateReportStatus)
		reportsAPI.DELETE("/:id", middleware.AdminMiddleware(), vehicleReportHandler.DeleteReport)
	}

	// SMTP API
	smtpHandler := handler.NewSMTPHandler()
	smtp := api.Group("/smtp")
	{
		smtp.GET("/config", middleware.AdminMiddleware(), smtpHandler.GetSMTPConfig)
		smtp.POST("/config", middleware.AdminMiddleware(), smtpHandler.SaveSMTPConfig)
		smtp.POST("/test", middleware.AdminMiddleware(), smtpHandler.TestSMTPConfig)
		smtp.GET("/templates", middleware.AdminMiddleware(), smtpHandler.GetEmailTemplates)
		smtp.POST("/templates", middleware.AdminMiddleware(), smtpHandler.SaveEmailTemplate)
		smtp.GET("/logs", middleware.AdminMiddleware(), smtpHandler.GetEmailLogs)
		smtp.POST("/send", middleware.AdminMiddleware(), smtpHandler.SendTestEmail)
	}

}

// setupDriverRoutes konfiguriert die Fahrer-spezifischen Routen
func setupDriverRoutes(group *gin.RouterGroup) {
	// Handler initialisieren
	driverDashboardHandler := handler.NewDriverDashboardHandler()
	vehicleReportHandler := handler.NewVehicleReportHandler()

	// Fahrer-Middleware hinzufügen - nur Fahrer dürfen diese Routen verwenden
	group.Use(middleware.DriverOrHigherMiddleware())

	// Dashboard für Fahrer (mobile-optimiert)
	group.GET("/dashboard", driverDashboardHandler.ShowDashboard)

	// Reservierungen für Fahrer
	group.GET("/reservations", driverDashboardHandler.ShowReservations)

	// Fahrzeugmeldungen für Fahrer  
	group.GET("/reports", driverDashboardHandler.ShowReports)

	// API-Routen für Fahrer
	driverAPI := group.Group("/api")
	{
		// Reservierungs-API für Fahrer
		reservations := driverAPI.Group("/reservations")
		{
			reservations.GET("", vehicleReportHandler.GetReportsByDriver) // Eigene Reservierungen
			// reservations.POST("", driverReservationHandler.CreateReservation) // Neue Reservierung erstellen
			// reservations.GET("/:id", driverReservationHandler.GetReservation) // Reservierung anzeigen
		}

		// Fahrzeugmeldungs-API für Fahrer
		reports := driverAPI.Group("/reports")
		{
			reports.GET("", vehicleReportHandler.GetReportsByDriver)          // Eigene Meldungen
			reports.POST("", vehicleReportHandler.CreateReport)              // Neue Meldung erstellen
			reports.GET("/:id", vehicleReportHandler.GetReport)              // Meldung anzeigen
		}

		// Fahrzeug-Info für Fahrer (nur lesend)
		// vehicles := driverAPI.Group("/vehicles")
		// {
		// 	vehicles.GET("", driverVehicleHandler.GetAvailableVehicles) // Verfügbare Fahrzeuge für Reservierung
		// 	vehicles.GET("/:id", driverVehicleHandler.GetVehicleInfo)   // Fahrzeuginfos für Meldung
		// }
	}
}
