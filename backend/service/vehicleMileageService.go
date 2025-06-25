package service

import (
	"fmt"
	"log"

	"FleetDrive/backend/repository"
)

// VehicleMileageService verwaltet die Kilometerstand-Logik für Fahrzeuge
type VehicleMileageService struct {
	vehicleRepo     *repository.VehicleRepository
	maintenanceRepo *repository.MaintenanceRepository
	usageRepo       *repository.VehicleUsageRepository
	fuelCostRepo    *repository.FuelCostRepository
}

// NewVehicleMileageService erstellt einen neuen VehicleMileageService
func NewVehicleMileageService() *VehicleMileageService {
	return &VehicleMileageService{
		vehicleRepo:     repository.NewVehicleRepository(),
		maintenanceRepo: repository.NewMaintenanceRepository(),
		usageRepo:       repository.NewVehicleUsageRepository(),
		fuelCostRepo:    repository.NewFuelCostRepository(),
	}
}

// MileageSource repräsentiert die Quelle eines Kilometerstands
type MileageSource struct {
	Value  int    `json:"value"`
	Source string `json:"source"`
	Date   string `json:"date,omitempty"`
	ID     string `json:"id,omitempty"`
}

// GetHighestMileageForVehicle ermittelt den höchsten Kilometerstand aus allen Quellen für ein Fahrzeug
func (s *VehicleMileageService) GetHighestMileageForVehicle(vehicleID string) (*MileageSource, error) {

	var highestMileage *MileageSource

	// Hilfsfunktion zum Vergleichen und Aktualisieren
	updateIfHigher := func(value int, source, date, id string) {
		if value > 0 && (highestMileage == nil || value > highestMileage.Value) {
			highestMileage = &MileageSource{
				Value:  value,
				Source: source,
				Date:   date,
				ID:     id,
			}
		}
	}

	// 1. Aktueller Fahrzeug-Kilometerstand
	vehicle, err := s.vehicleRepo.FindByID(vehicleID)
	if err == nil && vehicle.Mileage > 0 {
		updateIfHigher(vehicle.Mileage, "vehicle", "", vehicle.ID.Hex())
	}

	// 2. Wartungseinträge
	maintenanceEntries, err := s.maintenanceRepo.FindByVehicle(vehicleID)
	if err == nil {
		for _, maintenance := range maintenanceEntries {
			updateIfHigher(
				maintenance.Mileage,
				"maintenance",
				maintenance.Date.Format("2006-01-02"),
				maintenance.ID.Hex(),
			)
		}
	}

	// 3. Fahrzeugnutzungseinträge
	usageEntries, err := s.usageRepo.FindByVehicle(vehicleID)
	if err == nil {
		for _, usage := range usageEntries {
			// Start-Kilometerstand prüfen
			updateIfHigher(
				usage.StartMileage,
				"usage_start",
				usage.StartDate.Format("2006-01-02"),
				usage.ID.Hex(),
			)
			// End-Kilometerstand prüfen (falls vorhanden)
			if usage.EndMileage > 0 {
				updateIfHigher(
					usage.EndMileage,
					"usage_end",
					usage.EndDate.Format("2006-01-02"),
					usage.ID.Hex(),
				)
			}
		}
	}

	// 4. Tankkosten-Einträge
	fuelCostEntries, err := s.fuelCostRepo.FindByVehicle(vehicleID)
	if err == nil {
		for _, fuelCost := range fuelCostEntries {
			updateIfHigher(
				fuelCost.Mileage,
				"fuel_cost",
				fuelCost.Date.Format("2006-01-02"),
				fuelCost.ID.Hex(),
			)
		}
	}

	if highestMileage == nil {
		return &MileageSource{Value: 0, Source: "none"}, nil
	}

	return highestMileage, nil
}

