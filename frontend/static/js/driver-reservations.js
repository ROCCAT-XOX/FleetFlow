// Driver Reservations JavaScript

// Global variables
let currentFilter = 'all';
let selectedVehicleId = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initializeReservationsPage();
    initializeForm();
    filterReservations('all');
});

// Initialize the reservations page
function initializeReservationsPage() {
    // Set default dates to today and tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('startDate').value = formatDateForInput(today);
    document.getElementById('endDate').value = formatDateForInput(tomorrow);
    document.getElementById('startTime').value = '08:00';
    document.getElementById('endTime').value = '17:00';
    
    // Initialize vehicle selection
    initializeVehicleSelection();
}

// Initialize form handling
function initializeForm() {
    const form = document.getElementById('newReservationForm');
    if (form) {
        form.addEventListener('submit', handleReservationSubmit);
    }
    
    // Initialize date/time validation
    setupDateTimeValidation();
}

// Show/Hide Modals - Page-specific implementations
function pageSpecificShowReservationModal() {
    document.getElementById('newReservationModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    hapticFeedback('medium');
}

function pageSpecificHideReservationModal() {
    document.getElementById('newReservationModal').style.display = 'none';
    document.body.style.overflow = '';
    resetForm();
}

// Set page-specific functions on window for global access
window.pageSpecificShowReservationModal = pageSpecificShowReservationModal;
window.pageSpecificHideReservationModal = pageSpecificHideReservationModal;

// Also set the direct functions for backward compatibility and global access
function showNewReservationModal() {
    return pageSpecificShowReservationModal();
}

function hideNewReservationModal() {
    return pageSpecificHideReservationModal();
}

// Ensure functions are available globally
window.showNewReservationModal = showNewReservationModal;
window.hideNewReservationModal = hideNewReservationModal;

function resetForm() {
    document.getElementById('newReservationForm').reset();
    selectedVehicleId = null;
    
    // Reset vehicle selection
    document.querySelectorAll('.vehicle-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Reset to default dates
    initializeReservationsPage();
}

// Tab Filtering
function showTab(status) {
    currentFilter = status;
    
    // Update tab appearance
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter reservations
    filterReservations(status);
    hapticFeedback('light');
}

function filterReservations(status) {
    const reservations = document.querySelectorAll('.reservation-card');
    
    reservations.forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        
        if (status === 'all' || cardStatus === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show empty state if no visible cards
    const visibleCards = document.querySelectorAll('.reservation-card[style="display: block;"], .reservation-card:not([style])');
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

// Date and Time Validation
function setupDateTimeValidation() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    
    // Validate start date (can't be in the past)
    startDate.addEventListener('change', function() {
        const today = new Date().toISOString().split('T')[0];
        if (this.value < today) {
            this.value = today;
            showError('Startdatum darf nicht in der Vergangenheit liegen');
        }
        
        // Update end date minimum
        endDate.min = this.value;
        if (endDate.value < this.value) {
            endDate.value = this.value;
        }
    });
    
    // Validate end date
    endDate.addEventListener('change', function() {
        if (this.value < startDate.value) {
            this.value = startDate.value;
            showError('Enddatum muss nach dem Startdatum liegen');
        }
    });
    
    // Validate time if same day
    function validateTime() {
        if (startDate.value === endDate.value) {
            if (startTime.value >= endTime.value) {
                showError('Endzeit muss nach der Startzeit liegen');
                return false;
            }
        }
        return true;
    }
    
    startTime.addEventListener('change', validateTime);
    endTime.addEventListener('change', validateTime);
}

// Form Submission
async function handleReservationSubmit(event) {
    event.preventDefault();
    
    if (!validateReservationForm()) {
        return;
    }
    
    const formData = new FormData(event.target);
    const reservationData = {
        vehicleId: formData.get('vehicleId'),
        startDate: formData.get('startDate'),
        startTime: formData.get('startTime'),
        endDate: formData.get('endDate'),
        endTime: formData.get('endTime'),
        purpose: formData.get('purpose'),
        notes: formData.get('notes') || ''
    };
    
    // Combine date and time
    reservationData.startDateTime = `${reservationData.startDate}T${reservationData.startTime}:00`;
    reservationData.endDateTime = `${reservationData.endDate}T${reservationData.endTime}:00`;
    
    try {
        showLoading();
        
        const response = await fetch('/driver/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservationData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fehler beim Erstellen der Reservierung');
        }
        
        const result = await response.json();
        
        showSuccess('Reservierung erfolgreich eingereicht! Sie erhalten eine Benachrichtigung über die Genehmigung.');
        hideNewReservationModal();
        
        // Reload page to show new reservation
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Reservation submission failed:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function validateReservationForm() {
    const vehicleId = document.querySelector('input[name="vehicleId"]:checked');
    const startDate = document.getElementById('startDate').value;
    const startTime = document.getElementById('startTime').value;
    const endDate = document.getElementById('endDate').value;
    const endTime = document.getElementById('endTime').value;
    const purpose = document.getElementById('purpose').value;
    
    if (!vehicleId) {
        showError('Bitte wählen Sie ein Fahrzeug aus');
        return false;
    }
    
    if (!startDate || !startTime || !endDate || !endTime) {
        showError('Bitte füllen Sie alle Datum- und Zeitfelder aus');
        return false;
    }
    
    if (!purpose) {
        showError('Bitte geben Sie den Zweck der Reservierung an');
        return false;
    }
    
    // Check if start is before end
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    
    if (start >= end) {
        showError('Die Startzeit muss vor der Endzeit liegen');
        return false;
    }
    
    // Check if start is not in the past
    const now = new Date();
    if (start < now) {
        showError('Die Reservierung darf nicht in der Vergangenheit liegen');
        return false;
    }
    
    return true;
}

// Reservation Actions
async function editReservation(reservationId) {
    // TODO: Implement edit functionality
    showError('Bearbeitung noch nicht implementiert');
}

async function cancelReservation(reservationId) {
    if (!confirm('Möchten Sie diese Reservierung wirklich stornieren?')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/reservations/${reservationId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Stornieren der Reservierung');
        }
        
        showSuccess('Reservierung erfolgreich storniert');
        
        // Remove the card from UI
        const card = document.querySelector(`[onclick*="${reservationId}"]`).closest('.reservation-card');
        if (card) {
            card.remove();
        }
        
    } catch (error) {
        console.error('Cancel reservation failed:', error);
        showError('Fehler beim Stornieren der Reservierung');
    } finally {
        hideLoading();
    }
}

async function completeReservation(reservationId) {
    if (!confirm('Möchten Sie diese Reservierung als beendet markieren?')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/reservations/${reservationId}/complete`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Beenden der Reservierung');
        }
        
        showSuccess('Reservierung erfolgreich beendet');
        setTimeout(() => window.location.reload(), 1500);
        
    } catch (error) {
        console.error('Complete reservation failed:', error);
        showError('Fehler beim Beenden der Reservierung');
    } finally {
        hideLoading();
    }
}

function reportIssue(vehicleId) {
    showLoading();
    window.location.href = `/driver/reports?vehicleId=${vehicleId}`;
}

function viewReservationDetails(reservationId) {
    // TODO: Implement details view
    showError('Details-Ansicht noch nicht implementiert');
}

function showReservationMenu(reservationId) {
    // TODO: Implement context menu
    console.log('Show menu for reservation:', reservationId);
}

// Utility Functions
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
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

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        hideNewReservationModal();
    }
});

// Handle back button for modal
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        hideNewReservationModal();
    }
});

// Handle pull-to-refresh
let isRefreshing = false;

document.addEventListener('touchstart', function(e) {
    if (window.scrollY === 0 && !isRefreshing) {
        startY = e.touches[0].clientY;
    }
});

document.addEventListener('touchmove', function(e) {
    if (window.scrollY === 0 && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - (startY || 0);
        
        if (pullDistance > 0 && pullDistance < 100) {
            e.preventDefault();
        }
    }
});

document.addEventListener('touchend', function() {
    if (window.scrollY === 0 && !isRefreshing) {
        const currentY = event.changedTouches[0].clientY;
        const pullDistance = currentY - (startY || 0);
        
        if (pullDistance > 80) {
            isRefreshing = true;
            showLoading();
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }
});

// Debug: Log function availability
console.log('Driver Reservations JavaScript loaded');
console.log('showNewReservationModal function available:', typeof window.showNewReservationModal);
console.log('Global functions check:', {
    showNewReservationModal: typeof window.showNewReservationModal,
    hideNewReservationModal: typeof window.hideNewReservationModal,
    pageSpecificShowReservationModal: typeof window.pageSpecificShowReservationModal,
    pageSpecificHideReservationModal: typeof window.pageSpecificHideReservationModal
});