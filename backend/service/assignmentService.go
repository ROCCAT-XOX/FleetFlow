// backend/service/assignmentService.go
package service

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"fmt"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
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

// AssignVehicleToDriver weist einem Fahrer ein Fahrzeug zu oder entfernt die Zuweisung
func (s *AssignmentService) AssignVehicleToDriver(driverID, vehicleID string) error {
	fmt.Printf("=== ASSIGN VEHICLE TO DRIVER ===\n")
	fmt.Printf("DriverID: %s, VehicleID: '%s'\n", driverID, vehicleID)

	// Fahrer laden
	driver, err := s.driverRepo.FindByID(driverID)
	if err != nil {
		return fmt.Errorf("fahrer nicht gefunden: %v", err)
	}

	// Leere vehicleID = Zuweisung entfernen
	if vehicleID == "" {
		fmt.Printf("Removing vehicle assignment for driver %s %s\n", driver.FirstName, driver.LastName)
		return s.UnassignVehicleFromDriver(driverID)
	}

	// Fahrzeug laden
	vehicle, err := s.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		return fmt.Errorf("fahrzeug nicht gefunden: %v", err)
	}

	// Prüfen ob Fahrzeug bereits einem anderen Fahrer zugewiesen ist
	if !vehicle.CurrentDriverID.IsZero() && vehicle.CurrentDriverID.Hex() != driverID {
		currentDriver, _ := s.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
		if currentDriver != nil {
			return fmt.Errorf("fahrzeug %s %s (%s) ist bereits dem Fahrer %s %s zugewiesen",
				vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
				currentDriver.FirstName, currentDriver.LastName)
		}
	}

	// Wenn der Fahrer bereits dieses Fahrzeug hat, nichts tun
	if !driver.AssignedVehicleID.IsZero() && driver.AssignedVehicleID.Hex() == vehicleID {
		fmt.Printf("Driver already has this vehicle assigned\n")
		return nil
	}

	// Alte Zuweisungen komplett bereinigen für beide Seiten
	if err := s.cleanupAllAssignments(driver.ID.Hex(), vehicleID); err != nil {
		return fmt.Errorf("fehler beim Bereinigen alter Zuweisungen: %v", err)
	}

	// Neue bidirektionale Zuweisung setzen
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

	fmt.Printf("Successfully assigned vehicle %s %s to driver %s %s\n",
		vehicle.Brand, vehicle.Model, driver.FirstName, driver.LastName)
	return nil
}

// UnassignVehicleFromDriver entfernt die Fahrzeugzuweisung eines Fahrers komplett
func (s *AssignmentService) UnassignVehicleFromDriver(driverID string) error {
	fmt.Printf("=== UNASSIGN VEHICLE FROM DRIVER %s ===\n", driverID)

	driver, err := s.driverRepo.FindByID(driverID)
	if err != nil {
		return fmt.Errorf("fahrer nicht gefunden: %v", err)
	}

	// SCHRITT 1: Alle Fahrzeuge durchsuchen und freigeben, die diesem Fahrer zugewiesen sind
	vehicles, err := s.vehicleRepo.FindAll()
	if err != nil {
		return fmt.Errorf("fehler beim Laden der Fahrzeuge: %v", err)
	}

	vehiclesFreed := 0
	driverObjID := driver.ID

	for _, vehicle := range vehicles {
		if vehicle.CurrentDriverID == driverObjID {
			fmt.Printf("Freeing vehicle: %s %s (%s) from driver %s %s\n",
				vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
				driver.FirstName, driver.LastName)

			// Fahrzeug komplett freigeben - NULL ObjectID verwenden
			vehicle.CurrentDriverID = primitive.NilObjectID // Verwende NilObjectID statt leere ObjectID
			vehicle.Status = model.VehicleStatusAvailable

			if err := s.vehicleRepo.Update(vehicle); err != nil {
				fmt.Printf("ERROR freeing vehicle %s: %v\n", vehicle.LicensePlate, err)
				continue
			}
			vehiclesFreed++

			// Warten zwischen Updates
			time.Sleep(50 * time.Millisecond)
		}
	}

	// SCHRITT 2: Fahrer komplett zurücksetzen
	driver.AssignedVehicleID = primitive.NilObjectID // Verwende NilObjectID statt leere ObjectID
	driver.Status = model.DriverStatusAvailable
	if err := s.driverRepo.Update(driver); err != nil {
		return fmt.Errorf("fehler beim Zurücksetzen des Fahrers: %v", err)
	}

	fmt.Printf("Successfully unassigned %d vehicles from driver %s %s\n",
		vehiclesFreed, driver.FirstName, driver.LastName)

	// Final verification mit Delay
	time.Sleep(500 * time.Millisecond)

	// Verificaton: Laden und prüfen
	updatedDriver, err := s.driverRepo.FindByID(driverID)
	if err == nil {
		fmt.Printf("FINAL VERIFICATION - Driver %s: AssignedVehicleID=%s, IsZero=%v\n",
			driverID, updatedDriver.AssignedVehicleID.Hex(), updatedDriver.AssignedVehicleID.IsZero())
	}

	// Verify vehicles
	updatedVehicles, err := s.vehicleRepo.FindAll()
	if err == nil {
		for _, v := range updatedVehicles {
			if v.CurrentDriverID == driverObjID {
				fmt.Printf("WARNING: Vehicle %s %s still shows driver %s\n",
					v.Brand, v.Model, driverID)
			}
		}
	}

	return nil
}

