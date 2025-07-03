# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FleetFlow is a fleet management system built with Go (backend) and HTML/CSS/JavaScript (frontend). It helps organizations track and manage their vehicle fleet, drivers, and related activities.

## Build and Run Commands

```bash
# Start the application server (development)
go run .

# Build the application
go build -o fleetflow

# Run the built executable
./fleetflow

# Development with hot reload (requires air - recommended)
air

# Build with air (production-ready)
air build
```

### Environment Variables
- `LOG_LEVEL`: Controls logging verbosity (`debug`, `info`, `minimal`) - defaults to `info`
- `ENV`: Environment mode (`production` for Docker, defaults to `development`)
- `GIN_MODE`: Auto-managed by LOG_LEVEL setting

### Logging System
FleetFlow has an intelligent logging system:
- **DEBUG**: Shows all routes and HTTP requests (development)
- **INFO**: Shows data changes, errors, and slow requests (default)
- **MINIMAL**: Shows errors only (production)

## Architecture Overview

The application follows a clean architecture pattern with clear separation of concerns:

### Backend Structure (Go/Gin)
- **db/**: Database connection management with environment-aware MongoDB URIs
- **model/**: Data structures, entity definitions, and business constants
- **repository/**: Database operations using MongoDB driver patterns
- **service/**: Business logic layer (reservation scheduling, email services, etc.)
- **handler/**: HTTP request handlers with proper error handling
- **middleware/**: Authentication (JWT) and admin access control
- **utils/**: Shared utilities (JWT validation, template helpers)
- **router.go**: Centralized route configuration with grouped endpoints

### Frontend Structure
- **templates/**: Server-side rendered HTML with Go template syntax
  - **components/**: Reusable UI components (header, navbar, footer)
  - **vehicle/**: Vehicle-specific detail templates (modular structure)
- **static/js/**: Module-based JavaScript architecture
- **static/css/**: Styling with responsive design
- **static/assets/**: Brand assets and manufacturer logos

### Key Domain Entities
- **Vehicles**: Complete lifecycle (documents, images, registration, insurance, financing, technical specs)
- **Drivers**: Profile management with license documents and vehicle assignments
- **Vehicle Usage**: Usage tracking, assignments, and booking system
- **Reservations**: Advanced scheduling with conflict detection
- **Maintenance**: Service records and upcoming maintenance tracking
- **Fuel Costs**: Expense tracking with analytics
- **Activity Logs**: Comprehensive audit trail with user attribution
- **Users**: JWT authentication with role-based access (admin/user)
- **PeopleFlow Integration**: HR system synchronization for employee/driver management

### Request Flow Architecture
1. **Router**: Gin router with grouped routes (public, authorized, API)
2. **Middleware**: JWT validation → user context injection → admin checks
3. **Handler**: Request validation → service layer call → response formatting
4. **Service**: Business logic → repository calls → data transformation
5. **Repository**: MongoDB operations → error handling → data return
6. **Templates**: Server-side rendering with enriched data context

### Authentication & Authorization
- JWT tokens stored in secure HTTP cookies
- Middleware chain: `AuthMiddleware()` → `AdminMiddleware()` (where needed)
- User context injection for activity logging
- Protected routes for sensitive operations

## Database Architecture

### MongoDB Configuration
```go
// Environment-aware connection
development: "mongodb://localhost:27017"
production:  "mongodb://mongodb:27017"  // Docker container
```

### Database: "FleetFlow"
Collections follow entity naming conventions. Key patterns:
- **GridFS**: Used for file storage (vehicle documents, driver licenses, profile pictures)
- **Embedded Documents**: For related data (vehicle technical specs, financing info)
- **References**: Using ObjectIDs for entity relationships
- **Indexes**: Implemented for performance-critical queries (license plates, VINs)

### Repository Pattern
Each entity has its own repository with consistent methods:
- `FindAll()`, `FindByID()`, `Create()`, `Update()`, `Delete()`
- Specialized queries (`FindByVehicle()`, `FindByDriver()`, etc.)
- Error handling with proper MongoDB error types

## Server & Development Configuration

### Core Settings
- **Port**: 8080 (configurable for production)
- **Templates**: Parsed from multiple directories with helper functions
- **Static Files**: Served from `./frontend/static`
- **CORS**: Enabled with credentials for development
- **Timeouts**: 10s read/write with 1MB max header size

### Hot Reload (Air Configuration)
```toml
# Watches: backend/, frontend/ directories
# Extensions: .go, .html, .css, .js
# Build: go build -o ./tmp/main .
# Excludes: tmp/, vendor/
```

## API Architecture

### Route Organization
- **Public Routes**: `/login`, `/auth`, `/logout`
- **Authorized Routes**: Page templates with authentication
- **API Routes**: `/api/*` with consistent REST patterns

### Key API Groups
- `/api/vehicles` - CRUD + documents + images
- `/api/drivers` - CRUD + assignments + documents  
- `/api/usage` - Vehicle usage tracking
- `/api/reservations` - Booking system with conflict detection
- `/api/maintenance` - Service records
- `/api/fuelcosts` - Expense tracking
- `/api/activities` - Audit logs
- `/api/dashboard` - Analytics and statistics
- `/api/profile` - User profile management
- `/api/integrations/peopleflow` - HR system sync

### Document Management
- **Upload**: Multi-part form handling with type validation
- **Storage**: MongoDB GridFS with metadata
- **Download**: Streaming with proper MIME types
- **Security**: File type restrictions and size limits

## Frontend Architecture

### Template System
- **Go Templates**: Server-side rendering with template functions
- **Component Pattern**: Reusable header, navbar, footer components
- **Data Binding**: Rich context passed from handlers to templates
- **Responsive Design**: Mobile-first approach

### JavaScript Architecture
- **Module Pattern**: ES6 modules for organization
- **API Integration**: Fetch-based communication with error handling
- **Form Handling**: Validation and submission with feedback
- **Dynamic UI**: Real-time updates without page refresh

## Development Guidelines

### Adding New Features
1. **Model**: Define data structures in `/model` with proper tags
2. **Repository**: Implement database operations with error handling
3. **Service**: Add business logic with proper validation
4. **Handler**: Create HTTP endpoints with consistent patterns
5. **Routes**: Register in `router.go` with appropriate middleware
6. **Templates**: Create HTML templates with proper data binding
7. **JavaScript**: Add frontend logic following module patterns

### Code Patterns
- **Error Handling**: Consistent error responses with HTTP status codes
- **Logging**: Use activity service for audit trails
- **Validation**: Input validation at handler level
- **Security**: Admin middleware for sensitive operations
- **Testing**: Follow repository → service → handler testing pattern

### Database Considerations
- Use repository pattern for all database operations
- Implement proper indexing for frequently queried fields
- Handle MongoDB connection errors gracefully
- Use GridFS for file storage operations
- Maintain referential integrity manually (no foreign keys)

## Integration Points

### PeopleFlow Integration
- **Purpose**: Sync employees from external HR systems
- **Authentication**: API key based
- **Sync Process**: Automatic driver creation from employee data
- **Scheduling**: Configurable automatic synchronization

### Email System (SMTP)
- **Configuration**: Admin-configurable SMTP settings
- **Templates**: Customizable email templates
- **Logging**: Email sending audit trail
- **Testing**: Built-in email testing functionality

## Testing

Currently, no automated test suite is configured. When adding tests:
- Follow Go testing conventions (`*_test.go` files)
- Test repository → service → handler layers independently
- Use `go test ./...` to run all tests
- Consider adding `go test` commands to build process

## Important Implementation Notes

- **Date Handling**: Use proper time zone handling for vehicle operations
- **File Uploads**: Implement proper MIME type validation and size limits
- **Activity Logging**: All major operations automatically logged with user context
- **Admin Operations**: Protect sensitive endpoints with AdminMiddleware
- **Session Management**: JWT tokens with configurable expiration
- **Performance**: Implement proper database indexing for search operations
- **Module Name**: Project uses module name `FleetFlow` (consistent with project directory name)