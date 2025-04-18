// frontend/static/js/dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    // Fahrzeugdaten laden
    loadVehicles();

    // Fahrerdaten laden
    loadDrivers();

    // Aktivitätsdiagramm erstellen
    createActivityChart();

    // Wartungsdaten laden
    loadMaintenanceData();

    // Nutzungsstatistiken laden
    loadUsageStatistics();

    // Dark Mode für Charts bei Änderung aktualisieren
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', () => {
        if (window.fleetActivityChart) {
            window.fleetActivityChart.destroy();
        }
        createActivityChart();
    });
});

// Funktion zum Laden der Fahrzeuge
function loadVehicles() {
    fetch('/api/vehicles')
        .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Laden der Fahrzeuge');
            }
            return response.json();
        })
        .then(data => {
            const vehicles = data.vehicles || [];
            renderVehicles(vehicles);
            updateVehicleStats(vehicles);
        })
        .catch(error => {
            console.error('Fehler:', error);
            showError('vehicles-container', 'Fehler beim Laden der Fahrzeugdaten');
        });
}

// Funktion zum Rendern der Fahrzeuge
function renderVehicles(vehicles) {
    const container = document.getElementById('vehicles-container');
    if (!container) return;

    container.innerHTML = '';

    if (vehicles.length === 0) {
        container.innerHTML = '<div class="col-span-full p-4 text-center text-gray-500 dark:text-gray-400">Keine Fahrzeuge gefunden.</div>';
        return;
    }

    // Beschränke auf max. 4 Fahrzeuge für das Dashboard
    const displayVehicles = vehicles.slice(0, 4);

    displayVehicles.forEach(vehicle => {
        // Status bestimmen
        let statusConfig = getStatusConfig(vehicle.status);

        const vehicleCard = document.createElement('div');
        vehicleCard.className = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-all relative';
        vehicleCard.innerHTML = `
            ${statusConfig.icon}
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="text-md font-semibold text-gray-800 dark:text-white">${vehicle.brand} ${vehicle.model}</h4>
                    <p class="text-gray-500 dark:text-gray-400 text-xs mt-1">Kennzeichen: ${vehicle.licensePlate}</p>
                </div>
                <span class="inline-flex px-2 py-0.5 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.darkBg} ${statusConfig.darkText} text-xs font-medium rounded-full">
                    ${statusConfig.label}
                </span>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div class="flex justify-between items-center">
                    <a href="/vehicle-details/${vehicle.id}" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                        </svg>
                        Details
                    </a>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${vehicle.mileage || 0} km</span>
                </div>
            </div>
        `;
        container.appendChild(vehicleCard);
    });
}

// Funktion zum Bestimmen der Status-Konfiguration
function getStatusConfig(status) {
    switch(status) {
        case 'available':
            return {
                bg: 'bg-green-100',
                text: 'text-green-800',
                darkBg: 'dark:bg-green-900/30',
                darkText: 'dark:text-green-400',
                icon: '<span class="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-800"></span>',
                label: 'Verfügbar'
            };
        case 'inuse':
            return {
                bg: 'bg-red-100',
                text: 'text-red-800',
                darkBg: 'dark:bg-red-900/30',
                darkText: 'dark:text-red-400',
                icon: '<span class="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800"></span>',
                label: 'In Benutzung'
            };
        case 'maintenance':
            return {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                darkBg: 'dark:bg-yellow-900/30',
                darkText: 'dark:text-yellow-400',
                icon: '<span class="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-yellow-500 ring-2 ring-white dark:ring-gray-800"></span>',
                label: 'In Wartung'
            };
        default:
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-800',
                darkBg: 'dark:bg-gray-700',
                darkText: 'dark:text-gray-300',
                icon: '',
                label: status || 'Unbekannt'
            };
    }
}

// Funktion zum Aktualisieren der Fahrzeugstatistiken
function updateVehicleStats(vehicles) {
    // Statistik im Dashboard Header aktualisieren
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const inUseVehicles = vehicles.filter(v => v.status === 'inuse').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;

    // Statistik-Elemente im DOM suchen und aktualisieren
    const totalElement = document.querySelector('[data-stat="total-vehicles"]');
    const availableElement = document.querySelector('[data-stat="available-vehicles"]');
    const inUseElement = document.querySelector('[data-stat="in-use-vehicles"]');
    const maintenanceElement = document.querySelector('[data-stat="maintenance-vehicles"]');

    if (totalElement) totalElement.textContent = totalVehicles;
    if (availableElement) availableElement.textContent = availableVehicles;
    if (inUseElement) inUseElement.textContent = inUseVehicles;
    if (maintenanceElement) maintenanceElement.textContent = maintenanceVehicles;
}

// Funktion zum Laden der Fahrer
function loadDrivers() {
    fetch('/api/drivers')
        .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Laden der Fahrer');
            }
            return response.json();
        })
        .then(data => {
            const drivers = data.drivers || [];
            renderDrivers(drivers);
        })
        .catch(error => {
            console.error('Fehler:', error);
            showError('drivers-container', 'Fehler beim Laden der Fahrerdaten');
        });
}

