package handler

import (
	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"
	"FleetDrive/backend/service"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DriverDocumentHandler repräsentiert den Handler für Fahrerdokumente
type DriverDocumentHandler struct {
	documentRepo    *repository.DriverDocumentRepository
	driverRepo      *repository.DriverRepository
	activityService *service.ActivityService
}

// NewDriverDocumentHandler erstellt einen neuen DriverDocumentHandler
func NewDriverDocumentHandler() *DriverDocumentHandler {
	return &DriverDocumentHandler{
		documentRepo:    repository.NewDriverDocumentRepository(),
		driverRepo:      repository.NewDriverRepository(),
		activityService: service.NewActivityService(),
	}
}

// UploadDocument behandelt den Upload eines neuen Fahrerdokuments
func (h *DriverDocumentHandler) UploadDocument(c *gin.Context) {
	driverID := c.Param("id")

	// Fahrer existiert prüfen
	_, err := h.driverRepo.FindByID(driverID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrer nicht gefunden"})
		return
	}

	// Multipart Form parsen
	err = c.Request.ParseMultipartForm(10 << 20) // 10 MB
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Fehler beim Parsen der Formulardaten"})
		return
	}

	// Datei aus Form extrahieren
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Keine Datei gefunden"})
		return
	}
	defer file.Close()

	// Datei-Größe prüfen (max 10MB)
	if header.Size > 10<<20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datei zu groß (max. 10MB)"})
		return
	}

	// Form-Parameter extrahieren
	docType := model.DriverDocumentType(c.PostForm("type"))
	if docType == "" {
		docType = model.DriverDocumentTypeLicense
	}

	// Erlaubte Dateitypen
	allowedTypes := map[string]bool{
		"application/pdf": true,
		"image/jpeg":      true,
		"image/jpg":       true,
		"image/png":       true,
		"image/gif":       true,
		"image/webp":      true,
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		// Content-Type aus Dateiendung ermitteln
		extension := strings.ToLower(filepath.Ext(header.Filename))
		switch extension {
		case ".pdf":
			contentType = "application/pdf"
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		case ".png":
			contentType = "image/png"
		case ".gif":
			contentType = "image/gif"
		case ".webp":
			contentType = "image/webp"
		}
	}

	if !allowedTypes[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dateityp nicht erlaubt. Erlaubt sind PDF und Bildformate (JPG, PNG, GIF, WebP)"})
		return
	}

	// Datei-Inhalt lesen
	fileData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Lesen der Datei"})
		return
	}

	// Form-Daten
	name := c.PostForm("name")
	notes := c.PostForm("notes")
	expiryDateStr := c.PostForm("expiryDate")
	issueDateStr := c.PostForm("issueDate")
	licenseNumber := c.PostForm("licenseNumber")
	issuingAuthority := c.PostForm("issuingAuthority")

	// Validierung
	if name == "" {
		if docType == model.DriverDocumentTypeLicense {
			name = "Führerschein"
		} else {
			name = header.Filename
		}
	}

	// Datums-Parsing
	var expiryDate, issueDate *time.Time
	if expiryDateStr != "" {
		parsed, err := time.Parse("2006-01-02", expiryDateStr)
		if err == nil {
			expiryDate = &parsed
		}
	}
	if issueDateStr != "" {
		parsed, err := time.Parse("2006-01-02", issueDateStr)
		if err == nil {
			issueDate = &parsed
		}
	}

	// DriverID und UploadedBy konvertieren
	driverObjID, err := primitive.ObjectIDFromHex(driverID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrer-ID"})
		return
	}

	// Benutzer-ID aus Kontext
	userID, exists := c.Get("userId")
	var uploadedBy primitive.ObjectID
	if exists {
		uploadedBy, _ = service.GetUserIDFromContext(userID)
	}

	// Dokument erstellen
	document := &model.DriverDocument{
		DriverID:         driverObjID,
		Type:             docType,
		Name:             name,
		FileName:         header.Filename,
		ContentType:      contentType,
		Size:             header.Size,
		Data:             fileData,
		UploadedBy:       uploadedBy,
		ExpiryDate:       expiryDate,
		IssueDate:        issueDate,
		LicenseNumber:    licenseNumber,
		IssuingAuthority: issuingAuthority,
		Notes:            notes,
	}

	// In Datenbank speichern
	if err := h.documentRepo.Create(document); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Speichern des Dokuments"})
		return
	}

	// Aktivität protokollieren
	if !uploadedBy.IsZero() {
		details := map[string]interface{}{
			"documentType": docType,
			"fileName":     header.Filename,
			"size":         header.Size,
		}
		description := fmt.Sprintf("Dokument hochgeladen: %s (%s)", name, model.DriverDocumentTypeText(docType))

		h.activityService.LogDriverActivity(
			model.ActivityType("driver-document-uploaded"),
			uploadedBy,
			driverObjID,
			description,
			details,
		)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Dokument erfolgreich hochgeladen",
		"document": gin.H{
			"id":               document.ID.Hex(),
			"name":             document.Name,
			"type":             document.Type,
			"typeText":         model.DriverDocumentTypeText(document.Type),
			"fileName":         document.FileName,
			"contentType":      document.ContentType,
			"size":             document.Size,
			"uploadedAt":       document.UploadedAt,
			"expiryDate":       document.ExpiryDate,
			"issueDate":        document.IssueDate,
			"licenseNumber":    document.LicenseNumber,
			"issuingAuthority": document.IssuingAuthority,
			"notes":            document.Notes,
			"isExpired":        document.IsExpired(),
			"isExpiring":       document.IsExpiringSoon(),
		},
	})
}

