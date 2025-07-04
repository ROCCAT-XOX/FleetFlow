// backend/service/peopleflowService.go
package service

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
)

// PeopleFlowService verwaltet die Integration mit PeopleFlow
type PeopleFlowService struct {
	Repo       *repository.PeopleFlowRepository // Exportiert (großer Anfangsbuchstabe)
	driverRepo *repository.DriverRepository
	httpClient *http.Client
	encryptKey []byte
}

// PeopleFlowAPIEmployee repräsentiert einen Mitarbeiter aus der PeopleFlow API
type PeopleFlowAPIEmployee struct {
	ID             string `json:"id"`
	FirstName      string `json:"firstName"`
	LastName       string `json:"lastName"`
	Email          string `json:"email"`
	Phone          string `json:"phone"`
	Department     string `json:"department"`
	Position       string `json:"position"`
	EmployeeNumber string `json:"employeeNumber"`
	HireDate       string `json:"hireDate"`
	Status         string `json:"status"`
	Manager        string `json:"manager"`
	Location       string `json:"location"`
	CostCenter     string `json:"costCenter"`
}

// PeopleFlowAPIResponse repräsentiert die API-Antwort von PeopleFlow
type PeopleFlowAPIResponse struct {
	Success    bool                    `json:"success"`
	Data       []PeopleFlowAPIEmployee `json:"data"`
	Message    string                  `json:"message"`
	Total      int                     `json:"total"`
	Page       int                     `json:"page"`
	PerPage    int                     `json:"per_page"`
	TotalPages int                     `json:"total_pages"`
}

// NewPeopleFlowService erstellt einen neuen PeopleFlowService
func NewPeopleFlowService() *PeopleFlowService {
	// HTTP Client mit Timeout und TLS-Konfiguration
	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: false,
			},
		},
	}

	// Encryption Key für Passwort-Verschlüsselung
	// SHA256 Hash erstellt automatisch 32 Bytes
	keyString := "fleetflow-peopleflow-encryption-key"
	hash := sha256.Sum256([]byte(keyString))
	encryptKey := hash[:]

	return &PeopleFlowService{
		Repo:       repository.NewPeopleFlowRepository(),
		driverRepo: repository.NewDriverRepository(),
		httpClient: client,
		encryptKey: encryptKey,
	}
}

// === Integration Management ===

// SaveIntegrationConfig speichert die PeopleFlow-Integration-Konfiguration
func (s *PeopleFlowService) SaveIntegrationConfig(baseURL, username, password string, autoSync bool, syncInterval int) error {
	// WICHTIG: Erst die Verbindung testen, bevor wir speichern
	// Test-API-Aufruf mit den neuen Credentials
	url := fmt.Sprintf("%s/api/employees?limit=1", strings.TrimSuffix(baseURL, "/"))
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.SetBasicAuth(username, password)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("connection failed - please check URL and network: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return errors.New("authentication failed - please check username and password")
	}

	if resp.StatusCode == 404 {
		return errors.New("API endpoint not found - please check the URL and API path")
	}

	if resp.StatusCode >= 500 {
		return fmt.Errorf("server error (%d) - please try again later", resp.StatusCode)
	}

	if resp.StatusCode != 200 {
		return fmt.Errorf("unexpected response code: %d", resp.StatusCode)
	}

	// Versuche die Antwort zu parsen
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %v", err)
	}

	var apiResponse PeopleFlowAPIResponse
	err = json.Unmarshal(body, &apiResponse)
	if err != nil {
		return fmt.Errorf("invalid API response format - this does not appear to be a compatible PeopleFlow API: %v", err)
	}

	if !apiResponse.Success {
		return fmt.Errorf("API returned error: %s", apiResponse.Message)
	}

	// Nur bei erfolgreichem Test speichern
	// Passwort verschlüsseln
	encryptedPassword, err := s.encryptPassword(password)
	if err != nil {
		return fmt.Errorf("failed to encrypt password: %v", err)
	}

	// Bestehende Integration laden oder neue erstellen
	integration, err := s.Repo.GetIntegration()
	if err != nil {
		return err
	}

	if integration == nil {
		integration = &model.PeopleFlowIntegration{}
	}

	// Konfiguration aktualisieren
	integration.BaseURL = strings.TrimSuffix(baseURL, "/")
	integration.Username = username
	integration.Password = encryptedPassword
	integration.AutoSync = autoSync
	integration.SyncInterval = syncInterval
	integration.IsActive = true
	integration.FailedAttempts = 0

	return s.Repo.SaveIntegration(integration)
}