// Funktion zum Rendern der Fahrer
function renderDrivers(drivers) {
    const container = document.getElementById('drivers-container');
    if (!container) return;

    container.innerHTML = '';

    if (drivers.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Keine Fahrer gefunden.</div>';
        return;
    }

    // Beschränke auf max. 3 Fahrer für das Dashboard
    const displayDrivers = drivers.slice(0, 3);

    displayDrivers.forEach(driver => {
        // Status-Konfiguration bestimmen
        let statusConfig = getDriverStatusConfig(driver.status);

        // Profilbild-URL erzeugen
        const profileImages = [
            'photo-1472099645785-5658abf4ff4e',
            'photo-1494790108377-be9c29b29330',
            'photo-1506794778202-cad84cf45f1d'
        ];
        const randomIndex = Math.floor(Math.random() * profileImages.length);
        const profileImage = profileImages[randomIndex];

        const driverElement = document.createElement('div');
        driverElement.className = 'flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
        driverElement.innerHTML = `
            <div class="flex-shrink-0 mr-3 relative">
                <img class="h-10 w-10 rounded-full" src="https://images.unsplash.com/${profileImage}?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="${driver.firstName} ${driver.lastName}">
                <span class="absolute bottom-0 right-0 h-3 w-3 rounded-full ${statusConfig.ringColor} ring-2 ring-white dark:ring-gray-800"></span>
            </div>
            <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${driver.firstName} ${driver.lastName}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${driver.email || ''}</p>
            </div>
            <div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.darkBg} ${statusConfig.darkText}">
                    ${statusConfig.label}
                </span>
            </div>
        `;
        container.appendChild(driverElement);
    });
}

// Funktion zum Bestimmen der Fahrer-Status-Konfiguration
function getDriverStatusConfig(status) {
    switch(status) {
        case 'available':
            return {
                bg: 'bg-green-100',
                text: 'text-green-800',
                darkBg: 'dark:bg-green-900/30',
                darkText: 'dark:text-green-400',
                ringColor: 'bg-green-500',
                label: 'Verfügbar'
            };
        case 'onduty':
            return {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                darkBg: 'dark:bg-yellow-900/30',
                darkText: 'dark:text-yellow-400',
                ringColor: 'bg-yellow-500',
                label: 'Im Dienst'
            };
        case 'offduty':
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-800',
                darkBg: 'dark:bg-gray-700',
                darkText: 'dark:text-gray-300',
                ringColor: 'bg-gray-500',
                label: 'Außer Dienst'
            };
        default:
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-800',
                darkBg: 'dark:bg-gray-700',
                darkText: 'dark:text-gray-300',
                ringColor: 'bg-gray-500',
                label: 'Unbekannt'
            };
    }
}

// Funktion zum Laden der Wartungsdaten
function loadMaintenanceData() {
    // API für Wartungsdaten abrufen
    fetch('/api/maintenance')
        .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Laden der Wartungsdaten');
            }
            return response.json();
        })
        .then(data => {
            const maintenanceEntries = data.maintenance || [];
            renderUpcomingMaintenance(maintenanceEntries);
        })
        .catch(error => {
            console.error('Fehler beim Laden der Wartungsdaten:', error);
            // Hier könnte eine Fehlermeldung angezeigt werden
        });
}

