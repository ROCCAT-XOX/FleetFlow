// Globale Variablen
let reportsData = {};
let charts = {};

// DOM geladen
document.addEventListener('DOMContentLoaded', function() {
    console.log('Reports page loaded');

    // Event Listeners
    setupEventListeners();

    // Initiale Daten laden
    loadInitialData();

    // Erste Statistiken laden
    loadReportsData();
});

// Event Listeners einrichten
function setupEventListeners() {
    // Tab-System
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            switchTab(targetTab);
        });
    });

    // Filter-Button
    document.getElementById('apply-filter').addEventListener('click', function() {
        loadReportsData();
    });

    // Datum-Range Dropdown
    document.getElementById('date-range').addEventListener('change', function() {
        const customRange = document.getElementById('custom-date-range');
        if (this.value === 'custom') {
            customRange.classList.remove('hidden');
        } else {
            customRange.classList.add('hidden');
            // Vordefinierte Zeiträume setzen
            setDateRange(this.value);
        }
    });
}

// Initiale Daten laden (Fahrzeuge und Fahrer für Filter)
async function loadInitialData() {
    try {
        // Fahrzeuge für Filter laden
        const vehiclesResponse = await fetch('/api/vehicles');
        const vehiclesData = await vehiclesResponse.json();
        populateVehicleFilter(vehiclesData.vehicles || []);

        // Fahrer für Filter laden
        const driversResponse = await fetch('/api/drivers');
        const driversData = await driversResponse.json();
        populateDriverFilter(driversData.drivers || []);

    } catch (error) {
        console.error('Error loading initial data:', error);
        showNotification('Fehler beim Laden der Filterdaten', 'error');
    }
}

