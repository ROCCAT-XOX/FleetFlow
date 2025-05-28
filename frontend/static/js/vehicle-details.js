// frontend/static/js/vehicle-details.js
document.addEventListener('DOMContentLoaded', async function() {
    const vehicleId = window.location.pathname.split('/').pop();

    // Initialisierung
    await loadVehicleDetails(vehicleId);
    initializeTabs();
    initializeModals();

    // Tab-spezifische Initialisierungen
    initializeBasicInfo(vehicleId);
    initializeCurrentUsage(vehicleId);
    initializeUsageHistory(vehicleId);
    initializeMaintenance(vehicleId);
    initializeFuelCosts(vehicleId);
    initializeRegistration(vehicleId);
    initializeStatistics(vehicleId);
});

// Fahrzeugdetails laden
async function loadVehicleDetails(vehicleId) {
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Fahrzeugdaten');

        const data = await response.json();
        const vehicle = data.vehicle;

        // Markenlogo laden
        const brandLogo = document.getElementById('brand-logo');
        if (brandLogo && vehicle.brand) {
            // Logo-Pfad erstellen
            const logoPath = `static/assets/logo/${vehicle.brand.toLowerCase()}.svg`;

            // Direkt das src-Attribut setzen
            brandLogo.src = logoPath;
            brandLogo.alt = vehicle.brand;

            // Event-Listener für erfolgreichen Ladevorgang
            brandLogo.onload = function() {
                brandLogo.classList.remove('hidden');
                console.log('Logo erfolgreich geladen:', logoPath);
            };

            // Event-Listener für Fehler beim Laden
            brandLogo.onerror = function() {
                console.log('Logo nicht gefunden:', logoPath);
                // Versuche alternatives Format oder verstecke das Element
                const altLogoPath = `static/assets/logo/${vehicle.brand.toLowerCase()}.png`;

                brandLogo.src = altLogoPath;
                brandLogo.onload = function() {
                    brandLogo.classList.remove('hidden');
                    console.log('Alternatives Logo geladen:', altLogoPath);
                };

                brandLogo.onerror = function() {
                    brandLogo.classList.add('hidden');
                    console.log('Kein Logo gefunden für:', vehicle.brand);
                };
            };
        }

    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Laden der Fahrzeugdaten', 'error');
    }
}

// Status Badge aktualisieren
function updateStatusBadge(status) {
    const badge = document.getElementById('vehicle-status-badge');
    badge.className = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full';

    switch(status) {
        case 'available':
            badge.className += ' bg-green-100 text-green-800';
            badge.textContent = 'Verfügbar';
            break;
        case 'inuse':
            badge.className += ' bg-yellow-100 text-yellow-800';
            badge.textContent = 'In Benutzung';
            break;
        case 'maintenance':
            badge.className += ' bg-red-100 text-red-800';
            badge.textContent = 'In Wartung';
            break;
        default:
            badge.className += ' bg-gray-100 text-gray-800';
            badge.textContent = 'Unbekannt';
    }
}

// Tab-System initialisieren
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.vehicle-tab-btn');
    const tabContents = document.querySelectorAll('.vehicle-tab-content');
    const mobileSelect = document.getElementById('tabs');

    // Desktop Tab-Buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            switchTab(targetTab);
        });
    });

    // Mobile Dropdown
    if (mobileSelect) {
        mobileSelect.addEventListener('change', (e) => {
            switchTab(e.target.value);
        });
    }
}

// Tab wechseln
function switchTab(targetTab) {
    // Alle Tab-Inhalte verstecken
    document.querySelectorAll('.vehicle-tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Alle Tab-Buttons deaktivieren
    document.querySelectorAll('.vehicle-tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });

    // Gewählten Tab anzeigen
    const targetContent = document.getElementById(targetTab);
    if (targetContent) {
        targetContent.classList.remove('hidden');
    }

    // Gewählten Tab-Button aktivieren
    const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
    if (targetButton) {
        targetButton.classList.add('border-blue-500', 'text-blue-600');
        targetButton.classList.remove('border-transparent', 'text-gray-500');
    }

    // Mobile Dropdown aktualisieren
    const mobileSelect = document.getElementById('tabs');
    if (mobileSelect) {
        mobileSelect.value = targetTab;
    }
}

// Basis-Informationen initialisieren
function initializeBasicInfo(vehicleId) {
    const editBtn = document.getElementById('edit-vehicle-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            openEditVehicleModal(vehicleId);
        });
    }

    loadBasicInfo(vehicleId);
}

// Basis-Informationen laden
async function loadBasicInfo(vehicleId) {
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Basisdaten');

        const data = await response.json();
        const vehicle = data.vehicle;

        // Felder aktualisieren
        document.getElementById('license-plate-display').textContent = vehicle.licensePlate || '-';
        document.getElementById('brand-model-display').textContent = `${vehicle.brand} ${vehicle.model}` || '-';
        document.getElementById('year-display').textContent = vehicle.year || '-';
        document.getElementById('color-display').textContent = vehicle.color || '-';
        document.getElementById('vehicle-id-display').textContent = vehicle.vehicleId || '-';
        document.getElementById('vin-display').textContent = vehicle.vin || '-';
        document.getElementById('fuel-type-display').textContent = vehicle.fuelType || '-';
        document.getElementById('mileage-display').textContent = vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : '-';

    } catch (error) {
        console.error('Fehler:', error);
    }
}

