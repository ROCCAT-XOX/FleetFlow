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

    drivers.forEach(driver => {
        const row = document.createElement('tr');
        row.dataset.status = driver.status;

        const statusBadge = getStatusBadge(driver.status);

        const vehicleInfo = driver.vehicleName ?
            `<span class="text-sm text-gray-900">${driver.vehicleName}</span>` :
            `<span class="text-sm text-gray-500">Kein Fahrzeug zugewiesen</span>`;

        const licenseClasses = driver.licenseClasses && driver.licenseClasses.length > 0 ?
            driver.licenseClasses.join(', ') : 'Keine';

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
                        <div class="text-sm font-medium text-gray-900">
                            ${driver.firstName} ${driver.lastName}
                        </div>
                        <div class="text-sm text-gray-500">
                            ${driver.email}
                        </div>
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
                    <button onclick="openAssignVehicleModal('${driver.id}')" 
                            class="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Fahrzeug zuweisen">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0M9 17h6"></path>
                        </svg>
                    </button>
                    <button onclick="openEditDriverModal('${driver.id}')" 
                           class="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                           title="Bearbeiten">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="deleteDriver('${driver.id}')" 
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
}

// Status Badge
function getStatusBadge(status) {
    const statusConfig = {
        'available': { text: 'Verfügbar', class: 'bg-green-100 text-green-800' },
        'onduty': { text: 'Im Dienst', class: 'bg-blue-100 text-blue-800' },
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

    const requestBody = {
        vehicleId: vehicleId || ""
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

                // Erzwungenes Reload mit mehreren Versuchen
                console.log('Reloading drivers with force...');
                setTimeout(() => {
                    loadDrivers(true);

                    // Nochmal nach 1 Sekunde versuchen
                    setTimeout(() => {
                        console.log('Second reload attempt...');
                        loadDrivers(true);
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