// UpdateVehicleMileageFromAllSources aktualisiert den Kilometerstand des Fahrzeugs basierend auf dem höchsten Wert aus allen Quellen
func (s *VehicleMileageService) UpdateVehicleMileageFromAllSources(vehicleID string) error {
	// Höchsten Kilometerstand ermitteln
	highestMileage, err := s.GetHighestMileageForVehicle(vehicleID)
	if err != nil {
		return fmt.Errorf("fehler beim Ermitteln des höchsten Kilometerstands: %v", err)
	}

	// Fahrzeug laden
	vehicle, err := s.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		return fmt.Errorf("fahrzeug nicht gefunden: %v", err)
	}

	// Kilometerstand nur aktualisieren, wenn ein höherer Wert gefunden wurde
	if highestMileage.Value > vehicle.Mileage {
		oldMileage := vehicle.Mileage
		vehicle.Mileage = highestMileage.Value

		err = s.vehicleRepo.Update(vehicle)
		if err != nil {
			return fmt.Errorf("fehler beim Aktualisieren des Fahrzeug-Kilometerstands: %v", err)
		}

		log.Printf("Kilometerstand für Fahrzeug %s aktualisiert: %d -> %d (Quelle: %s)",
			vehicleID, oldMileage, highestMileage.Value, highestMileage.Source)
	}

	return nil
}

// UpdateAllVehicleMileages aktualisiert die Kilometerstände aller Fahrzeuge basierend auf den höchsten Werten aus allen Quellen
func (s *VehicleMileageService) UpdateAllVehicleMileages() error {
	vehicles, err := s.vehicleRepo.FindAll()
	if err != nil {
		return fmt.Errorf("fehler beim Laden der Fahrzeuge: %v", err)
	}

	var errors []string
	updatedCount := 0

	for _, vehicle := range vehicles {
		err := s.UpdateVehicleMileageFromAllSources(vehicle.ID.Hex())
		if err != nil {
			errors = append(errors, fmt.Sprintf("Fahrzeug %s: %v", vehicle.ID.Hex(), err))
		} else {
			updatedCount++
		}
	}

	log.Printf("Kilometerstand-Update abgeschlossen: %d Fahrzeuge überprüft", len(vehicles))

	if len(errors) > 0 {
		return fmt.Errorf("fehler bei %d Fahrzeugen: %v", len(errors), errors)
	}

	return nil
}

// GetMileageAnalysisForVehicle gibt eine detaillierte Analyse aller Kilometerstände für ein Fahrzeug zurück
func (s *VehicleMileageService) GetMileageAnalysisForVehicle(vehicleID string) ([]MileageSource, error) {
	var allMileages []MileageSource

	// 1. Aktueller Fahrzeug-Kilometerstand
	vehicle, err := s.vehicleRepo.FindByID(vehicleID)
	if err == nil && vehicle.Mileage > 0 {
		allMileages = append(allMileages, MileageSource{
			Value:  vehicle.Mileage,
			Source: "vehicle",
			Date:   "",
			ID:     vehicle.ID.Hex(),
		})
	}

	// 2. Wartungseinträge
	maintenanceEntries, err := s.maintenanceRepo.FindByVehicle(vehicleID)
	if err == nil {
		for _, maintenance := range maintenanceEntries {
			if maintenance.Mileage > 0 {
				allMileages = append(allMileages, MileageSource{
					Value:  maintenance.Mileage,
					Source: "maintenance",
					Date:   maintenance.Date.Format("2006-01-02"),
					ID:     maintenance.ID.Hex(),
				})
			}
		}
	}

	// 3. Fahrzeugnutzungseinträge
	usageEntries, err := s.usageRepo.FindByVehicle(vehicleID)
	if err == nil {
		for _, usage := range usageEntries {
			if usage.StartMileage > 0 {
				allMileages = append(allMileages, MileageSource{
					Value:  usage.StartMileage,
					Source: "usage_start",
					Date:   usage.StartDate.Format("2006-01-02"),
					ID:     usage.ID.Hex(),
				})
			}
			if usage.EndMileage > 0 {
				allMileages = append(allMileages, MileageSource{
					Value:  usage.EndMileage,
					Source: "usage_end",
					Date:   usage.EndDate.Format("2006-01-02"),
					ID:     usage.ID.Hex(),
				})
			}
		}
	}

	// 4. Tankkosten-Einträge
	fuelCostEntries, err := s.fuelCostRepo.FindByVehicle(vehicleID)
	if err == nil {
		for _, fuelCost := range fuelCostEntries {
			if fuelCost.Mileage > 0 {
				allMileages = append(allMileages, MileageSource{
					Value:  fuelCost.Mileage,
					Source: "fuel_cost",
					Date:   fuelCost.Date.Format("2006-01-02"),
					ID:     fuelCost.ID.Hex(),
				})
			}
		}
	}

	return allMileages, nil
}