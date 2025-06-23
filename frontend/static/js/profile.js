// Profile Page JavaScript

// Global functions (need to be accessible from HTML onclick)
// Trigger Profile Picture Upload
function triggerProfilePictureUpload() {
    const input = document.getElementById('profile-picture-input');
    if (input) {
        input.click();
    }
}

// Handle Profile Picture Upload
function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Bitte wählen Sie eine gültige Bilddatei aus.', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Die Datei ist zu groß. Maximale Größe: 5MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    // Show uploading state
    showNotification('Profilbild wird hochgeladen...', 'info');
    
    fetch('/api/profile/picture', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { 
                throw new Error(err.error || 'Fehler beim Hochladen des Profilbilds'); 
            });
        }
        return response.json();
    })
    .then(data => {
        // Show the uploaded image
        const imageUrl = URL.createObjectURL(file);
        showProfilePicture(imageUrl);
        showNotification('Profilbild erfolgreich hochgeladen!', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Fehler beim Hochladen: ' + error.message, 'error');
    });
    
    // Reset input
    event.target.value = '';
}

// Delete Profile Picture
function deleteProfilePicture() {
    if (!confirm('Möchten Sie Ihr Profilbild wirklich löschen?')) {
        return;
    }
    
    fetch('/api/profile/picture', {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { 
                throw new Error(err.error || 'Fehler beim Löschen des Profilbilds'); 
            });
        }
        return response.json();
    })
    .then(data => {
        hideProfilePicture();
        showNotification('Profilbild erfolgreich gelöscht!', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Fehler beim Löschen: ' + error.message, 'error');
    });
}

// Modal Management
function openProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function showChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        // Reset form
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
    // Initialize user avatar
    initializeUserAvatar();
    
    // Initialize tab functionality
    initializeTabs();
    
    // Load initial data
    loadActiveBookings();
    loadProfileStats();
    loadNotificationSettings();
    loadActivityHistory();
    
    // Setup event listeners
    setupEventListeners();
});

// Initialize User Avatar with Initials
function initializeUserAvatar() {
    const avatar = document.getElementById('user-avatar');
    const profilePicture = document.getElementById('profile-picture');
    
    if (avatar) {
        const firstName = avatar.getAttribute('data-firstname') || '';
        const lastName = avatar.getAttribute('data-lastname') || '';
        const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        avatar.textContent = initials;
        
        // Load existing profile picture if available
        loadProfilePicture();
    }
}

// Load Profile Picture
function loadProfilePicture() {
    fetch('/api/profile/picture')
        .then(response => {
            if (response.ok) {
                return response.blob();
            }
            throw new Error('No profile picture found');
        })
        .then(blob => {
            const imageUrl = URL.createObjectURL(blob);
            showProfilePicture(imageUrl);
        })
        .catch(error => {
            // No profile picture exists, show initials
            console.log('No profile picture found, showing initials');
        });
}

// Show Profile Picture
function showProfilePicture(imageUrl) {
    const profilePicture = document.getElementById('profile-picture');
    const avatar = document.getElementById('user-avatar');
    const deleteBtn = document.getElementById('delete-picture-btn');
    
    if (profilePicture && avatar) {
        profilePicture.src = imageUrl;
        profilePicture.classList.remove('hidden');
        avatar.classList.add('hidden');
        
        // Show delete button
        if (deleteBtn) {
            deleteBtn.classList.remove('hidden');
        }
    }
}

// Hide Profile Picture and Show Initials
function hideProfilePicture() {
    const profilePicture = document.getElementById('profile-picture');
    const avatar = document.getElementById('user-avatar');
    const deleteBtn = document.getElementById('delete-picture-btn');
    
    if (profilePicture && avatar) {
        profilePicture.classList.add('hidden');
        avatar.classList.remove('hidden');
        
        // Hide delete button
        if (deleteBtn) {
            deleteBtn.classList.add('hidden');
        }
    }
}