// GetDriverDocuments gibt alle Dokumente für einen Fahrer zurück
func (h *DriverDocumentHandler) GetDriverDocuments(c *gin.Context) {
	driverID := c.Param("id")

	documents, err := h.documentRepo.FindByDriver(driverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Dokumente"})
		return
	}

	// Dokumente ohne Binärdaten für JSON Response vorbereiten
	var response []gin.H
	for _, doc := range documents {
		response = append(response, gin.H{
			"id":               doc.ID.Hex(),
			"type":             doc.Type,
			"typeText":         model.DriverDocumentTypeText(doc.Type),
			"name":             doc.Name,
			"fileName":         doc.FileName,
			"contentType":      doc.ContentType,
			"size":             doc.Size,
			"uploadedAt":       doc.UploadedAt,
			"expiryDate":       doc.ExpiryDate,
			"issueDate":        doc.IssueDate,
			"licenseNumber":    doc.LicenseNumber,
			"issuingAuthority": doc.IssuingAuthority,
			"notes":            doc.Notes,
			"isExpired":        doc.IsExpired(),
			"isExpiring":       doc.IsExpiringSoon(),
		})
	}

	c.JSON(http.StatusOK, gin.H{"documents": response})
}

// DownloadDocument lädt ein Fahrerdokument herunter
func (h *DriverDocumentHandler) DownloadDocument(c *gin.Context) {
	documentID := c.Param("docId")

	document, err := h.documentRepo.FindByID(documentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dokument nicht gefunden"})
		return
	}

	// Content-Disposition Header setzen
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", document.FileName))
	c.Header("Content-Type", document.ContentType)
	c.Header("Content-Length", strconv.FormatInt(document.Size, 10))

	// Datei-Inhalt senden
	c.Data(http.StatusOK, document.ContentType, document.Data)
}

// ViewDocument zeigt ein Dokument inline an (für PDFs und Bilder)
func (h *DriverDocumentHandler) ViewDocument(c *gin.Context) {
	documentID := c.Param("docId")

	document, err := h.documentRepo.FindByID(documentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dokument nicht gefunden"})
		return
	}

	// Content-Disposition Header für inline Anzeige
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", document.FileName))
	c.Header("Content-Type", document.ContentType)
	c.Header("Content-Length", strconv.FormatInt(document.Size, 10))

	// Cache für Bilder
	if strings.HasPrefix(document.ContentType, "image/") {
		c.Header("Cache-Control", "public, max-age=3600")
	}

	// Datei-Inhalt senden
	c.Data(http.StatusOK, document.ContentType, document.Data)
}

