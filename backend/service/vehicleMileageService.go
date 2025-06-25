package service

import (
	"fmt"
	"log"
	"time"

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

// GetLatestMileageForVehicle ermittelt den neuesten Kilometerstand aus allen Quellen für ein Fahrzeug basierend auf dem Datum
func (s *VehicleMileageService) GetLatestMileageForVehicle(vehicleID string) (*MileageSource, error) {

	var latestMileage *MileageSource

	// Hilfsfunktion zum Vergleichen und Aktualisieren basierend auf Datum
	updateIfNewer := func(value int, source, date, id string) {
		if value > 0 && date != "" {
			// Datum parsen für Vergleich
			entryDate, err := time.Parse("2006-01-02", date)
			if err != nil {
				return // Ungültiges Datum ignorieren
			}
			
			if latestMileage == nil {
				latestMileage = &MileageSource{
					Value:  value,
					Source: source,
					Date:   date,
					ID:     id,
				}
			} else {
				// Aktuelles Datum parsen
				currentDate, err := time.Parse("2006-01-02", latestMileage.Date)
				if err != nil {
					return
				}
				
				// Wenn das neue Datum neuer ist, aktualisieren
				if entryDate.After(currentDate) {
					latestMileage = &MileageSource{
						Value:  value,
						Source: source,
						Date:   date,
						ID:     id,
					}
				}
			}
		}
	}

	// 1. Wartungseinträge
	maintenanceEntries, err := s.maintenanceRepo.FindByVehicle(vehicleID)
	if err == nil {
		for _, maintenance := range maintenanceEntries {
			updateIfNewer(
				maintenance.Mileage,
				"maintenance",
				maintenance.Date.Format("2006-01-02"),
				maintenance.ID.Hex(),
			)
		}
	}

	// 2. Fahrzeugnutzungseinträge
	usageEntries, err := s.usageRepo.FindByVehicle(vehicleID)
	if err == nil {
		for _, usage := range usageEntries {
			// Start-Kilometerstand prüfen
			updateIfNewer(
				usage.StartMileage,
				"usage_start",
				usage.StartDate.Format("2006-01-02"),
				usage.ID.Hex(),
			)
			// End-Kilometerstand prüfen (falls vorhanden)
			if usage.EndMileage > 0 {
				updateIfNewer(
					usage.EndMileage,
					"usage_end",
					usage.EndDate.Format("2006-01-02"),
					usage.ID.Hex(),
				)
			}
		}
	}

	// 3. Tankkosten-Einträge
	fuelCostEntries, err := s.fuelCostRepo.FindByVehicle(vehicleID)
	if err == nil {
		for _, fuelCost := range fuelCostEntries {
			updateIfNewer(
				fuelCost.Mileage,
				"fuel_cost",
				fuelCost.Date.Format("2006-01-02"),
				fuelCost.ID.Hex(),
			)
		}
	}

	// 4. Aktueller Fahrzeug-Kilometerstand als Fallback (ohne Datum)
	vehicle, err := s.vehicleRepo.FindByID(vehicleID)
	if err == nil && vehicle.Mileage > 0 && latestMileage == nil {
		latestMileage = &MileageSource{
			Value:  vehicle.Mileage,
			Source: "vehicle",
			Date:   "",
			ID:     vehicle.ID.Hex(),
		}
	}

	if latestMileage == nil {
		return &MileageSource{Value: 0, Source: "none"}, nil
	}

	return latestMileage, nil
}

// UpdateVehicleMileageFromAllSources aktualisiert den Kilometerstand des Fahrzeugs basierend auf dem neuesten Wert aus allen Quellen
func (s *VehicleMileageService) UpdateVehicleMileageFromAllSources(vehicleID string) error {
	// Neuesten Kilometerstand ermitteln
	latestMileage, err := s.GetLatestMileageForVehicle(vehicleID)
	if err != nil {
		return fmt.Errorf("fehler beim Ermitteln des neuesten Kilometerstands: %v", err)
	}

	// Fahrzeug laden
	vehicle, err := s.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		return fmt.Errorf("fahrzeug nicht gefunden: %v", err)
	}

	// Kilometerstand aktualisieren, wenn ein neuerer Wert gefunden wurde
	if latestMileage.Value > 0 && latestMileage.Value != vehicle.Mileage {
		oldMileage := vehicle.Mileage
		vehicle.Mileage = latestMileage.Value

		err = s.vehicleRepo.Update(vehicle)
		if err != nil {
			return fmt.Errorf("fehler beim Aktualisieren des Fahrzeug-Kilometerstands: %v", err)
		}

		log.Printf("Kilometerstand für Fahrzeug %s aktualisiert: %d -> %d (Quelle: %s, Datum: %s)",
			vehicleID, oldMileage, latestMileage.Value, latestMileage.Source, latestMileage.Date)
	}

	return nil
}

// GetHighestMileageForVehicle ist eine Kompatibilitätsfunktion für die alte API - jetzt delegiert sie an GetLatestMileageForVehicle
func (s *VehicleMileageService) GetHighestMileageForVehicle(vehicleID string) (*MileageSource, error) {
	return s.GetLatestMileageForVehicle(vehicleID)
}

// UpdateAllVehicleMileages aktualisiert die Kilometerstände aller Fahrzeuge basierend auf den neuesten Werten aus allen Quellen
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