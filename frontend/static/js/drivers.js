// frontend/static/js/drivers.js

let currentDriverId = null;
let isEditMode = false;

// DOM geladen
document.addEventListener('DOMContentLoaded', function() {
    console.log('Drivers page loaded');

    // Fahrer laden
    loadDrivers();

    // Event Listeners
    setupEventListeners();

    // URL-Parameter prüfen für automatisches Öffnen des Edit-Modals
    const urlParams = new URLSearchParams(window.location.search);
    const editDriverId = urlParams.get('edit');
    if (editDriverId) {
        // Kurz warten, damit die Fahrer geladen sind, dann Modal öffnen
        setTimeout(() => {
            openEditDriverModal(editDriverId);
            // URL-Parameter entfernen, ohne die Seite neu zu laden
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
    }
});

// Event Listeners einrichten
function setupEventListeners() {
    // Driver Form Submit
    const driverForm = document.getElementById('driver-form');
    if (driverForm) {
        driverForm.addEventListener('submit', handleDriverSubmit);
    }

    // Assign Vehicle Button
    const assignBtn = document.getElementById('assign-vehicle-btn');
    if (assignBtn) {
        assignBtn.addEventListener('click', assignVehicle);
    }

    // Upload Form Submit
    const uploadForm = document.getElementById('document-upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleDocumentUpload);
    }

    // Modal Click Outside
    document.getElementById('driver-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeDriverModal();
        }
    });

    document.getElementById('assign-vehicle-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAssignVehicleModal();
        }
    });

    // Search
    document.getElementById('search').addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        const rows = document.querySelectorAll('#drivers-table-body tr[data-status]');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchText) ? '' : 'none';
        });
    });

    // Status Filter
    document.getElementById('status-filter').addEventListener('change', function() {
        const selectedStatus = this.value;
        const rows = document.querySelectorAll('#drivers-table-body tr[data-status]');

        rows.forEach(row => {
            if (selectedStatus === '' || row.dataset.status === selectedStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// Fahrer laden
function loadDrivers(forceReload = false) {
    console.log('Loading drivers... (forceReload:', forceReload, ')');

    const url = forceReload ? '/api/drivers?_t=' + new Date().getTime() : '/api/drivers';

    fetch(url, {
        method: 'GET',
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    })
        .then(response => {
            console.log('Drivers API response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Drivers data received:', data);

            // Debug: Spezifische Fahrer-Info
            if (data.drivers && data.drivers.length > 0) {
                data.drivers.forEach(driver => {
                    console.log(`Driver ${driver.firstName} ${driver.lastName}:`, {
                        id: driver.id,
                        assignedVehicleId: driver.assignedVehicleId,
                        vehicleName: driver.vehicleName,
                        status: driver.status
                    });
                });
            }

            renderDrivers(data.drivers || []);
        })
        .catch(error => {
            console.error('Error loading drivers:', error);
            showNotification('Fehler beim Laden der Fahrer', 'error');
        });
}

// Fahrzeuge für Dropdown laden
function loadVehiclesForDropdown(currentVehicleId = null) {
    // Alle Fahrzeuge laden (verfügbare + aktuell zugewiesenes)
    return fetch('/api/vehicles')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('driver-assigned-vehicle');
            select.innerHTML = '<option value="">Kein Fahrzeug zuweisen</option>';

            if (data.vehicles) {
                data.vehicles.forEach(vehicle => {
                    // Nur verfügbare Fahrzeuge oder das aktuell zugewiesene zeigen
                    if (vehicle.status === 'available' || vehicle.id === currentVehicleId) {
                        const option = document.createElement('option');
                        option.value = vehicle.id;
                        option.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`;

                        // Aktuell zugewiesenes Fahrzeug vorauswählen
                        if (vehicle.id === currentVehicleId) {
                            option.selected = true;
                        }

                        select.appendChild(option);
                    }
                });
            }
        });
}


// Fahrer rendern
function renderDrivers(drivers) {
    const tbody = document.getElementById('drivers-table-body');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    console.log('=== renderDrivers Debug ===');
    console.log('Total drivers to render:', drivers.length);

    tbody.innerHTML = '';

    if (!drivers || drivers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    Keine Fahrer vorhanden
                </td>
            </tr>
        `;
        return;
    }

    drivers.forEach((driver, index) => {
        console.log(`Driver ${index + 1}:`, {
            name: `${driver.firstName} ${driver.lastName}`,
            id: driver.id,
            status: driver.status,
            assignedVehicleId: driver.assignedVehicleId,
            vehicleName: driver.vehicleName
        });

        const row = document.createElement('tr');
        row.dataset.status = driver.status;

        const statusBadge = getStatusBadge(driver.status);

        const vehicleInfo = driver.vehicleName ?
            `<span class="text-sm text-gray-900">${driver.vehicleName}</span>` :
            `<span class="text-sm text-gray-500">Kein Fahrzeug zugewiesen</span>`;

        console.log(`Vehicle info for ${driver.firstName} ${driver.lastName}:`, vehicleInfo);

        const licenseClasses = driver.licenseClasses && driver.licenseClasses.length > 0 ?
            driver.licenseClasses.join(', ') : 'Keine';

        row.className = "cursor-pointer hover:bg-blue-50 hover:shadow-lg transition-all duration-200 ease-in-out group relative";
        row.style.borderLeft = "4px solid transparent";
        row.onclick = function() { openEditDriverModal(driver.id); };

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span class="text-sm font-medium text-indigo-800">
                                ${getInitials(driver.firstName, driver.lastName)}
                            </span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900 flex items-center">
                            ${driver.firstName} ${driver.lastName}
                            ${driver.hasLicense ?
                        driver.licenseExpired ?
                            '<svg class="ml-2 h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20" title="Führerschein abgelaufen"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>' :
                            '<svg class="ml-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20" title="Führerschein vorhanden"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>'
                        : '<svg class="ml-2 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20" title="Kein Führerschein hinterlegt"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>'
                    }
                        </div>
                        <div class="text-sm text-gray-500">
                            ${driver.email}
                        </div>
                        ${driver.driverNumber ? `<div class="text-xs text-gray-400">Fahrer-Nr: ${driver.driverNumber}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${vehicleInfo}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${licenseClasses}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                    <button onclick="event.stopPropagation(); openDocumentsModal('${driver.id}')" 
                            class="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                            title="Dokumente">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); openAssignVehicleModal('${driver.id}')" 
                            class="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Fahrzeug zuweisen">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0M9 17h6"></path>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); openEditDriverModal('${driver.id}')" 
                           class="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                           title="Bearbeiten">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); deleteDriver('${driver.id}')" 
                            class="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Löschen">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Verbesserte Hover-Effekte mit explizitem Styling für alle Zeilen
    tbody.addEventListener('mouseover', function(e) {
        const row = e.target.closest('tr[data-status]');
        if (row) {
            row.style.backgroundColor = 'rgb(239 246 255)'; // bg-blue-50
            row.style.borderLeftColor = 'rgb(96 165 250)'; // border-blue-400
            row.style.borderLeftWidth = '4px';
            row.style.borderLeftStyle = 'solid';
            row.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'; // shadow-lg
            row.style.transform = 'translateX(2px)';
            row.style.transition = 'all 0.2s ease-in-out';
        }
    });

    tbody.addEventListener('mouseout', function(e) {
        const row = e.target.closest('tr[data-status]');
        if (row) {
            row.style.backgroundColor = '';
            row.style.borderLeftColor = 'transparent';
            row.style.borderLeftWidth = '4px';
            row.style.borderLeftStyle = 'solid';
            row.style.boxShadow = '';
            row.style.transform = 'translateX(0)';
        }
    });

    // Event-Delegation für dynamisch erstellte Zeilen (fallback falls onclick nicht funktioniert)
    tbody.addEventListener('click', function(e) {
        // Finde die Tabellenzeile
        const row = e.target.closest('tr[data-status]');
        if (!row) return;

        // Prüfe ob das Klick-Event von einem Button kam
        if (e.target.closest('button')) {
            return; // Button-Event nicht überschreiben
        }

        // Extrahiere Driver-ID aus dem onclick-Attribut
        const onclickAttr = row.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/openEditDriverModal\('([^']+)'\)/);
            if (match) {
                openEditDriverModal(match[1]);
            }
        }
    });

    console.log('renderDrivers completed');
}

// Status Badge
function getStatusBadge(status) {
    const statusConfig = {
        'available': { text: 'Verfügbar', class: 'bg-green-100 text-green-800' },
        'onduty': { text: 'Im Dienst', class: 'bg-blue-100 text-blue-800' },
        'reserved': { text: 'Reserviert', class: 'bg-yellow-100 text-yellow-800' },
        'offduty': { text: 'Außer Dienst', class: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status] || { text: status, class: 'bg-gray-100 text-gray-800' };

    return `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.class}">
                ${config.text}
            </span>`;
}

// Initialen generieren
function getInitials(firstName, lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Neuen Fahrer Modal öffnen
function openCreateDriverModal() {
    isEditMode = false;
    currentDriverId = null;

    document.getElementById('driver-modal-title').textContent = 'Neuen Fahrer hinzufügen';
    document.getElementById('driver-submit-btn').textContent = 'Erstellen';

    // Fahrzeugzuweisung verstecken (nur bei Bearbeitung)
    document.getElementById('vehicle-assignment-section').classList.add('hidden');

    // Formular zurücksetzen
    document.getElementById('driver-form').reset();

    // Alle Checkboxes deaktivieren
    document.querySelectorAll('input[name="licenseClasses"]').forEach(cb => cb.checked = false);

    document.getElementById('driver-modal').classList.remove('hidden');
}

// Fahrer bearbeiten Modal öffnen
function openEditDriverModal(driverId) {
    isEditMode = true;
    currentDriverId = driverId;

    document.getElementById('driver-modal-title').textContent = 'Fahrer bearbeiten';
    document.getElementById('driver-submit-btn').textContent = 'Speichern';

    // Fahrzeugzuweisung anzeigen
    document.getElementById('vehicle-assignment-section').classList.remove('hidden');

    // Fahrerdaten laden
    fetch(`/api/drivers/${driverId}`)
        .then(response => response.json())
        .then(data => {
            const driver = data.driver;

            // Formular füllen
            document.getElementById('driver-firstName').value = driver.firstName || '';
            document.getElementById('driver-lastName').value = driver.lastName || '';
            document.getElementById('driver-driverNumber').value = driver.driverNumber || '';
            document.getElementById('driver-email').value = driver.email || '';
            document.getElementById('driver-phone').value = driver.phone || '';
            document.getElementById('driver-status').value = driver.status || 'available';
            document.getElementById('driver-notes').value = driver.notes || '';

            // Führerscheinklassen setzen
            document.querySelectorAll('input[name="licenseClasses"]').forEach(cb => cb.checked = false);
            if (driver.licenseClasses) {
                driver.licenseClasses.forEach(licenseClass => {
                    const checkbox = document.querySelector(`input[name="licenseClasses"][value="${licenseClass}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }

            // Fahrzeuge für Dropdown laden und aktuelles Fahrzeug vorauswählen
            const currentVehicleId = driver.assignedVehicleId && driver.assignedVehicleId !== "000000000000000000000000" ? driver.assignedVehicleId : null;
            loadVehiclesForDropdown(currentVehicleId).then(() => {
                document.getElementById('driver-modal').classList.remove('hidden');
            });
        })
        .catch(error => {
            console.error('Error loading driver:', error);
            showNotification('Fehler beim Laden der Fahrerdaten', 'error');
        });
}

// Driver Modal schließen
function closeDriverModal() {
    document.getElementById('driver-modal').classList.add('hidden');
    isEditMode = false;
    currentDriverId = null;
}

// Driver Form Submit - auch hier erzwungenes Reload
function handleDriverSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const driverData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        driverNumber: formData.get('driverNumber'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        status: formData.get('status'),
        notes: formData.get('notes'),
        licenseClasses: formData.getAll('licenseClasses')
    };

    // Bei Bearbeitung auch Fahrzeugzuweisung berücksichtigen
    if (isEditMode) {
        const assignedVehicleId = formData.get('assignedVehicleId');
        if (assignedVehicleId) {
            driverData.assignedVehicleId = assignedVehicleId;
        }
        console.log('Edit mode - including vehicle assignment:', assignedVehicleId);
    }

    const url = isEditMode ? `/api/drivers/${currentDriverId}` : '/api/drivers';
    const method = isEditMode ? 'PUT' : 'POST';

    console.log('Sending driver data:', driverData);

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(driverData)
    })
        .then(response => response.json())
        .then(data => {
            console.log('Driver save response:', data);
            if (data.driver) {
                const message = isEditMode ? 'Fahrer erfolgreich aktualisiert' : 'Fahrer erfolgreich erstellt';
                showNotification(message, 'success');

                closeDriverModal();

                // Erzwungenes Reload
                setTimeout(() => {
                    loadDrivers(true);
                }, 200);
            } else {
                throw new Error(data.error || 'Unbekannter Fehler');
            }
        })
        .catch(error => {
            console.error('Error saving driver:', error);
            showNotification('Fehler beim Speichern: ' + error.message, 'error');
        });
}

// Fahrzeugzuordnungs-Modal öffnen
function openAssignVehicleModal(driverId) {
    currentDriverId = driverId;

    // Fahrer-Info laden
    fetch(`/api/drivers/${driverId}`)
        .then(response => response.json())
        .then(data => {
            const driver = data.driver;
            document.getElementById('assign-modal-driver-info').textContent =
                `Fahrzeug für ${driver.firstName} ${driver.lastName} zuweisen`;

            // Aktuell zugewiesenes Fahrzeug in die Auswahl einbeziehen
            const currentVehicleId = driver.assignedVehicleId && driver.assignedVehicleId !== "000000000000000000000000" ? driver.assignedVehicleId : null;
            return loadVehiclesForAssignModal(currentVehicleId);
        })
        .then(() => {
            document.getElementById('assign-vehicle-modal').classList.remove('hidden');
        });
}

// Fahrzeuge für Assign Modal laden
function loadVehiclesForAssignModal(currentVehicleId = null) {
    return fetch('/api/vehicles')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('vehicle-select');
            select.innerHTML = '<option value="">Kein Fahrzeug zuweisen</option>';

            if (data.vehicles) {
                data.vehicles.forEach(vehicle => {
                    // Verfügbare Fahrzeuge oder das aktuell zugewiesene zeigen
                    if (vehicle.status === 'available' || vehicle.id === currentVehicleId) {
                        const option = document.createElement('option');
                        option.value = vehicle.id;
                        option.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`;

                        // Aktuell zugewiesenes Fahrzeug vorauswählen
                        if (vehicle.id === currentVehicleId) {
                            option.selected = true;
                        }

                        select.appendChild(option);
                    }
                });
            }
        });
}


// Fahrzeugzuordnung durchführen
function assignVehicle() {
    const vehicleId = document.getElementById('vehicle-select').value;

    console.log('=== ASSIGN VEHICLE DEBUG ===');
    console.log('Selected vehicle ID:', vehicleId);
    console.log('Current driver ID:', currentDriverId);
    console.log('Vehicle ID length:', vehicleId.length);
    console.log('Is empty string?', vehicleId === '');
    console.log('Vehicle ID type:', typeof vehicleId);

    const requestBody = {
        vehicleId: vehicleId === "" ? "" : vehicleId
    };

    console.log('Request body:', JSON.stringify(requestBody));

    fetch(`/api/drivers/${currentDriverId}/assign-vehicle`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Assign vehicle response data:', data);
            if (data.message) {
                showNotification(data.message, 'success');
                closeAssignVehicleModal();

                // Mehrfache Reloads mit Verzögerung für Konsistenz
                console.log('Reloading drivers with force...');
                setTimeout(() => {
                    loadDrivers(true);

                    // Zweiter Reload nach 1 Sekunde
                    setTimeout(() => {
                        console.log('Second reload attempt...');
                        loadDrivers(true);

                        // Dritter Reload nach weiteren 2 Sekunden
                        setTimeout(() => {
                            console.log('Final reload attempt...');
                            loadDrivers(true);
                        }, 2000);
                    }, 1000);
                }, 200);
            } else if (data.error) {
                throw new Error(data.error);
            }
        })
        .catch(error => {
            console.error('Error assigning vehicle:', error);
            showNotification('Fehler beim Zuweisen des Fahrzeugs: ' + error.message, 'error');
        });
}

// Assign Vehicle Modal schließen
function closeAssignVehicleModal() {
    document.getElementById('assign-vehicle-modal').classList.add('hidden');
    currentDriverId = null;
}

// Fahrer löschen
function deleteDriver(driverId) {
    if (!confirm('Möchten Sie diesen Fahrer wirklich löschen?')) {
        return;
    }

    fetch(`/api/drivers/${driverId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            showNotification('Fahrer erfolgreich gelöscht', 'success');
            loadDrivers();
        })
        .catch(error => {
            console.error('Error deleting driver:', error);
            showNotification('Fehler beim Löschen des Fahrers', 'error');
        });
}

// Notification anzeigen
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// === DRIVER DOCUMENTS FUNCTIONS ===

let currentDocumentDriverId = null;

// Dokumente Modal öffnen
function openDocumentsModal(driverId) {
    currentDocumentDriverId = driverId;

    // Fahrer-Info laden
    fetch(`/api/drivers/${driverId}`)
        .then(response => response.json())
        .then(data => {
            const driver = data.driver;
            const modalTitle = document.querySelector('#documents-modal h3');
            modalTitle.textContent = `Dokumente für ${driver.firstName} ${driver.lastName}`;

            // Dokumente laden
            loadDriverDocuments(driverId);
        });

    document.getElementById('documents-modal').classList.remove('hidden');
}

// Dokumente Modal schließen
function closeDocumentsModal() {
    document.getElementById('documents-modal').classList.add('hidden');
    currentDocumentDriverId = null;
}

// Upload Form öffnen
function openUploadDocumentForm() {
    document.getElementById('document-upload-form').reset();
    toggleLicenseFields(); // Führerschein-Felder initial anzeigen
    document.getElementById('document-upload-modal').classList.remove('hidden');
}

// Upload Form schließen
function closeUploadDocumentForm() {
    document.getElementById('document-upload-modal').classList.add('hidden');
}

// Führerschein-spezifische Felder ein-/ausblenden
function toggleLicenseFields() {
    const docType = document.getElementById('doc-type').value;
    const licenseFields = document.getElementById('license-fields');

    if (docType === 'driver_license') {
        licenseFields.style.display = 'block';
    } else {
        licenseFields.style.display = 'none';
    }
}

// Fahrerdokumente laden
function loadDriverDocuments(driverId) {
    fetch(`/api/drivers/${driverId}/documents`)
        .then(response => response.json())
        .then(data => {
            renderDocuments(data.documents || []);
        })
        .catch(error => {
            console.error('Error loading documents:', error);
            showNotification('Fehler beim Laden der Dokumente', 'error');
        });
}

// Dokumente rendern
function renderDocuments(documents) {
    const container = document.getElementById('documents-list');

    if (documents.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="mt-2">Keine Dokumente vorhanden</p>
            </div>
        `;
        return;
    }

    container.innerHTML = documents.map(doc => {
        const expiryBadge = doc.isExpired ?
            '<span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Abgelaufen</span>' :
            doc.isExpiring ?
                '<span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Läuft bald ab</span>' : '';

        const iconClass = doc.contentType.startsWith('image/') ? 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' :
            'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';

        return `
            <div class="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="flex-shrink-0">
                        <svg class="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconClass}" />
                        </svg>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-900">
                            ${doc.name}
                            ${expiryBadge}
                        </h4>
                        <p class="text-sm text-gray-500">${doc.typeText} • ${doc.fileName}</p>
                        ${doc.licenseNumber ? `<p class="text-xs text-gray-500">Nr.: ${doc.licenseNumber}</p>` : ''}
                        ${doc.expiryDate ? `<p class="text-xs text-gray-500">Gültig bis: ${formatDate(doc.expiryDate)}</p>` : ''}
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="viewDocument('${doc.id}')" 
                            class="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Ansehen">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                    <button onclick="downloadDocument('${doc.id}')" 
                            class="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                            title="Herunterladen">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </button>
                    <button onclick="deleteDocument('${doc.id}')" 
                            class="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Löschen">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Dokument ansehen
function viewDocument(documentId) {
    window.open(`/api/driver-documents/${documentId}/view`, '_blank');
}

// Dokument herunterladen
function downloadDocument(documentId) {
    window.location.href = `/api/driver-documents/${documentId}/download`;
}

// Dokument löschen
function deleteDocument(documentId) {
    if (!confirm('Möchten Sie dieses Dokument wirklich löschen?')) {
        return;
    }

    fetch(`/api/driver-documents/${documentId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            showNotification('Dokument erfolgreich gelöscht', 'success');
            loadDriverDocuments(currentDocumentDriverId);
        })
        .catch(error => {
            console.error('Error deleting document:', error);
            showNotification('Fehler beim Löschen des Dokuments', 'error');
        });
}

// Datum formatieren
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
}


// Dokument Upload Handler
function handleDocumentUpload(e) {
    e.preventDefault();

    const formData = new FormData(e.target);

    fetch(`/api/drivers/${currentDocumentDriverId}/documents`, {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.document) {
                showNotification('Dokument erfolgreich hochgeladen', 'success');
                closeUploadDocumentForm();
                loadDriverDocuments(currentDocumentDriverId);
            } else {
                throw new Error(data.error || 'Unbekannter Fehler');
            }
        })
        .catch(error => {
            console.error('Error uploading document:', error);
            showNotification('Fehler beim Hochladen: ' + error.message, 'error');
        });
}