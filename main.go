package main

import (
	"FleetFlow/backend/db"
	"FleetFlow/backend/repository"
	"FleetFlow/backend/service"
	"FleetFlow/backend/utils"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"FleetFlow/backend" // Ändere diesen Pfad zu deinem tatsächlichen Importpfad
)

func main() {
	// Configure Gin logging mode based on environment
	setupLogging()

	log.Println("🚀 Starting FleetFlow Application...")

	// Datenbankverbindung herstellen
	log.Println("📊 Connecting to database...")
	if err := db.ConnectDB(); err != nil {
		log.Fatalf("❌ Database connection failed: %v", err)
	}
	defer db.DisconnectDB()
	log.Println("✅ Database connected successfully")

	// Admin-Benutzer erstellen, falls keiner existiert
	userRepo := repository.NewUserRepository()
	if err := userRepo.CreateAdminUserIfNotExists(); err != nil {
		log.Printf("⚠️  Admin user creation warning: %v", err)
	} else {
		log.Println("👤 Admin user verified/created")
	}

	// Reservierungs-Scheduler starten
	log.Println("📅 Starting reservation scheduler...")
	scheduler := service.NewReservationScheduler()
	scheduler.Start(1)
	log.Println("✅ Reservation scheduler started")

	// Initialize router
	log.Println("🌐 Setting up routes...")
	router := setupRouter()
	log.Println("✅ Routes configured")

	// Create and configure the server
	server := &http.Server{
		Addr:           ":8080",
		Handler:        router,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	// Start the server
	log.Println("🌍 Server starting on http://localhost:8080")
	printLogLevelHelp()
	log.Println("📋 Ready to handle requests...")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("❌ Server startup failed: %v", err)
	}
}

func setupRouter() *gin.Engine {
	// Create router based on log level
	logLevel := getLogLevel()
	
	var router *gin.Engine
	if logLevel == "debug" {
		// Development mode: show all routes during setup
		router = gin.Default()
		log.Println("🔧 Running in DEBUG mode - showing all routes")
	} else {
		// Production mode: minimal logging
		router = gin.New()
		router.Use(gin.Recovery())
		router.Use(smartLoggerMiddleware())
	}

	// Configure CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Serve static files
	router.Static("/static", "./frontend/static")

	// Load HTML templates with helper functions
	templ := template.Must(template.New("").Funcs(utils.TemplateHelpers()).ParseGlob("frontend/templates/*.html"))
	template.Must(templ.ParseGlob("frontend/templates/components/*.html"))
	template.Must(templ.ParseGlob("frontend/templates/vehicle/*.html"))
	router.SetHTMLTemplate(templ)

	// Import routes from router.go
	backend.InitializeRoutes(router)

	return router
}

// setupLogging configures the logging mode based on environment
func setupLogging() {
	logLevel := getLogLevel()
	
	switch logLevel {
	case "debug":
		gin.SetMode(gin.DebugMode)
		log.Println("🔧 Log Level: DEBUG (showing all requests and routes)")
	case "info": 
		gin.SetMode(gin.ReleaseMode)
		log.Println("📋 Log Level: INFO (important requests only)")
	case "minimal":
		gin.SetMode(gin.ReleaseMode)
		log.Println("🔇 Log Level: MINIMAL (errors only)")
	default:
		gin.SetMode(gin.ReleaseMode)
		log.Println("📋 Log Level: INFO (default)")
	}
}

// getLogLevel returns the current log level from environment or default
func getLogLevel() string {
	level := strings.ToLower(os.Getenv("LOG_LEVEL"))
	if level == "" {
		level = "info" // default
	}
	return level
}

// smartLoggerMiddleware creates an intelligent logger based on log level
func smartLoggerMiddleware() gin.HandlerFunc {
	logLevel := getLogLevel()
	
	return func(c *gin.Context) {
		startTime := time.Now()
		path := c.Request.URL.Path
		
		// Process request
		c.Next()
		
		// Calculate processing time
		latency := time.Since(startTime)
		statusCode := c.Writer.Status()
		method := c.Request.Method
		
		shouldLog := false
		logSymbol := ""
		
		switch logLevel {
		case "debug":
			// Log everything (but we're using gin.Default() for this)
			shouldLog = true
			logSymbol = "🔍"
		case "info":
			// Log errors, data changes, and slow requests
			if statusCode >= 400 || 
			   method == "POST" || method == "PUT" || method == "DELETE" ||
			   latency > time.Second {
				shouldLog = true
			}
		case "minimal":
			// Only errors
			if statusCode >= 400 {
				shouldLog = true
			}
		}
		
		if shouldLog {
			// Choose appropriate symbol
			if statusCode >= 500 {
				logSymbol = "❌"
			} else if statusCode >= 400 {
				logSymbol = "⚠️ "
			} else if latency > time.Second {
				logSymbol = "🐌"
			} else if method == "POST" || method == "PUT" || method == "DELETE" {
				logSymbol = "✏️ "
			} else {
				logSymbol = "📋"
			}
			
			clientIP := c.ClientIP()
			userInfo := getUserInfo(c)
			
			log.Printf("%s %s %s %d %v | %s | %s", 
				logSymbol, method, path, statusCode, latency, clientIP, userInfo)
		}
	}
}


// getUserInfo extracts user information from context for logging
func getUserInfo(c *gin.Context) string {
	if userID, exists := c.Get("userID"); exists {
		if username, exists := c.Get("username"); exists {
			return fmt.Sprintf("User: %s (%v)", username, userID)
		}
		return fmt.Sprintf("UserID: %v", userID)
	}
	return "Anonymous"
}

// truncateUserAgent shortens long user agent strings for cleaner logs
func truncateUserAgent(userAgent string) string {
	if len(userAgent) > 50 {
		return userAgent[:47] + "..."
	}
	return userAgent
}

// printLogLevelHelp shows information about available log levels
func printLogLevelHelp() {
	currentLevel := getLogLevel()
	log.Printf("💡 Current log level: %s", strings.ToUpper(currentLevel))
	log.Printf("   To change: export LOG_LEVEL=debug|info|minimal")
	log.Printf("   • DEBUG: Show all routes and requests")
	log.Printf("   • INFO: Show data changes and errors (default)")
	log.Printf("   • MINIMAL: Show errors only")
}
