# FleetFlow

<div align="center">
  <img src="frontend/static/images/FleetFlow-Logo-Schriftzug.svg" alt="FleetFlow Logo" width="400">
  
  **Modern Fleet Management System**
  
  A comprehensive solution for tracking and managing vehicle fleets, drivers, and related activities.
</div>

## 🚀 Features

- **Vehicle Management**: Track vehicles, documents, registration, insurance, and financing
- **Driver Management**: Manage drivers, licenses, and vehicle assignments
- **Usage Tracking**: Monitor vehicle usage, bookings, and assignments
- **Maintenance Records**: Keep track of maintenance schedules and history
- **Fuel Cost Tracking**: Monitor and analyze fuel expenses
- **Activity Logging**: Comprehensive audit trail of all system activities
- **User Authentication**: JWT-based authentication with role-based access control
- **PeopleFlow Integration**: Sync employees from external HR systems

## 🛠️ Technology Stack

### Backend
- **Go** with Gin web framework
- **MongoDB** for data storage
- **GridFS** for file storage
- **JWT** authentication

### Frontend
- **HTML/CSS/JavaScript** (vanilla)
- **Module-based JavaScript** architecture
- **Responsive design**

## 📋 Prerequisites

- Go 1.19 or higher
- MongoDB running on localhost:27017
- Air (optional, for hot reload during development)

## 🚀 Quick Start

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd FleetFlow
```

2. Install dependencies:
```bash
go mod download
```

3. Ensure MongoDB is running on localhost:27017

### Running the Application

#### Development Mode
```bash
# Start the application
go run .

# Or with hot reload (requires air)
air
```

#### Production Build
```bash
# Build the application
go build -o fleetdrive

# Run the built executable
./fleetdrive
```

The application will be available at `http://localhost:8080`

## 🐳 Docker

### Build Docker Image
```bash
# Build the Docker image

```

### Save Docker Image
```bash
# Save the image to a tar file
docker save -o fleetflow.tar fleetflow:latest
```

### Load Docker Image
```bash
# Load the image from a tar file
docker load -i fleetflow.tar
```

## 🏗️ Architecture

### Backend Structure
```
├── db/              # Database connection and management
├── model/           # Data structures and types
├── repository/      # Database operations for each entity
├── service/         # Business logic layer
├── handler/         # HTTP request handlers
├── middleware/      # Authentication and request interceptors
└── utils/           # Helper functions (JWT, etc.)
```

### Frontend Structure
```
frontend/
├── templates/       # HTML templates
│   ├── components/  # Reusable HTML components
│   └── vehicle/     # Vehicle-specific templates
├── static/
│   ├── js/         # JavaScript modules
│   ├── css/        # Stylesheets
│   ├── images/     # Images and logos
│   └── assets/     # Brand assets and icons
```

### Key Entities
- **Vehicles**: Complete vehicle lifecycle management
- **Drivers**: Driver profiles and license management
- **Usage Records**: Vehicle assignments and bookings
- **Maintenance**: Service records and scheduling
- **Fuel Costs**: Expense tracking and analysis
- **Activity Logs**: System audit trail
- **Users**: Authentication and authorization
- **PeopleFlow Integration**: HR system synchronization

## 🔧 Configuration

### Database
- **Connection**: `mongodb://localhost:27017`
- **Database**: `FleetFlow`
- **File Storage**: MongoDB GridFS

### Server
- **Port**: 8080
- **Authentication**: JWT with cookie storage
- **CORS**: Enabled for development
- **Static Files**: Served from `./frontend/static`

## 📝 API Endpoints

The application provides RESTful APIs for:
- Vehicle management (CRUD operations)
- Driver management and assignments
- Usage tracking and bookings
- Maintenance scheduling
- Fuel cost recording
- User authentication and management
- File upload/download for documents

## 🔐 Authentication

- JWT-based authentication system
- Secure cookie storage
- Role-based access control (admin/user)
- Protected routes for sensitive operations

## 📄 File Handling

- Document storage via MongoDB GridFS
- Support for PDFs, images (PNG, JPG, etc.)
- File size limits and type validation
- Separate endpoints for vehicle documents and driver licenses

## 🧪 Development

### Code Style
- Follow Go conventions and best practices
- Use existing patterns for consistency
- Implement proper error handling
- Follow the clean architecture principles

### Adding New Features
1. Define models in `/model`
2. Create repository layer in `/repository`
3. Implement business logic in `/service`
4. Add HTTP handlers in `/handler`
5. Update routes in `router.go`
6. Create frontend templates and JavaScript modules

## 📚 Additional Information

For detailed development guidelines and architecture decisions, see `CLAUDE.md` in the project root.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Add your license information here]

---

<div align="center">
  <img src="frontend/static/images/FleetFlow-Logo-Icon.svg" alt="FleetFlow Icon" width="32">
  
  **FleetFlow** - Streamline your fleet management
</div>