// cleanupAllAssignments bereinigt alle bestehenden Zuweisungen vor einer neuen Zuweisung
func (s *AssignmentService) cleanupAllAssignments(driverID, newVehicleID string) error {
	fmt.Printf("=== CLEANUP ALL ASSIGNMENTS ===\n")
	fmt.Printf("DriverID: %s, NewVehicleID: %s\n", driverID, newVehicleID)

	// 1. Aktuellen Fahrer von allen Fahrzeugen entfernen
	if err := s.UnassignVehicleFromDriver(driverID); err != nil {
		return err
	}

	// 2. Neues Fahrzeug von allen Fahrern entfernen
	vehicle, err := s.vehicleRepo.FindByID(newVehicleID)
	if err != nil {
		return err
	}

	if !vehicle.CurrentDriverID.IsZero() {
		fmt.Printf("Vehicle %s %s is currently assigned to driver %s, freeing it\n",
			vehicle.Brand, vehicle.Model, vehicle.CurrentDriverID.Hex())

		// Den anderen Fahrer auch bereinigen
		if err := s.UnassignVehicleFromDriver(vehicle.CurrentDriverID.Hex()); err != nil {
			fmt.Printf("WARNING: Could not free driver %s: %v\n", vehicle.CurrentDriverID.Hex(), err)
		}
	}

	fmt.Printf("Cleanup completed\n")
	return nil
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

// DebugAllAssignments gibt alle aktuellen Zuweisungen aus
func (s *AssignmentService) DebugAllAssignments() {
	fmt.Printf("=== DEBUG ALL ASSIGNMENTS ===\n")

	vehicles, _ := s.vehicleRepo.FindAll()
	drivers, _ := s.driverRepo.FindAll()

	fmt.Printf("VEHICLES (%d total):\n", len(vehicles))
	for _, v := range vehicles {
		driverInfo := "None"
		if !v.CurrentDriverID.IsZero() {
			driverInfo = v.CurrentDriverID.Hex()
		}
		fmt.Printf("  %s %s (%s) -> Driver: %s, Status: %s\n",
			v.Brand, v.Model, v.LicensePlate, driverInfo, v.Status)
	}

	fmt.Printf("DRIVERS (%d total):\n", len(drivers))
	for _, d := range drivers {
		vehicleInfo := "None"
		if !d.AssignedVehicleID.IsZero() {
			vehicleInfo = d.AssignedVehicleID.Hex()
		}
		fmt.Printf("  %s %s -> Vehicle: %s, Status: %s\n",
			d.FirstName, d.LastName, vehicleInfo, d.Status)
	}

	fmt.Printf("=== END DEBUG ===\n")
}

// ValidateAllAssignments prüft die Konsistenz aller Zuweisungen
func (s *AssignmentService) ValidateAllAssignments() []string {
	var issues []string

	vehicles, _ := s.vehicleRepo.FindAll()
	drivers, _ := s.driverRepo.FindAll()

	// Fahrer -> Fahrzeug Konsistenz prüfen
	for _, driver := range drivers {
		if !driver.AssignedVehicleID.IsZero() {
			vehicle, err := s.vehicleRepo.FindByID(driver.AssignedVehicleID.Hex())
			if err != nil {
				issues = append(issues, fmt.Sprintf("Driver %s %s has non-existent vehicle %s",
					driver.FirstName, driver.LastName, driver.AssignedVehicleID.Hex()))
			} else if vehicle.CurrentDriverID != driver.ID {
				issues = append(issues, fmt.Sprintf("Driver %s %s -> Vehicle %s %s, but vehicle points to %s",
					driver.FirstName, driver.LastName, vehicle.Brand, vehicle.Model, vehicle.CurrentDriverID.Hex()))
			}
		}
	}

	// Fahrzeug -> Fahrer Konsistenz prüfen
	for _, vehicle := range vehicles {
		if !vehicle.CurrentDriverID.IsZero() {
			driver, err := s.driverRepo.FindByID(vehicle.CurrentDriverID.Hex())
			if err != nil {
				issues = append(issues, fmt.Sprintf("Vehicle %s %s has non-existent driver %s",
					vehicle.Brand, vehicle.Model, vehicle.CurrentDriverID.Hex()))
			} else if driver.AssignedVehicleID != vehicle.ID {
				issues = append(issues, fmt.Sprintf("Vehicle %s %s -> Driver %s %s, but driver points to %s",
					vehicle.Brand, vehicle.Model, driver.FirstName, driver.LastName, driver.AssignedVehicleID.Hex()))
			}
		}
	}

	return issues
}
