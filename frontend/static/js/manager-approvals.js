// Manager Approvals JavaScript

let currentReservationId = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApprovalInterface();
    
    // Auto-refresh every 30 seconds
    setInterval(checkForNewReservations, 30000);
});

function initializeApprovalInterface() {
    const form = document.getElementById('rejectForm');
    if (form) {
        form.addEventListener('submit', handleRejectSubmit);
    }
}

// Approve Reservation
async function approveReservation(reservationId) {
    if (!confirm('Möchten Sie diese Reservierung genehmigen?')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/reservations/${reservationId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fehler beim Genehmigen der Reservierung');
        }
        
        showSuccess('Reservierung erfolgreich genehmigt!');
        
        // Remove the approved card from the UI
        removeReservationCard(reservationId);
        
        // Reload page after short delay to show updated state
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Approval failed:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Show Reject Modal
function showRejectModal(reservationId, vehicleName, driverName) {
    currentReservationId = reservationId;
    
    const modalContent = document.getElementById('rejectModalContent');
    modalContent.innerHTML = `
        <div style="padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #991b1b;">Reservierung ablehnen</h4>
            <p style="margin: 0; color: #dc2626; font-size: 14px;">
                <strong>Fahrzeug:</strong> ${vehicleName}<br>
                <strong>Fahrer:</strong> ${driverName}
            </p>
        </div>
    `;
    
    document.getElementById('rejectModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus on textarea
    setTimeout(() => {
        document.getElementById('rejectionNote').focus();
    }, 100);
}

// Hide Reject Modal
function hideRejectModal() {
    document.getElementById('rejectModal').classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset form
    document.getElementById('rejectForm').reset();
    currentReservationId = null;
}

// Handle Reject Form Submit
async function handleRejectSubmit(event) {
    event.preventDefault();
    
    if (!currentReservationId) {
        showError('Keine Reservierung ausgewählt');
        return;
    }
    
    const formData = new FormData(event.target);
    const rejectionNote = formData.get('rejectionNote').trim();
    
    if (!rejectionNote) {
        showError('Bitte geben Sie eine Begründung für die Ablehnung an');
        return;
    }
    
    if (rejectionNote.length < 10) {
        showError('Die Begründung muss mindestens 10 Zeichen lang sein');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/reservations/${currentReservationId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                rejectionNote: rejectionNote
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fehler beim Ablehnen der Reservierung');
        }
        
        showSuccess('Reservierung erfolgreich abgelehnt! Der Fahrer wurde benachrichtigt.');
        
        hideRejectModal();
        
        // Remove the rejected card from the UI
        removeReservationCard(currentReservationId);
        
        // Reload page after short delay to show updated state
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Rejection failed:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Remove reservation card from UI
function removeReservationCard(reservationId) {
    const cards = document.querySelectorAll('.reservation-card');
    cards.forEach(card => {
        const approveBtn = card.querySelector(`[onclick*="${reservationId}"]`);
        if (approveBtn) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                card.remove();
                
                // Show empty state if no cards left
                const remainingCards = document.querySelectorAll('.reservation-card');
                if (remainingCards.length === 0) {
                    showEmptyState();
                }
            }, 300);
        }
    });
}

// Show empty state
function showEmptyState() {
    const grid = document.querySelector('.reservations-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">✅</div>
                <h3>Alle Genehmigungen bearbeitet</h3>
                <p>Großartig! Sie haben alle ausstehenden Reservierungen bearbeitet.</p>
            </div>
        `;
    }
    
    // Update header
    const pendingCount = document.querySelector('.pending-count');
    if (pendingCount) {
        pendingCount.style.display = 'none';
    }
}

// Check for new reservations
async function checkForNewReservations() {
    try {
        const response = await fetch('/api/reservations/pending');
        
        if (!response.ok) {
            return; // Silent fail for background checks
        }
        
        const data = await response.json();
        const currentCount = document.querySelectorAll('.reservation-card').length;
        
        if (data.length > currentCount) {
            // New reservations available - show notification
            showInfo(`${data.length - currentCount} neue Reservierung(en) eingegangen. Seite wird aktualisiert...`);
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
        
    } catch (error) {
        // Silent fail for background checks
        console.log('Background check failed:', error);
    }
}

// Utility Functions
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
            break;
        case 'info':
            notification.style.background = 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
            break;
        default:
            notification.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, type === 'error' ? 5000 : 3000);
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        hideRejectModal();
    }
});

// Handle escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        hideRejectModal();
    }
});

// Auto-resize textarea
document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('rejectionNote');
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        });
    }
});

console.log('Manager Approvals JavaScript loaded');