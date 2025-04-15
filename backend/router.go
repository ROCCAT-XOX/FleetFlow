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
		"year":  time.Now().Year(),
	})
}

// Logout handles user logout
func Logout(c *gin.Context) {
	c.SetCookie("user", "", -1, "/", "", false, true)
	c.Redirect(http.StatusSeeOther, "/login")
}

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

		// Setting
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
			id := c.Param("id")

			// Hier würdest du das Fahrzeug aus der Datenbank laden
			vehicle := gin.H{
				"id":           id,
				"name":         "Fahrzeug " + id,
				"model":        "Model X" + id,
				"licensePlate": "B-FD " + id,
				"status":       "Available",
				"mileage":      45000,
				"lastService":  "2025-03-15",
			}

			c.HTML(http.StatusOK, "vehicle-form.html", gin.H{
				"title":   "Fahrzeug bearbeiten",
				"user":    c.MustGet("user"),
				"vehicle": vehicle,
				"year":    currentYear,
				"isNew":   false,
			})
		})

		// Fahrzeugdetails anzeigen
		authorized.GET("/vehicle-details/:id", func(c *gin.Context) {
			id := c.Param("id")

			// Hier würdest du das Fahrzeug aus der Datenbank laden
			vehicle := gin.H{
				"id":           id,
				"name":         "Fahrzeug " + id,
				"model":        "Model X" + id,
				"licensePlate": "B-FD " + id,
				"status":       "Available",
				"mileage":      45000,
				"lastService":  "2025-03-15",
				"nextService":  "2025-09-15",
			}

			// Bisherige Zuweisungen/Nutzungen des Fahrzeugs
			assignments := []gin.H{
				{
					"id":         "a1",
					"driverId":   "1",
					"driverName": "Max Mustermann",
					"startDate":  "2025-04-10",
					"endDate":    "2025-04-12",
					"purpose":    "Kundentermin",
				},
				{
					"id":         "a2",
					"driverId":   "2",
					"driverName": "Erika Musterfrau",
					"startDate":  "2025-04-20",
					"endDate":    "2025-04-25",
					"purpose":    "Messebesuch",
				},
			}

			// Servicehistorie
			serviceHistory := []gin.H{
				{
					"id":      "s1",
					"date":    "2024-09-15",
					"type":    "Inspektion",
					"mileage": 40000,
					"notes":   "Ölwechsel, Bremsen geprüft",
				},
				{
					"id":      "s2",
					"date":    "2025-03-15",
					"type":    "Inspektion",
					"mileage": 45000,
					"notes":   "Luftfilter getauscht, Reifen gewechselt",
				},
			}

			c.HTML(http.StatusOK, "vehicle-details.html", gin.H{
				"title":          "Fahrzeugdetails",
				"user":           c.MustGet("user"),
				"vehicle":        vehicle,
				"assignments":    assignments,
				"serviceHistory": serviceHistory,
				"year":           currentYear,
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
			id := c.Param("id")

			// Hier würdest du den Fahrer aus der Datenbank laden
			driver := gin.H{
				"id":           id,
				"name":         "Fahrer " + id,
				"licenseClass": "B",
				"email":        "fahrer" + id + "@example.com",
				"phone":        "+49 123 45678" + id,
				"status":       "Available",
			}

			c.HTML(http.StatusOK, "driver-form.html", gin.H{
				"title":  "Fahrer bearbeiten",
				"user":   c.MustGet("user"),
				"driver": driver,
				"year":   currentYear,
				"isNew":  false,
			})
		})

		// Neue Fahrzeugzuweisung - Formular
		authorized.GET("/assignments/new", func(c *gin.Context) {
			vehicleId := c.Query("vehicleId")

			// Verfügbare Fahrer laden
			availableDrivers := []gin.H{
				{"id": "1", "name": "Max Mustermann"},
				{"id": "2", "name": "Erika Musterfrau"},
				{"id": "3", "name": "John Doe"},
			}

			// Falls ein Fahrzeug ausgewählt wurde, dessen Daten laden
			var vehicle gin.H
			if vehicleId != "" {
				vehicle = gin.H{
					"id":   vehicleId,
					"name": "Fahrzeug " + vehicleId,
				}
			}

			c.HTML(http.StatusOK, "assignment-form.html", gin.H{
				"title":   "Neue Fahrzeugzuweisung",
				"user":    c.MustGet("user"),
				"year":    currentYear,
				"drivers": availableDrivers,
				"vehicle": vehicle,
				"isNew":   true,
			})
		})

		// Fahrzeugzuweisung bearbeiten - Formular
		authorized.GET("/assignments/edit/:id", func(c *gin.Context) {
			id := c.Param("id")

			// Hier würdest du die Zuweisung aus der Datenbank laden
			assignment := gin.H{
				"id":          id,
				"vehicleId":   "1",
				"vehicleName": "Fahrzeug 1",
				"driverId":    "2",
				"driverName":  "Erika Musterfrau",
				"startDate":   "2025-04-20",
				"endDate":     "2025-04-25",
				"purpose":     "Messebesuch",
			}

			// Verfügbare Fahrer laden
			availableDrivers := []gin.H{
				{"id": "1", "name": "Max Mustermann"},
				{"id": "2", "name": "Erika Musterfrau"},
				{"id": "3", "name": "John Doe"},
			}

			c.HTML(http.StatusOK, "assignment-form.html", gin.H{
				"title":      "Fahrzeugzuweisung bearbeiten",
				"user":       c.MustGet("user"),
				"year":       currentYear,
				"drivers":    availableDrivers,
				"assignment": assignment,
				"isNew":      false,
			})
		})

		// Neue Inspektion/Service hinzufügen - Formular
		authorized.GET("/service/new", func(c *gin.Context) {
			vehicleId := c.Query("vehicleId")

			// Falls ein Fahrzeug ausgewählt wurde, dessen Daten laden
			var vehicle gin.H
			if vehicleId != "" {
				vehicle = gin.H{
					"id":      vehicleId,
					"name":    "Fahrzeug " + vehicleId,
					"mileage": 45000,
				}
			}

			c.HTML(http.StatusOK, "service-form.html", gin.H{
				"title":   "Neue Inspektion erfassen",
				"user":    c.MustGet("user"),
				"year":    currentYear,
				"vehicle": vehicle,
				"isNew":   true,
			})
		})

		// Inspektion/Service bearbeiten - Formular
		authorized.GET("/service/edit/:id", func(c *gin.Context) {
			id := c.Param("id")

			// Hier würdest du den Service aus der Datenbank laden
			service := gin.H{
				"id":          id,
				"vehicleId":   "1",
				"vehicleName": "Fahrzeug 1",
				"date":        "2025-03-15",
				"type":        "Inspektion",
				"mileage":     45000,
				"notes":       "Luftfilter getauscht, Reifen gewechselt",
			}

			c.HTML(http.StatusOK, "service-form.html", gin.H{
				"title":   "Inspektion bearbeiten",
				"user":    c.MustGet("user"),
				"year":    currentYear,
				"service": service,
				"isNew":   false,
			})
		})

		// API routes for backend operations
		api := authorized.Group("/api")
		{
			// Fahrzeug-API-Endpunkte
			api.GET("/vehicles", func(c *gin.Context) {
				// Placeholder für Fahrzeugdaten
				vehicles := []gin.H{
					{"id": "1", "name": "Fahrzeug 1", "model": "Model X1", "licensePlate": "B-FD 1", "status": "Available"},
					{"id": "2", "name": "Fahrzeug 2", "model": "Model Y2", "licensePlate": "B-FD 2", "status": "In Use"},
				}
				c.JSON(http.StatusOK, gin.H{"vehicles": vehicles})
			})

			api.GET("/vehicle-details/:id", func(c *gin.Context) {
				id := c.Param("id")

				// Hier würdest du das Fahrzeug aus der Datenbank laden
				vehicle := gin.H{
					"id":           id,
					"name":         "Fahrzeug " + id,
					"model":        "Model X" + id,
					"licensePlate": "B-FD " + id,
					"status":       "Available",
					"mileage":      45000,
					"lastService":  "2025-03-15",
					"nextService":  "2025-09-15",
				}

				c.JSON(http.StatusOK, gin.H{"vehicle": vehicle})
			})

			// Neues Fahrzeug hinzufügen
			api.POST("/vehicles", func(c *gin.Context) {
				var newVehicle struct {
					Name         string `json:"name"`
					Model        string `json:"model"`
					LicensePlate string `json:"licensePlate"`
					Mileage      int    `json:"mileage"`
				}

				if err := c.ShouldBindJSON(&newVehicle); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Hier würdest du das Fahrzeug in der Datenbank speichern
				// und die ID zurückgeben

				c.JSON(http.StatusCreated, gin.H{
					"success": true,
					"id":      "3", // Beispiel-ID
					"message": "Fahrzeug erfolgreich hinzugefügt",
				})
			})

			// Fahrzeug aktualisieren
			api.PUT("/vehicles/:id", func(c *gin.Context) {
				id := c.Param("id")

				var updatedVehicle struct {
					Name         string `json:"name"`
					Model        string `json:"model"`
					LicensePlate string `json:"licensePlate"`
					Mileage      int    `json:"mileage"`
				}

				if err := c.ShouldBindJSON(&updatedVehicle); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Hier würdest du das Fahrzeug in der Datenbank aktualisieren

				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"id":      id,
					"message": "Fahrzeug erfolgreich aktualisiert",
				})
			})

			// Fahrer-API-Endpunkte
			api.GET("/drivers", func(c *gin.Context) {
				// Placeholder für Fahrerdaten
				drivers := []gin.H{
					{"id": "1", "name": "Max Mustermann", "licenseClass": "B", "status": "Available"},
					{"id": "2", "name": "Erika Musterfrau", "licenseClass": "B,C", "status": "On duty"},
				}
				c.JSON(http.StatusOK, gin.H{"drivers": drivers})
			})

			api.GET("/drivers/:id", func(c *gin.Context) {
				id := c.Param("id")

				// Hier würdest du den Fahrer aus der Datenbank laden
				var name, licenseClass, status string

				if id == "1" {
					name = "Max Mustermann"
					licenseClass = "B"
					status = "Available"
				} else {
					name = "Erika Musterfrau"
					licenseClass = "B,C"
					status = "On duty"
				}

				driver := gin.H{
					"id":           id,
					"name":         name,
					"licenseClass": licenseClass,
					"email":        "fahrer" + id + "@example.com",
					"phone":        "+49 123 45678" + id,
					"status":       status,
				}

				c.JSON(http.StatusOK, gin.H{"driver": driver})
			})

			// Neuen Fahrer hinzufügen
			api.POST("/drivers", func(c *gin.Context) {
				var newDriver struct {
					Name         string `json:"name"`
					LicenseClass string `json:"licenseClass"`
					Email        string `json:"email"`
					Phone        string `json:"phone"`
				}

				if err := c.ShouldBindJSON(&newDriver); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Hier würdest du den Fahrer in der Datenbank speichern

				c.JSON(http.StatusCreated, gin.H{
					"success": true,
					"id":      "3", // Beispiel-ID
					"message": "Fahrer erfolgreich hinzugefügt",
				})
			})

			// Fahrer aktualisieren
			api.PUT("/drivers/:id", func(c *gin.Context) {
				id := c.Param("id")

				var updatedDriver struct {
					Name         string `json:"name"`
					LicenseClass string `json:"licenseClass"`
					Email        string `json:"email"`
					Phone        string `json:"phone"`
				}

				if err := c.ShouldBindJSON(&updatedDriver); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Hier würdest du den Fahrer in der Datenbank aktualisieren

				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"id":      id,
					"message": "Fahrer erfolgreich aktualisiert",
				})
			})

			// API-Endpunkte für Fahrzeugzuweisungen
			api.GET("/assignments", func(c *gin.Context) {
				vehicleId := c.Query("vehicleId")
				driverId := c.Query("driverId")

				// Placeholder für Zuweisungsdaten
				assignments := []gin.H{
					{
						"id":          "a1",
						"vehicleId":   "1",
						"vehicleName": "Fahrzeug 1",
						"driverId":    "1",
						"driverName":  "Max Mustermann",
						"startDate":   "2025-04-10",
						"endDate":     "2025-04-12",
						"purpose":     "Kundentermin",
					},
					{
						"id":          "a2",
						"vehicleId":   "1",
						"vehicleName": "Fahrzeug 1",
						"driverId":    "2",
						"driverName":  "Erika Musterfrau",
						"startDate":   "2025-04-20",
						"endDate":     "2025-04-25",
						"purpose":     "Messebesuch",
					},
				}

				// Hier würdest du nach Fahrzeug oder Fahrer filtern
				filteredAssignments := []gin.H{}

				for _, a := range assignments {
					if (vehicleId == "" || a["vehicleId"] == vehicleId) &&
						(driverId == "" || a["driverId"] == driverId) {
						filteredAssignments = append(filteredAssignments, a)
					}
				}

				c.JSON(http.StatusOK, gin.H{"assignments": filteredAssignments})
			})

			// Neue Zuweisung erstellen
			api.POST("/assignments", func(c *gin.Context) {
				var newAssignment struct {
					VehicleId string `json:"vehicleId"`
					DriverId  string `json:"driverId"`
					StartDate string `json:"startDate"`
					EndDate   string `json:"endDate"`
					Purpose   string `json:"purpose"`
				}

				if err := c.ShouldBindJSON(&newAssignment); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Hier würdest du die Zuweisung in der Datenbank speichern
				// und prüfen, ob das Fahrzeug im angegebenen Zeitraum verfügbar ist

				c.JSON(http.StatusCreated, gin.H{
					"success": true,
					"id":      "a3", // Beispiel-ID
					"message": "Fahrzeugzuweisung erfolgreich erstellt",
				})
			})

			// Zuweisung aktualisieren
			api.PUT("/assignments/:id", func(c *gin.Context) {
				id := c.Param("id")

				var updatedAssignment struct {
					VehicleId string `json:"vehicleId"`
					DriverId  string `json:"driverId"`
					StartDate string `json:"startDate"`
					EndDate   string `json:"endDate"`
					Purpose   string `json:"purpose"`
				}

				if err := c.ShouldBindJSON(&updatedAssignment); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Hier würdest du die Zuweisung in der Datenbank aktualisieren

				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"id":      id,
					"message": "Fahrzeugzuweisung erfolgreich aktualisiert",
				})
			})

			// API-Endpunkte für Servicehistorie
			api.GET("/service-history", func(c *gin.Context) {
				vehicleId := c.Query("vehicleId")

				// Placeholder für Servicehistorie
				serviceHistory := []gin.H{
					{
						"id":          "s1",
						"vehicleId":   "1",
						"vehicleName": "Fahrzeug 1",
						"date":        "2024-09-15",
						"type":        "Inspektion",
						"mileage":     40000,
						"notes":       "Ölwechsel, Bremsen geprüft",
					},
					{
						"id":          "s2",
						"vehicleId":   "1",
						"vehicleName": "Fahrzeug 1",
						"date":        "2025-03-15",
						"type":        "Inspektion",
						"mileage":     45000,
						"notes":       "Luftfilter getauscht, Reifen gewechselt",
					},
				}

				// Hier würdest du nach Fahrzeug filtern
				filteredHistory := []gin.H{}

				for _, s := range serviceHistory {
					if vehicleId == "" || s["vehicleId"] == vehicleId {
						filteredHistory = append(filteredHistory, s)
					}
				}

				c.JSON(http.StatusOK, gin.H{"serviceHistory": filteredHistory})
			})

			// Neuen Service hinzufügen
			api.POST("/service-history", func(c *gin.Context) {
				var newService struct {
					VehicleId string `json:"vehicleId"`
					Date      string `json:"date"`
					Type      string `json:"type"`
					Mileage   int    `json:"mileage"`
					Notes     string `json:"notes"`
				}

				if err := c.ShouldBindJSON(&newService); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Hier würdest du den Service in der Datenbank speichern

				c.JSON(http.StatusCreated, gin.H{
					"success": true,
					"id":      "s3", // Beispiel-ID
					"message": "Service erfolgreich hinzugefügt",
				})
			})

			// Service aktualisieren
			api.PUT("/service-history/:id", func(c *gin.Context) {
				id := c.Param("id")

				var updatedService struct {
					Date    string `json:"date"`
					Type    string `json:"type"`
					Mileage int    `json:"mileage"`
					Notes   string `json:"notes"`
				}

				if err := c.ShouldBindJSON(&updatedService); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				// Hier würdest du den Service in der Datenbank aktualisieren

				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"id":      id,
					"message": "Service erfolgreich aktualisiert",
				})
			})
		}
	}
}
