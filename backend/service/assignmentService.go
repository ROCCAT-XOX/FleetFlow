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

	// Neue Zuweisung setzen - BIDIREKTIONAL
	vehicleObjID, _ := primitive.ObjectIDFromHex(vehicleID)

	// Fahrzeug aktualisieren
	vehicle.CurrentDriverID = driver.ID
	vehicle.Status = model.VehicleStatusInUse
	if err := s.vehicleRepo.Update(vehicle); err != nil {
		return fmt.Errorf("fehler beim Zuweisen des Fahrzeugs: %v", err)
	}

	// Fahrer aktualisieren
	driver.AssignedVehicleID = vehicleObjID
	driver.Status = model.DriverStatusOnDuty
	if err := s.driverRepo.Update(driver); err != nil {
		// Rollback: Fahrzeug zurücksetzen
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

	// Debug: Alle Fahrzeugzuweisungen ausgeben
	fmt.Printf("=== SEARCHING FOR VEHICLES ASSIGNED TO DRIVER %s ===\n", driverID)

	for _, vehicle := range vehicles {
		if !vehicle.CurrentDriverID.IsZero() {
			fmt.Printf("Vehicle %s %s (%s) -> Driver %s\n",
				vehicle.Brand, vehicle.Model, vehicle.LicensePlate, vehicle.CurrentDriverID.Hex())
		}

		if vehicle.CurrentDriverID == driverObjID {
			fmt.Printf("FOUND: Vehicle %s %s assigned to driver %s\n",
				vehicle.Brand, vehicle.Model, driverID)
			return vehicle, nil
		}
	}

	fmt.Printf("NO vehicle found for driver %s\n", driverID)
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

// clearDriverCurrentAssignment entfernt die aktuelle Fahrzeugzuweisung eines Fahrers
func (s *AssignmentService) clearDriverCurrentAssignment(driver *model.Driver) error {
	fmt.Printf("=== CLEARING ALL ASSIGNMENTS FOR DRIVER %s ===\n", driver.ID.Hex())

	// ROBUSTE LÖSUNG: ALLE Fahrzeuge durchsuchen und freigeben
	vehicles, err := s.vehicleRepo.FindAll()
	if err != nil {
		return fmt.Errorf("fehler beim Laden der Fahrzeuge: %v", err)
	}

	// Alle Fahrzeuge durchgehen und prüfen, ob sie diesem Fahrer zugewiesen sind
	vehiclesFreed := 0
	for _, vehicle := range vehicles {
		if vehicle.CurrentDriverID == driver.ID {
			fmt.Printf("Freeing vehicle: %s %s (%s) from driver %s %s\n",
				vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
				driver.FirstName, driver.LastName)

			// Fahrzeug freigeben
			vehicle.CurrentDriverID = primitive.ObjectID{}
			vehicle.Status = model.VehicleStatusAvailable

			if err := s.vehicleRepo.Update(vehicle); err != nil {
				return fmt.Errorf("fehler beim Freigeben des Fahrzeugs %s %s: %v", vehicle.Brand, vehicle.Model, err)
			}
			vehiclesFreed++
		}
	}

	fmt.Printf("Freed %d vehicles from driver\n", vehiclesFreed)

	// Fahrer freigeben
	driver.AssignedVehicleID = primitive.ObjectID{}
	driver.Status = model.DriverStatusAvailable
	if err := s.driverRepo.Update(driver); err != nil {
		return fmt.Errorf("fehler beim Aktualisieren des Fahrers: %v", err)
	}

	fmt.Printf("Driver %s %s cleared successfully\n", driver.FirstName, driver.LastName)
	return nil
}

// DebugAllAssignments gibt alle aktuellen Zuweisungen aus
func (s *AssignmentService) DebugAllAssignments() {
	fmt.Printf("=== DEBUG ALL ASSIGNMENTS ===\n")

	vehicles, _ := s.vehicleRepo.FindAll()
	drivers, _ := s.driverRepo.FindAll()

	fmt.Printf("VEHICLES:\n")
	for _, v := range vehicles {
		fmt.Printf("  %s %s (%s) -> Driver: %s, Status: %s\n",
			v.Brand, v.Model, v.LicensePlate, v.CurrentDriverID.Hex(), v.Status)
	}

	fmt.Printf("DRIVERS:\n")
	for _, d := range drivers {
		fmt.Printf("  %s %s -> Vehicle: %s, Status: %s\n",
			d.FirstName, d.LastName, d.AssignedVehicleID.Hex(), d.Status)
	}

	fmt.Printf("=== END DEBUG ===\n")
}
