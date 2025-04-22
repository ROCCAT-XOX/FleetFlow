// frontend/static/js/dashboard.js

// Initialize dashboard functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisiere Dashboard...');

    // Load dashboard data
    loadDashboardStats();
    loadVehiclesOverview();
    loadDriversOverview();
    loadUpcomingMaintenance();
    loadRecentActivities();
    // Initialisiere Charts
    initializeFleetActivityChart();
    initializeFuelCostsChart();

    // Setup filter event listener
    const fleetViewFilter = document.getElementById('fleet-view-filter');
    if (fleetViewFilter) {
        fleetViewFilter.addEventListener('change', (e) => {
            filterVehicles(e.target.value);
        });
    }
});

// Function to load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) throw new Error('Fehler beim Laden der Statistiken');

        const data = await response.json();

        // Update statistics display
        document.querySelector('[data-stat="total-vehicles"]').textContent = data.totalVehicles || 0;
        document.querySelector('[data-stat="available-vehicles"]').textContent = data.availableVehicles || 0;
        document.querySelector('[data-stat="maintenance-vehicles"]').textContent = data.maintenanceVehicles || 0;
        document.querySelector('[data-stat="in-use-vehicles"]').textContent = data.inUseVehicles || 0;
    } catch (error) {
        console.error('Fehler:', error);
    }
}

// Function to load vehicles overview
async function loadVehiclesOverview() {
    try {
        const response = await fetch('/api/vehicles?limit=6');
        if (!response.ok) throw new Error('Fehler beim Laden der Fahrzeuge');

        const data = await response.json();
        renderVehiclesOverview(data.vehicles || []);
    } catch (error) {
        console.error('Fehler:', error);
        showVehiclesError();
    }
}

// Function to render vehicles in overview
function renderVehiclesOverview(vehicles) {
    const container = document.getElementById('vehicles-container');
    if (!container) return;

    container.innerHTML = '';

    if (vehicles.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-gray-500">Keine Fahrzeuge verfügbar</div>';
        return;
    }

    vehicles.forEach(vehicle => {
        const statusClass = getStatusClass(vehicle.status);
        const statusText = getStatusText(vehicle.status);

        const vehicleCard = document.createElement('div');
        vehicleCard.className = 'bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow';
        vehicleCard.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900">${vehicle.brand} ${vehicle.model}</h4>
                <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                    ${statusText}
                </span>
            </div>
            <p class="text-sm text-gray-500 mb-1">Kennzeichen: ${vehicle.licensePlate}</p>
            <p class="text-sm text-gray-500 mb-2">Kilometerstand: ${vehicle.mileage} km</p>
            <a href="/vehicle-details/${vehicle.id}" class="text-sm text-blue-600 hover:text-blue-800">Details anzeigen →</a>
        `;

        container.appendChild(vehicleCard);
    });
}

// Function to load drivers overview
async function loadDriversOverview() {
    try {
        const response = await fetch('/api/drivers?limit=5');
        if (!response.ok) throw new Error('Fehler beim Laden der Fahrer');

        const data = await response.json();
        renderDriversOverview(data.drivers || []);
    } catch (error) {
        console.error('Fehler:', error);
        showDriversError();
    }
}

// Function to render drivers in overview
function renderDriversOverview(drivers) {
    const container = document.getElementById('drivers-container');
    if (!container) return;

    container.innerHTML = '';

    if (drivers.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500">Keine Fahrer verfügbar</div>';
        return;
    }

    drivers.forEach(driver => {
        const statusClass = getDriverStatusClass(driver.status);
        const statusText = getDriverStatusText(driver.status);

        const driverCard = document.createElement('div');
        driverCard.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        driverCard.innerHTML = `
            <div>
                <h5 class="font-medium text-gray-900">${driver.firstName} ${driver.lastName}</h5>
                <p class="text-xs text-gray-500">${driver.assignedVehicleId ? 'Fahrzeug zugewiesen' : 'Kein Fahrzeug zugewiesen'}</p>
            </div>
            <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                ${statusText}
            </span>
        `;

        container.appendChild(driverCard);
    });
}

// Function to load upcoming maintenance
async function loadUpcomingMaintenance() {
    try {
        const response = await fetch('/api/maintenance/upcoming?limit=5');
        if (!response.ok) throw new Error('Fehler beim Laden der Wartungen');

        const data = await response.json();
        renderUpcomingMaintenance(data.maintenance || []);
    } catch (error) {
        console.error('Fehler:', error);
        showMaintenanceError();
    }
}

// Function to render upcoming maintenance
function renderUpcomingMaintenance(maintenanceItems) {
    const container = document.querySelector('.anstehende-wartungen');
    if (!container) return;

    container.innerHTML = '';

    if (maintenanceItems.length === 0) {
        container.innerHTML = '<li class="py-3 text-center text-gray-500">Keine anstehenden Wartungen</li>';
        return;
    }

    maintenanceItems.forEach(item => {
        const maintenanceItem = document.createElement('li');
        maintenanceItem.className = 'py-3 flex justify-between items-center';
        maintenanceItem.innerHTML = `
            <div>
                <p class="text-sm font-medium text-gray-900">${item.vehicleName || item.vehicleId}</p>
                <p class="text-xs text-gray-500">${getMaintenanceTypeText(item.type)}</p>
            </div>
            <span class="text-sm text-gray-500">${formatDate(item.nextDueDate)}</span>
        `;

        container.appendChild(maintenanceItem);
    });
}

// Function to load recent activities
async function loadRecentActivities() {
    try {
        const response = await fetch('/api/activities/recent?limit=5');
        if (!response.ok) throw new Error('Fehler beim Laden der Aktivitäten');

        const data = await response.json();
        renderRecentActivities(data.activities || []);
    } catch (error) {
        console.error('Fehler:', error);
        showActivitiesError();
    }
}

// Function to render recent activities
function renderRecentActivities(activities) {
    const container = document.querySelector('.letzte-aktivitaeten');
    if (!container) return;

    container.innerHTML = '';

    if (activities.length === 0) {
        container.innerHTML = '<li class="py-3 text-center text-gray-500">Keine Aktivitäten vorhanden</li>';
        return;
    }

    activities.forEach(activity => {
        const activityItem = document.createElement('li');
        activityItem.className = 'relative pb-8';
        activityItem.innerHTML = `
            <span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
            <div class="relative flex space-x-3">
                <div>
                    <span class="h-8 w-8 rounded-full bg-${getActivityColor(activity.type)}-100 flex items-center justify-center ring-8 ring-white">
                        ${getActivityIcon(activity.type)}
                    </span>
                </div>
                <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                        <p class="text-sm text-gray-500">${activity.description}</p>
                    </div>
                    <div class="whitespace-nowrap text-right text-sm text-gray-500">
                        <time datetime="${activity.timestamp}">${formatTimeAgo(activity.timestamp)}</time>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(activityItem);
    });
}

