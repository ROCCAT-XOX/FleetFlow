// Mobile Driver Interface JavaScript

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');

// Loading States
function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Modal Functions - Always available fallbacks
function showNewReportModal() {
    const modal = document.getElementById('newReportModal');
    if (modal) {
        // Use page-specific modal if available
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        // Fallback: navigate to reports page
        window.location.href = '/driver/reports';
    }
}

// Reservation modal function removed - handled by driver-globals.js

// Logout Function - Global and always available
function logout() {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
        // Cookie löschen
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        // Zur Login-Seite weiterleiten
        window.location.href = '/login';
    }
}

// Ensure functions are always available globally
window.logout = logout;
window.showNewReportModal = showNewReportModal;
window.showNewReservationModal = showNewReservationModal;

// Navigation Functions
function showReservationDetails(reservationId) {
    showLoading();
    window.location.href = `/driver/reservations/${reservationId}`;
}

function reportIssue(vehicleId) {
    showLoading();
    window.location.href = `/driver/reports/new?vehicleId=${vehicleId}`;
}

// API Helper Functions
async function makeRequest(url, options = {}) {
    showLoading();
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Request failed:', error);
        showError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        throw error;
    } finally {
        hideLoading();
    }
}

// Error Handling
function showError(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #dc2626;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function showSuccess(message) {
    // Simple success notification
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #059669;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Pull-to-Refresh functionality
let startY = 0;
let currentY = 0;
let isPulling = false;
const pullThreshold = 80;

document.addEventListener('touchstart', function(e) {
    if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
    }
});

document.addEventListener('touchmove', function(e) {
    if (!isPulling) return;
    
    currentY = e.touches[0].clientY;
    const pullDistance = currentY - startY;
    
    if (pullDistance > 0 && pullDistance < pullThreshold * 2) {
        e.preventDefault();
        
        // Visual feedback for pull-to-refresh
        const pullIndicator = document.querySelector('.pull-indicator') || createPullIndicator();
        pullIndicator.style.transform = `translateY(${Math.min(pullDistance, pullThreshold)}px)`;
        pullIndicator.style.opacity = Math.min(pullDistance / pullThreshold, 1);
    }
});

document.addEventListener('touchend', function() {
    if (!isPulling) return;
    
    const pullDistance = currentY - startY;
    
    if (pullDistance > pullThreshold) {
        // Trigger refresh
        refreshDashboard();
    }
    
    // Reset
    const pullIndicator = document.querySelector('.pull-indicator');
    if (pullIndicator) {
        pullIndicator.style.transform = 'translateY(0)';
        pullIndicator.style.opacity = '0';
    }
    
    isPulling = false;
    startY = 0;
    currentY = 0;
});

function createPullIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'pull-indicator';
    indicator.innerHTML = '⬇️ Ziehen zum Aktualisieren';
    indicator.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        z-index: 999;
        opacity: 0;
        transition: all 0.2s ease;
    `;
    
    document.body.appendChild(indicator);
    return indicator;
}

// Refresh Dashboard
async function refreshDashboard() {
    try {
        showLoading();
        // Reload the page for now - can be optimized to fetch only new data
        window.location.reload();
    } catch (error) {
        showError('Aktualisierung fehlgeschlagen');
    }
}

// Quick Actions
function quickBookVehicle() {
    showLoading();
    window.location.href = '/driver/reservations/new';
}

function quickReportIssue() {
    showLoading();
    window.location.href = '/driver/reports/new';
}

// Swipe Gestures for Cards
function initSwipeGestures() {
    const cards = document.querySelectorAll('.reservation-card, .report-card');
    
    cards.forEach(card => {
        let startX = 0;
        let currentX = 0;
        let isSwiping = false;
        
        card.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            isSwiping = true;
        });
        
        card.addEventListener('touchmove', function(e) {
            if (!isSwiping) return;
            
            currentX = e.touches[0].clientX;
            const diffX = startX - currentX;
            
            // Add visual feedback for swipe
            if (Math.abs(diffX) > 10) {
                card.style.transform = `translateX(${-diffX * 0.3}px)`;
                card.style.opacity = Math.max(0.7, 1 - Math.abs(diffX) / 200);
            }
        });
        
        card.addEventListener('touchend', function() {
            if (!isSwiping) return;
            
            const diffX = startX - currentX;
            
            // Reset visual state
            card.style.transform = '';
            card.style.opacity = '';
            
            // Handle swipe actions (future enhancement)
            if (Math.abs(diffX) > 100) {
                // Swipe detected - could trigger actions like delete, archive, etc.
                console.log('Swipe detected:', diffX > 0 ? 'left' : 'right');
            }
            
            isSwiping = false;
        });
    });
}

// Initialize swipe gestures when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initSwipeGestures();
});

// Haptic Feedback (for supported devices)
function hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
        switch (type) {
            case 'light':
                navigator.vibrate(10);
                break;
            case 'medium':
                navigator.vibrate(20);
                break;
            case 'heavy':
                navigator.vibrate([30, 10, 30]);
                break;
        }
    }
}

// Add haptic feedback to buttons
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .action-card');
    
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            hapticFeedback('light');
        });
    });
});

// Service Worker Registration (for PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('SW registered: ', registration);
            })
            .catch(function(registrationError) {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Network Status Handling
function updateNetworkStatus() {
    if (!navigator.onLine) {
        showError('Keine Internetverbindung');
    }
}

window.addEventListener('online', function() {
    showSuccess('Internetverbindung wiederhergestellt');
});

window.addEventListener('offline', function() {
    showError('Internetverbindung verloren');
});

// Auto-hide header on scroll (optional enhancement)
let lastScrollY = window.scrollY;
const header = document.querySelector('.mobile-header');

window.addEventListener('scroll', function() {
    const currentScrollY = window.scrollY;
    
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        header.style.transform = 'translateY(-100%)';
    } else {
        // Scrolling up
        header.style.transform = 'translateY(0)';
    }
    
    lastScrollY = currentScrollY;
});

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('Driver Mobile App initialized');
    updateNetworkStatus();
});