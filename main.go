package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"FleetDrive/backend" // Ändere diesen Pfad zu deinem tatsächlichen Importpfad
)

func main() {
	// Set Gin to release mode in production
	// gin.SetMode(gin.ReleaseMode)

	// Initialize router
	router := setupRouter()

	// Create and configure the server
	server := &http.Server{
		Addr:           ":8080",
		Handler:        router,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	// Start the server
	log.Println("Server starting on http://localhost:8080")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func setupRouter() *gin.Engine {
	// Create a default gin router with Logger and Recovery middleware
	router := gin.Default()

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
	router.Static("/assets", "./frontend/assets")

	// Load HTML templates
	router.LoadHTMLGlob("frontend/templates/*.html")

	// Import routes from router.go
	backend.InitializeRoutes(router)

	return router
}