// Funktion zum Rendern der anstehenden Wartungen
function renderUpcomingMaintenance(maintenanceEntries) {
    // Container für anstehende Wartungen im DOM suchen
    const container = document.querySelector('.anstehende-wartungen ul') || document.querySelector('.anstehende-wartungen');
    if (!container) return;

    container.innerHTML = '';

    // Aktuelle Zeit für Vergleich der Wartungsdaten
    const now = new Date();

    // Wartungseinträge filtern und sortieren
    const upcomingMaintenance = maintenanceEntries
        .filter(entry => {
            const maintenanceDate = new Date(entry.date);
            return maintenanceDate > now;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3); // Nur die nächsten 3 anzeigen

    if (upcomingMaintenance.length === 0) {
        container.innerHTML = '<li class="py-3 text-center text-gray-500 dark:text-gray-400">Keine anstehenden Wartungen.</li>';
        return;
    }

    upcomingMaintenance.forEach(entry => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('de-DE');
        const daysUntil = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        const daysText = daysUntil === 1 ? "1 Tag" : `${daysUntil} Tagen`;

        const maintenanceItem = document.createElement('li');
        maintenanceItem.className = 'py-3';
        maintenanceItem.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">${entry.vehicleName || 'Fahrzeug'}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${getMaintenanceTypeText(entry.type)} in ${daysText}</p>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                    ${formattedDate}
                </span>
            </div>
        `;
        container.appendChild(maintenanceItem);
    });
}

// Funktion zum Umwandeln des Wartungstyps in Text
function getMaintenanceTypeText(type) {
    switch(type) {
        case 'inspection':
            return 'HU/AU fällig';
        case 'oil-change':
            return 'Ölwechsel fällig';
        case 'tire-change':
            return 'Reifenwechsel fällig';
        case 'repair':
            return 'Reparatur geplant';
        default:
            return 'Wartung fällig';
    }
}

// Funktion zum Laden der Nutzungsstatistiken
function loadUsageStatistics() {
    fetch('/api/usage')
        .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Laden der Nutzungsdaten');
            }
            return response.json();
        })
        .then(data => {
            const usageEntries = data.usage || [];
            renderRecentActivities(usageEntries);
        })
        .catch(error => {
            console.error('Fehler beim Laden der Nutzungsdaten:', error);
            // Hier könnte eine Fehlermeldung angezeigt werden
        });
}

// Funktion zum Rendern der letzten Aktivitäten
function renderRecentActivities(usageEntries) {
    // Container für die letzten Aktivitäten im DOM suchen
    const container = document.querySelector('.letzte-aktivitaeten ul') || document.querySelector('.letzte-aktivitaeten');
    if (!container) return;

    container.innerHTML = '';

    // Nutzungseinträge nach Startdatum sortieren (neueste zuerst)
    const recentActivities = usageEntries
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .slice(0, 3); // Nur die letzten 3 anzeigen

    if (recentActivities.length === 0) {
        container.innerHTML = '<li class="py-3 text-center text-gray-500 dark:text-gray-400">Keine Aktivitäten gefunden.</li>';
        return;
    }

    recentActivities.forEach((entry, index) => {
        const date = new Date(entry.startDate);
        const formattedDate = formatDateRelative(date);
        const isLast = index === recentActivities.length - 1;

        const activityItem = document.createElement('li');
        activityItem.innerHTML = `
            <div class="relative pb-8">
                ${isLast ? '' : '<span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>'}
                <div class="relative flex space-x-3">
                    <div>
                        <span class="h-8 w-8 rounded-full ${getActivityColor(entry.status)} flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
                            <svg class="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                ${getActivityIcon(entry.status)}
                            </svg>
                        </span>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">
                                <a href="#" class="font-medium text-gray-900 dark:text-white">${entry.driverName || 'Fahrer'}</a> hat die Nutzung von <a href="#" class="font-medium text-gray-900 dark:text-white">${entry.vehicleName || 'Fahrzeug'}</a> ${getActivityAction(entry.status)}
                            </div>
                            <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">${formattedDate}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(activityItem);
    });
}

// Funktion zum Formatieren des Datums relativ zum aktuellen Zeitpunkt
function formatDateRelative(date) {
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
        return `Heute ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    } else if (diffInDays === 1) {
        return `Gestern ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    } else {
        return `${date.toLocaleDateString('de-DE')} ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    }
}

// Funktion zum Bestimmen der Farbe der Aktivität
function getActivityColor(status) {
    switch(status) {
        case 'active':
            return 'bg-blue-500';
        case 'completed':
            return 'bg-green-500';
        case 'cancelled':
            return 'bg-red-500';
        default:
            return 'bg-gray-500';
    }
}

// Funktion zum Bestimmen des Icons für die Aktivität
function getActivityIcon(status) {
    switch(status) {
        case 'active':
            return '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0V5z" clip-rule="evenodd" />';
        case 'completed':
            return '<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />';
        case 'cancelled':
            return '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />';
        default:
            return '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0V5z" clip-rule="evenodd" />';
    }
}

// Funktion zum Bestimmen der Aktionsbeschreibung
function getActivityAction(status) {
    switch(status) {
        case 'active':
            return 'gestartet';
        case 'completed':
            return 'abgeschlossen';
        case 'cancelled':
            return 'abgebrochen';
        default:
            return 'aktualisiert';
    }
}

// Funktion zum Erstellen des Aktivitätsdiagramms
function createActivityChart() {
    const ctx = document.getElementById('fleetActivityChart');
    if (!ctx || typeof Chart === 'undefined') return;

    // Beispieldaten der letzten 7 Tage
    const today = new Date();
    const labels = Array(7).fill().map((_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    });

    // Simulierte Daten für das Diagramm
    const kilometersData = Array(7).fill().map(() => Math.floor(Math.random() * 200) + 50);
    const vehiclesData = Array(7).fill().map(() => Math.floor(Math.random() * 5) + 1);

    // Farben für den Chart basierend auf Dark Mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';

    // Chart-Konfiguration und Erstellung
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gefahrene Kilometer',
                    data: kilometersData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Fahrzeuge im Einsatz',
                    data: vehiclesData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Kilometer',
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Fahrzeuge',
                        color: textColor
                    },
                    grid: {
                        drawOnChartArea: false,
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        stepSize: 1,
                        precision: 0
                    }
                },
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                }
            }
        }
    });

    // Chart-Instanz global speichern für spätere Aktualisierungen
    window.fleetActivityChart = chart;
}

// Hilfsfunktion zum Anzeigen von Fehlermeldungen
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="col-span-full p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                <p>${message}. Bitte versuchen Sie es später erneut.</p>
            </div>
        `;
    }
}