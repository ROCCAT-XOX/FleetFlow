// frontend/static/js/vehicle-details.js
document.addEventListener('DOMContentLoaded', async function() {
    const vehicleId = window.location.pathname.split('/').pop();

    // Initialisierungen
    await loadVehicleDetails(vehicleId);
    initializeTabs();
    initializeModals();

    // Initial Tab laden
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || 'basic';
    loadTabContent(initialTab, vehicleId);
});

// Fahrzeugdetails laden
async function loadVehicleDetails(vehicleId) {
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        if (!response.ok) throw new Error('Fehler beim Laden der Fahrzeugdaten');

        const data = await response.json();
        window.vehicleData = data.vehicle;

    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Laden der Fahrzeugdaten', 'error');
    }
}

// Tab-System initialisieren
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.vehicle-tab-btn');
    const vehicleId = window.location.pathname.split('/').pop();

    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = button.dataset.tab;
            const tabParam = button.getAttribute('href').split('=')[1];

            // URL aktualisieren ohne Reload
            window.history.pushState({}, '', `?tab=${tabParam}`);

            // Tab-Buttons aktualisieren
            tabButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            button.classList.add('border-blue-500', 'text-blue-600');
            button.classList.remove('border-transparent', 'text-gray-500');

            // Tab-Content laden
            loadTabContent(tabParam, vehicleId);
        });
    });
}

// Tab-Content laden
async function loadTabContent(tab, vehicleId) {
    const contentContainer = document.getElementById('tab-content');

    switch(tab) {
        case 'basic':
            contentContainer.innerHTML = await loadBasicInfo(vehicleId);
            initializeBasicInfoTab(vehicleId);
            break;
        case 'usage':
            contentContainer.innerHTML = await loadUsageTab(vehicleId);
            initializeUsageTab(vehicleId);
            break;
        case 'maintenance':
            contentContainer.innerHTML = await loadMaintenanceTab(vehicleId);
            initializeMaintenanceTab(vehicleId);
            break;
        case 'fuel':
            contentContainer.innerHTML = await loadFuelTab(vehicleId);
            initializeFuelTab(vehicleId);
            break;
        case 'registration':
            contentContainer.innerHTML = await loadRegistrationTab(vehicleId);
            initializeRegistrationTab(vehicleId);
            break;
        case 'statistics':
            contentContainer.innerHTML = await loadStatisticsTab(vehicleId);
            await initializeStatisticsTab(vehicleId);
            break;
    }
}

// Basic Info Tab (bereits implementiert - gekürzt für Übersichtlichkeit)
async function loadBasicInfo(vehicleId) {
    const response = await fetch(`/api/vehicles/${vehicleId}`);
    const data = await response.json();
    const vehicle = data.vehicle;

    return `
    <div id="basic-info" class="vehicle-tab-content">
        <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Fahrzeuginformationen</h3>
                <button type="button" onclick="openEditVehicleModal('${vehicleId}')" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                    <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Bearbeiten
                </button>
            </div>
            <div class="px-4 py-5 sm:p-6">
                <!-- Grunddaten -->
                <h4 class="text-base font-medium text-gray-900 mb-4">Grunddaten</h4>
                <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 mb-8">
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Kennzeichen</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.licensePlate || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Marke & Modell</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.brand} ${vehicle.model}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Baujahr</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.year || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Farbe</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.color || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Fahrzeug-ID</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.vehicleId || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">VIN</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.vin || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Art des Fahrzeugs</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.vehicleType || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Kraftstoffart</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.fuelType || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Aktueller Kilometerstand</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : '-'}</dd>
                    </div>
                </dl>

                <!-- Technische Daten -->
                <h4 class="text-base font-medium text-gray-900 mb-4 pt-6 border-t">Technische Daten</h4>
                <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 mb-8">
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Hubraum</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.engineDisplacement ? vehicle.engineDisplacement + ' cm³' : '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Nennleistung</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.powerRating ? vehicle.powerRating + ' kW' : '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Anzahl der Achsen</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.numberOfAxles || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Höchstgeschwindigkeit</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.maxSpeed ? vehicle.maxSpeed + ' km/h' : '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Reifengröße</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.tireSize || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Felgentyp</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.rimType || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Schadstoffklasse</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.emissionClass || '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Zulässige Anhängelast</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.towingCapacity ? vehicle.towingCapacity + ' kg' : '-'}</dd>
                    </div>
                </dl>

                <!-- Abmessungen & Gewichte -->
                <h4 class="text-base font-medium text-gray-900 mb-4 pt-6 border-t">Abmessungen & Gewichte</h4>
                <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 mb-8">
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Abmessungen (L × B × H)</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.length && vehicle.width && vehicle.height ?
        `${vehicle.length} × ${vehicle.width} × ${vehicle.height} mm` : '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Leermasse</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.curbWeight ? vehicle.curbWeight + ' kg' : '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Gesamtmasse</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.grossWeight ? vehicle.grossWeight + ' kg' : '-'}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Technisch zulässige Gesamtmasse</dt>
                        <dd class="mt-1 text-sm text-gray-900">${vehicle.technicalMaxWeight ? vehicle.technicalMaxWeight + ' kg' : '-'}</dd>
                    </div>
                </dl>

                <!-- Besonderheiten -->
                <div class="pt-6 border-t">
                    <h4 class="text-base font-medium text-gray-900 mb-4">Besonderheiten</h4>
                    <p class="text-sm text-gray-900">${vehicle.specialFeatures || 'Keine besonderen Merkmale eingetragen'}</p>
                </div>
            </div>
        </div>
    </div>`;
}

