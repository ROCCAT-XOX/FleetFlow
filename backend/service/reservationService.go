package service

import (
	"fmt"
	"log"
	"time"

	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ReservationService struct {
	reservationRepo *repository.VehicleReservationRepository
	vehicleRepo     *repository.VehicleRepository
	driverRepo      *repository.DriverRepository
	activityService *ActivityService
}

func NewReservationService() *ReservationService {
	return &ReservationService{
		reservationRepo: repository.NewVehicleReservationRepository(),
		vehicleRepo:     repository.NewVehicleRepository(),
		driverRepo:      repository.NewDriverRepository(),
		activityService: NewActivityService(),
	}
}

// CreateReservation erstellt eine neue Fahrzeug-Reservierung
func (s *ReservationService) CreateReservation(vehicleID, driverID string, startTime, endTime time.Time, purpose, notes string, createdBy primitive.ObjectID) (*model.VehicleReservation, error) {
	// Input-Validierung
	if vehicleID == "" {
		return nil, fmt.Errorf("fahrzeug-id ist erforderlich")
	}
	if driverID == "" {
		return nil, fmt.Errorf("fahrer-id ist erforderlich")
	}

	// Zeit-Validierung
	if startTime.After(endTime) {
		return nil, fmt.Errorf("startzeit muss vor endzeit liegen")
	}

	if startTime.Before(time.Now()) {
		return nil, fmt.Errorf("startzeit kann nicht in der vergangenheit liegen")
	}

	// ObjectID-Validierung für Fahrzeug
	_, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, fmt.Errorf("ungültige fahrzeug-id format: %v", err)
	}

	// ObjectID-Validierung für Fahrer
	_, err = primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return nil, fmt.Errorf("ungültige fahrer-id format: %v", err)
	}

	// Fahrzeug validieren
	vehicle, err := s.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		return nil, fmt.Errorf("fahrzeug nicht gefunden: %v", err)
	}

	// Fahrer validieren
	driver, err := s.driverRepo.FindByID(driverID)
	if err != nil {
		return nil, fmt.Errorf("fahrer nicht gefunden: %v", err)
	}

	// Auf Konflikte prüfen
	hasConflict, err := s.reservationRepo.CheckConflict(vehicleID, startTime, endTime, nil)
	if err != nil {
		return nil, fmt.Errorf("fehler beim prüfen auf konflikte: %v", err)
	}

	if hasConflict {
		return nil, fmt.Errorf("das fahrzeug ist für den gewählten zeitraum bereits reserviert")
	}

	// ObjectIDs konvertieren
	vehicleObjectID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		return nil, fmt.Errorf("ungültige fahrzeug-id: %v", err)
	}

	driverObjectID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		return nil, fmt.Errorf("ungültige fahrer-id: %v", err)
	}

	// Reservierung erstellen
	reservation := &model.VehicleReservation{
		VehicleID: vehicleObjectID,
		DriverID:  driverObjectID,
		StartTime: startTime,
		EndTime:   endTime,
		Status:    model.ReservationStatusPending,
		Purpose:   purpose,
		Notes:     notes,
		CreatedBy: createdBy,
	}

	err = s.reservationRepo.Create(reservation)
	if err != nil {
		return nil, fmt.Errorf("fehler beim erstellen der reservierung: %v", err)
	}

	// Prüfen ob Reservierung sofort aktiviert werden sollte (nur wenn Startzeit bereits erreicht ist)
	now := time.Now()
	if now.After(startTime) || now.Equal(startTime) {
		// Reservierung sofort aktivieren - Startzeit ist bereits erreicht
		err = s.ActivateReservation(reservation.ID.Hex())
		if err != nil {
			// Log Warnung aber nicht als Fehler behandeln
			fmt.Printf("Warnung: Reservierung konnte nicht automatisch aktiviert werden: %v\n", err)
		} else {
			fmt.Printf("Reservierung %s wurde sofort aktiviert (Startzeit: %v, Jetzt: %v)\n", reservation.ID.Hex(), startTime, now)
		}
	}

	// Aktivität protokollieren
	s.activityService.LogActivity(
		"vehicle_reservation_created",
		fmt.Sprintf("Reservierung für Fahrzeug %s (%s) erstellt für Fahrer %s %s von %s bis %s",
			vehicle.LicensePlate, vehicle.Brand+" "+vehicle.Model,
			driver.FirstName, driver.LastName,
			startTime.Format("02.01.2006 15:04"),
			endTime.Format("02.01.2006 15:04")),
		createdBy,
		&vehicleObjectID,
	)

	return reservation, nil
}

