package service

import (
	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"fmt"
	"log"
)

// NotificationService verwaltet Benachrichtigungen
type NotificationService struct {
	userRepo        *repository.UserRepository
	emailService    *EmailService
	activityService *ActivityService
}

// NewNotificationService erstellt einen neuen NotificationService
func NewNotificationService() *NotificationService {
	return &NotificationService{
		userRepo:        repository.NewUserRepository(),
		emailService:    NewEmailService(),
		activityService: NewActivityService(),
	}
}

// NotifyUrgentReport sendet Benachrichtigungen für dringende Fahrzeugmeldungen
func (s *NotificationService) NotifyUrgentReport(report *model.VehicleReport, vehicle *model.Vehicle, driver *model.Driver) error {
	// Manager und Admins finden
	managers, err := s.getManagersAndAdmins()
	if err != nil {
		log.Printf("Fehler beim Laden der Manager: %v", err)
		return err
	}

	if len(managers) == 0 {
		log.Println("Keine Manager oder Admins gefunden für Benachrichtigung")
		return nil
	}

	// E-Mail-Inhalt erstellen
	subject := fmt.Sprintf("🚨 DRINGENDE Fahrzeugmeldung: %s", report.Title)
	body := s.createUrgentReportEmailBody(report, vehicle, driver)

	// E-Mails an alle Manager senden
	for _, manager := range managers {
		err := s.emailService.SendEmail(manager.Email, subject, "", body)
		if err != nil {
			log.Printf("Fehler beim Senden der E-Mail an %s: %v", manager.Email, err)
		} else {
			log.Printf("Dringende Fahrzeugmeldung E-Mail an %s gesendet", manager.Email)
		}
	}

	// Aktivität protokollieren
	s.activityService.LogActivity(
		"urgent_report_notification_sent",
		fmt.Sprintf("Dringende Meldung %s - Benachrichtigungen an %d Manager gesendet", report.ID.Hex(), len(managers)),
		driver.ID,
		&vehicle.ID,
	)

	return nil
}

// NotifyReservationApproval sendet Benachrichtigung über Genehmigung einer Reservierung
func (s *NotificationService) NotifyReservationApproval(reservation *model.VehicleReservation, vehicle *model.Vehicle, driver *model.Driver, approvedBy *model.User) error {
	subject := fmt.Sprintf("✅ Reservierung genehmigt: %s %s", vehicle.Brand, vehicle.Model)
	body := s.createReservationApprovalEmailBody(reservation, vehicle, driver, approvedBy)

	err := s.emailService.SendEmail(driver.Email, subject, "", body)
	if err != nil {
		log.Printf("Fehler beim Senden der Genehmigungs-E-Mail an %s: %v", driver.Email, err)
		return err
	}

	log.Printf("Genehmigungs-E-Mail an %s gesendet", driver.Email)
	return nil
}

// NotifyReservationRejection sendet Benachrichtigung über Ablehnung einer Reservierung
func (s *NotificationService) NotifyReservationRejection(reservation *model.VehicleReservation, vehicle *model.Vehicle, driver *model.Driver, rejectedBy *model.User) error {
	subject := fmt.Sprintf("❌ Reservierung abgelehnt: %s %s", vehicle.Brand, vehicle.Model)
	body := s.createReservationRejectionEmailBody(reservation, vehicle, driver, rejectedBy)

	err := s.emailService.SendEmail(driver.Email, subject, "", body)
	if err != nil {
		log.Printf("Fehler beim Senden der Ablehnungs-E-Mail an %s: %v", driver.Email, err)
		return err
	}

	log.Printf("Ablehnungs-E-Mail an %s gesendet", driver.Email)
	return nil
}

// NotifyNewReservationRequest sendet Benachrichtigung über neue Reservierungsanfrage an Manager
func (s *NotificationService) NotifyNewReservationRequest(reservation *model.VehicleReservation, vehicle *model.Vehicle, driver *model.Driver) error {
	// Manager und Admins finden
	managers, err := s.getManagersAndAdmins()
	if err != nil {
		log.Printf("Fehler beim Laden der Manager: %v", err)
		return err
	}

	if len(managers) == 0 {
		log.Println("Keine Manager oder Admins gefunden für Benachrichtigung")
		return nil
	}

	subject := fmt.Sprintf("📋 Neue Reservierungsanfrage: %s %s", vehicle.Brand, vehicle.Model)
	body := s.createNewReservationEmailBody(reservation, vehicle, driver)

	// E-Mails an alle Manager senden
	for _, manager := range managers {
		err := s.emailService.SendEmail(manager.Email, subject, "", body)
		if err != nil {
			log.Printf("Fehler beim Senden der E-Mail an %s: %v", manager.Email, err)
		} else {
			log.Printf("Neue Reservierungsanfrage E-Mail an %s gesendet", manager.Email)
		}
	}

	return nil
}