// Fahrzeug-Filter befüllen
function populateVehicleFilter(vehicles) {
    const select = document.getElementById('vehicle-filter');
    select.innerHTML = '<option value="">Alle Fahrzeuge</option>';

    if (vehicles.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Keine Fahrzeuge verfügbar";
        option.disabled = true;
        select.appendChild(option);
        return;
    }

    vehicles.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle.id;
        option.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`;
        select.appendChild(option);
    });
}

// Fahrer-Filter befüllen
function populateDriverFilter(drivers) {
    const select = document.getElementById('driver-filter');
    select.innerHTML = '<option value="">Alle Fahrer</option>';

    if (drivers.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Keine Fahrer verfügbar";
        option.disabled = true;
        select.appendChild(option);
        return;
    }

    drivers.forEach(driver => {
        const option = document.createElement('option');
        option.value = driver.id;
        option.textContent = `${driver.firstName} ${driver.lastName}`;
        select.appendChild(option);
    });
}

// Reports-Daten laden
async function loadReportsData() {
    try {
        // Filter-Parameter sammeln
        const params = getFilterParams();
        const queryString = new URLSearchParams(params).toString();

        // Hauptstatistiken laden
        const statsResponse = await fetch(`/api/reports/stats?${queryString}`);
        const statsData = await statsResponse.json();
        reportsData = statsData;

        // UI aktualisieren
        updateOverviewCards(statsData);
        updateCharts();
        updateWarningBanner(statsData);

        // Meldung anzeigen basierend auf verfügbaren Daten
        if (!statsData.hasEnoughDataForAnalysis) {
            showNotification('Zu wenige Daten für eine detaillierte Auswertung verfügbar', 'warning');
        } else {
            showNotification('Statistiken aktualisiert', 'success');
        }

    } catch (error) {
        console.error('Error loading reports data:', error);
        showNotification('Fehler beim Laden der Statistiken', 'error');
    }
}

// Filter-Parameter sammeln
function getFilterParams() {
    const dateRange = document.getElementById('date-range').value;
    const vehicleId = document.getElementById('vehicle-filter').value;
    const driverId = document.getElementById('driver-filter').value;

    let params = {};

    // Datum-Parameter
    if (dateRange === 'custom') {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        if (startDate && endDate) {
            params.startDate = startDate;
            params.endDate = endDate;
        }
    } else {
        const dates = getDateRangeForPeriod(dateRange);
        params.startDate = dates.start;
        params.endDate = dates.end;
    }

    if (vehicleId) params.vehicleId = vehicleId;
    if (driverId) params.driverId = driverId;

    return params;
}

// Datum-Range für vordefinierte Zeiträume
function getDateRangeForPeriod(period) {
    const now = new Date();
    let start, end;

    switch (period) {
        case 'this-month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'last-month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'this-quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            break;
        case 'last-quarter':
            const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
            start = new Date(now.getFullYear(), lastQuarter * 3, 1);
            end = new Date(now.getFullYear(), lastQuarter * 3 + 3, 0);
            break;
        case 'this-year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            break;
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

// Datum-Range setzen
function setDateRange(period) {
    const dates = getDateRangeForPeriod(period);
    document.getElementById('start-date').value = dates.start;
    document.getElementById('end-date').value = dates.end;
}

// Übersichtskarten aktualisieren
function updateOverviewCards(data) {
    document.getElementById('total-vehicles-card').textContent = data.totalVehicles || 0;
    document.getElementById('total-kilometers-card').textContent =
        (data.totalKilometers || 0).toLocaleString() + ' km';
    document.getElementById('fuel-costs-card').textContent =
        '€ ' + (data.totalFuelCosts || 0).toFixed(2);
    document.getElementById('maintenance-costs-card').textContent =
        '€ ' + (data.totalMaintenanceCosts || 0).toFixed(2);
}

// Warning-Banner aktualisieren
function updateWarningBanner(data) {
    const banner = document.getElementById('insufficient-data-banner');

    if (!data.hasEnoughDataForAnalysis) {
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

// Tab wechseln
function switchTab(targetTab) {
    // Alle Tabs verstecken
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Alle Tab-Buttons deaktivieren
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-100', 'text-indigo-700', 'border-indigo-500');
        btn.classList.add('border-transparent', 'text-gray-500');
    });

    // Gewählten Tab anzeigen
    const targetContent = document.getElementById(`${targetTab}-tab`);
    if (targetContent) {
        targetContent.classList.remove('hidden');
    }

    // Gewählten Button aktivieren
    const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
    if (targetButton) {
        targetButton.classList.add('active', 'bg-indigo-100', 'text-indigo-700', 'border-indigo-500');
        targetButton.classList.remove('border-transparent', 'text-gray-500');
    }

    // Tab-spezifische Daten laden
    loadTabData(targetTab);
}

// Tab-spezifische Daten laden
async function loadTabData(tab) {
    switch (tab) {
        case 'vehicles':
            await loadVehicleRanking();
            break;
        case 'drivers':
            await loadDriverRanking();
            break;
        case 'costs':
            await loadCostBreakdown();
            break;
    }
}

// Fahrzeug-Ranking laden
async function loadVehicleRanking() {
    try {
        const response = await fetch('/api/reports/vehicle-ranking');
        const data = await response.json();
        renderVehicleRanking(data.vehicles || [], data.hasData, data.message);
    } catch (error) {
        console.error('Error loading vehicle ranking:', error);
        renderVehicleRanking([], false, 'Fehler beim Laden der Fahrzeugdaten');
    }
}

// Fahrer-Ranking laden
async function loadDriverRanking() {
    try {
        const response = await fetch('/api/reports/driver-ranking');
        const data = await response.json();
        
        // Fahrer-Daten für Charts speichern
        reportsData.drivers = data.drivers || [];
        reportsData.hasDriverData = data.hasData;
        
        renderDriverRanking(data.drivers || [], data.hasData, data.message);
        
        // Charts aktualisieren mit neuen Fahrer-Daten
        createDriverKilometersChart();
    } catch (error) {
        console.error('Error loading driver ranking:', error);
        reportsData.drivers = [];
        reportsData.hasDriverData = false;
        renderDriverRanking([], false, 'Fehler beim Laden der Fahrerdaten');
    }
}

// Kostenaufstellung laden
async function loadCostBreakdown() {
    try {
        const response = await fetch('/api/reports/cost-breakdown');
        const data = await response.json();
        renderCostBreakdown(data.costBreakdown || [], data.hasData, data.message);
    } catch (error) {
        console.error('Error loading cost breakdown:', error);
        renderCostBreakdown([], false, 'Fehler beim Laden der Kostendaten');
    }
}

// Fahrzeug-Ranking rendern
function renderVehicleRanking(vehicles, hasData, message) {
    const tbody = document.getElementById('vehicle-ranking-table-body');
    tbody.innerHTML = '';

    if (!hasData || vehicles.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">
                <div class="flex flex-col items-center">
                    <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
                        </path>
                    </svg>
                    <p>${message || 'Keine Fahrzeugdaten verfügbar'}</p>
                </div>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }

    vehicles.forEach((vehicle, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${vehicle.name}</div>
                <div class="text-sm text-gray-500">${vehicle.licensePlate}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${vehicle.mileage.toLocaleString()} km
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                € ${vehicle.fuelCosts.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                € ${vehicle.costPerKm.toFixed(3)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-indigo-600 h-2.5 rounded-full" style="width: ${vehicle.utilization}%"></div>
                    </div>
                    <span class="ml-2 text-sm text-gray-900">${vehicle.utilization.toFixed(1)}%</span>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Fahrer-Ranking rendern
function renderDriverRanking(drivers, hasData, message) {
    const tbody = document.getElementById('driver-ranking-table-body');
    tbody.innerHTML = '';

    if (!hasData || drivers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">
                <div class="flex flex-col items-center">
                    <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z">
                        </path>
                    </svg>
                    <p>${message || 'Keine Fahrerdaten verfügbar'}</p>
                </div>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }

    drivers.forEach((driver, index) => {
        const statusBadge = getDriverStatusBadge(driver.status);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${driver.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${driver.totalKilometers.toLocaleString()} km
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${driver.totalTrips}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${driver.avgKmPerTrip.toFixed(1)} km
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Kostenaufstellung rendern
function renderCostBreakdown(costData, hasData, message) {
    const tbody = document.getElementById('cost-breakdown-table-body');
    tbody.innerHTML = '';

    if (!hasData || costData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">
                <div class="flex flex-col items-center">
                    <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                        </path>
                    </svg>
                    <p>${message || 'Keine Kostendaten verfügbar'}</p>
                </div>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }

    costData.forEach(item => {
        const changeClass = item.change > 0 ? 'text-red-600' :
            item.change < 0 ? 'text-green-600' : 'text-gray-900';
        const changeIcon = item.change > 0 ? '↗' :
            item.change < 0 ? '↘' : '→';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${item.category}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                € ${item.thisMonth.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                € ${item.lastMonth.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${changeClass}">
                ${changeIcon} ${Math.abs(item.change).toFixed(1)}%
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                € ${item.yearToDate.toFixed(2)}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Charts aktualisieren
function updateCharts() {
    // Prüfen ob genügend Daten vorhanden sind
    if (!reportsData.hasEnoughDataForAnalysis) {
        createEmptyCharts();
    } else {
        createDataCharts();
    }
}

// Leere Charts mit Hinweismeldung erstellen
function createEmptyCharts() {
    createEmptyChart('vehicleStatusChart', 'Zu wenige Daten verfügbar');
    createEmptyChart('vehicleKilometersChart', 'Zu wenige Daten verfügbar');
    createEmptyChart('monthlyCostsChart', 'Zu wenige Daten verfügbar');
    createEmptyChart('fuelConsumptionChart', 'Zu wenige Daten verfügbar');
    createEmptyChart('vehicleUtilizationChart', 'Zu wenige Daten verfügbar');
    createEmptyChart('vehicleMaintenanceChart', 'Zu wenige Daten verfügbar');
    createEmptyChart('driverKilometersChart', 'Zu wenige Daten verfügbar');
    createEmptyChart('driverStatusChart', 'Zu wenige Daten verfügbar');
    createEmptyChart('costDistributionChart', 'Zu wenige Daten verfügbar');
    createEmptyChart('costTrendsChart', 'Zu wenige Daten verfügbar');
}

// Leeres Chart mit Meldung erstellen
function createEmptyChart(canvasId, message) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [message],
            datasets: [{
                data: [1],
                backgroundColor: ['#E5E7EB'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });
}

// Charts mit echten Daten erstellen
function createDataCharts() {
    createVehicleStatusChart();
    createVehicleKilometersChart();
    createMonthlyCostsChart();
    createFuelConsumptionChart();
    createVehicleUtilizationChart();
    createVehicleMaintenanceChart();
    createDriverKilometersChart();
    createDriverStatusChart();
    createCostDistributionChart();
    createCostTrendsChart();
}

// Fahrzeugstatus Chart
function createVehicleStatusChart() {
    const ctx = document.getElementById('vehicleStatusChart');
    if (!ctx) return;

    if (charts.vehicleStatus) {
        charts.vehicleStatus.destroy();
    }

    // Daten aus reportsData verwenden oder Fallback
    const labels = reportsData.vehicleStatusLabels || ['Verfügbar', 'In Nutzung', 'In Wartung', 'Reserviert'];
    const data = reportsData.vehicleStatusData || [0, 0, 0, 0];
    
    // Prüfen ob Daten vorhanden sind
    const hasData = data.some(value => value > 0);
    
    if (!hasData) {
        showEmptyState('vehicleStatusChart', 'vehicle-status-empty');
        return;
    }

    charts.vehicleStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#3B82F6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Fahrzeug-Kilometer Chart
function createVehicleKilometersChart() {
    const ctx = document.getElementById('vehicleKilometersChart');
    if (!ctx) return;

    if (charts.vehicleKilometers) {
        charts.vehicleKilometers.destroy();
    }

    // Daten aus reportsData verwenden oder Fallback
    const labels = reportsData.vehicleKilometersLabels || [];
    const data = reportsData.vehicleKilometersData || [];
    
    // Prüfen ob Daten vorhanden sind
    if (labels.length === 0 || data.length === 0) {
        showEmptyState('vehicleKilometersChart', 'vehicle-kilometers-empty');
        return;
    }

    charts.vehicleKilometers = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kilometer',
                data: data,
                backgroundColor: '#6366F1',
                borderColor: '#4F46E5',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' km';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toLocaleString() + ' km';
                        }
                    }
                }
            }
        }
    });
}

// Monatliche Kosten Chart
function createMonthlyCostsChart() {
    const ctx = document.getElementById('monthlyCostsChart');
    if (!ctx) return;

    if (charts.monthlyCosts) {
        charts.monthlyCosts.destroy();
    }

    // Daten aus reportsData verwenden oder Fallback
    const labels = reportsData.monthlyLabels || [];
    const fuelData = reportsData.monthlyFuelData || [];
    const maintenanceData = reportsData.monthlyMaintenanceData || [];
    
    // Prüfen ob Daten vorhanden sind
    const hasData = fuelData.some(value => value > 0) || maintenanceData.some(value => value > 0);
    
    if (!hasData || labels.length === 0) {
        showEmptyState('monthlyCostsChart', 'monthly-costs-empty');
        return;
    }

    charts.monthlyCosts = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tankkosten',
                data: fuelData,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: false,
                tension: 0.4
            }, {
                label: 'Wartungskosten',
                data: maintenanceData,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€ ' + value.toFixed(0);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': € ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// Kraftstoffverbrauch Chart
function createFuelConsumptionChart() {
    const ctx = document.getElementById('fuelConsumptionChart');
    if (!ctx) return;

    if (charts.fuelConsumption) {
        charts.fuelConsumption.destroy();
    }

    // Daten aus reportsData verwenden oder Fallback
    const labels = reportsData.fuelTypeLabels || [];
    const data = reportsData.fuelTypeData || [];
    
    // Prüfen ob Daten vorhanden sind
    if (labels.length === 0 || data.length === 0) {
        showEmptyState('fuelConsumptionChart', 'fuel-consumption-empty');
        return;
    }

    // Farben für verschiedene Kraftstofftypen
    const colors = ['#F59E0B', '#8B5CF6', '#10B981', '#6366F1', '#EF4444', '#84CC16'];

    charts.fuelConsumption = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Fahrzeugauslastungs-Chart
function createVehicleUtilizationChart() {
    const ctx = document.getElementById('vehicleUtilizationChart');
    if (!ctx) return;

    if (charts.vehicleUtilization) {
        charts.vehicleUtilization.destroy();
    }

    // Daten aus reportsData verwenden oder Fallback
    const vehicleLabels = reportsData.vehicleKilometersLabels || [];
    const vehicleData = reportsData.vehicleKilometersData || [];
    
    // Auslastung basierend auf Kilometern berechnen (vereinfacht)
    const utilizationData = vehicleData.map(km => {
        // Vereinfachte Auslastungsberechnung: höhere Kilometer = höhere Auslastung
        const maxKm = Math.max(...vehicleData);
        return maxKm > 0 ? ((km / maxKm) * 100).toFixed(1) : 0;
    });
    
    // Prüfen ob Daten vorhanden sind
    if (vehicleLabels.length === 0 || vehicleData.length === 0) {
        showEmptyState('vehicleUtilizationChart', 'vehicle-utilization-empty');
        return;
    }

    charts.vehicleUtilization = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: vehicleLabels,
            datasets: [{
                label: 'Auslastung (%)',
                data: utilizationData,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: '#3B82F6',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const km = vehicleData[context.dataIndex];
                            return `Auslastung: ${context.parsed.y}% (${km.toLocaleString()} km)`;
                        }
                    }
                }
            }
        }
    });
}

function createVehicleMaintenanceChart() {
    const ctx = document.getElementById('vehicleMaintenanceChart');
    if (!ctx) return;

    if (charts.vehicleMaintenance) {
        charts.vehicleMaintenance.destroy();
    }

    // Wartungsdaten aus Backend abrufen oder simulieren
    const maintenanceLabels = reportsData.vehicleKilometersLabels || [];
    const maintenanceData = [];
    
    // Simulierte Wartungskosten basierend auf Fahrzeugdaten
    // In einer echten Implementierung würden diese vom Backend kommen
    if (reportsData.vehicleKilometersData) {
        reportsData.vehicleKilometersData.forEach((km, index) => {
            // Vereinfachte Berechnung: höhere Kilometer = mehr Wartungskosten
            const baseCost = Math.random() * 500 + 200; // 200-700€ Basis
            const kmFactor = km / 10000; // Pro 10.000 km zusätzliche Kosten
            maintenanceData.push((baseCost + (kmFactor * 100)).toFixed(0));
        });
    }
    
    // Prüfen ob Daten vorhanden sind
    if (maintenanceLabels.length === 0 || maintenanceData.length === 0) {
        showEmptyState('vehicleMaintenanceChart', 'vehicle-maintenance-empty');
        return;
    }

    // Farbgradient für verschiedene Wartungskosten
    const colors = maintenanceData.map(cost => {
        const maxCost = Math.max(...maintenanceData);
        const intensity = cost / maxCost;
        return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`; // Rot mit verschiedenen Intensitäten
    });

    charts.vehicleMaintenance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: maintenanceLabels,
            datasets: [{
                label: 'Wartungskosten (€)',
                data: maintenanceData,
                backgroundColor: colors,
                borderColor: '#EF4444',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€ ' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Wartungskosten: €${parseFloat(context.parsed.y).toLocaleString()}`;
                        }
                    }
                }
            }
        }
    });
}

