// Global Driver Functions - Always available
// This file ensures critical functions are always defined before any template loads

// Core functions
function logout() {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        window.location.href = '/login';
    }
}

function showNewReportModal() {
    const modal = document.getElementById('newReportModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        window.location.href = '/driver/reports';
    }
}

function hideNewReportModal() {
    const modal = document.getElementById('newReportModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Reservation modal functions - fallback implementations
// These will be overridden by page-specific implementations if available
function showNewReservationModal() {
    // Check if page-specific function exists
    if (window.pageSpecificShowReservationModal) {
        return window.pageSpecificShowReservationModal();
    }
    
    const modal = document.getElementById('newReservationModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        window.location.href = '/driver/reservations';
    }
}

function hideNewReservationModal() {
    // Check if page-specific function exists
    if (window.pageSpecificHideReservationModal) {
        return window.pageSpecificHideReservationModal();
    }
    
    const modal = document.getElementById('newReservationModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function showReservationDetails(reservationId) {
    window.location.href = `/driver/reservations/${reservationId}`;
}

function reportIssue(vehicleId) {
    window.location.href = `/driver/reports?vehicleId=${vehicleId}`;
}

function viewReportDetails(reportId) {
    // This will be handled by the page-specific script
    console.log('Viewing report details:', reportId);
}

function markAsUrgent(reportId) {
    // This will be handled by the page-specific script
    console.log('Marking as urgent:', reportId);
}

function showTab(status) {
    // This will be handled by the page-specific script
    console.log('Showing tab:', status);
}

function hideReportDetailsModal() {
    const modal = document.getElementById('reportDetailsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function editReservation(reservationId) {
    console.log('Edit reservation:', reservationId);
}

function cancelReservation(reservationId) {
    console.log('Cancel reservation:', reservationId);
}

function completeReservation(reservationId) {
    console.log('Complete reservation:', reservationId);
}

function viewReservationDetails(reservationId) {
    console.log('View reservation details:', reservationId);
}

function showReservationMenu(reservationId) {
    console.log('Show reservation menu:', reservationId);
}

// Make all functions globally available
window.logout = logout;
window.showNewReportModal = showNewReportModal;
window.hideNewReportModal = hideNewReportModal;
window.showNewReservationModal = showNewReservationModal;
window.hideNewReservationModal = hideNewReservationModal;
window.showReservationDetails = showReservationDetails;
window.reportIssue = reportIssue;
window.viewReportDetails = viewReportDetails;
window.markAsUrgent = markAsUrgent;
window.showTab = showTab;
window.hideReportDetailsModal = hideReportDetailsModal;
window.editReservation = editReservation;
window.cancelReservation = cancelReservation;
window.completeReservation = completeReservation;
window.viewReservationDetails = viewReservationDetails;
window.showReservationMenu = showReservationMenu;

// Ensure functions are available immediately
if (typeof window !== 'undefined') {
    Object.assign(window, {
        logout,
        showNewReportModal,
        hideNewReportModal,
        showNewReservationModal,
        hideNewReservationModal,
        showReservationDetails,
        reportIssue,
        viewReportDetails,
        markAsUrgent,
        showTab,
        hideReportDetailsModal,
        editReservation,
        cancelReservation,
        completeReservation,
        viewReservationDetails,
        showReservationMenu
    });
}

console.log('Global driver functions loaded');