// Tab Management
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.profile-tab-btn');
    const tabContents = document.querySelectorAll('.profile-tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Update button states
            tabButtons.forEach(btn => {
                btn.classList.remove('border-indigo-500', 'text-indigo-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            
            this.classList.remove('border-transparent', 'text-gray-500');
            this.classList.add('border-indigo-500', 'text-indigo-600');
            
            // Update tab content visibility
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
        });
    });
}

// Event Listeners Setup
function setupEventListeners() {
    // Profile form submission
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Password form submission
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // Notification settings
    const saveNotificationsBtn = document.getElementById('save-notifications-btn');
    if (saveNotificationsBtn) {
        saveNotificationsBtn.addEventListener('click', handleNotificationSave);
    }
}

// Profile Update Handler
function handleProfileUpdate(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const profileData = {
        firstName: formData.get('first-name'),
        lastName: formData.get('last-name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        department: formData.get('department'),
        position: formData.get('position')
    };
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Wird gespeichert...';
    submitBtn.disabled = true;
    
    fetch('/api/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { 
                throw new Error(err.error || 'Fehler beim Aktualisieren des Profils'); 
            });
        }
        return response.json();
    })
    .then(data => {
        closeProfileModal();
        updateProfileDisplay(data);
        showNotification('Profil erfolgreich aktualisiert!', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Fehler beim Aktualisieren des Profils: ' + error.message, 'error');
    })
    .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

// Password Change Handler
function handlePasswordChange(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showNotification('Die neuen Passwörter stimmen nicht überein!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('Das neue Passwort muss mindestens 6 Zeichen lang sein!', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Wird geändert...';
    submitBtn.disabled = true;
    
    fetch('/api/profile/password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            currentPassword,
            newPassword
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { 
                throw new Error(err.error || 'Passwortänderung fehlgeschlagen'); 
            });
        }
        return response.json();
    })
    .then(data => {
        closeChangePasswordModal();
        showNotification('Passwort erfolgreich geändert!', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Fehler beim Ändern des Passworts: ' + error.message, 'error');
    })
    .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

// Update Profile Display
function updateProfileDisplay(data) {
    const updates = {
        'profile-firstname': data.firstName || '',
        'profile-lastname': data.lastName || '',
        'profile-email': data.email || '',
        'profile-phone': data.phone || 'Nicht angegeben',
        'profile-department': data.department || 'Nicht angegeben',
        'profile-position': data.position || 'Nicht angegeben'
    };
    
    Object.entries(updates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Load Active Bookings
function loadActiveBookings() {
    fetch('/api/profile/bookings/my-active')
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    return { bookings: [] };
                }
                throw new Error('Fehler beim Laden der Buchungen');
            }
            return response.json();
        })
        .then(data => {
            renderBookings(data.bookings || []);
        })
        .catch(error => {
            console.error('Error loading bookings:', error);
            renderBookingsError();
        });
}

