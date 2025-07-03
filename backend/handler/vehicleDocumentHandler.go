package handler

import (
	"FleetFlow/backend/model"
	"FleetFlow/backend/repository"
	"FleetFlow/backend/service"
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

// VehicleDocumentHandler repräsentiert den Handler für Fahrzeugdokumente
type VehicleDocumentHandler struct {
	documentRepo    *repository.VehicleDocumentRepository
	vehicleRepo     *repository.VehicleRepository
	activityService *service.ActivityService
}

// NewVehicleDocumentHandler erstellt einen neuen VehicleDocumentHandler
func NewVehicleDocumentHandler() *VehicleDocumentHandler {
	return &VehicleDocumentHandler{
		documentRepo:    repository.NewVehicleDocumentRepository(),
		vehicleRepo:     repository.NewVehicleRepository(),
		activityService: service.NewActivityService(),
	}
}

// UploadDocument behandelt den Upload eines neuen Dokuments
func (h *VehicleDocumentHandler) UploadDocument(c *gin.Context) {
	vehicleID := c.Param("id")

	// Fahrzeug existiert prüfen
	_, err := h.vehicleRepo.FindByID(vehicleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fahrzeug nicht gefunden"})
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
	docType := model.DocumentType(c.PostForm("type"))

	// Erlaubte Dateitypen je nach Dokumenttyp
	var allowedTypes map[string]bool
	if docType == model.DocumentTypeVehicleImage {
		// Nur Bildformate für Fahrzeugbilder
		allowedTypes = map[string]bool{
			"image/jpeg": true,
			"image/jpg":  true,
			"image/png":  true,
			"image/gif":  true,
			"image/webp": true,
		}
	} else {
		// Standard-Dokumenttypen
		allowedTypes = map[string]bool{
			"application/pdf":    true,
			"image/jpeg":         true,
			"image/jpg":          true,
			"image/png":          true,
			"image/gif":          true,
			"application/msword": true,
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		}
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
		if docType == model.DocumentTypeVehicleImage {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nur Bildformate sind für Fahrzeugbilder erlaubt"})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dateityp nicht erlaubt"})
		}
		return
	}

	// Datei-Inhalt lesen
	fileData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Lesen der Datei"})
		return
	}

	name := c.PostForm("name")
	notes := c.PostForm("notes")
	expiryDateStr := c.PostForm("expiryDate")

	// Validierung
	if docType == "" {
		docType = model.DocumentTypeOther
	}
	if name == "" {
		if docType == model.DocumentTypeVehicleImage {
			name = "Fahrzeugbild"
		} else {
			name = header.Filename
		}
	}

	// Ablaufdatum parsen (nur für Nicht-Bilder)
	var expiryDate *time.Time
	if docType != model.DocumentTypeVehicleImage && expiryDateStr != "" {
		parsed, err := time.Parse("2006-01-02", expiryDateStr)
		if err == nil {
			expiryDate = &parsed
		}
	}

	// VehicleID und UploadedBy konvertieren
	vehicleObjID, err := primitive.ObjectIDFromHex(vehicleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Fahrzeug-ID"})
		return
	}

	// Benutzer-ID aus Kontext
	userID, exists := c.Get("userId")
	var uploadedBy primitive.ObjectID
	if exists {
		uploadedBy, _ = service.GetUserIDFromContext(userID)
	}

	// Dokument erstellen
	document := &model.VehicleDocument{
		VehicleID:   vehicleObjID,
		Type:        docType,
		Name:        name,
		FileName:    header.Filename,
		ContentType: contentType,
		Size:        header.Size,
		Data:        fileData,
		UploadedBy:  uploadedBy,
		ExpiryDate:  expiryDate,
		Notes:       notes,
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
		description := fmt.Sprintf("Dokument hochgeladen: %s (%s)", name, model.DocumentTypeText(docType))

		h.activityService.LogVehicleActivity(
			model.ActivityTypeDocumentUploaded,
			uploadedBy,
			vehicleObjID,
			description,
			details,
		)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Dokument erfolgreich hochgeladen",
		"document": gin.H{
			"id":          document.ID.Hex(),
			"name":        document.Name,
			"type":        document.Type,
			"fileName":    document.FileName,
			"contentType": document.ContentType,
			"size":        document.Size,
			"uploadedAt":  document.UploadedAt,
			"expiryDate":  document.ExpiryDate,
			"notes":       document.Notes,
		},
	})
}

