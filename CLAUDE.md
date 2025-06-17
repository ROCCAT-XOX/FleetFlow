# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FleetFlow is a fleet management system built with Go (backend) and HTML/CSS/JavaScript (frontend). It helps organizations track and manage their vehicle fleet, drivers, and related activities.

## Build and Run Commands

```bash
# Start the application server
go run .

# Build the application
go build -o fleetdrive

# Run the built executable
./fleetdrive

# Development with hot reload (requires air)
air

# Build development version with air
air build
```

## Architecture Overview

The application follows a clean architecture with the following components:

### Backend (Go/Gin)
- **db**: Database connection and management (MongoDB)
- **model**: Data structures and types
- **repository**: Database operations for each entity
- **service**: Business logic 
- **handler**: HTTP request handlers
- **middleware**: Authentication and other request interceptors
- **utils**: Helper functions (e.g., JWT utils)

### Frontend
- **templates**: HTML templates for rendering pages
  - **components**: Reusable HTML components
  - **vehicle**: Vehicle-specific templates
- **static/js**: JavaScript files for frontend functionality
- **static/css**: CSS stylesheets

### Key Entities
- Vehicles (with documents, images, registration, insurance, financing)
- Drivers (with license documents and vehicle assignments)
- Vehicle Usage (tracking, assignments, bookings)
- Maintenance Records
- Fuel Costs
- Activity Logs
- Users/Authentication (admin and regular users)
- PeopleFlow Integration (employee sync)

### Data Flow
1. Client requests come through the Gin router
2. Router directs to appropriate handler
3. Handler uses repository to interact with the database
4. Repository returns data to the handler
5. Handler formats and returns response

### Authentication
- JWT-based authentication system
- Token stored in cookies
- Role-based access control for admin operations

## Database

The application uses MongoDB with the following connection:
```go
// MongoDB connection string
const mongoURI = "mongodb://localhost:27017"
```

The database name is "FleetFlow" with collections matching the model entities.

## Server Configuration

- Default port: 8080
- Runs on http://localhost:8080
- JWT authentication with cookie storage
- CORS enabled for development
- Static files served from `./frontend/static`
- Templates parsed from `frontend/templates/` with components and vehicle subdirectories

## File Upload Handling

- Vehicle documents and images stored in MongoDB GridFS
- Driver license documents handled via separate endpoints
- Document types: PDF, images (PNG, JPG), etc.
- File size limits and type validation implemented

## Important Notes

- When modifying vehicle data, be sure to handle dates properly
- The frontend uses module-based JavaScript for organization
- Vehicle registration, insurance, and maintenance dates require special formatting
- Admin middleware protects certain routes (user management, system configuration)
- PeopleFlow integration allows syncing employees as drivers from external HR system
- Activity logging tracks all major system actions automatically