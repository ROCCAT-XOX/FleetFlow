// backend/service/assignmentService.go
package service

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"fmt"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AssignmentService struct {
	vehicleRepo *repository.VehicleRepository
	driverRepo  *repository.DriverRepository
}

func NewAssignmentService() *AssignmentService {
	return &AssignmentService{
		vehicleRepo: repository.NewVehicleRepository(),
		driverRepo:  repository.NewDriverRepository(),
	}
}

// AssignVehicleToDriver weist einem Fahrer ein Fahrzeug zu
func (s *AssignmentService) AssignVehicleToDriver(driverID, vehicleID string) error {
	// Fahrer laden
	driver, err := s.driverRepo.FindByID(driverID)
	if err != nil {
		return fmt.Errorf("fahrer nicht gefunden: %v", err)
	}

	// Leere vehicleID = Zuweisung entfernen
	if vehicleID == "" {
		return s.UnassignVehicleFromDriver(driverID)
	}

	// Fahrzeug laden
	vehicle, err := s.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		return fmt.Errorf("fahrzeug nicht gefunden: %v", err)
	}

	// Prüfen ob Fahrzeug bereits zugewiesen ist
	if !vehicle.CurrentDriverID.IsZero() && vehicle.CurrentDriverID.Hex() != driverID {
		currentDriver, _ := s.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
		if currentDriver != nil {
			return fmt.Errorf("fahrzeug %s %s (%s) ist bereits dem Fahrer %s %s zugewiesen",
				vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
				currentDriver.FirstName, currentDriver.LastName)
		}
		return fmt.Errorf("fahrzeug ist bereits einem anderen Fahrer zugewiesen")
	}

	// Alte Zuweisung des Fahrers entfernen (falls vorhanden)
	if err := s.clearDriverCurrentAssignment(driver); err != nil {
		return fmt.Errorf("fehler beim Entfernen der alten Zuweisung: %v", err)
	}

	// Neue Zuweisung setzen
	vehicleObjID, _ := primitive.ObjectIDFromHex(vehicleID)
	vehicle.CurrentDriverID = driver.ID
	vehicle.Status = model.VehicleStatusInUse

	if err := s.vehicleRepo.Update(vehicle); err != nil {
		return fmt.Errorf("fehler beim Zuweisen des Fahrzeugs: %v", err)
	}

	// Fahrerstatus aktualisieren
	driver.Status = model.DriverStatusOnDuty
	if err := s.driverRepo.Update(driver); err != nil {
		// Rollback
		vehicle.CurrentDriverID = primitive.ObjectID{}
		vehicle.Status = model.VehicleStatusAvailable
		s.vehicleRepo.Update(vehicle)
		return fmt.Errorf("fehler beim Aktualisieren des Fahrerstatus: %v", err)
	}

	return nil
}

// UnassignVehicleFromDriver entfernt die Fahrzeugzuweisung eines Fahrers
func (s *AssignmentService) UnassignVehicleFromDriver(driverID string) error {
	driver, err := s.driverRepo.FindByID(driverID)
	if err != nil {
		return fmt.Errorf("fahrer nicht gefunden: %v", err)
	}

	return s.clearDriverCurrentAssignment(driver)
}

// clearDriverCurrentAssignment entfernt die aktuelle Fahrzeugzuweisung eines Fahrers
func (s *AssignmentService) clearDriverCurrentAssignment(driver *model.Driver) error {
	// Aktuell zugewiesenes Fahrzeug finden
	assignedVehicle, err := s.GetAssignedVehicle(driver.ID.Hex())
	if err != nil || assignedVehicle == nil {
		// Kein Fahrzeug zugewiesen oder nicht gefunden
		driver.Status = model.DriverStatusAvailable
		return s.driverRepo.Update(driver)
	}

	// Fahrzeug freigeben
	assignedVehicle.CurrentDriverID = primitive.ObjectID{}
	assignedVehicle.Status = model.VehicleStatusAvailable
	if err := s.vehicleRepo.Update(assignedVehicle); err != nil {
		return fmt.Errorf("fehler beim Freigeben des Fahrzeugs: %v", err)
	}

	// Fahrer freigeben
	driver.Status = model.DriverStatusAvailable
	return s.driverRepo.Update(driver)
}

// GetAssignedVehicle gibt das einem Fahrer zugewiesene Fahrzeug zurück
func (s *AssignmentService) GetAssignedVehicle(driverID string) (*model.Vehicle, error) {
	driverObjID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return nil, err
	}

	vehicles, err := s.vehicleRepo.FindAll()
	if err != nil {
		return nil, err
	}

	for _, vehicle := range vehicles {
		if vehicle.CurrentDriverID == driverObjID {
			return vehicle, nil
		}
	}

	return nil, nil // Kein Fahrzeug zugewiesen
}

// GetAssignedDriver gibt den einem Fahrzeug zugewiesenen Fahrer zurück
func (s *AssignmentService) GetAssignedDriver(vehicleID string) (*model.Driver, error) {
	vehicle, err := s.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		return nil, err
	}

	if vehicle.CurrentDriverID.IsZero() {
		return nil, nil // Kein Fahrer zugewiesen
	}

	return s.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
}