// UpdateReservation aktualisiert eine bestehende Reservierung
func (s *ReservationService) UpdateReservation(reservationID string, startTime, endTime time.Time, purpose, notes string, updatedBy primitive.ObjectID) error {
	// Bestehende Reservierung laden
	reservation, err := s.reservationRepo.FindByID(reservationID)
	if err != nil {
		return fmt.Errorf("reservierung nicht gefunden: %v", err)
	}

	// Nur ausstehende oder aktive Reservierungen können bearbeitet werden
	if reservation.Status == model.ReservationStatusCompleted || reservation.Status == model.ReservationStatusCancelled {
		return fmt.Errorf("abgeschlossene oder stornierte reservierungen können nicht bearbeitet werden")
	}

	// Validierung
	if startTime.After(endTime) {
		return fmt.Errorf("startzeit muss vor endzeit liegen")
	}

	// Auf Konflikte prüfen (ausgenommen die aktuelle Reservierung)
	hasConflict, err := s.reservationRepo.CheckConflict(reservation.VehicleID.Hex(), startTime, endTime, &reservationID)
	if err != nil {
		return fmt.Errorf("fehler beim prüfen auf konflikte: %v", err)
	}

	if hasConflict {
		return fmt.Errorf("das fahrzeug ist für den gewählten zeitraum bereits reserviert")
	}

	// Reservierung aktualisieren
	reservation.StartTime = startTime
	reservation.EndTime = endTime
	reservation.Purpose = purpose
	reservation.Notes = notes

	err = s.reservationRepo.Update(reservation)
	if err != nil {
		return fmt.Errorf("fehler beim aktualisieren der reservierung: %v", err)
	}

	// Aktivität protokollieren
	s.activityService.LogActivity(
		"vehicle_reservation_updated",
		fmt.Sprintf("Reservierung %s aktualisiert", reservationID),
		updatedBy,
		&reservation.VehicleID,
	)

	return nil
}

// CancelReservation storniert eine Reservierung
func (s *ReservationService) CancelReservation(reservationID string, cancelledBy primitive.ObjectID) error {
	reservation, err := s.reservationRepo.FindByID(reservationID)
	if err != nil {
		return fmt.Errorf("reservierung nicht gefunden: %v", err)
	}

	if reservation.Status == model.ReservationStatusCompleted || reservation.Status == model.ReservationStatusCancelled {
		return fmt.Errorf("reservierung kann nicht storniert werden")
	}

	reservation.Status = model.ReservationStatusCancelled
	err = s.reservationRepo.Update(reservation)
	if err != nil {
		return fmt.Errorf("fehler beim stornieren der reservierung: %v", err)
	}

	// Status zurücksetzen falls Reservierung aktiv war
	oldStatus := reservation.Status
	if oldStatus == model.ReservationStatusActive {
		// Fahrzeugstatus zurücksetzen
		vehicle, err := s.vehicleRepo.FindByID(reservation.VehicleID.Hex())
		if err == nil && vehicle.Status == model.VehicleStatusReserved {
			vehicle.Status = model.VehicleStatusAvailable
			s.vehicleRepo.Update(vehicle)
		}

		// Fahrerstatus zurücksetzen
		driver, err := s.driverRepo.FindByID(reservation.DriverID.Hex())
		if err == nil && driver.Status == model.DriverStatusReserved {
			driver.Status = model.DriverStatusAvailable
			s.driverRepo.Update(driver)
		}
	}

	// Aktivität protokollieren
	s.activityService.LogActivity(
		"vehicle_reservation_cancelled",
		fmt.Sprintf("Reservierung %s storniert", reservationID),
		cancelledBy,
		&reservation.VehicleID,
	)

	return nil
}

// ActivateReservation aktiviert eine ausstehende Reservierung
func (s *ReservationService) ActivateReservation(reservationID string) error {
	reservation, err := s.reservationRepo.FindByID(reservationID)
	if err != nil {
		return fmt.Errorf("reservierung nicht gefunden: %v", err)
	}

	if reservation.Status != model.ReservationStatusPending {
		return fmt.Errorf("nur ausstehende reservierungen können aktiviert werden")
	}

	// Entferne Zeit-Check - Scheduler kann Reservierungen zum passenden Zeitpunkt aktivieren

	reservation.Status = model.ReservationStatusActive
	err = s.reservationRepo.Update(reservation)
	if err != nil {
		return fmt.Errorf("fehler beim aktivieren der reservierung: %v", err)
	}

	// Fahrzeugstatus auf reserviert setzen
	vehicle, err := s.vehicleRepo.FindByID(reservation.VehicleID.Hex())
	if err == nil {
		vehicle.Status = model.VehicleStatusReserved
		s.vehicleRepo.Update(vehicle)
	}

	// Fahrerstatus auf reserviert setzen
	driver, err := s.driverRepo.FindByID(reservation.DriverID.Hex())
	if err == nil {
		driver.Status = model.DriverStatusReserved
		s.driverRepo.Update(driver)
	}

	return nil
}

