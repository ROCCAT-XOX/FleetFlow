// Settings Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Settings page loaded');
    
    // Load SMTP configuration if email tab is available
    if (document.getElementById('email-tab')) {
        loadSMTPConfig();
        loadEmailLogs();
        setupSMTPEventListeners();
    }
});

// Modal handling functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        // Reset form if it exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// User management functions
function submitAddUserForm(event) {
    event.preventDefault();
    
    const form = document.getElementById('addUserForm');
    const formData = new FormData(form);
    
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role') || 'user',
        status: 'active',
        generatePass: document.getElementById('generatePassword') ? document.getElementById('generatePassword').checked : false,
        sendEmail: document.getElementById('sendEmail') ? document.getElementById('sendEmail').checked : false
    };
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Wird hinzugefügt...';
    submitBtn.disabled = true;
    
    fetch('/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            showNotification('Benutzer wurde erfolgreich hinzugefügt', 'success');
            closeModal('addUserModal');
            // Reload page to show new user
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Fehler beim Hinzufügen des Benutzers', 'error');
    })
    .finally(() => {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

function openEditUserModal(userId, firstName, lastName, email, role, status) {
    // Create edit modal if it doesn't exist
    if (!document.getElementById('editUserModal')) {
        createEditUserModal();
    }
    
    // Populate form with user data
    document.getElementById('editUserId').value = userId;
    document.getElementById('editFirstName').value = firstName;
    document.getElementById('editLastName').value = lastName;
    document.getElementById('editEmail').value = email;
    document.getElementById('editRole').value = role;
    document.getElementById('editStatus').value = status;
    
    openModal('editUserModal');
}

function createEditUserModal() {
    const modalHTML = `
    <div id="editUserModal" class="fixed inset-0 z-50 hidden overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>
            <div class="relative bg-white rounded-lg max-w-md w-full mx-auto shadow-xl">
                <div class="flex justify-between items-center px-6 py-4 border-b">
                    <h3 class="text-lg font-medium text-gray-900">Benutzer bearbeiten</h3>
                    <button type="button" onclick="closeModal('editUserModal')" class="text-gray-400 hover:text-gray-500">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form id="editUserForm" onsubmit="submitEditUserForm(event)" class="px-6 py-4">
                    <input type="hidden" id="editUserId" name="userId">
                    <div class="space-y-4">
                        <div>
                            <label for="editFirstName" class="block text-sm font-medium text-gray-700">Vorname</label>
                            <input type="text" name="firstName" id="editFirstName" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                        </div>
                        <div>
                            <label for="editLastName" class="block text-sm font-medium text-gray-700">Nachname</label>
                            <input type="text" name="lastName" id="editLastName" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                        </div>
                        <div>
                            <label for="editEmail" class="block text-sm font-medium text-gray-700">E-Mail</label>
                            <input type="email" name="email" id="editEmail" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                        </div>
                        <div>
                            <label for="editPassword" class="block text-sm font-medium text-gray-700">Neues Passwort (optional)</label>
                            <input type="password" name="password" id="editPassword" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                            <p class="mt-1 text-sm text-gray-500">Leer lassen, um das Passwort nicht zu ändern</p>
                        </div>
                        <div>
                            <label for="editRole" class="block text-sm font-medium text-gray-700">Rolle</label>
                            <select name="role" id="editRole" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                <option value="user">Fahrer</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                        <div>
                            <label for="editStatus" class="block text-sm font-medium text-gray-700">Status</label>
                            <select name="status" id="editStatus" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                <option value="active">Aktiv</option>
                                <option value="inactive">Inaktiv</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-5 flex justify-end space-x-3">
                        <button type="button" onclick="closeModal('editUserModal')" class="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            Abbrechen
                        </button>
                        <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                            Speichern
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function submitEditUserForm(event) {
    event.preventDefault();
    
    const form = document.getElementById('editUserForm');
    const formData = new FormData(form);
    const userId = formData.get('userId');
    
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        role: formData.get('role'),
        status: formData.get('status')
    };
    
    // Only include password if it's provided
    const password = formData.get('password');
    if (password && password.trim() !== '') {
        userData.password = password;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Wird gespeichert...';
    submitBtn.disabled = true;
    
    fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            showNotification('Benutzer wurde erfolgreich aktualisiert', 'success');
            closeModal('editUserModal');
            // Reload page to show updated user
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Fehler beim Aktualisieren des Benutzers', 'error');
    })
    .finally(() => {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

function confirmDeleteUser(userId, userName) {
    if (!document.getElementById('deleteUserModal')) {
        createDeleteUserModal();
    }
    
    document.getElementById('deleteUserId').value = userId;
    document.getElementById('deleteUserName').textContent = userName;
    
    openModal('deleteUserModal');
}

function createDeleteUserModal() {
    const modalHTML = `
    <div id="deleteUserModal" class="fixed inset-0 z-50 hidden overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>
            <div class="relative bg-white rounded-lg max-w-md w-full mx-auto shadow-xl">
                <div class="flex justify-between items-center px-6 py-4 border-b">
                    <h3 class="text-lg font-medium text-gray-900">Benutzer löschen</h3>
                    <button type="button" onclick="closeModal('deleteUserModal')" class="text-gray-400 hover:text-gray-500">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="px-6 py-4">
                    <div class="flex items-center mb-4">
                        <div class="flex-shrink-0">
                            <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-gray-900">Benutzer wirklich löschen?</h3>
                            <p class="mt-1 text-sm text-gray-500">
                                Möchten Sie den Benutzer <span id="deleteUserName" class="font-semibold"></span> wirklich löschen? 
                                Diese Aktion kann nicht rückgängig gemacht werden.
                            </p>
                        </div>
                    </div>
                    <input type="hidden" id="deleteUserId">
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="closeModal('deleteUserModal')" class="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            Abbrechen
                        </button>
                        <button type="button" onclick="deleteUser()" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                            Löschen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function deleteUser() {
    const userId = document.getElementById('deleteUserId').value;
    const deleteBtn = document.querySelector('#deleteUserModal button[onclick="deleteUser()"]');
    const originalText = deleteBtn.textContent;
    
    // Show loading state
    deleteBtn.textContent = 'Wird gelöscht...';
    deleteBtn.disabled = true;
    
    fetch(`/api/users/${userId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            showNotification('Benutzer wurde erfolgreich gelöscht', 'success');
            closeModal('deleteUserModal');
            // Reload page to show updated user list
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Fehler beim Löschen des Benutzers', 'error');
    })
    .finally(() => {
        // Reset button state
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
    });
}

// Notification system
function showNotification(message, type = 'info', duration = 4000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification fixed top-4 right-4 z-50 max-w-sm w-full';
    
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

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modals = ['addUserModal', 'editUserModal', 'deleteUserModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && !modal.classList.contains('hidden')) {
            const modalContent = modal.querySelector('.relative');
            if (event.target === modal && !modalContent.contains(event.target)) {
                closeModal(modalId);
            }
        }
    });
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modals = ['addUserModal', 'editUserModal', 'deleteUserModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && !modal.classList.contains('hidden')) {
                closeModal(modalId);
            }
        });
    }
});

// SMTP Configuration Functions

function setupSMTPEventListeners() {
    const smtpForm = document.getElementById('smtp-config-form');
    if (smtpForm) {
        smtpForm.addEventListener('submit', handleSMTPConfigSave);
    }
}

function loadSMTPConfig() {
    fetch('/api/smtp/config')
        .then(response => response.json())
        .then(data => {
            if (data.config) {
                populateSMTPForm(data.config);
            }
        })
        .catch(error => {
            console.error('Error loading SMTP config:', error);
        });
}

function populateSMTPForm(config) {
    document.getElementById('smtp-host').value = config.host || '';
    document.getElementById('smtp-port').value = config.port || 587;
    document.getElementById('smtp-username').value = config.username || '';
    document.getElementById('smtp-from-name').value = config.fromName || '';
    document.getElementById('smtp-from-email').value = config.fromEmail || '';
    document.getElementById('smtp-use-tls').checked = config.useTLS || false;
    document.getElementById('smtp-use-ssl').checked = config.useSSL || false;
    document.getElementById('smtp-is-active').checked = config.isActive || false;
}

function handleSMTPConfigSave(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const config = {
        host: formData.get('smtp-host'),
        port: parseInt(formData.get('smtp-port')),
        username: formData.get('smtp-username'),
        password: formData.get('smtp-password'),
        fromName: formData.get('smtp-from-name'),
        fromEmail: formData.get('smtp-from-email'),
        useTLS: document.getElementById('smtp-use-tls').checked,
        useSSL: document.getElementById('smtp-use-ssl').checked,
        isActive: document.getElementById('smtp-is-active').checked
    };
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Wird gespeichert...';
    submitBtn.disabled = true;
    
    fetch('/api/smtp/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            showNotification('SMTP-Konfiguration erfolgreich gespeichert!', 'success');
            loadEmailLogs(); // Reload logs after config change
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Fehler beim Speichern der SMTP-Konfiguration', 'error');
    })
    .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

function testSMTPConfig() {
    const config = {
        host: document.getElementById('smtp-host').value,
        port: parseInt(document.getElementById('smtp-port').value),
        username: document.getElementById('smtp-username').value,
        password: document.getElementById('smtp-password').value,
        fromName: document.getElementById('smtp-from-name').value,
        fromEmail: document.getElementById('smtp-from-email').value,
        useTLS: document.getElementById('smtp-use-tls').checked,
        useSSL: document.getElementById('smtp-use-ssl').checked,
        testEmail: prompt('Bitte geben Sie eine E-Mail-Adresse für den Test ein:')
    };
    
    if (!config.testEmail) {
        showNotification('Test-E-Mail-Adresse ist erforderlich', 'warning');
        return;
    }
    
    if (!config.host || !config.port || !config.fromEmail) {
        showNotification('Bitte füllen Sie alle erforderlichen Felder aus', 'warning');
        return;
    }
    
    fetch('/api/smtp/test', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            showNotification(data.message, 'success');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Fehler beim Testen der SMTP-Konfiguration', 'error');
    });
}

function loadEmailLogs() {
    fetch('/api/smtp/logs?limit=20&offset=0')
        .then(response => response.json())
        .then(data => {
            renderEmailLogs(data.logs || []);
        })
        .catch(error => {
            console.error('Error loading email logs:', error);
            renderEmailLogsError();
        });
}

function renderEmailLogs(logs) {
    const tableBody = document.getElementById('email-logs-table');
    if (!tableBody) return;
    
    if (logs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        <p>Noch keine E-Mails versendet</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = logs.map(log => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${log.to}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
                <div class="max-w-xs truncate">${log.subject}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getEmailStatusClass(log.status)}">
                    ${getEmailStatusText(log.status)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${log.sentAt ? formatDateTime(log.sentAt) : '-'}
            </td>
        </tr>
    `).join('');
}

function renderEmailLogsError() {
    const tableBody = document.getElementById('email-logs-table');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="py-8 text-center text-red-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p>Fehler beim Laden der E-Mail-Logs</p>
                        <button onclick="loadEmailLogs()" class="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200">
                            Erneut versuchen
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function getEmailStatusClass(status) {
    switch (status) {
        case 'sent': return 'bg-green-100 text-green-800';
        case 'failed': return 'bg-red-100 text-red-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getEmailStatusText(status) {
    switch (status) {
        case 'sent': return 'Gesendet';
        case 'failed': return 'Fehlgeschlagen';
        case 'pending': return 'Ausstehend';
        default: return status || 'Unbekannt';
    }
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}