// TestConnection testet die Verbindung zu PeopleFlow
func (s *PeopleFlowService) TestConnection() error {
	integration, err := s.Repo.GetIntegration()
	if err != nil || integration == nil {
		return errors.New("keine PeopleFlow-Integration konfiguriert")
	}

	// Passwort entschlüsseln
	password, err := s.decryptPassword(integration.Password)
	if err != nil {
		return fmt.Errorf("failed to decrypt password: %v", err)
	}

	// Test-API-Aufruf
	url := fmt.Sprintf("%s/api/employees?limit=1", integration.BaseURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	// Basic Auth setzen
	req.SetBasicAuth(integration.Username, password)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		return errors.New("authentifizierung fehlgeschlagen - bitte Benutzername und Passwort prüfen")
	}

	if resp.StatusCode != 200 {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}

// === Employee Synchronization ===

// SyncEmployees synchronisiert alle Mitarbeiter von PeopleFlow
func (s *PeopleFlowService) SyncEmployees(syncType string) (*model.PeopleFlowSyncLog, error) {
	// Sync-Log erstellen
	syncLog := &model.PeopleFlowSyncLog{
		SyncType:  syncType,
		StartTime: time.Now(),
		Status:    "running",
	}

	err := s.Repo.CreateSyncLog(syncLog)
	if err != nil {
		return nil, fmt.Errorf("failed to create sync log: %v", err)
	}

	// Integration laden
	integration, err := s.Repo.GetIntegration()
	if err != nil || integration == nil {
		syncLog.Status = "error"
		syncLog.ErrorMessage = "Keine PeopleFlow-Integration konfiguriert"
		syncLog.EndTime = time.Now()
		s.Repo.UpdateSyncLog(syncLog)
		return syncLog, errors.New("keine PeopleFlow-Integration konfiguriert")
	}

	// Prüfen ob Integration aktiv ist
	if !integration.IsActive {
		syncLog.Status = "error"
		syncLog.ErrorMessage = "PeopleFlow-Integration ist nicht aktiv"
		syncLog.EndTime = time.Now()
		s.Repo.UpdateSyncLog(syncLog)
		return syncLog, errors.New("integration is not active")
	}

	// Passwort entschlüsseln
	password, err := s.decryptPassword(integration.Password)
	if err != nil {
		syncLog.Status = "error"
		syncLog.ErrorMessage = "Failed to decrypt password"
		syncLog.EndTime = time.Now()
		s.Repo.UpdateSyncLog(syncLog)
		return syncLog, err
	}

	// Mitarbeiter von PeopleFlow API abrufen
	employees, err := s.fetchEmployeesFromAPI(integration.BaseURL, integration.Username, password)
	if err != nil {
		syncLog.Status = "error"
		syncLog.ErrorMessage = err.Error()
		syncLog.EndTime = time.Now()
		s.Repo.UpdateSyncLog(syncLog)
		return syncLog, err
	}

	// Mitarbeiter verarbeiten
	var processed, created, updated int
	var errors []string

	for _, apiEmployee := range employees {
		processed++

		// Zu PeopleFlow-Mitarbeiter konvertieren
		employee := s.convertAPIEmployeeToPeopleFlowEmployee(apiEmployee)

		// Prüfen, ob Mitarbeiter bereits existiert
		existingEmployee, err := s.Repo.FindEmployeeByEmail(employee.Email)
		if err == nil && existingEmployee != nil {
			// Mitarbeiter aktualisieren
			employee.ID = existingEmployee.ID
			employee.CreatedAt = existingEmployee.CreatedAt
			err = s.Repo.SaveEmployee(employee)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Failed to update employee %s: %v", employee.Email, err))
			} else {
				updated++
			}
		} else {
			// Neuer Mitarbeiter
			err = s.Repo.SaveEmployee(employee)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Failed to create employee %s: %v", employee.Email, err))
			} else {
				created++
			}
		}

		// Sync-Status des Mitarbeiters aktualisieren
		s.Repo.UpdateEmployeeSyncStatus(employee.Email, "synced")
	}

	// Sync-Log abschließen
	syncLog.EndTime = time.Now()
	syncLog.EmployeesProcessed = processed
	syncLog.EmployeesCreated = created
	syncLog.EmployeesUpdated = updated
	syncLog.Errors = errors

	if len(errors) == 0 {
		syncLog.Status = "success"
	} else if len(errors) < processed {
		syncLog.Status = "partial"
	} else {
		syncLog.Status = "error"
	}

	// Integration-Status aktualisieren
	status := "success"
	if len(errors) > 0 {
		status = "partial"
	}

	s.Repo.UpdateIntegrationStatus(true, time.Now(), status, created+updated)
	s.Repo.UpdateSyncLog(syncLog)

	// Nach erfolgreicher Synchronisation automatisch alle aktiven als Fahrer anlegen
	if syncLog.Status == "success" || syncLog.Status == "partial" {
		err := s.SyncDriverEligibleEmployees()
		if err != nil {
			// Fehler loggen, aber Synchronisation nicht als fehlgeschlagen markieren
			fmt.Printf("Warning: Failed to create drivers from employees: %v\n", err)
			syncLog.Errors = append(syncLog.Errors, fmt.Sprintf("Warning: Failed to create drivers: %v", err))
			s.Repo.UpdateSyncLog(syncLog)
		}
	}

	return syncLog, nil
}

