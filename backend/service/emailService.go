package service

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"bytes"
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
	"text/template"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// EmailService verwaltet E-Mail-Funktionen
type EmailService struct {
	smtpRepo *repository.SMTPRepository
}

// NewEmailService erstellt einen neuen EmailService
func NewEmailService() *EmailService {
	return &EmailService{
		smtpRepo: repository.NewSMTPRepository(),
	}
}

// SendEmail sendet eine E-Mail
func (s *EmailService) SendEmail(to, subject, body, bodyHTML string) error {
	config, err := s.smtpRepo.GetSMTPConfig()
	if err != nil {
		return fmt.Errorf("fehler beim Abrufen der SMTP-Konfiguration: %v", err)
	}

	if config == nil || !config.IsActive {
		return fmt.Errorf("keine aktive SMTP-Konfiguration gefunden")
	}

	// E-Mail-Log erstellen
	emailLog := &model.EmailLog{
		To:      to,
		Subject: subject,
		Body:    body,
		Status:  model.EmailStatusPending,
	}

	// Versuche E-Mail zu senden
	err = s.sendSMTPEmail(config, to, subject, body, bodyHTML)
	if err != nil {
		emailLog.Status = model.EmailStatusFailed
		emailLog.Error = err.Error()
	} else {
		emailLog.Status = model.EmailStatusSent
		now := time.Now()
		emailLog.SentAt = &now
	}

	// Log speichern
	s.smtpRepo.LogEmail(emailLog)

	return err
}

// SendTemplateEmail sendet eine E-Mail basierend auf einer Vorlage
func (s *EmailService) SendTemplateEmail(to string, templateType model.EmailTemplateType, data interface{}) error {
	emailTemplate, err := s.smtpRepo.GetEmailTemplate(templateType)
	if err != nil {
		return fmt.Errorf("fehler beim Abrufen der E-Mail-Vorlage: %v", err)
	}

	if emailTemplate == nil {
		return fmt.Errorf("E-Mail-Vorlage '%s' nicht gefunden", templateType)
	}

	// Template-Engine für Subject
	subjectTmpl, err := template.New("subject").Parse(emailTemplate.Subject)
	if err != nil {
		return fmt.Errorf("fehler beim Parsen des Subject-Templates: %v", err)
	}

	var subjectBuf bytes.Buffer
	if err := subjectTmpl.Execute(&subjectBuf, data); err != nil {
		return fmt.Errorf("fehler beim Ausführen des Subject-Templates: %v", err)
	}

	// Template-Engine für Body (Text)
	bodyTmpl, err := template.New("body").Parse(emailTemplate.Body)
	if err != nil {
		return fmt.Errorf("fehler beim Parsen des Body-Templates: %v", err)
	}

	var bodyBuf bytes.Buffer
	if err := bodyTmpl.Execute(&bodyBuf, data); err != nil {
		return fmt.Errorf("fehler beim Ausführen des Body-Templates: %v", err)
	}

	// Template-Engine für Body (HTML)
	var bodyHTMLBuf bytes.Buffer
	if emailTemplate.BodyHTML != "" {
		bodyHTMLTmpl, err := template.New("bodyHTML").Parse(emailTemplate.BodyHTML)
		if err != nil {
			return fmt.Errorf("fehler beim Parsen des BodyHTML-Templates: %v", err)
		}

		if err := bodyHTMLTmpl.Execute(&bodyHTMLBuf, data); err != nil {
			return fmt.Errorf("fehler beim Ausführen des BodyHTML-Templates: %v", err)
		}
	}

	return s.SendEmail(to, subjectBuf.String(), bodyBuf.String(), bodyHTMLBuf.String())
}

// sendSMTPEmail sendet eine E-Mail über SMTP
func (s *EmailService) sendSMTPEmail(config *model.SMTPConfig, to, subject, body, bodyHTML string) error {
	// Server-Adresse
	serverAddr := fmt.Sprintf("%s:%d", config.Host, config.Port)

	// Auth
	var auth smtp.Auth
	if config.Username != "" && config.Password != "" {
		auth = smtp.PlainAuth("", config.Username, config.Password, config.Host)
	}

	// E-Mail-Headers
	from := config.FromEmail
	if config.FromName != "" {
		from = fmt.Sprintf("%s <%s>", config.FromName, config.FromEmail)
	}

	headers := make(map[string]string)
	headers["From"] = from
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"

	// Content-Type bestimmen
	if bodyHTML != "" {
		headers["Content-Type"] = "multipart/alternative; boundary=\"boundary\""
	} else {
		headers["Content-Type"] = "text/plain; charset=UTF-8"
	}

	// E-Mail-Body zusammenstellen
	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n"

	if bodyHTML != "" {
		// Multipart-Message für Text und HTML
		message += "--boundary\r\n"
		message += "Content-Type: text/plain; charset=UTF-8\r\n\r\n"
		message += body + "\r\n\r\n"
		message += "--boundary\r\n"
		message += "Content-Type: text/html; charset=UTF-8\r\n\r\n"
		message += bodyHTML + "\r\n\r\n"
		message += "--boundary--\r\n"
	} else {
		message += body
	}

	// E-Mail senden
	if config.UseSSL {
		return s.sendSSLEmail(serverAddr, auth, config.FromEmail, []string{to}, []byte(message))
	} else {
		return smtp.SendMail(serverAddr, auth, config.FromEmail, []string{to}, []byte(message))
	}
}