// UpdateDocument aktualisiert ein Dokument (ohne Datei)
func (h *DriverDocumentHandler) UpdateDocument(c *gin.Context) {
	documentID := c.Param("docId")

	document, err := h.documentRepo.FindByID(documentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dokument nicht gefunden"})
		return
	}

	var req struct {
		Type             model.DriverDocumentType `json:"type"`
		Name             string                   `json:"name"`
		Notes            string                   `json:"notes"`
		ExpiryDate       string                   `json:"expiryDate"`
		IssueDate        string                   `json:"issueDate"`
		LicenseNumber    string                   `json:"licenseNumber"`
		IssuingAuthority string                   `json:"issuingAuthority"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Datums-Parsing
	var expiryDate, issueDate *time.Time
	if req.ExpiryDate != "" {
		parsed, err := time.Parse("2006-01-02", req.ExpiryDate)
		if err == nil {
			expiryDate = &parsed
		}
	}
	if req.IssueDate != "" {
		parsed, err := time.Parse("2006-01-02", req.IssueDate)
		if err == nil {
			issueDate = &parsed
		}
	}

	// Dokument aktualisieren
	document.Type = req.Type
	document.Name = req.Name
	document.Notes = req.Notes
	document.ExpiryDate = expiryDate
	document.IssueDate = issueDate
	document.LicenseNumber = req.LicenseNumber
	document.IssuingAuthority = req.IssuingAuthority

	if err := h.documentRepo.Update(document); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Dokument erfolgreich aktualisiert",
		"document": gin.H{
			"id":               document.ID.Hex(),
			"type":             document.Type,
			"typeText":         model.DriverDocumentTypeText(document.Type),
			"name":             document.Name,
			"fileName":         document.FileName,
			"contentType":      document.ContentType,
			"size":             document.Size,
			"uploadedAt":       document.UploadedAt,
			"expiryDate":       document.ExpiryDate,
			"issueDate":        document.IssueDate,
			"licenseNumber":    document.LicenseNumber,
			"issuingAuthority": document.IssuingAuthority,
			"notes":            document.Notes,
			"isExpired":        document.IsExpired(),
			"isExpiring":       document.IsExpiringSoon(),
		},
	})
}

// DeleteDocument löscht ein Dokument
func (h *DriverDocumentHandler) DeleteDocument(c *gin.Context) {
	documentID := c.Param("docId")

	document, err := h.documentRepo.FindByID(documentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dokument nicht gefunden"})
		return
	}

	if err := h.documentRepo.Delete(documentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Löschen"})
		return
	}

	// Aktivität protokollieren
	userID, exists := c.Get("userId")
	if exists {
		uploadedBy, _ := service.GetUserIDFromContext(userID)
		if !uploadedBy.IsZero() {
			details := map[string]interface{}{
				"documentType": document.Type,
				"fileName":     document.FileName,
			}
			description := fmt.Sprintf("Dokument gelöscht: %s (%s)", document.Name, model.DriverDocumentTypeText(document.Type))

			h.activityService.LogDriverActivity(
				model.ActivityType("driver-document-deleted"),
				uploadedBy,
				document.DriverID,
				description,
				details,
			)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dokument erfolgreich gelöscht"})
}

// GetDriverLicense gibt den aktuellen Führerschein eines Fahrers zurück
func (h *DriverDocumentHandler) GetDriverLicense(c *gin.Context) {
	driverID := c.Param("id")

	// Neuesten Führerschein finden
	licenses, err := h.documentRepo.FindByDriverAndType(driverID, model.DriverDocumentTypeLicense)
	if err != nil || len(licenses) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kein Führerschein gefunden"})
		return
	}

	// Den neuesten Führerschein verwenden
	license := licenses[0]

	// Content-Type prüfen
	if !strings.HasPrefix(license.ContentType, "image/") && license.ContentType != "application/pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Dateiformat"})
		return
	}

	// Cache-Header setzen
	c.Header("Cache-Control", "public, max-age=3600")
	c.Header("Content-Type", license.ContentType)

	// Inhalt senden
	c.Data(http.StatusOK, license.ContentType, license.Data)
}