// getManagersAndAdmins findet alle Benutzer mit Manager- oder Admin-Rolle
func (s *NotificationService) getManagersAndAdmins() ([]*model.User, error) {
	allUsers, err := s.userRepo.FindAll()
	if err != nil {
		return nil, err
	}

	var managers []*model.User
	for _, user := range allUsers {
		if user.Role == model.RoleAdmin || user.Role == model.RoleManager {
			managers = append(managers, user)
		}
	}

	return managers, nil
}

// createUrgentReportEmailBody erstellt den E-Mail-Inhalt für dringende Meldungen
func (s *NotificationService) createUrgentReportEmailBody(report *model.VehicleReport, vehicle *model.Vehicle, driver *model.Driver) string {
	priorityText := "DRINGEND"
	if report.Priority == "urgent" {
		priorityText = "NOTFALL"
	}

	return fmt.Sprintf(`
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
	<div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
		<h1>🚨 %s: Fahrzeugmeldung</h1>
	</div>
	
	<div style="padding: 20px; background: #fee2e2; border-left: 4px solid #dc2626; margin: 20px 0;">
		<h2 style="color: #991b1b; margin-top: 0;">%s</h2>
		<p style="color: #dc2626; font-weight: bold;">%s</p>
	</div>
	
	<div style="padding: 20px;">
		<h3>Fahrzeug:</h3>
		<p><strong>%s %s</strong> (%s)</p>
		
		<h3>Gemeldet von:</h3>
		<p>%s %s (%s)</p>
		
		<h3>Typ des Problems:</h3>
		<p>%s</p>
		
		<h3>Standort:</h3>
		<p>%s</p>
		
		<h3>Beschreibung:</h3>
		<p>%s</p>
		
		<h3>Gemeldet am:</h3>
		<p>%s</p>
		
		<div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 20px;">
			<p style="margin: 0; font-weight: bold; color: #374151;">
				Diese Meldung erfordert sofortige Aufmerksamkeit. Bitte überprüfen Sie das Fahrzeug umgehend.
			</p>
		</div>
	</div>
</body>
</html>`,
		priorityText,
		report.Title,
		report.Description,
		vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
		driver.FirstName, driver.LastName, driver.Email,
		report.GetTypeDisplayName(),
		getLocationOrDefault(report.Location),
		report.Description,
		report.CreatedAt.Format("02.01.2006 15:04 Uhr"),
	)
}

// createReservationApprovalEmailBody erstellt den E-Mail-Inhalt für Genehmigungen
func (s *NotificationService) createReservationApprovalEmailBody(reservation *model.VehicleReservation, vehicle *model.Vehicle, driver *model.Driver, approvedBy *model.User) string {
	return fmt.Sprintf(`
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
	<div style="background: #059669; color: white; padding: 20px; text-align: center;">
		<h1>✅ Reservierung genehmigt</h1>
	</div>
	
	<div style="padding: 20px;">
		<p>Hallo %s %s,</p>
		
		<p>Ihre Reservierungsanfrage wurde genehmigt!</p>
		
		<div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 5px; margin: 20px 0;">
			<h3 style="color: #047857; margin-top: 0;">Reservierungsdetails:</h3>
			<p><strong>Fahrzeug:</strong> %s %s (%s)</p>
			<p><strong>Zeitraum:</strong> %s - %s</p>
			<p><strong>Zweck:</strong> %s</p>
			<p><strong>Genehmigt von:</strong> %s %s</p>
		</div>
		
		<p>Sie können das Fahrzeug zum vereinbarten Zeitpunkt nutzen.</p>
		
		<p>Bei Fragen wenden Sie sich bitte an Ihren Manager.</p>
		
		<p>Mit freundlichen Grüßen<br>
		Ihr FleetFlow Team</p>
	</div>
</body>
</html>`,
		driver.FirstName, driver.LastName,
		vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
		reservation.StartTime.Format("02.01.2006 15:04"),
		reservation.EndTime.Format("02.01.2006 15:04"),
		getPurposeOrDefault(reservation.Purpose),
		approvedBy.FirstName, approvedBy.LastName,
	)
}

