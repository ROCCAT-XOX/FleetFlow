# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FleetDrive is a fleet management system built with Go (backend) and HTML/CSS/JavaScript (frontend). It helps organizations track and manage their vehicle fleet, drivers, and related activities.

## Build and Run Commands

```bash
# Start the application server
go run .

# Build the application
go build -o fleetdrive

# Run the built executable
./fleetdrive
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
- Vehicles
- Drivers
- Vehicle Usage
- Maintenance Records
- Fuel Costs
- Projects
- Users/Authentication

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

The database name is "fleetdrive" with collections matching the model entities.

## Important Notes

- When modifying vehicle data, be sure to handle dates properly
- The frontend uses module-based JavaScript for organization
- Vehicle registration, insurance, and maintenance dates require special formatting