// Render Bookings
function renderBookings(bookings) {
    const tableBody = document.getElementById('active-bookings-table-body');
    if (!tableBody) return;
    
    if (bookings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        <p>Keine aktiven Buchungen vorhanden</p>
                        <a href="/reservations" class="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Fahrzeug buchen
                        </a>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = bookings.map(booking => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${booking.vehicleName || 'Unbekanntes Fahrzeug'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatDate(booking.startDate)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${booking.endDate ? formatDate(booking.endDate) : '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusClass(booking.status)}">
                    ${getStatusText(booking.status)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="/vehicle-details/${booking.vehicleId}" class="text-indigo-600 hover:text-indigo-900">Details</a>
            </td>
        </tr>
    `).join('');
}

// Render Bookings Error
function renderBookingsError() {
    const tableBody = document.getElementById('active-bookings-table-body');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-red-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p>Fehler beim Laden der Buchungen</p>
                        <button onclick="loadActiveBookings()" class="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200">
                            Erneut versuchen
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Load Profile Stats
function loadProfileStats() {
    fetch('/api/profile/stats')
        .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Laden der Statistiken');
            }
            return response.json();
        })
        .then(data => {
            updateStats(data);
        })
        .catch(error => {
            console.error('Error loading stats:', error);
        });
}

// Update Stats Display
function updateStats(stats) {
    const updates = {
        'stats-bookings': stats.bookedRides || 0,
        'stats-vehicles': stats.activeVehicles || 0,
        'stats-kilometers': (stats.totalKilometers || 0).toLocaleString('de-DE') + ' km'
    };
    
    Object.entries(updates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Load Notification Settings
function loadNotificationSettings() {
    fetch('/api/profile/notification-settings')
        .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Laden der Benachrichtigungseinstellungen');
            }
            return response.json();
        })
        .then(data => {
            updateNotificationSettings(data);
        })
        .catch(error => {
            console.error('Error loading notification settings:', error);
        });
}

// Update Notification Settings Display
function updateNotificationSettings(settings) {
    const checkboxes = {
        'email-notifications': settings.emailNotifications,
        'booking-reminders': settings.bookingReminders,
        'fuel-reminders': settings.fuelReminders,
        'maintenance-alerts': settings.maintenanceAlerts
    };
    
    Object.entries(checkboxes).forEach(([id, checked]) => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = checked;
        }
    });
}

// Handle Notification Settings Save
function handleNotificationSave() {
    const settings = {
        emailNotifications: document.getElementById('email-notifications').checked,
        bookingReminders: document.getElementById('booking-reminders').checked,
        fuelReminders: document.getElementById('fuel-reminders').checked,
        maintenanceAlerts: document.getElementById('maintenance-alerts').checked
    };
    
    const saveBtn = document.getElementById('save-notifications-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Wird gespeichert...';
    saveBtn.disabled = true;
    
    fetch('/api/profile/notification-settings', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Fehler beim Speichern der Benachrichtigungseinstellungen');
        }
        return response.json();
    })
    .then(data => {
        showNotification('Benachrichtigungseinstellungen gespeichert!', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Fehler beim Speichern der Einstellungen: ' + error.message, 'error');
    })
    .finally(() => {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    });
}

// Load Activity History
function loadActivityHistory() {
    // Placeholder for activity history - would need backend endpoint
    const activityTimeline = document.getElementById('activity-timeline');
    if (activityTimeline) {
        activityTimeline.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p>Aktivitätsverlauf wird in einer zukünftigen Version verfügbar sein</p>
            </div>
        `;
    }
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function getStatusClass(status) {
    switch (status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'completed': return 'bg-gray-100 text-gray-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'active': return 'Aktiv';
        case 'pending': return 'Ausstehend';
        case 'completed': return 'Abgeschlossen';
        case 'cancelled': return 'Storniert';
        default: return status || 'Unbekannt';
    }
}

// Notification System
function showNotification(message, type = 'info', duration = 4000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.profile-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = 'profile-notification fixed top-4 right-4 z-50 max-w-sm w-full';
    
    let bgColor, textColor, icon;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            textColor = 'text-white';
            icon = '✓';
            break;
        case 'error':
            bgColor = 'bg-red-500';
            textColor = 'text-white';
            icon = '✗';
            break;
        case 'warning':
            bgColor = 'bg-yellow-500';
            textColor = 'text-white';
            icon = '⚠';
            break;
        default:
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
            icon = 'ℹ';
    }
    
    notification.innerHTML = `
        <div class="${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 transform translate-x-full transition-transform duration-300 ease-in-out">
            <span class="font-bold text-lg">${icon}</span>
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 font-bold hover:opacity-75 text-lg">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.firstElementChild.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.firstElementChild.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, duration);
}

// Close modals on outside click
document.addEventListener('click', function(event) {
    const modals = ['edit-profile-modal', 'change-password-modal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && !modal.classList.contains('hidden')) {
            const modalContent = modal.querySelector('.inline-block');
            if (event.target === modal && !modalContent.contains(event.target)) {
                if (modalId === 'edit-profile-modal') {
                    closeProfileModal();
                } else if (modalId === 'change-password-modal') {
                    closeChangePasswordModal();
                }
            }
        }
    });
});

// Close modals with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeProfileModal();
        closeChangePasswordModal();
    }
});