// createReservationRejectionEmailBody erstellt den E-Mail-Inhalt für Ablehnungen
func (s *NotificationService) createReservationRejectionEmailBody(reservation *model.VehicleReservation, vehicle *model.Vehicle, driver *model.Driver, rejectedBy *model.User) string {
	return fmt.Sprintf(`
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
	<div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
		<h1>❌ Reservierung abgelehnt</h1>
	</div>
	
	<div style="padding: 20px;">
		<p>Hallo %s %s,</p>
		
		<p>Ihre Reservierungsanfrage wurde leider abgelehnt.</p>
		
		<div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0;">
			<h3 style="color: #991b1b; margin-top: 0;">Reservierungsdetails:</h3>
			<p><strong>Fahrzeug:</strong> %s %s (%s)</p>
			<p><strong>Zeitraum:</strong> %s - %s</p>
			<p><strong>Zweck:</strong> %s</p>
			<p><strong>Abgelehnt von:</strong> %s %s</p>
		</div>
		
		<div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 5px; margin: 20px 0;">
			<h4 style="color: #92400e; margin-top: 0;">Grund für die Ablehnung:</h4>
			<p style="color: #92400e;">%s</p>
		</div>
		
		<p>Bitte wenden Sie sich an Ihren Manager, wenn Sie Fragen zur Ablehnung haben oder eine alternative Lösung besprechen möchten.</p>
		
		<p>Mit freundlichen Grüßen<br>
		Ihr FleetFlow Team</p>
	</div>
</body>
</html>`,
		driver.FirstName, driver.LastName,
		vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
		reservation.StartTime.Format("02.01.2006 15:04"),
		reservation.EndTime.Format("02.01.2006 15:04"),
		getPurposeOrDefault(reservation.Purpose),
		rejectedBy.FirstName, rejectedBy.LastName,
		reservation.RejectionNote,
	)
}

// createNewReservationEmailBody erstellt den E-Mail-Inhalt für neue Reservierungsanfragen
func (s *NotificationService) createNewReservationEmailBody(reservation *model.VehicleReservation, vehicle *model.Vehicle, driver *model.Driver) string {
	return fmt.Sprintf(`
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
	<div style="background: #3B82F6; color: white; padding: 20px; text-align: center;">
		<h1>📋 Neue Reservierungsanfrage</h1>
	</div>
	
	<div style="padding: 20px;">
		<p>Eine neue Reservierungsanfrage wartet auf Ihre Genehmigung.</p>
		
		<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
			<h3 style="color: #1e40af; margin-top: 0;">Reservierungsdetails:</h3>
			<p><strong>Fahrzeug:</strong> %s %s (%s)</p>
			<p><strong>Angefragt von:</strong> %s %s (%s)</p>
			<p><strong>Zeitraum:</strong> %s - %s</p>
			<p><strong>Zweck:</strong> %s</p>
			<p><strong>Angefragt am:</strong> %s</p>
		</div>
		
		%s
		
		<div style="text-align: center; margin: 30px 0;">
			<a href="http://localhost:8080/manager/approvals" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
				Jetzt genehmigen
			</a>
		</div>
		
		<p>Bitte überprüfen Sie die Anfrage zeitnah.</p>
		
		<p>Mit freundlichen Grüßen<br>
		Ihr FleetFlow System</p>
	</div>
</body>
</html>`,
		vehicle.Brand, vehicle.Model, vehicle.LicensePlate,
		driver.FirstName, driver.LastName, driver.Email,
		reservation.StartTime.Format("02.01.2006 15:04"),
		reservation.EndTime.Format("02.01.2006 15:04"),
		getPurposeOrDefault(reservation.Purpose),
		reservation.CreatedAt.Format("02.01.2006 15:04 Uhr"),
		getNotesSection(reservation.Notes),
	)
}

// Helper functions
func getLocationOrDefault(location string) string {
	if location == "" {
		return "Nicht angegeben"
	}
	return location
}

func getPurposeOrDefault(purpose string) string {
	if purpose == "" {
		return "Nicht angegeben"
	}
	return purpose
}

func getNotesSection(notes string) string {
	if notes == "" {
		return ""
	}
	return fmt.Sprintf(`
		<div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 5px; margin: 20px 0;">
			<h4 style="color: #92400e; margin-top: 0;">Zusätzliche Hinweise:</h4>
			<p style="color: #92400e;">%s</p>
		</div>`, notes)
}