// Aktuelle Nutzung initialisieren
function initializeCurrentUsage(vehicleId) {
    const editBtn = document.getElementById('edit-current-usage-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            openEditCurrentUsageModal(vehicleId);
        });
    }

    loadCurrentUsage(vehicleId);
}

// Aktuelle Nutzung laden
async function loadCurrentUsage(vehicleId) {
    try {
        const response = await fetch(`/api/usage/vehicle/${vehicleId}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Nutzungsdaten');

        const data = await response.json();
        const activeUsage = data.usage.find(u => u.status === 'active');

        const container = document.querySelector('#current-usage .sm\\:p-6');

        if (activeUsage) {
            // HTML für aktive Nutzung generieren
            container.innerHTML = `
                <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Aktueller Fahrer</dt>
                        <dd class="mt-1 text-sm text-gray-900">${activeUsage.driverName || 'Unbekannt'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Abteilung</dt>
                        <dd class="mt-1 text-sm text-gray-900">${activeUsage.department || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Nutzung seit</dt>
                        <dd class="mt-1 text-sm text-gray-900">${formatDateTime(activeUsage.startDate)}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Geplante Rückgabe</dt>
                        <dd class="mt-1 text-sm text-gray-900">${activeUsage.endDate ? formatDateTime(activeUsage.endDate) : 'Nicht festgelegt'}</dd>
                    </div>
                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-gray-500">Projekt/Zweck</dt>
                        <dd class="mt-1 text-sm text-gray-900">${activeUsage.purpose || '-'}</dd>
                    </div>
                </dl>
            `;
        } else {
            container.innerHTML = `
                <div class="text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-gray-900">Keine aktive Nutzung</h3>
                    <p class="mt-1 text-sm text-gray-500">Das Fahrzeug wird derzeit nicht genutzt.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Fehler:', error);
    }
}

// Nutzungshistorie initialisieren
function initializeUsageHistory(vehicleId) {
    const addBtn = document.getElementById('add-usage-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openAddUsageModal(vehicleId);
        });
    }

    loadUsageHistory(vehicleId);
}

// Nutzungshistorie laden
async function loadUsageHistory(vehicleId) {
    try {
        const response = await fetch(`/api/usage/vehicle/${vehicleId}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Nutzungshistorie');

        const data = await response.json();
        const tbody = document.getElementById('usage-table-body');

        if (data.usage && data.usage.length > 0) {
            tbody.innerHTML = data.usage.map(usage => `
                <tr>
                    <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div class="text-gray-900">${formatDate(usage.startDate)} - ${usage.endDate ? formatDate(usage.endDate) : 'Aktiv'}</div>
                        <div class="text-gray-500">${formatTime(usage.startDate)} - ${usage.endDate ? formatTime(usage.endDate) : ''}</div>
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${usage.driverName || 'Unbekannt'}
                    </td>
                    <td class="px-3 py-4 text-sm text-gray-500">
                        ${usage.purpose || '-'}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${usage.startMileage ? `${usage.startMileage.toLocaleString()} - ${usage.endMileage ? usage.endMileage.toLocaleString() : '?'} km` : '-'}
                    </td>
                    <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button class="text-indigo-600 hover:text-indigo-900" onclick="editUsage('${usage.id}')">Bearbeiten</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">Keine Nutzungshistorie vorhanden</td></tr>';
        }
    } catch (error) {
        console.error('Fehler:', error);
    }
}

// Wartung initialisieren
function initializeMaintenance(vehicleId) {
    const addBtn = document.getElementById('add-maintenance-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openAddMaintenanceModal(vehicleId);
        });
    }

    loadMaintenance(vehicleId);
}

// Wartungseinträge laden
async function loadMaintenance(vehicleId) {
    try {
        const response = await fetch(`/api/maintenance/vehicle/${vehicleId}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Wartungsdaten');

        const data = await response.json();
        const tbody = document.getElementById('maintenance-table-body');

        if (data.maintenance && data.maintenance.length > 0) {
            tbody.innerHTML = data.maintenance.map(entry => `
                <tr>
                    <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        ${formatDate(entry.date)}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${getMaintenanceTypeText(entry.type)}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${entry.mileage ? entry.mileage.toLocaleString() + ' km' : '-'}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${entry.cost ? '€ ' + entry.cost.toFixed(2) : '-'}
                    </td>
                    <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        <button class="text-indigo-600 hover:text-indigo-900" onclick="editMaintenance('${entry.id}')">Details</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">Keine Wartungseinträge vorhanden</td></tr>';
        }
    } catch (error) {
        console.error('Fehler:', error);
    }
}

// Tankkosten initialisieren
function initializeFuelCosts(vehicleId) {
    const addBtn = document.getElementById('add-vehicle-fuel-cost-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openAddFuelCostModal(vehicleId);
        });
    }

    loadFuelCosts(vehicleId);
}