// GetVehicleDocuments gibt alle Dokumente für ein Fahrzeug zurück
func (h *VehicleDocumentHandler) GetVehicleDocuments(c *gin.Context) {
	vehicleID := c.Param("id")

	documents, err := h.documentRepo.FindByVehicle(vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Laden der Dokumente"})
		return
	}

	// Dokumente ohne Binärdaten für JSON Response vorbereiten
	var response []gin.H
	for _, doc := range documents {
		response = append(response, gin.H{
			"id":          doc.ID.Hex(),
			"type":        doc.Type,
			"typeText":    model.DocumentTypeText(doc.Type),
			"name":        doc.Name,
			"fileName":    doc.FileName,
			"contentType": doc.ContentType,
			"size":        doc.Size,
			"uploadedAt":  doc.UploadedAt,
			"expiryDate":  doc.ExpiryDate,
			"notes":       doc.Notes,
			"isExpired":   doc.IsExpired(),
			"isExpiring":  doc.IsExpiringSoon(),
		})
	}

	c.JSON(http.StatusOK, gin.H{"documents": response})
}

// DownloadDocument lädt ein Dokument herunter
func (h *VehicleDocumentHandler) DownloadDocument(c *gin.Context) {
	documentID := c.Param("id")

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

// UpdateDocument aktualisiert ein Dokument (ohne Datei)
func (h *VehicleDocumentHandler) UpdateDocument(c *gin.Context) {
	documentID := c.Param("id")

	document, err := h.documentRepo.FindByID(documentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dokument nicht gefunden"})
		return
	}

	var req struct {
		Type       model.DocumentType `json:"type"`
		Name       string             `json:"name"`
		Notes      string             `json:"notes"`
		ExpiryDate string             `json:"expiryDate"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ablaufdatum parsen
	var expiryDate *time.Time
	if req.ExpiryDate != "" {
		parsed, err := time.Parse("2006-01-02", req.ExpiryDate)
		if err == nil {
			expiryDate = &parsed
		}
	}

	// Dokument aktualisieren
	document.Type = req.Type
	document.Name = req.Name
	document.Notes = req.Notes
	document.ExpiryDate = expiryDate

	if err := h.documentRepo.Update(document); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Dokument erfolgreich aktualisiert",
		"document": gin.H{
			"id":          document.ID.Hex(),
			"type":        document.Type,
			"typeText":    model.DocumentTypeText(document.Type),
			"name":        document.Name,
			"fileName":    document.FileName,
			"contentType": document.ContentType,
			"size":        document.Size,
			"uploadedAt":  document.UploadedAt,
			"expiryDate":  document.ExpiryDate,
			"notes":       document.Notes,
			"isExpired":   document.IsExpired(),
			"isExpiring":  document.IsExpiringSoon(),
		},
	})
}

// DeleteDocument löscht ein Dokument
func (h *VehicleDocumentHandler) DeleteDocument(c *gin.Context) {
	documentID := c.Param("id")

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
			description := fmt.Sprintf("Dokument gelöscht: %s (%s)", document.Name, model.DocumentTypeText(document.Type))

			h.activityService.LogVehicleActivity(
				model.ActivityTypeDocumentDeleted,
				uploadedBy,
				document.VehicleID,
				description,
				details,
			)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dokument erfolgreich gelöscht"})
}

// GetVehicleMainImage gibt das Hauptbild eines Fahrzeugs zurück
func (h *VehicleDocumentHandler) GetVehicleMainImage(c *gin.Context) {
	vehicleID := c.Param("id")

	// Neuestes Fahrzeugbild finden
	images, err := h.documentRepo.FindByVehicleAndType(vehicleID, model.DocumentTypeVehicleImage)
	if err != nil || len(images) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kein Fahrzeugbild gefunden"})
		return
	}

	// Das neueste Bild verwenden
	image := images[0]

	// Content-Type prüfen (nur Bilder erlauben)
	if !strings.HasPrefix(image.ContentType, "image/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datei ist kein Bild"})
		return
	}

	// Cache-Header setzen
	c.Header("Cache-Control", "public, max-age=3600")
	c.Header("Content-Type", image.ContentType)

	// Bild-Inhalt senden
	c.Data(http.StatusOK, image.ContentType, image.Data)
}