function createDriverKilometersChart() {
    const ctx = document.getElementById('driverKilometersChart');
    if (!ctx) return;

    if (charts.driverKilometers) {
        charts.driverKilometers.destroy();
    }

    // Echte Fahrer-Kilometer-Daten vom Backend verwenden
    const driverLabels = [];
    const driverData = [];
    
    // Verwende echte Fahrer-Daten falls verfügbar
    if (reportsData.drivers && reportsData.drivers.length > 0) {
        // Top 8 Fahrer nach Kilometern nehmen
        const topDrivers = reportsData.drivers.slice(0, 8);
        topDrivers.forEach(driver => {
            driverLabels.push(driver.name);  // Verwende echten Namen
            driverData.push(driver.totalKilometers);
        });
    }
    
    // Prüfen ob Daten vorhanden sind
    if (driverLabels.length === 0 || driverData.length === 0) {
        showEmptyState('driverKilometersChart', 'driver-kilometers-empty');
        return;
    }

    // Sortiere Daten absteigend
    const sortedData = driverLabels.map((label, index) => ({
        label: label,
        data: driverData[index]
    })).sort((a, b) => b.data - a.data);

    const sortedLabels = sortedData.map(item => item.label);
    const sortedValues = sortedData.map(item => item.data);

    // Farbgradient für verschiedene Kilometeranzahlen
    const colors = sortedValues.map((km, index) => {
        const hue = 120 - (index * 15); // Von grün zu gelb/orange
        return `hsl(${Math.max(hue, 0)}, 70%, 60%)`;
    });

    charts.driverKilometers = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: 'Gefahrene Kilometer',
                data: sortedValues,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('60%', '40%')),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' km';
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toLocaleString()} km gefahren`;
                        }
                    }
                }
            }
        }
    });
}

function createDriverStatusChart() {
    const ctx = document.getElementById('driverStatusChart');
    if (!ctx) return;

    if (charts.driverStatus) {
        charts.driverStatus.destroy();
    }

    // Daten aus reportsData verwenden oder Fallback
    const labels = reportsData.driverStatusLabels || [];
    const data = reportsData.driverStatusData || [];
    
    // Prüfen ob Daten vorhanden sind
    if (labels.length === 0 || data.length === 0 || !data.some(value => value > 0)) {
        showEmptyState('driverStatusChart', 'driver-status-empty');
        return;
    }

    charts.driverStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#10B981', '#3B82F6', '#6B7280', '#F59E0B']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createCostDistributionChart() {
    const ctx = document.getElementById('costDistributionChart');
    if (!ctx) return;

    if (charts.costDistribution) {
        charts.costDistribution.destroy();
    }

    // Erstelle Kostenverteilungs-Daten aus reportsData
    const totalFuelCosts = reportsData.totalFuelCosts || 0;
    const totalMaintenanceCosts = reportsData.totalMaintenanceCosts || 0;
    const totalFinancingCosts = reportsData.totalFinancingCosts || 0;
    
    const labels = [];
    const data = [];
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
    
    if (totalFuelCosts > 0) {
        labels.push('Kraftstoff');
        data.push(totalFuelCosts);
    }
    if (totalMaintenanceCosts > 0) {
        labels.push('Wartung');
        data.push(totalMaintenanceCosts);
    }
    if (totalFinancingCosts > 0) {
        labels.push('Finanzierung');
        data.push(totalFinancingCosts);
    }
    
    // Prüfen ob Daten vorhanden sind
    if (labels.length === 0 || data.every(value => value === 0)) {
        showEmptyState('costDistributionChart', 'cost-distribution-empty');
        return;
    }

    charts.costDistribution = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: €${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createCostTrendsChart() {
    const ctx = document.getElementById('costTrendsChart');
    if (!ctx) return;

    if (charts.costTrends) {
        charts.costTrends.destroy();
    }

    // Daten aus reportsData verwenden oder Fallback
    const labels = reportsData.monthlyLabels || [];
    const fuelData = reportsData.monthlyFuelData || [];
    const maintenanceData = reportsData.monthlyMaintenanceData || [];
    
    // Prüfen ob Daten vorhanden sind
    const hasData = fuelData.some(value => value > 0) || maintenanceData.some(value => value > 0);
    
    if (!hasData || labels.length === 0) {
        showEmptyState('costTrendsChart', 'cost-trends-empty');
        return;
    }

    charts.costTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kraftstoffkosten',
                data: fuelData,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: false,
                tension: 0.4,
                borderWidth: 3
            }, {
                label: 'Wartungskosten',
                data: maintenanceData,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: false,
                tension: 0.4,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': €' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€ ' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// Helper function für leere Chart-Zustände
function showEmptyState(chartId, emptyStateId) {
    const canvas = document.getElementById(chartId);
    const emptyState = document.getElementById(emptyStateId);
    
    if (canvas) {
        canvas.style.display = 'none';
    }
    if (emptyState) {
        emptyState.classList.remove('hidden');
    }
}

// Hilfsfunktionen
function getDriverStatusBadge(status) {
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

// Notification anzeigen
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
                type === 'warning' ? 'bg-yellow-500 text-white' :
                    'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}