// Usage Tab
async function loadUsageTab(vehicleId) {
    try {
        const response = await fetch(`/api/usage/vehicle/${vehicleId}`);
        const data = await response.json();

        // Sicherstellen, dass usage ein Array ist
        const usageHistory = data.usage || [];
        const activeUsage = usageHistory.find(u => u.status === 'active');

        // Fahrer laden für Select
        const driversResponse = await fetch('/api/drivers');
        const driversData = await driversResponse.json();
        const driversMap = {};

        if (driversData.drivers) {
            driversData.drivers.forEach(driver => {
                driversMap[driver.id] = `${driver.firstName} ${driver.lastName}`;
            });
        }

        // Fahrernamen zu Usage-Daten hinzufügen
        usageHistory.forEach(usage => {
            if (usage.driverId && driversMap[usage.driverId]) {
                usage.driverName = driversMap[usage.driverId];
            }
        });

        let currentUsageHTML = '';
        if (activeUsage) {
            currentUsageHTML = `
                <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Aktueller Fahrer</dt>
                        <dd class="mt-1 text-sm text-gray-900">${driversMap[activeUsage.driverId] || 'Unbekannt'}</dd>
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
                </dl>`;
        } else {
            currentUsageHTML = `
                <div class="text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-gray-900">Keine aktive Nutzung</h3>
                    <p class="mt-1 text-sm text-gray-500">Das Fahrzeug wird derzeit nicht genutzt.</p>
                </div>`;
        }

        let usageHistoryHTML = '';
        if (usageHistory.length > 0) {
            usageHistoryHTML = usageHistory.map(usage => `
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
            usageHistoryHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">Keine Nutzungshistorie vorhanden</td></tr>';
        }

        return `
        <div id="current-usage" class="vehicle-tab-content">
            <div class="bg-white overflow-hidden shadow rounded-lg mb-6">
                <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Aktuelle Nutzung</h3>
                    <button type="button" onclick="openEditCurrentUsageModal('${vehicleId}')" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                        <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Bearbeiten
                    </button>
                </div>
                <div class="px-4 py-5 sm:p-6">
                    ${currentUsageHTML}
                </div>
            </div>

            <div class="bg-white shadow sm:rounded-lg">
                <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Nutzungshistorie</h3>
                    <button type="button" onclick="openAddUsageModal('${vehicleId}')" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                        <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Nutzung eintragen
                    </button>
                </div>
                <div class="px-4 py-5 sm:p-6">
                    <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table class="min-w-full divide-y divide-gray-300">
                            <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Zeitraum</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fahrer</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Projekt/Zweck</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Kilometerstand</th>
                                <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <span class="sr-only">Bearbeiten</span>
                                </th>
                            </tr>
                            </thead>
                            <tbody id="usage-table-body" class="divide-y divide-gray-200 bg-white">
                                ${usageHistoryHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
    } catch (error) {
        console.error('Fehler beim Laden der Nutzungsdaten:', error);
        return '<div class="bg-white p-6 rounded-lg shadow">Fehler beim Laden der Nutzungsdaten</div>';
    }
}

// Maintenance Tab
async function loadMaintenanceTab(vehicleId) {
    try {
        const response = await fetch(`/api/maintenance/vehicle/${vehicleId}`);
        const data = await response.json();
        const maintenanceEntries = data.maintenance || [];

        let tableHTML = '';
        if (maintenanceEntries.length > 0) {
            tableHTML = maintenanceEntries.map(entry => `
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
            tableHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">Keine Wartungseinträge vorhanden</td></tr>';
        }

        return `
        <div id="maintenance" class="vehicle-tab-content">
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Wartung & Inspektionen</h3>
                    <button type="button" onclick="openAddMaintenanceModal('${vehicleId}')" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                        <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Inspektion/Wartung hinzufügen
                    </button>
                </div>
                <div class="px-4 py-5 sm:p-6">
                    <div class="flow-root">
                        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                <table class="min-w-full divide-y divide-gray-300">
                                    <thead>
                                    <tr>
                                        <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Datum</th>
                                        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Typ</th>
                                        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Kilometerstand</th>
                                        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Kosten</th>
                                        <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-0">
                                            <span class="sr-only">Bearbeiten</span>
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody id="maintenance-table-body" class="divide-y divide-gray-200">
                                        ${tableHTML}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    } catch (error) {
        console.error('Fehler beim Laden der Wartungsdaten:', error);
        return '<div class="bg-white p-6 rounded-lg shadow">Fehler beim Laden der Wartungsdaten</div>';
    }
}

// Fuel Tab
async function loadFuelTab(vehicleId) {
    try {
        const response = await fetch(`/api/fuelcosts/vehicle/${vehicleId}`);
        const data = await response.json();
        const fuelCosts = data.fuelCosts || [];

        let tableHTML = '';
        if (fuelCosts.length > 0) {
            tableHTML = fuelCosts.map(entry => `
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
        } else {
            tableHTML = '<tr><td colspan="7" class="py-4 text-center text-gray-500">Keine Tankkosten vorhanden</td></tr>';
        }

        // Statistiken berechnen
        let statsHTML = '';
        if (fuelCosts.length > 1) {
            const sortedCosts = [...fuelCosts].sort((a, b) => a.mileage - b.mileage);
            let totalFuel = 0;
            let totalCost = 0;
            let totalDistance = 0;

            for (let i = 1; i < sortedCosts.length; i++) {
                const distance = sortedCosts[i].mileage - sortedCosts[i-1].mileage;
                if (distance > 0) {
                    totalDistance += distance;
                    totalFuel += sortedCosts[i].amount;
                    totalCost += sortedCosts[i].totalCost;
                }
            }

            const avgConsumption = totalDistance > 0 ? (totalFuel / totalDistance * 100).toFixed(2) : 0;
            const costPerKm = totalDistance > 0 ? (totalCost / totalDistance).toFixed(3) : 0;

            statsHTML = `
                <div class="mt-8 bg-white p-6 rounded-lg shadow ring-1 ring-black ring-opacity-5">
                    <h4 class="text-lg font-medium text-gray-900 mb-4">Verbrauchsstatistik</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="text-sm font-medium text-gray-500">Durchschnittsverbrauch</div>
                            <div class="mt-1 text-3xl font-semibold text-gray-900">${avgConsumption}</div>
                            <div class="text-sm text-gray-500">L/100km</div>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="text-sm font-medium text-gray-500">Gesamtkosten</div>
                            <div class="mt-1 text-3xl font-semibold text-gray-900">€ ${totalCost.toFixed(2)}</div>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="text-sm font-medium text-gray-500">Kosten pro Kilometer</div>
                            <div class="mt-1 text-3xl font-semibold text-gray-900">€ ${costPerKm}</div>
                        </div>
                    </div>
                </div>`;
        }

        return `
        <div id="fuel-costs" class="vehicle-tab-content">
            <div class="bg-white shadow sm:rounded-lg">
                <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Tankkosten</h3>
                    <button type="button" onclick="openAddFuelCostModal('${vehicleId}')" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                        <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Tankkosten hinzufügen
                    </button>
                </div>
                <div class="px-4 py-5 sm:p-6">
                    <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table class="min-w-full divide-y divide-gray-300">
                            <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Datum</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Kraftstoff</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Menge</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Preis/Einheit</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Gesamtkosten</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Kilometerstand</th>
                                <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <span class="sr-only">Bearbeiten</span>
                                </th>
                            </tr>
                            </thead>
                            <tbody id="vehicle-fuel-costs-body" class="divide-y divide-gray-200 bg-white">
                                ${tableHTML}
                            </tbody>
                        </table>
                    </div>
                    ${statsHTML}
                </div>
            </div>
        </div>`;
    } catch (error) {
        console.error('Fehler beim Laden der Tankkosten:', error);
        return '<div class="bg-white p-6 rounded-lg shadow">Fehler beim Laden der Tankkosten</div>';
    }
}

// Registration Tab
async function loadRegistrationTab(vehicleId) {
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        const data = await response.json();
        const vehicle = data.vehicle;

        return `
        <div id="registration-insurance" class="vehicle-tab-content">
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Zulassung & Versicherung</h3>
                    <button type="button" onclick="openEditRegistrationModal('${vehicleId}')" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                        <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Bearbeiten
                    </button>
                </div>
                <div class="px-4 py-5 sm:p-6">
                    <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500">Erstzulassung</dt>
                            <dd class="mt-1 text-sm text-gray-900">${vehicle.registrationDate ? formatDate(vehicle.registrationDate) : '-'}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500">Ablaufdatum der Zulassung</dt>
                            <dd class="mt-1 text-sm text-gray-900">${vehicle.registrationExpiry ? formatDate(vehicle.registrationExpiry) : '-'}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500">Nächste HU/AU</dt>
                            <dd class="mt-1 text-sm text-gray-900 font-medium">${vehicle.nextInspectionDate ? formatDate(vehicle.nextInspectionDate) : '-'}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500">Versicherung</dt>
                            <dd class="mt-1 text-sm text-gray-900">${vehicle.insuranceCompany || '-'}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500">Versicherungsnummer</dt>
                            <dd class="mt-1 text-sm text-gray-900">${vehicle.insuranceNumber || '-'}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500">Versicherungstyp</dt>
                            <dd class="mt-1 text-sm text-gray-900">${vehicle.insuranceType || '-'}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500">Ablaufdatum der Versicherung</dt>
                            <dd class="mt-1 text-sm text-gray-900">${vehicle.insuranceExpiry ? formatDate(vehicle.insuranceExpiry) : '-'}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500">Jährliche Kosten</dt>
                            <dd class="mt-1 text-sm text-gray-900">${vehicle.insuranceCost ? '€ ' + vehicle.insuranceCost.toFixed(2) : '-'}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>`;
    } catch (error) {
        console.error('Fehler beim Laden der Zulassungsdaten:', error);
        return '<div class="bg-white p-6 rounded-lg shadow">Fehler beim Laden der Zulassungsdaten</div>';
    }
}

// Statistics Tab
async function loadStatisticsTab(vehicleId) {
    return `
    <div id="statistics" class="vehicle-tab-content">
        <div class="bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Fahrzeugstatistiken</h3>
            </div>
            <div class="px-4 py-5 sm:p-6">
                <!-- Kraftstoffverbrauch-Statistiken -->
                <div class="mb-6">
                    <div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                        <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 class="text-base font-medium text-gray-900">Kraftstoffverbrauch und -kosten</h3>
                        </div>
                        <div class="px-4 py-3 sm:px-6">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <div class="text-sm font-medium text-gray-500">Durchschnittsverbrauch</div>
                                    <div class="mt-1 text-3xl font-semibold text-gray-900" id="stats-avg-consumption">--</div>
                                    <div class="text-sm text-gray-500" id="stats-consumption-unit">L/100km</div>
                                </div>
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <div class="text-sm font-medium text-gray-500">Gesamtkosten (Kraftstoff)</div>
                                    <div class="mt-1 text-3xl font-semibold text-gray-900" id="stats-total-fuel-costs">--</div>
                                </div>
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <div class="text-sm font-medium text-gray-500">Kosten pro Kilometer</div>
                                    <div class="mt-1 text-3xl font-semibold text-gray-900" id="stats-cost-per-km">--</div>
                                </div>
                            </div>
                            <div class="h-72" id="stats-fuel-costs-chart"></div>
                        </div>
                    </div>
                </div>

                <!-- Kosten der letzten 12 Monate -->
                <div class="mb-6">
                    <div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                        <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 class="text-base font-medium text-gray-900">Monatliche Kosten (letzte 12 Monate)</h3>
                        </div>
                        <div class="px-4 py-3 sm:px-6">
                            <div id="costChart" class="h-80"></div>
                        </div>
                    </div>
                </div>

                <!-- Pie Charts nebeneinander -->
                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <!-- Nutzung nach Mitarbeitern -->
                    <div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                        <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 class="text-base font-medium text-gray-900">Nutzung nach Mitarbeitern</h3>
                        </div>
                        <div class="px-4 py-3 sm:px-6">
                            <div id="driverPieChart" class="h-80"></div>
                        </div>
                    </div>

                    <!-- Nutzung nach Projekten -->
                    <div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                        <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 class="text-base font-medium text-gray-900">Nutzung nach Projekten</h3>
                        </div>
                        <div class="px-4 py-3 sm:px-6">
                            <div id="projectPieChart" class="h-80"></div>
                        </div>
                    </div>
                </div>

                <!-- Zusammenfassung -->
                <div class="mt-6">
                    <div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                        <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 class="text-base font-medium text-gray-900">Zusammenfassung</h3>
                        </div>
                        <div class="px-4 py-3 sm:px-6">
                            <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-4">
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">Gesamtkilometer</dt>
                                    <dd class="mt-1 text-2xl text-gray-900 font-medium" id="total-kilometers">-</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">Kosten pro km</dt>
                                    <dd class="mt-1 text-2xl text-gray-900 font-medium" id="cost-per-km">-</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">Gesamtkosten (12 Mon.)</dt>
                                    <dd class="mt-1 text-2xl text-gray-900 font-medium" id="total-cost">-</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">Auslastung</dt>
                                    <dd class="mt-1 text-2xl text-gray-900 font-medium" id="utilization">-</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

// Tab-Initialisierungen
function initializeBasicInfoTab(vehicleId) {
    // Event-Listener werden inline im HTML definiert
}

function initializeUsageTab(vehicleId) {
    // Event-Listener werden inline im HTML definiert
}

function initializeMaintenanceTab(vehicleId) {
    // Event-Listener werden inline im HTML definiert
}

function initializeFuelTab(vehicleId) {
    // Event-Listener werden inline im HTML definiert
}

function initializeRegistrationTab(vehicleId) {
    // Event-Listener werden inline im HTML definiert
}

async function initializeStatisticsTab(vehicleId) {
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
        if (typeof renderStatisticsCharts === 'function') {
            renderStatisticsCharts(vehicleData.vehicle, fuelData.fuelCosts, maintenanceData.maintenance, usageData.usage);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Statistiken:', error);
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
    console.log(`${type}: ${message}`);
}

// Export der Funktionen für globalen Zugriff
window.editMaintenance = function(id) {
    console.log('Edit maintenance:', id);
};

window.editFuelCost = function(id) {
    console.log('Edit fuel cost:', id);
};

window.editUsage = function(id) {
    console.log('Edit usage:', id);
};

window.openEditCurrentUsageModal = function(vehicleId) {
    console.log('Open edit current usage modal for vehicle:', vehicleId);
};