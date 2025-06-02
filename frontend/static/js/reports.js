
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

        showNotification('Statistiken aktualisiert', 'success');

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
        renderVehicleRanking(data.vehicles || []);
    } catch (error) {
        console.error('Error loading vehicle ranking:', error);
    }
}

// Fahrer-Ranking laden
async function loadDriverRanking() {
    try {
        const response = await fetch('/api/reports/driver-ranking');
        const data = await response.json();
        renderDriverRanking(data.drivers || []);
    } catch (error) {
        console.error('Error loading driver ranking:', error);
    }
}

// Kostenaufstellung laden
async function loadCostBreakdown() {
    try {
        const response = await fetch('/api/reports/cost-breakdown');
        const data = await response.json();
        renderCostBreakdown(data.costBreakdown || []);
    } catch (error) {
        console.error('Error loading cost breakdown:', error);
    }
}

// Fahrzeug-Ranking rendern
function renderVehicleRanking(vehicles) {
    const tbody = document.getElementById('vehicle-ranking-table-body');
    tbody.innerHTML = '';

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
function renderDriverRanking(drivers) {
    const tbody = document.getElementById('driver-ranking-table-body');
    tbody.innerHTML = '';

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
function renderCostBreakdown(costData) {
    const tbody = document.getElementById('cost-breakdown-table-body');
    tbody.innerHTML = '';

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

    charts.vehicleStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Verfügbar', 'In Nutzung', 'In Wartung'],
            datasets: [{
                data: [65, 25, 10], // Beispieldaten
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
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

    charts.vehicleKilometers = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Fahrzeug 1', 'Fahrzeug 2', 'Fahrzeug 3', 'Fahrzeug 4'],
            datasets: [{
                label: 'Kilometer',
                data: [15000, 12000, 18000, 9000],
                backgroundColor: '#6366F1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
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

    charts.monthlyCosts = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Tankkosten',
                data: [1200, 1100, 1300, 1250, 1400, 1350],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }, {
                label: 'Wartungskosten',
                data: [300, 450, 200, 600, 350, 400],
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
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

    charts.fuelConsumption = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Benzin', 'Diesel', 'Elektro', 'Hybrid'],
            datasets: [{
                data: [40, 45, 10, 5],
                backgroundColor: ['#F59E0B', '#8B5CF6', '#10B981', '#6366F1']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Weitere Chart-Funktionen analog implementieren...
function createVehicleUtilizationChart() {
    // Implementierung analog zu den anderen Charts
}

function createVehicleMaintenanceChart() {
    // Implementierung analog zu den anderen Charts
}

function createDriverKilometersChart() {
    // Implementierung analog zu den anderen Charts
}

function createDriverStatusChart() {
    // Implementierung analog zu den anderen Charts
}

function createCostDistributionChart() {
    // Implementierung analog zu den anderen Charts
}

function createCostTrendsChart() {
    // Implementierung analog zu den anderen Charts
}

// Hilfsfunktionen
function getDriverStatusBadge(status) {
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