// SyncDriverEligibleEmployees synchronisiert nur fahrtaugliche Mitarbeiter mit FleetFlow-Fahrern
func (s *PeopleFlowService) SyncDriverEligibleEmployees() error {
	// Fahrtaugliche PeopleFlow-Mitarbeiter abrufen
	driverEligibleEmployees, err := s.Repo.FindDriverEligibleEmployees()
	if err != nil {
		return err
	}

	for _, pfEmployee := range driverEligibleEmployees {
		// Prüfen, ob bereits ein FleetFlow-Fahrer mit dieser E-Mail existiert
		existingDriver, err := s.driverRepo.FindByEmail(pfEmployee.Email)
		if err != nil {
			// Neuen Fahrer erstellen
			driver := &model.Driver{
				FirstName:      pfEmployee.FirstName,
				LastName:       pfEmployee.LastName,
				Email:          pfEmployee.Email,
				Phone:          pfEmployee.Phone,
				Status:         model.DriverStatusAvailable,
				LicenseClasses: pfEmployee.LicenseClasses,
				Notes:          fmt.Sprintf("Automatisch synchronisiert von PeopleFlow (ID: %s)", pfEmployee.PeopleFlowID),
			}

			err = s.driverRepo.Create(driver)
			if err != nil {
				return fmt.Errorf("failed to create driver for %s: %v", pfEmployee.Email, err)
			}
		} else {
			// Bestehenden Fahrer aktualisieren
			existingDriver.FirstName = pfEmployee.FirstName
			existingDriver.LastName = pfEmployee.LastName
			existingDriver.Phone = pfEmployee.Phone
			existingDriver.LicenseClasses = pfEmployee.LicenseClasses

			err = s.driverRepo.Update(existingDriver)
			if err != nil {
				return fmt.Errorf("failed to update driver for %s: %v", pfEmployee.Email, err)
			}
		}
	}

	return nil
}

// === Helper Methods ===

// fetchEmployeesFromAPI ruft alle Mitarbeiter von der PeopleFlow API ab
func (s *PeopleFlowService) fetchEmployeesFromAPI(baseURL, username, password string) ([]PeopleFlowAPIEmployee, error) {
	var allEmployees []PeopleFlowAPIEmployee
	page := 1
	perPage := 100

	for {
		url := fmt.Sprintf("%s/api/employees?page=%d&per_page=%d", baseURL, page, perPage)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}

		req.SetBasicAuth(username, password)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")

		resp, err := s.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("API request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			return nil, fmt.Errorf("API returned status code: %d", resp.StatusCode)
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}

		var apiResponse PeopleFlowAPIResponse
		err = json.Unmarshal(body, &apiResponse)
		if err != nil {
			return nil, fmt.Errorf("failed to parse API response: %v", err)
		}

		if !apiResponse.Success {
			return nil, fmt.Errorf("API returned error: %s", apiResponse.Message)
		}

		allEmployees = append(allEmployees, apiResponse.Data...)

		// Prüfen, ob weitere Seiten vorhanden sind
		if page >= apiResponse.TotalPages {
			break
		}
		page++
	}

	return allEmployees, nil
}

