// frontend/static/js/drivers.js

let currentDriverId = null;

// Laden und Anzeigen aller Fahrer
async function loadDrivers() {
    try {
        const response = await fetch('/api/drivers');
        const data = await response.json();

        if (data.drivers) {
            renderDrivers(data.drivers);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Fahrer:', error);
        showNotification('Fehler beim Laden der Fahrer', 'error');
    }
}

// Fahrer in Tabelle anzeigen
function renderDrivers(drivers) {
    const tbody = document.getElementById('drivers-table-body');

    if (!tbody) {
        console.error('Drivers table body not found');
        return;
    }

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

    tbody.innerHTML = drivers.map(driver => {
        const statusClass = getStatusClass(driver.status);
        const statusText = getStatusText(driver.status);

        return `
            <tr data-status="${driver.status}">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span class="text-sm font-medium text-gray-700">
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
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${driver.vehicleName || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${driver.licenseClasses ? driver.licenseClasses.join(', ') : '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="openAssignVehicleModal('${driver.id}', '${driver.firstName} ${driver.lastName}')" 
                            class="text-indigo-600 hover:text-indigo-900 mr-3">
                        Fahrzeug zuweisen
                    </button>
                    <a href="/drivers/edit/${driver.id}" class="text-indigo-600 hover:text-indigo-900 mr-3">
                        Bearbeiten
                    </a>
                    <button onclick="deleteDriver('${driver.id}')" class="text-red-600 hover:text-red-900">
                        Löschen
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Hilfsfunktionen für Status
function getStatusClass(status) {
    switch (status) {
        case 'available':
            return 'bg-green-100 text-green-800';
        case 'onduty':
            return 'bg-yellow-100 text-yellow-800';
        case 'offduty':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'available':
            return 'Verfügbar';
        case 'onduty':
            return 'Im Dienst';
        case 'offduty':
            return 'Außer Dienst';
        default:
            return 'Unbekannt';
    }
}

function getInitials(firstName, lastName) {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

// Fahrzeugzuordnungs-Modal öffnen
async function openAssignVehicleModal(driverId, driverName) {
    currentDriverId = driverId;

    const modal = document.getElementById('assign-vehicle-modal');
    const driverInfo = document.getElementById('assign-modal-driver-info');
    const vehicleSelect = document.getElementById('vehicle-select');

    driverInfo.textContent = `Fahrzeug für ${driverName} zuweisen`;

    try {
        // Verfügbare Fahrzeuge laden
        const response = await fetch('/api/vehicles?status=available');
        const data = await response.json();

        // Aktuell zugewiesenes Fahrzeug des Fahrers laden
        const driverResponse = await fetch(`/api/drivers/${driverId}`);
        const driverData = await driverResponse.json();

        // Vehicle-Select befüllen
        vehicleSelect.innerHTML = '<option value="">Kein Fahrzeug zuweisen</option>';

        if (data.vehicles) {
            data.vehicles.forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle.id;
                option.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`;
                vehicleSelect.appendChild(option);
            });
        }

        // Aktuell zugewiesenes Fahrzeug hinzufügen und auswählen
        if (driverData.driver && driverData.driver.assignedVehicleId) {
            const currentVehicleResponse = await fetch(`/api/vehicles/${driverData.driver.assignedVehicleId}`);
            if (currentVehicleResponse.ok) {
                const currentVehicleData = await currentVehicleResponse.json();
                const currentVehicle = currentVehicleData.vehicle;

                let existingOption = vehicleSelect.querySelector(`option[value="${currentVehicle.id}"]`);
                if (!existingOption) {
                    const option = document.createElement('option');
                    option.value = currentVehicle.id;
                    option.textContent = `${currentVehicle.brand} ${currentVehicle.model} (${currentVehicle.licensePlate}) - Aktuell zugewiesen`;
                    vehicleSelect.appendChild(option);
                }

                vehicleSelect.value = currentVehicle.id;
            }
        }

        modal.classList.remove('hidden');

    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeuge:', error);
        showNotification('Fehler beim Laden der Fahrzeuge', 'error');
    }
}

// Fahrzeug zuweisen
async function assignVehicle() {
    if (!currentDriverId) return;

    const vehicleSelect = document.getElementById('vehicle-select');
    const vehicleId = vehicleSelect.value;

    try {
        const response = await fetch(`/api/drivers/${currentDriverId}/assign-vehicle`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vehicleId: vehicleId
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fehler beim Zuweisen des Fahrzeugs');
        }

        const data = await response.json();
        showNotification(data.message, 'success');

        closeAssignVehicleModal();
        loadDrivers();

    } catch (error) {
        console.error('Fehler beim Zuweisen des Fahrzeugs:', error);
        showNotification(error.message, 'error');
    }
}

// Modal schließen
function closeAssignVehicleModal() {
    const modal = document.getElementById('assign-vehicle-modal');
    modal.classList.add('hidden');
    currentDriverId = null;
}

// Fahrer löschen
async function deleteDriver(driverId) {
    if (!confirm('Möchten Sie diesen Fahrer wirklich löschen?')) {
        return;
    }

    try {
        const response = await fetch(`/api/drivers/${driverId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Fehler beim Löschen des Fahrers');
        }

        showNotification('Fahrer erfolgreich gelöscht', 'success');
        loadDrivers();

    } catch (error) {
        console.error('Fehler beim Löschen:', error);
        showNotification('Fehler beim Löschen des Fahrers', 'error');
    }
}

// Suchfunktion
function setupSearch() {
    const searchInput = document.getElementById('search');
    const statusFilter = document.getElementById('status-filter');

    function filterDrivers() {
        const searchText = searchInput.value.toLowerCase();
        const statusFilterValue = document.getElementById('status-filter').value;
        const rows = document.querySelectorAll('#drivers-table-body tr[data-status]');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const status = row.dataset.status;

            const matchesSearch = text.includes(searchText);
            const matchesStatus = !statusFilterValue || status === statusFilterValue;

            if (matchesSearch && matchesStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterDrivers);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', filterDrivers);
    }
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

// Event-Listener beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    loadDrivers();
    setupSearch();

    const modal = document.getElementById('assign-vehicle-modal');
    const assignBtn = document.getElementById('assign-vehicle-btn');
    const cancelBtn = document.getElementById('cancel-assign-btn');

    if (assignBtn) {
        assignBtn.addEventListener('click', assignVehicle);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeAssignVehicleModal);
    }

    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeAssignVehicleModal();
            }
        });
    }
});

// Globale Funktionen
window.openAssignVehicleModal = openAssignVehicleModal;
window.deleteDriver = deleteDriver;