// Überarbeitete Funktion mit verbesserter Fehlerbehandlung und Logging
// Korrigierte Funktion mit datenkorrektur
async function initializeFleetActivityChart() {
    const ctx = document.getElementById('fleetActivityChart');
    if (!ctx) return;

    try {
        // Zuerst die Gesamtzahl der Fahrzeuge laden
        const statsResponse = await fetch('/api/dashboard/stats');
        if (!statsResponse.ok) throw new Error('Fehler beim Laden der Fahrzeugstatistiken');

        const statsData = await statsResponse.json();
        const totalVehicles = statsData.totalVehicles || 0;

        console.log("Gesamtanzahl der Fahrzeuge:", totalVehicles);

        // Dann die Nutzungsdaten für die letzten 7 Tage laden
        const response = await fetch('/api/dashboard/vehicle-usage-stats');
        if (!response.ok) throw new Error('Fehler beim Laden der Flottenaktivitätsdaten');

        const data = await response.json();
        const usageData = data.usageData || [];

        // Daten für das Chart vorbereiten und nach Datum sortieren
        usageData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Formatiere die Labels für die Anzeige
        const labels = usageData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
        });

        // KORREKTUR: Daten anpassen, um Überzählung zu vermeiden
        const correctedData = usageData.map(day => {
            // Originaldaten sichern
            const inUse = day.inUseCount || 0;
            const maintenance = day.maintenanceCount || 0;

            // Überprüfen auf Überzählung
            const total = inUse + maintenance;
            let correctedInUse = inUse;
            let correctedMaintenance = maintenance;

            // Wenn die Summe größer als die Gesamtzahl ist, proportional reduzieren
            if (total > totalVehicles) {
                const reductionFactor = totalVehicles / total;
                correctedInUse = Math.floor(inUse * reductionFactor);
                correctedMaintenance = totalVehicles - correctedInUse;
            }

            return {
                original: { inUse, maintenance },
                corrected: { inUse: correctedInUse, maintenance: correctedMaintenance }
            };
        });

        // Log der Korrekturen
        correctedData.forEach((day, i) => {
            console.log(`Tag ${i+1} - Original: InUse=${day.original.inUse}, Maintenance=${day.original.maintenance}, Total=${day.original.inUse + day.original.maintenance}`);
            console.log(`Tag ${i+1} - Korrigiert: InUse=${day.corrected.inUse}, Maintenance=${day.corrected.maintenance}, Total=${day.corrected.inUse + day.corrected.maintenance}`);
        });

        // Korrigierte Daten für das Chart
        const inUseData = correctedData.map(day => day.corrected.inUse);
        const maintenanceData = correctedData.map(day => day.corrected.maintenance);
        const availableData = correctedData.map(day =>
            totalVehicles - day.corrected.inUse - day.corrected.maintenance
        );

        // Chart erstellen mit korrigierten Daten
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Verfügbar',
                        data: availableData,
                        borderColor: 'rgb(34, 197, 94)', // Grün
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'In Benutzung',
                        data: inUseData,
                        borderColor: 'rgb(79, 70, 229)', // Blau/Indigo
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'In Wartung',
                        data: maintenanceData,
                        borderColor: 'rgb(234, 179, 8)', // Gelb
                        backgroundColor: 'rgba(234, 179, 8, 0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw + ' Fahrzeuge';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Anzahl Fahrzeuge'
                        },
                        ticks: {
                            precision: 0,
                            stepSize: 1,
                            max: totalVehicles
                        },
                        suggestedMax: totalVehicles
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Tag'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Fehler beim Laden der Flottenaktivitäts-Daten:', error);
        ctx.parentNode.innerHTML = '<div class="text-center text-red-500 py-4">Fehler beim Laden der Daten: ' + error.message + '</div>';
    }
}