// convertAPIEmployeeToPeopleFlowEmployee konvertiert einen API-Mitarbeiter zu einem PeopleFlow-Mitarbeiter
func (s *PeopleFlowService) convertAPIEmployeeToPeopleFlowEmployee(apiEmployee PeopleFlowAPIEmployee) *model.PeopleFlowEmployee {
	employee := &model.PeopleFlowEmployee{
		PeopleFlowID:   apiEmployee.ID,
		Email:          apiEmployee.Email,
		FirstName:      apiEmployee.FirstName,
		LastName:       apiEmployee.LastName,
		Phone:          apiEmployee.Phone,
		Department:     apiEmployee.Department,
		Position:       apiEmployee.Position,
		EmployeeNumber: apiEmployee.EmployeeNumber,
		Status:         apiEmployee.Status,
		Manager:        apiEmployee.Manager,
		Location:       apiEmployee.Location,
		CostCenter:     apiEmployee.CostCenter,
		LastSyncedAt:   time.Now(),
		SyncStatus:     "pending",
	}

	// HireDate parsen
	if apiEmployee.HireDate != "" {
		if hireDate, err := time.Parse("2006-01-02", apiEmployee.HireDate); err == nil {
			employee.HireDate = hireDate
		}
	}

	// Fahrtauglichkeit bestimmen (vereinfacht)
	employee.IsDriverEligible = s.determineDriverEligibility(employee)
	employee.HasValidLicense = employee.IsDriverEligible // Vereinfacht

	// Standard-Führerscheinklassen für fahrtaugliche Mitarbeiter
	if employee.IsDriverEligible {
		employee.LicenseClasses = []model.LicenseClass{model.LicenseClassB}
	}

	return employee
}

// determineDriverEligibility bestimmt, ob ein Mitarbeiter als Fahrer geeignet ist
func (s *PeopleFlowService) determineDriverEligibility(employee *model.PeopleFlowEmployee) bool {
	// Einfache Logik - kann erweitert werden
	return employee.Status == "active" &&
		employee.Email != "" &&
		!strings.Contains(strings.ToLower(employee.Position), "extern")
}

// === Encryption/Decryption ===

// encryptPassword verschlüsselt ein Passwort
func (s *PeopleFlowService) encryptPassword(plaintext string) (string, error) {
	block, err := aes.NewCipher(s.encryptKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// decryptPassword entschlüsselt ein Passwort
func (s *PeopleFlowService) decryptPassword(ciphertext string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(s.encryptKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	// Variable umbenannt um Namenskonflikt zu vermeiden
	nonce, encryptedData := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, encryptedData, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// === Status Methods ===

// GetIntegrationStatus gibt den aktuellen Status der Integration zurück
func (s *PeopleFlowService) GetIntegrationStatus() (map[string]interface{}, error) {
	integration, err := s.Repo.GetIntegration()
	if err != nil {
		return nil, err
	}

	if integration == nil {
		return map[string]interface{}{
			"connected":       false,
			"lastSync":        nil,
			"syncedEmployees": 0,
			"autoSync":        false,
		}, nil
	}

	return map[string]interface{}{
		"connected":       integration.IsActive,
		"lastSync":        integration.LastSync,
		"lastSyncStatus":  integration.LastSyncStatus,
		"syncedEmployees": integration.SyncedEmployees,
		"autoSync":        integration.AutoSync,
		"syncInterval":    integration.SyncInterval,
		"failedAttempts":  integration.FailedAttempts,
	}, nil
}

// RemoveIntegration entfernt die PeopleFlow-Integration
func (s *PeopleFlowService) RemoveIntegration() error {
	integration, err := s.Repo.GetIntegration()
	if err != nil || integration == nil {
		return errors.New("keine Integration gefunden")
	}

	// Integration deaktivieren
	integration.IsActive = false
	integration.Username = ""
	integration.Password = ""
	integration.BaseURL = ""

	return s.Repo.SaveIntegration(integration)
}

// testConnectionWithCredentials testet die Verbindung mit spezifischen Credentials
func (s *PeopleFlowService) testConnectionWithCredentials(baseURL, username, password string) error {
	// Test-API-Aufruf mit nur 1 Mitarbeiter
	url := fmt.Sprintf("%s/api/employees?limit=1", strings.TrimSuffix(baseURL, "/"))
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	// Basic Auth setzen
	req.SetBasicAuth(username, password)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("connection failed - please check URL and network: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return errors.New("authentication failed - please check username and password")
	}

	if resp.StatusCode == 404 {
		return errors.New("API endpoint not found - please check the URL and API path")
	}

	if resp.StatusCode >= 500 {
		return fmt.Errorf("server error (%d) - please try again later", resp.StatusCode)
	}

	if resp.StatusCode != 200 {
		return fmt.Errorf("unexpected response code: %d", resp.StatusCode)
	}

	// Versuche die Antwort zu parsen um sicherzustellen, dass es eine gültige API ist
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %v", err)
	}

	var apiResponse PeopleFlowAPIResponse
	err = json.Unmarshal(body, &apiResponse)
	if err != nil {
		return fmt.Errorf("invalid API response format - this does not appear to be a compatible PeopleFlow API: %v", err)
	}

	if !apiResponse.Success {
		return fmt.Errorf("API returned error: %s", apiResponse.Message)
	}

	return nil
}