// CompleteReservation schließt eine aktive Reservierung ab
func (s *ReservationService) CompleteReservation(reservationID string, completedBy primitive.ObjectID) error {
	reservation, err := s.reservationRepo.FindByID(reservationID)
	if err != nil {
		return fmt.Errorf("reservierung nicht gefunden: %v", err)
	}

	if reservation.Status != model.ReservationStatusActive {
		return fmt.Errorf("nur aktive reservierungen können abgeschlossen werden")
	}

	reservation.Status = model.ReservationStatusCompleted
	err = s.reservationRepo.Update(reservation)
	if err != nil {
		return fmt.Errorf("fehler beim abschließen der reservierung: %v", err)
	}

	// Fahrzeugstatus zurücksetzen
	vehicle, err := s.vehicleRepo.FindByID(reservation.VehicleID.Hex())
	if err == nil {
		vehicle.Status = model.VehicleStatusAvailable
		s.vehicleRepo.Update(vehicle)
	}

	// Fahrerstatus zurücksetzen
	driver, err := s.driverRepo.FindByID(reservation.DriverID.Hex())
	if err == nil {
		driver.Status = model.DriverStatusAvailable
		s.driverRepo.Update(driver)
	}

	// Aktivität protokollieren
	s.activityService.LogActivity(
		"vehicle_reservation_completed",
		fmt.Sprintf("Reservierung %s abgeschlossen", reservationID),
		completedBy,
		&reservation.VehicleID,
	)

	return nil
}

// GetReservationsByVehicle holt alle Reservierungen für ein Fahrzeug
func (s *ReservationService) GetReservationsByVehicle(vehicleID string) ([]model.VehicleReservation, error) {
	return s.reservationRepo.FindByVehicleID(vehicleID)
}

// GetReservationsByDriver holt alle Reservierungen für einen Fahrer
func (s *ReservationService) GetReservationsByDriver(driverID string) ([]model.VehicleReservation, error) {
	return s.reservationRepo.FindByDriverID(driverID)
}

// GetAllReservations holt alle Reservierungen
func (s *ReservationService) GetAllReservations() ([]model.VehicleReservation, error) {
	return s.reservationRepo.FindAll()
}

// GetActiveReservations holt alle Reservierungen außer abgeschlossenen
func (s *ReservationService) GetActiveReservations() ([]model.VehicleReservation, error) {
	allReservations, err := s.reservationRepo.FindAll()
	if err != nil {
		return nil, err
	}

	var activeReservations []model.VehicleReservation
	for _, reservation := range allReservations {
		if reservation.Status != model.ReservationStatusCompleted {
			activeReservations = append(activeReservations, reservation)
		}
	}

	return activeReservations, nil
}

// ProcessScheduledReservations verarbeitet geplante Reservierungen (für Cron-Jobs)
func (s *ReservationService) ProcessScheduledReservations() error {
	now := time.Now()

	// Ausstehende Reservierungen aktivieren
	reservations, err := s.reservationRepo.FindAll()
	if err != nil {
		return err
	}

	for _, reservation := range reservations {
		// Ausstehende Reservierungen aktivieren (wenn Startzeit erreicht ist)
		if reservation.Status == model.ReservationStatusPending && now.After(reservation.StartTime) {
			log.Printf("Aktiviere Reservierung %s (Start: %v, Jetzt: %v)", reservation.ID.Hex(), reservation.StartTime, now)
			err := s.ActivateReservation(reservation.ID.Hex())
			if err != nil {
				log.Printf("Fehler beim Aktivieren der Reservierung %s: %v", reservation.ID.Hex(), err)
			}
		}

		// Abgelaufene aktive Reservierungen automatisch abschließen
		if reservation.Status == model.ReservationStatusActive && now.After(reservation.EndTime) {
			log.Printf("Schließe abgelaufene Reservierung %s ab (Ende: %v, Jetzt: %v)", reservation.ID.Hex(), reservation.EndTime, now)
			// Systembenutzer ID verwenden (könnte konfigurierbar sein)
			systemUserID := primitive.NewObjectID() // TODO: Konfigurierbare System-User-ID
			err := s.CompleteReservation(reservation.ID.Hex(), systemUserID)
			if err != nil {
				log.Printf("Fehler beim Abschließen der Reservierung %s: %v", reservation.ID.Hex(), err)
			}
		}
	}

	return nil
}