// Funktion zum Initialisieren des Kraftstoffkosten-Charts
// Verbesserte Funktion zum Initialisieren des Kraftstoffkosten-Charts
async function initializeFuelCostsChart() {
    const ctx = document.getElementById('fuelCostsChart');
    if (!ctx) return;

    try {
        // Daten für die letzten 12 Monate laden
        const response = await fetch('/api/dashboard/fuel-costs-by-vehicle');
        if (!response.ok) throw new Error('Fehler beim Laden der Kraftstoffkostendaten');

        const data = await response.json();
        const fuelCostsData = data.fuelCostsData || [];

        // Daten für das Chart vorbereiten
        const labels = fuelCostsData.map(item => item.month);

        // Fahrzeuge und ihre Daten extrahieren
        const vehicles = [];
        const datasets = [];

        // Prüfen, ob Daten vorhanden sind und die erwartete Struktur haben
        console.log("Erhaltene Fuel Cost Daten:", fuelCostsData);

        if (fuelCostsData.length > 0) {
            // Alle Fahrzeug-IDs aus allen Monaten sammeln
            const allVehicleIds = new Set();
            fuelCostsData.forEach(month => {
                if (month.vehicleCosts) {
                    Object.keys(month.vehicleCosts).forEach(vehicleId => {
                        allVehicleIds.add(vehicleId);
                    });
                }
            });

            // Farben für Fahrzeuge generieren
            const colors = [
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 99, 132, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(255, 159, 64, 0.8)',
                'rgba(153, 102, 255, 0.8)',
                'rgba(255, 205, 86, 0.8)',
                'rgba(201, 203, 207, 0.8)',
                'rgba(255, 99, 71, 0.8)',
                'rgba(46, 139, 87, 0.8)',
                'rgba(106, 90, 205, 0.8)'
            ];

            // Datasets für jedes Fahrzeug erstellen
            let colorIndex = 0;
            allVehicleIds.forEach(vehicleId => {
                // Fahrzeugnamen aus irgendeinem Monat extrahieren, wo es vorhanden ist
                let vehicleName = `Fahrzeug ${vehicleId.substring(0, 5)}`;
                for (const month of fuelCostsData) {
                    if (month.vehicleCosts && month.vehicleCosts[vehicleId] && month.vehicleCosts[vehicleId].name) {
                        vehicleName = month.vehicleCosts[vehicleId].name;
                        break;
                    }
                }

                const vehicleData = fuelCostsData.map(month => {
                    if (month.vehicleCosts && month.vehicleCosts[vehicleId]) {
                        return month.vehicleCosts[vehicleId].cost || 0;
                    }
                    return 0;
                });

                // Nur Fahrzeuge hinzufügen, die tatsächliche Kosten haben
                if (vehicleData.some(cost => cost > 0)) {
                    datasets.push({
                        label: vehicleName,
                        data: vehicleData,
                        backgroundColor: colors[colorIndex % colors.length],
                        stack: 'Stack 0'
                    });
                    colorIndex++;
                }
            });
        }

        // Chart erstellen mit den gesammelten Daten
        console.log("Chart Daten:", { labels, datasets });

        // Chart nur erstellen, wenn tatsächlich Daten vorhanden sind
        if (datasets.length === 0) {
            // Fallback bei leeren Daten
            ctx.parentNode.innerHTML = '<div class="text-center text-gray-500 py-4">Keine Tankkosten-Daten verfügbar</div>';
            return;
        }

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('de-DE', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(context.raw);
                            },
                            footer: function(tooltipItems) {
                                let sum = 0;
                                tooltipItems.forEach(item => {
                                    sum += item.raw;
                                });
                                return 'Gesamt: ' + new Intl.NumberFormat('de-DE', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(sum);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Monat'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Kosten (EUR)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + ' €';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Fehler beim Laden der Kraftstoffkosten-Daten:', error);
        ctx.parentNode.innerHTML = '<div class="text-center text-red-500 py-4">Fehler beim Laden der Daten</div>';
    }
}

// Helper functions
function getStatusClass(status) {
    switch (status) {
        case 'available':
            return 'bg-green-100 text-green-800';
        case 'inuse':
            return 'bg-red-100 text-red-800';
        case 'maintenance':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'available':
            return 'Verfügbar';
        case 'inuse':
            return 'In Benutzung';
        case 'maintenance':
            return 'In Wartung';
        default:
            return status;
    }
}

function getDriverStatusClass(status) {
    switch (status) {
        case 'available':
            return 'bg-green-100 text-green-800';
        case 'onduty':
            return 'bg-blue-100 text-blue-800';
        case 'offduty':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function getDriverStatusText(status) {
    switch (status) {
        case 'available':
            return 'Verfügbar';
        case 'onduty':
            return 'Im Dienst';
        case 'offduty':
            return 'Außer Dienst';
        default:
            return status;
    }
}

function getMaintenanceTypeText(type) {
    switch (type) {
        case 'inspection':
            return 'Inspektion';
        case 'oil-change':
            return 'Ölwechsel';
        case 'tire-change':
            return 'Reifenwechsel';
        case 'repair':
            return 'Reparatur';
        default:
            return 'Sonstiges';
    }
}

function getActivityColor(type) {
    switch (type) {
        case 'booking':
            return 'green';
        case 'maintenance':
            return 'yellow';
        case 'alert':
            return 'red';
        default:
            return 'blue';
    }
}

function getActivityIcon(type) {
    switch (type) {
        case 'booking':
            return '<svg class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
        case 'maintenance':
            return '<svg class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>';
        default:
            return '<svg class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
}

function formatTimeAgo(timestamp) {
    // Simple implementation
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
    if (hours > 0) return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
    if (minutes > 0) return `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
    return 'gerade eben';
}

function filterVehicles(status) {
    const cards = document.querySelectorAll('#vehicles-container > div');

    cards.forEach(card => {
        if (status === 'all') {
            card.style.display = '';
            return;
        }

        const statusElement = card.querySelector('.rounded-full');
        if (!statusElement) return;

        const vehicleStatus = statusElement.textContent.trim().toLowerCase();

        let matchesFilter = false;

        if (status === 'available' && vehicleStatus.includes('verfügbar')) {
            matchesFilter = true;
        } else if (status === 'inuse' && vehicleStatus.includes('in benutzung')) {
            matchesFilter = true;
        } else if (status === 'maintenance' && vehicleStatus.includes('in wartung')) {
            matchesFilter = true;
        }

        card.style.display = matchesFilter ? '' : 'none';
    });
}

// Error display functions
function showVehiclesError() {
    const container = document.getElementById('vehicles-container');
    if (container) {
        container.innerHTML = '<div class="col-span-full text-center text-red-500">Fehler beim Laden der Fahrzeuge</div>';
    }
}

function showDriversError() {
    const container = document.getElementById('drivers-container');
    if (container) {
        container.innerHTML = '<div class="text-center text-red-500">Fehler beim Laden der Fahrer</div>';
    }
}

function showMaintenanceError() {
    const container = document.querySelector('.anstehende-wartungen');
    if (container) {
        container.innerHTML = '<li class="py-3 text-center text-red-500">Fehler beim Laden der Wartungen</li>';
    }
}

function showActivitiesError() {
    const container = document.querySelector('.letzte-aktivitaeten');
    if (container) {
        container.innerHTML = '<li class="py-3 text-center text-red-500">Fehler beim Laden der Aktivitäten</li>';
    }
}