// backend/handler/projectHandler.go
package handler

import (
	"net/http"
	"time"

	"FleetDrive/backend/model"
	"FleetDrive/backend/repository"

	"github.com/gin-gonic/gin"
)

// ProjectHandler repräsentiert den Handler für Projekt-Operationen
type ProjectHandler struct {
	projectRepo *repository.ProjectRepository
}

// NewProjectHandler erstellt einen neuen ProjectHandler
func NewProjectHandler() *ProjectHandler {
	return &ProjectHandler{
		projectRepo: repository.NewProjectRepository(),
	}
}

// CreateProjectRequest repräsentiert die Anfrage zum Erstellen eines Projekts
type CreateProjectRequest struct {
	Name        string              `json:"name" binding:"required"`
	Description string              `json:"description"`
	Status      model.ProjectStatus `json:"status"`
	Department  string              `json:"department"`
	StartDate   string              `json:"startDate"`
	EndDate     string              `json:"endDate"`
	Manager     string              `json:"manager"`
	Budget      float64             `json:"budget"`
}

// GetProjects behandelt die Anfrage, alle Projekte abzurufen
func (h *ProjectHandler) GetProjects(c *gin.Context) {
	// Statusfilter prüfen
	statusFilter := c.Query("status")
	var projects []*model.Project
	var err error

	if statusFilter != "" {
		// Projekte nach Status filtern
		projects, err = h.projectRepo.FindByStatus(model.ProjectStatus(statusFilter))
	} else {
		// Alle Projekte abrufen
		projects, err = h.projectRepo.FindAll()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Abrufen der Projekte"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"projects": projects})
}

// GetProject behandelt die Anfrage, ein Projekt anhand seiner ID abzurufen
func (h *ProjectHandler) GetProject(c *gin.Context) {
	id := c.Param("id")

	project, err := h.projectRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projekt nicht gefunden"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"project": project})
}

// CreateProject behandelt die Anfrage, ein neues Projekt zu erstellen
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prüfen, ob ein Projekt mit diesem Namen bereits existiert
	existingProject, _ := h.projectRepo.FindByName(req.Name)
	if existingProject != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ein Projekt mit diesem Namen existiert bereits"})
		return
	}

	// Standardwert für Status, falls nicht angegeben
	status := req.Status
	if status == "" {
		status = model.ProjectStatusPlanning
	}

	// Datum parsen, wenn vorhanden
	var startDate, endDate time.Time
	if req.StartDate != "" {
		var err error
		startDate, err = time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Startdatum"})
			return
		}
	}

	if req.EndDate != "" {
		var err error
		endDate, err = time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Enddatum"})
			return
		}
	}

	// Neues Projekt erstellen
	project := &model.Project{
		Name:        req.Name,
		Description: req.Description,
		Status:      status,
		Department:  req.Department,
		StartDate:   startDate,
		EndDate:     endDate,
		Manager:     req.Manager,
		Budget:      req.Budget,
	}

	// Projekt in der Datenbank speichern
	if err := h.projectRepo.Create(project); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Erstellen des Projekts"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"project": project})
}

// UpdateProject behandelt die Anfrage, ein Projekt zu aktualisieren
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	id := c.Param("id")

	// Projekt aus der Datenbank abrufen
	project, err := h.projectRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projekt nicht gefunden"})
		return
	}

	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prüfen, ob ein anderes Projekt mit dem gleichen Namen existiert
	if req.Name != project.Name {
		existingProject, _ := h.projectRepo.FindByName(req.Name)
		if existingProject != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ein anderes Projekt mit diesem Namen existiert bereits"})
			return
		}
	}

	// Datum parsen, wenn vorhanden
	if req.StartDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Startdatum"})
			return
		}
		project.StartDate = startDate
	}

	if req.EndDate != "" {
		endDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültiges Enddatum"})
			return
		}
		project.EndDate = endDate
	}

	// Projekt aktualisieren
	project.Name = req.Name
	project.Description = req.Description
	project.Status = req.Status
	project.Department = req.Department
	project.Manager = req.Manager
	project.Budget = req.Budget

	// Projekt in der Datenbank aktualisieren
	if err := h.projectRepo.Update(project); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Aktualisieren des Projekts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"project": project})
}

// DeleteProject behandelt die Anfrage, ein Projekt zu löschen
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	id := c.Param("id")

	// Prüfen, ob das Projekt existiert
	_, err := h.projectRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projekt nicht gefunden"})
		return
	}

	// Projekt aus der Datenbank löschen
	if err := h.projectRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fehler beim Löschen des Projekts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Projekt erfolgreich gelöscht"})
}
