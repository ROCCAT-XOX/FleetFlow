// Driver Reports JavaScript

// Global variables
let currentFilter = 'all';
let selectedVehicleId = null;
let selectedReportType = null;
let selectedPriority = 'medium'; // Default priority

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initializeReportsPage();
    initializeForm();
    filterReports('all');
    
    // Check if vehicleId is provided in URL
    const urlParams = new URLSearchParams(window.location.search);
    const vehicleId = urlParams.get('vehicleId');
    if (vehicleId) {
        // Auto-open report modal and pre-select vehicle
        setTimeout(() => {
            showNewReportModal();
            preselectVehicle(vehicleId);
        }, 500);
    }
});

// Initialize the reports page
function initializeReportsPage() {
    initializeVehicleSelection();
    initializeReportTypeSelection();
    initializePrioritySelection();
}

// Initialize form handling
function initializeForm() {
    const form = document.getElementById('newReportForm');
    if (form) {
        form.addEventListener('submit', handleReportSubmit);
    }
    
    // Set default priority
    const mediumPriority = document.getElementById('priority_medium');
    if (mediumPriority) {
        mediumPriority.checked = true;
        selectedPriority = 'medium';
    }
}

// Show/Hide Modals
function showNewReportModal() {
    document.getElementById('newReportModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    hapticFeedback('medium');
}

function hideNewReportModal() {
    document.getElementById('newReportModal').style.display = 'none';
    document.body.style.overflow = '';
    resetForm();
}

function hideReportDetailsModal() {
    document.getElementById('reportDetailsModal').style.display = 'none';
    document.body.style.overflow = '';
}

function resetForm() {
    document.getElementById('newReportForm').reset();
    selectedVehicleId = null;
    selectedReportType = null;
    selectedPriority = 'medium';
    
    // Reset selections
    document.querySelectorAll('.vehicle-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelectorAll('.report-type-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelectorAll('.priority-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Set default priority
    const mediumPriority = document.getElementById('priority_medium');
    if (mediumPriority) {
        mediumPriority.checked = true;
        document.querySelector('[data-priority="medium"]').classList.add('selected');
    }
    
    hideEmergencyNotice();
}

// Tab Filtering
function showTab(status) {
    currentFilter = status;
    
    // Update tab appearance
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter reports
    filterReports(status);
    hapticFeedback('light');
}

function filterReports(status) {
    const reports = document.querySelectorAll('.report-card');
    
    reports.forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        
        if (status === 'all' || cardStatus === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show empty state if no visible cards
    const visibleCards = document.querySelectorAll('.report-card[style="display: block;"], .report-card:not([style])');
    const emptyState = document.querySelector('.empty-state');
    
    if (visibleCards.length === 0 && emptyState) {
        emptyState.style.display = 'block';
    } else if (emptyState) {
        emptyState.style.display = 'none';
    }
}

// Vehicle Selection
function initializeVehicleSelection() {
    const vehicleOptions = document.querySelectorAll('.vehicle-option');
    
    vehicleOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove previous selection
            vehicleOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Select this option
            this.classList.add('selected');
            selectedVehicleId = this.getAttribute('data-vehicle-id');
            
            // Check the radio button
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
            
            hapticFeedback('light');
        });
    });
}

function preselectVehicle(vehicleId) {
    const vehicleOption = document.querySelector(`[data-vehicle-id="${vehicleId}"]`);
    if (vehicleOption) {
        vehicleOption.click();
    }
}

// Report Type Selection
function initializeReportTypeSelection() {
    const typeOptions = document.querySelectorAll('.report-type-option');
    
    typeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove previous selection
            typeOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Select this option
            this.classList.add('selected');
            selectedReportType = this.getAttribute('data-type');
            
            // Check the radio button
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
            
            // Auto-set priority for critical issues
            if (selectedReportType === 'accident' || selectedReportType === 'brake_issue') {
                selectPriority('urgent');
                showEmergencyNotice();
            } else {
                hideEmergencyNotice();
            }
            
            hapticFeedback('light');
        });
    });
}