// sendSSLEmail sendet E-Mail über SSL/TLS
func (s *EmailService) sendSSLEmail(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	// TLS-Konfiguration
	tlsConfig := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         strings.Split(addr, ":")[0],
	}

	// Verbindung aufbauen
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return err
	}
	defer conn.Close()

	// SMTP-Client erstellen
	client, err := smtp.NewClient(conn, strings.Split(addr, ":")[0])
	if err != nil {
		return err
	}
	defer client.Quit()

	// Authentifizierung
	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return err
		}
	}

	// Absender setzen
	if err := client.Mail(from); err != nil {
		return err
	}

	// Empfänger setzen
	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return err
		}
	}

	// Nachricht senden
	writer, err := client.Data()
	if err != nil {
		return err
	}
	defer writer.Close()

	_, err = writer.Write(msg)
	return err
}

// TestSMTPConfig testet eine SMTP-Konfiguration
func (s *EmailService) TestSMTPConfig(config *model.SMTPConfig, testEmail string) error {
	if testEmail == "" {
		return fmt.Errorf("test-E-Mail-Adresse ist erforderlich")
	}

	// Test-E-Mail senden
	subject := "FleetFlow SMTP Test"
	body := "Dies ist eine Test-E-Mail von FleetFlow.\n\nWenn Sie diese E-Mail erhalten, ist die SMTP-Konfiguration korrekt."
	bodyHTML := "<h2>FleetFlow SMTP Test</h2><p>Dies ist eine Test-E-Mail von FleetFlow.</p><p>Wenn Sie diese E-Mail erhalten, ist die SMTP-Konfiguration korrekt.</p>"

	return s.sendSMTPEmail(config, testEmail, subject, body, bodyHTML)
}

// GetSMTPConfig holt die aktuelle SMTP-Konfiguration
func (s *EmailService) GetSMTPConfig() (*model.SMTPConfig, error) {
	return s.smtpRepo.GetSMTPConfig()
}

// SaveSMTPConfig speichert die SMTP-Konfiguration
func (s *EmailService) SaveSMTPConfig(config *model.SMTPConfig) error {
	return s.smtpRepo.SaveSMTPConfig(config)
}

// GetEmailTemplates holt alle E-Mail-Vorlagen
func (s *EmailService) GetEmailTemplates() ([]*model.EmailTemplate, error) {
	return s.smtpRepo.GetAllEmailTemplates()
}

// SaveEmailTemplate speichert eine E-Mail-Vorlage
func (s *EmailService) SaveEmailTemplate(template *model.EmailTemplate) error {
	return s.smtpRepo.SaveEmailTemplate(template)
}

// GetEmailLogs holt E-Mail-Logs
func (s *EmailService) GetEmailLogs(limit, offset int) ([]*model.EmailLog, error) {
	return s.smtpRepo.GetEmailLogs(limit, offset)
}

// GetNotificationSettings holt Benachrichtigungseinstellungen
func (s *EmailService) GetNotificationSettings(userID string) (*model.NotificationSettings, error) {
	objectID, err := s.parseObjectID(userID)
	if err != nil {
		return nil, err
	}
	return s.smtpRepo.GetNotificationSettings(objectID)
}

// SaveNotificationSettings speichert Benachrichtigungseinstellungen
func (s *EmailService) SaveNotificationSettings(settings *model.NotificationSettings) error {
	return s.smtpRepo.SaveNotificationSettings(settings)
}

// SendUserCreatedEmail sendet eine E-Mail für einen neuen Benutzer
func (s *EmailService) SendUserCreatedEmail(user *model.User, tempPassword string) error {
	data := map[string]interface{}{
		"FirstName": user.FirstName,
		"LastName":  user.LastName,
		"Email":     user.Email,
		"Password":  tempPassword,
	}

	return s.SendTemplateEmail(user.Email, model.EmailTemplateUserCreated, data)
}

// InitializeDefaultTemplates erstellt Standard-E-Mail-Vorlagen
func (s *EmailService) InitializeDefaultTemplates() error {
	return s.smtpRepo.CreateDefaultEmailTemplates()
}

// parseObjectID konvertiert einen String zu einer MongoDB ObjectID
func (s *EmailService) parseObjectID(id string) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(id)
}