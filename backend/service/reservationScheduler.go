package service

import (
	"log"
	"time"
)

// ReservationScheduler verwaltet automatische Reservierungsoperationen
type ReservationScheduler struct {
	reservationService *ReservationService
	running            bool
	stopChan           chan bool
}

// NewReservationScheduler erstellt einen neuen ReservationScheduler
func NewReservationScheduler() *ReservationScheduler {
	return &ReservationScheduler{
		reservationService: NewReservationService(),
		running:            false,
		stopChan:           make(chan bool),
	}
}

// Start startet den Scheduler mit einem bestimmten Intervall (in Minuten)
func (s *ReservationScheduler) Start(intervalMinutes int) {
	if s.running {
		return
	}

	s.running = true

	// Initialer Lauf beim Start
	s.processReservations()

	// Goroutine für regelmäßige Ausführung
	go func() {
		ticker := time.NewTicker(time.Duration(intervalMinutes) * time.Minute)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				s.processReservations()
			case <-s.stopChan:
				return
			}
		}
	}()
}

// Stop stoppt den Scheduler
func (s *ReservationScheduler) Stop() {
	if !s.running {
		return
	}

	s.running = false
	s.stopChan <- true
}

// processReservations verarbeitet alle ausstehenden Reservierungen
func (s *ReservationScheduler) processReservations() {
	err := s.reservationService.ProcessScheduledReservations()
	if err != nil {
		log.Printf("⚠️  Reservation scheduler error: %v", err)
	}
}

// IsRunning gibt zurück, ob der Scheduler läuft
func (s *ReservationScheduler) IsRunning() bool {
	return s.running
}