// Priority Selection
function initializePrioritySelection() {
    const priorityOptions = document.querySelectorAll('.priority-option');
    
    priorityOptions.forEach(option => {
        option.addEventListener('click', function() {
            const priority = this.getAttribute('data-priority');
            selectPriority(priority);
        });
    });
}

function selectPriority(priority) {
    // Remove previous selection
    document.querySelectorAll('.priority-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Select new priority
    const priorityOption = document.querySelector(`[data-priority="${priority}"]`);
    if (priorityOption) {
        priorityOption.classList.add('selected');
        const radio = priorityOption.querySelector('input[type="radio"]');
        radio.checked = true;
        selectedPriority = priority;
        
        hapticFeedback('light');
    }
}

// Emergency Notice
function showEmergencyNotice() {
    document.getElementById('emergencyNotice').style.display = 'flex';
}

function hideEmergencyNotice() {
    document.getElementById('emergencyNotice').style.display = 'none';
}

// Form Submission
async function handleReportSubmit(event) {
    event.preventDefault();
    
    if (!validateReportForm()) {
        return;
    }
    
    const formData = new FormData(event.target);
    const reportData = {
        vehicleId: formData.get('vehicleId'),
        type: formData.get('reportType'),
        priority: formData.get('priority'),
        title: formData.get('title'),
        description: formData.get('description'),
        location: formData.get('location') || '',
        mileage: formData.get('mileage') ? parseInt(formData.get('mileage')) : null
    };
    
    try {
        showLoading();
        
        const response = await fetch('/driver/api/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reportData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fehler beim Erstellen der Meldung');
        }
        
        const result = await response.json();
        
        if (reportData.priority === 'urgent' || reportData.type === 'accident' || reportData.type === 'brake_issue') {
            showSuccess('Dringende Meldung erfolgreich eingereicht! Die Werkstatt wurde sofort benachrichtigt.');
        } else {
            showSuccess('Meldung erfolgreich eingereicht! Sie wird zeitnah bearbeitet.');
        }
        
        hideNewReportModal();
        
        // Reload page to show new report
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Report submission failed:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function validateReportForm() {
    const vehicleId = document.querySelector('input[name="vehicleId"]:checked');
    const reportType = document.querySelector('input[name="reportType"]:checked');
    const priority = document.querySelector('input[name="priority"]:checked');
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    
    if (!vehicleId) {
        showError('Bitte wählen Sie ein Fahrzeug aus');
        return false;
    }
    
    if (!reportType) {
        showError('Bitte wählen Sie die Art des Problems aus');
        return false;
    }
    
    if (!priority) {
        showError('Bitte wählen Sie die Dringlichkeit aus');
        return false;
    }
    
    if (!title) {
        showError('Bitte geben Sie eine kurze Beschreibung ein');
        return false;
    }
    
    if (title.length < 5) {
        showError('Die Beschreibung muss mindestens 5 Zeichen lang sein');
        return false;
    }
    
    if (!description) {
        showError('Bitte geben Sie eine detaillierte Beschreibung ein');
        return false;
    }
    
    if (description.length < 10) {
        showError('Die detaillierte Beschreibung muss mindestens 10 Zeichen lang sein');
        return false;
    }
    
    return true;
}

// Report Actions
async function viewReportDetails(reportId) {
    try {
        showLoading();
        
        const response = await fetch(`/driver/api/reports/${reportId}`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Meldungsdetails');
        }
        
        const data = await response.json();
        displayReportDetails(data.report, data.vehicle);
        
    } catch (error) {
        console.error('Load report details failed:', error);
        showError('Fehler beim Laden der Meldungsdetails');
    } finally {
        hideLoading();
    }
}

function displayReportDetails(report, vehicle) {
    const content = document.getElementById('reportDetailsContent');
    
    const statusBadgeClass = `status-${report.status}`;
    const priorityBadgeClass = `priority-${report.priority}`;
    
    content.innerHTML = `
        <div class="report-details-full">
            <div class="details-header">
                <div class="details-type">
                    <span class="type-icon">${getTypeIcon(report.type)}</span>
                    <h3>${getTypeDisplayName(report.type)}</h3>
                </div>
                <div class="details-badges">
                    <span class="status-badge ${statusBadgeClass}">${getStatusDisplayName(report.status)}</span>
                    <span class="priority-badge ${priorityBadgeClass}">${getPriorityDisplayName(report.priority)}</span>
                </div>
            </div>
            
            <div class="details-vehicle">
                <h4>Fahrzeug</h4>
                <p>${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})</p>
            </div>
            
            <div class="details-info">
                <h4>Beschreibung</h4>
                <p><strong>${report.title}</strong></p>
                <p>${report.description}</p>
                
                ${report.location ? `
                <h4>Standort</h4>
                <p>${report.location}</p>
                ` : ''}
                
                ${report.mileage ? `
                <h4>Kilometerstand</h4>
                <p>${report.mileage} km</p>
                ` : ''}
                
                <h4>Gemeldet am</h4>
                <p>${formatDateTime(report.createdAt)}</p>
                
                ${report.resolution ? `
                <h4>Lösung</h4>
                <p>${report.resolution}</p>
                ` : ''}
                
                ${report.resolvedAt ? `
                <h4>Behoben am</h4>
                <p>${formatDateTime(report.resolvedAt)}</p>
                ` : ''}
            </div>
        </div>
    `;
    
    document.getElementById('reportDetailsModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

async function markAsUrgent(reportId) {
    if (!confirm('Möchten Sie diese Meldung als dringend markieren? Dies wird sofort an die Werkstatt weitergeleitet.')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/vehicle-reports/${reportId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                priority: 'urgent'
            })
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Aktualisieren der Priorität');
        }
        
        showSuccess('Meldung als dringend markiert! Die Werkstatt wurde benachrichtigt.');
        setTimeout(() => window.location.reload(), 1500);
        
    } catch (error) {
        console.error('Mark as urgent failed:', error);
        showError('Fehler beim Markieren als dringend');
    } finally {
        hideLoading();
    }
}

// Utility Functions
function getTypeIcon(type) {
    const icons = {
        'engine_light': '⚠️',
        'inspection': '🔧',
        'tire_change': '🛞',
        'fuel_issue': '⛽',
        'cleaning': '🧽',
        'repair': '🛠️',
        'accident': '🚨',
        'brake_issue': '🛑',
        'electrical': '⚡',
        'air_conditioning': '❄️',
        'noise': '🔊',
        'other': '❓'
    };
    return icons[type] || '❓';
}

function getTypeDisplayName(type) {
    const names = {
        'engine_light': 'Motorkontrollleuchte',
        'inspection': 'Inspektion fällig',
        'tire_change': 'Reifenwechsel',
        'fuel_issue': 'Tankproblem',
        'cleaning': 'Reinigung erforderlich',
        'repair': 'Allgemeine Reparatur',
        'accident': 'Unfall',
        'brake_issue': 'Bremsproblem',
        'electrical': 'Elektrisches Problem',
        'air_conditioning': 'Klimaanlage',
        'noise': 'Geräusche/Lärm',
        'other': 'Sonstiges'
    };
    return names[type] || type;
}

function getStatusDisplayName(status) {
    const names = {
        'open': 'Offen',
        'in_progress': 'In Bearbeitung',
        'resolved': 'Behoben',
        'closed': 'Geschlossen'
    };
    return names[status] || status;
}

function getPriorityDisplayName(priority) {
    const names = {
        'low': 'Niedrig',
        'medium': 'Mittel',
        'high': 'Hoch',
        'urgent': 'Dringend'
    };
    return names[priority] || priority;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        if (event.target.id === 'newReportModal') {
            hideNewReportModal();
        } else if (event.target.id === 'reportDetailsModal') {
            hideReportDetailsModal();
        }
    }
});

// Handle back button for modals
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        hideNewReportModal();
        hideReportDetailsModal();
    }
});

// Character count for description
document.addEventListener('DOMContentLoaded', function() {
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');
    
    if (titleInput) {
        titleInput.addEventListener('input', function() {
            const remaining = 100 - this.value.length;
            if (remaining < 20) {
                this.style.borderColor = remaining < 0 ? '#dc2626' : '#f59e0b';
            } else {
                this.style.borderColor = '';
            }
        });
    }
});

console.log('Driver Reports JavaScript loaded');