// Tankkosten laden
async function loadFuelCosts(vehicleId) {
    try {
        const response = await fetch(`/api/fuelcosts/vehicle/${vehicleId}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Tankkosten');

        const data = await response.json();
        const tbody = document.getElementById('vehicle-fuel-costs-body');

        if (data.fuelCosts && data.fuelCosts.length > 0) {
            tbody.innerHTML = data.fuelCosts.map(entry => `
                <tr>
                    <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        ${formatDate(entry.date)}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${entry.fuelType}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${entry.amount.toFixed(2)} ${entry.fuelType === 'Elektro' ? 'kWh' : 'L'}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        € ${entry.pricePerUnit.toFixed(3)}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        € ${entry.totalCost.toFixed(2)}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${entry.mileage ? entry.mileage.toLocaleString() + ' km' : '-'}
                    </td>
                    <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button class="text-indigo-600 hover:text-indigo-900" onclick="editFuelCost('${entry.id}')">Bearbeiten</button>
                    </td>
                </tr>
            `).join('');

            // Statistiken berechnen
            calculateFuelStatistics(data.fuelCosts);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="py-4 text-center text-gray-500">Keine Tankkosten vorhanden</td></tr>';
        }
    } catch (error) {
        console.error('Fehler:', error);
    }
}

// Zulassung & Versicherung initialisieren
function initializeRegistration(vehicleId) {
    const editBtn = document.getElementById('edit-registration-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            openEditRegistrationModal(vehicleId);
        });
    }

    loadRegistration(vehicleId);
}

// Zulassungsdaten laden
async function loadRegistration(vehicleId) {
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Zulassungsdaten');

        const data = await response.json();
        const vehicle = data.vehicle;

        // Felder aktualisieren
        document.getElementById('registration-date-display').textContent = vehicle.registrationDate ? formatDate(vehicle.registrationDate) : '-';
        document.getElementById('registration-expiry-display').textContent = vehicle.registrationExpiry ? formatDate(vehicle.registrationExpiry) : '-';
        document.getElementById('next-inspection-display').textContent = vehicle.nextInspectionDate ? formatDate(vehicle.nextInspectionDate) : '-';
        document.getElementById('insurance-company-display').textContent = vehicle.insuranceCompany || '-';
        document.getElementById('insurance-number-display').textContent = vehicle.insuranceNumber || '-';
        document.getElementById('insurance-type-display').textContent = vehicle.insuranceType || '-';
        document.getElementById('insurance-expiry-display').textContent = vehicle.insuranceExpiry ? formatDate(vehicle.insuranceExpiry) : '-';
        document.getElementById('insurance-cost-display').textContent = vehicle.insuranceCost ? `€ ${vehicle.insuranceCost.toFixed(2)}` : '-';

    } catch (error) {
        console.error('Fehler:', error);
    }
}

// Statistiken initialisieren
function initializeStatistics(vehicleId) {
    loadStatistics(vehicleId);
}

// Statistiken laden
async function loadStatistics(vehicleId) {
    try {
        // Verschiedene Daten für Statistiken laden
        const [vehicleResponse, fuelResponse, maintenanceResponse, usageResponse] = await Promise.all([
            fetch(`/api/vehicles/${vehicleId}`),
            fetch(`/api/fuelcosts/vehicle/${vehicleId}`),
            fetch(`/api/maintenance/vehicle/${vehicleId}`),
            fetch(`/api/usage/vehicle/${vehicleId}`)
        ]);

        const vehicleData = await vehicleResponse.json();
        const fuelData = await fuelResponse.json();
        const maintenanceData = await maintenanceResponse.json();
        const usageData = await usageResponse.json();

        // Statistiken berechnen und Charts rendern
        renderStatisticsCharts(vehicleData.vehicle, fuelData.fuelCosts, maintenanceData.maintenance, usageData.usage);

    } catch (error) {
        console.error('Fehler:', error);
    }
}

// Hilfsfunktionen
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
}

function formatTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${formatDate(dateString)}, ${formatTime(dateString)} Uhr`;
}

function getMaintenanceTypeText(type) {
    const types = {
        'inspection': 'Inspektion',
        'oil-change': 'Ölwechsel',
        'tire-change': 'Reifenwechsel',
        'repair': 'Reparatur',
        'other': 'Sonstiges'
    };
    return types[type] || type;
}

function showNotification(message, type = 'info') {
    // Notification implementierung
    console.log(`${type}: ${message}`);
}

// Modal-Funktionen
function initializeModals() {
    // Initialisierung der verschiedenen Modals
    initializeVehicleEditModal();
    initializeMaintenanceModal();
    initializeFuelCostModal();
    initializeUsageModal();
    initializeRegistrationModal();
}

// Export der Funktionen für globalen Zugriff
window.editMaintenance = function(id) {
    openEditMaintenanceModal(id);
};

window.editFuelCost = function(id) {
    openEditFuelCostModal(id);
};

window.editUsage = function(id) {
    openEditUsageModal(id);
};