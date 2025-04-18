/**
 * Vehicle Display Updater
 * Handles all UI update functionality for vehicle details
 */

// Hilfsfunktionen für Formatierung
function formatDate(dateString) {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }) + ', ' + date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    }) + ' Uhr';
}

function formatNumber(number, decimals = 0) {
    if (number === undefined || number === null) return '-';
    return parseFloat(number).toLocaleString('de-DE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatCurrency(number) {
    if (number === undefined || number === null) return '-';
    return parseFloat(number).toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' €';
}

function setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text || '-';
    }
}

// Kopfzeileninformationen aktualisieren
function updateHeaderInfo(vehicle) {
    // Fahrzeugtitel im Header und Breadcrumb aktualisieren
    const vehicleTitle = document.getElementById('vehicle-title');
    const vehicleHeader = document.getElementById('vehicle-header');
    const vehicleSubheader = document.getElementById('vehicle-subheader');
    const vehicleStatus = document.getElementById('vehicle-status-badge');

    const fullVehicleName = `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`;

    if (vehicleTitle) vehicleTitle.textContent = fullVehicleName;
    if (vehicleHeader) vehicleHeader.textContent = fullVehicleName;
    if (vehicleSubheader) vehicleSubheader.textContent =
        `${vehicle.year || ''} · ${vehicle.fuelType || 'Unbekannter Kraftstofftyp'}`;

    // Fahrzeugstatus-Badge aktualisieren
    if (vehicleStatus) {
        let statusConfig = getStatusConfig(vehicle.status);
        vehicleStatus.className = `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.bg} ${statusConfig.text} dark:${statusConfig.darkBg} dark:${statusConfig.darkText}`;
        vehicleStatus.textContent = statusConfig.label;
    }
}

// Statuskonfiguration erhalten
function getStatusConfig(status) {
    switch(status) {
        case 'available':
            return {
                bg: 'bg-green-100',
                text: 'text-green-800',
                darkBg: 'bg-green-900/30',
                darkText: 'text-green-400',
                label: 'Verfügbar'
            };
        case 'inuse':
            return {
                bg: 'bg-red-100',
                text: 'text-red-800',
                darkBg: 'bg-red-900/30',
                darkText: 'text-red-400',
                label: 'In Benutzung'
            };
        case 'maintenance':
            return {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                darkBg: 'bg-yellow-900/30',
                darkText: 'text-yellow-400',
                label: 'In Wartung'
            };
        default:
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-800',
                darkBg: 'bg-gray-700',
                darkText: 'text-gray-300',
                label: status || 'Unbekannt'
            };
    }
}

// Fahrzeug-Details anzeigen
function updateVehicleDisplay(vehicle) {
    // Grundinformationen
    setElementText('license-plate-display', vehicle.licensePlate || '-');
    setElementText('brand-model-display', (vehicle.brand + ' ' + vehicle.model) || '-');
    setElementText('year-display', vehicle.year || '-');
    setElementText('color-display', vehicle.color || '-');
    setElementText('vehicle-id-display', vehicle.vehicleId || '-');
    setElementText('vin-display', vehicle.vin || '-');
    setElementText('fuel-type-display', vehicle.fuelType || '-');
    setElementText('mileage-display', vehicle.mileage ? `${vehicle.mileage} km` : '-');
}

// Aktuelle Nutzungsanzeige aktualisieren
function updateCurrentUsageDisplay(driver, activeUsage = null) {
    const currentUsageTab = document.getElementById('current-usage');
    if (!currentUsageTab) return;

    if (!driver) {
        // Kein Fahrer zugewiesen
        currentUsageTab.innerHTML = `
            <div class="bg-white overflow-hidden shadow rounded-lg dark:bg-gray-800">
                <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Aktuelle Nutzung</h3>
                </div>
                <div class="px-4 py-5 sm:p-6 text-center text-gray-500 dark:text-gray-400">
                    <p>Dieses Fahrzeug wird derzeit nicht genutzt.</p>
                    <button id="start-usage-btn" type="button" class="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                        <svg class="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Nutzung starten
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Fahrer ist zugewiesen, Details anzeigen
    let usageStartDate = "Unbekannt";
    let usageEndDate = "Nicht gesetzt";
    let department = "";
    let project = "";

    if (activeUsage) {
        usageStartDate = formatDateTime(activeUsage.startDate);
        if (activeUsage.endDate) usageEndDate = formatDateTime(activeUsage.endDate);
        department = activeUsage.department || "";
        project = activeUsage.project || activeUsage.purpose || "";
    }

    currentUsageTab.innerHTML = `
        <div class="bg-white overflow-hidden shadow rounded-lg dark:bg-gray-800">
            <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 dark:bg-gray-700 dark:border-gray-600 flex justify-between items-center">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Aktuelle Nutzung</h3>
                <button type="button" id="edit-current-usage-btn" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50">
                    <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Bearbeiten
                </button>
            </div>
            <div class="px-4 py-5 sm:p-6">
                <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Aktueller Fahrer</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">${driver.firstName} ${driver.lastName}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Abteilung</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">${department || "Nicht angegeben"}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nutzung seit</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">${usageStartDate}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Geplante Rückgabe</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">${usageEndDate}</dd>
                    </div>
                    <div class="sm:col-span-2">
                        <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Projekt/Zweck</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">${project || "Nicht angegeben"}</dd>
                    </div>
                </dl>
            </div>
        </div>
    `;
}

// Wartungstabelle aktualisieren
function updateMaintenanceTable(entries) {
    const tableBody = document.getElementById('maintenance-table-body');
    if (!tableBody) return;

    if (!entries || entries.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-gray-500 dark:text-gray-400">
                    Keine Wartungseinträge gefunden.
                </td>
            </tr>
        `;
        return;
    }

    // Nach Datum sortieren (neueste zuerst)
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Tabelle mit Einträgen füllen
    tableBody.innerHTML = entries.map(entry => {
        const date = formatDate(entry.date);
        let type = 'Sonstiges';

        switch (entry.type) {
            case 'inspection': type = 'Inspektion'; break;
            case 'oil-change': type = 'Ölwechsel'; break;
            case 'tire-change': type = 'Reifenwechsel'; break;
            case 'repair': type = 'Reparatur'; break;
        }

        return `
            <tr>
                <td class="py-3.5 pl-4 pr-3 text-left text-sm text-gray-900 dark:text-white sm:pl-0">${date}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${type}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.mileage} km</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.cost ? (entry.cost + ' €') : '-'}</td>
                <td class="relative py-3.5 pl-3 pr-4 sm:pr-0 text-right">
                    <button class="edit-maintenance-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" data-id="${entry.id}">
                        Bearbeiten
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Nutzungstabelle aktualisieren
function updateUsageTable(entries) {
    const tableBody = document.getElementById('usage-table-body');
    if (!tableBody) return;

    if (!entries || entries.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-gray-500 dark:text-gray-400">
                    Keine Nutzungseinträge gefunden.
                </td>
            </tr>
        `;
        return;
    }

    // Nach Startdatum sortieren (neueste zuerst)
    entries.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    // Tabelle mit Einträgen füllen
    tableBody.innerHTML = entries.map(entry => {
        const startDate = formatDate(entry.startDate);
        const endDate = entry.endDate ? formatDate(entry.endDate) : '-';
        const timeframe = `${startDate} - ${endDate}`;

        // Kilometerstand-Differenz berechnen
        let mileageInfo = `${entry.startMileage} km`;
        if (entry.endMileage && entry.endMileage > entry.startMileage) {
            const diff = entry.endMileage - entry.startMileage;
            mileageInfo = `${entry.startMileage} - ${entry.endMileage} km (+${diff} km)`;
        }

        return `
            <tr>
                <td class="py-3.5 pl-4 pr-3 text-left text-sm text-gray-900 dark:text-white sm:pl-6">${timeframe}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.driverName || '-'}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.project || entry.purpose || '-'}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${mileageInfo}</td>
                <td class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                    <button class="edit-usage-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" data-id="${entry.id}">
                        Bearbeiten
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Zulassungsanzeige aktualisieren
function updateRegistrationDisplay(vehicle) {
    // Zulassungsdaten aktualisieren
    setElementText('registration-date-display', formatDate(vehicle.registrationDate) || '-');
    setElementText('registration-expiry-display', formatDate(vehicle.registrationExpiry) || '-');
    setElementText('next-inspection-display', formatDate(vehicle.nextInspectionDate) || '-');
    setElementText('insurance-company-display', vehicle.insuranceCompany || '-');
    setElementText('insurance-number-display', vehicle.insuranceNumber || '-');
    setElementText('insurance-type-display', vehicle.insuranceType || '-');
    setElementText('insurance-expiry-display', formatDate(vehicle.insuranceExpiry) || '-');
    setElementText('insurance-cost-display', vehicle.insuranceCost ? formatCurrency(vehicle.insuranceCost) : '-');
}

// Tankkosten-Tabelle aktualisieren
function updateFuelCostsTable(entries) {
    const tableBody = document.getElementById('vehicle-fuel-costs-body');
    if (!tableBody) return;

    if (!entries || entries.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="py-4 text-center text-gray-500 dark:text-gray-400">
                    Keine Tankkosten gefunden.
                </td>
            </tr>
        `;
        return;
    }

    // Nach Datum sortieren (neueste zuerst)
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Tabelle mit Einträgen füllen
    tableBody.innerHTML = entries.map(entry => {
        const date = formatDate(entry.date);
        const amount = formatNumber(entry.amount, 2);
        const pricePerUnit = formatCurrency(entry.pricePerUnit);
        const totalCost = formatCurrency(entry.totalCost);

        return `
            <tr>
                <td class="py-3.5 pl-4 pr-3 text-left text-sm text-gray-900 dark:text-white sm:pl-6">${date}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.fuelType || '-'}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${amount} ${entry.fuelType === 'Elektro' ? 'kWh' : 'L'}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${pricePerUnit}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${totalCost}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.mileage} km</td>
                <td class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                    <button class="edit-fuel-cost-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" data-id="${entry.id}">
                        Bearbeiten
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Tankkosten-Statistik aktualisieren
function updateFuelCostsStatistics(entries) {
    if (!entries || entries.length === 0) {
        // Statistik-Elemente mit Standardwerten füllen
        const elements = [
            'avg-consumption', 'stats-avg-consumption',
            'total-fuel-costs', 'stats-total-fuel-costs',
            'cost-per-km', 'stats-cost-per-km'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '--';
        });

        return;
    }

    // Elemente für Statistik finden (sowohl im Fuel-Costs als auch im Statistics Tab)
    const avgConsumptionElements = [
        document.getElementById('avg-consumption'),
        document.getElementById('stats-avg-consumption')
    ];

    const totalFuelCostsElements = [
        document.getElementById('total-fuel-costs'),
        document.getElementById('stats-total-fuel-costs')
    ];

    const costPerKmElements = [
        document.getElementById('cost-per-km'),
        document.getElementById('stats-cost-per-km')
    ];

    // Berechnung der Statistiken
    // Diese Berechnungen sind vereinfacht - im Produktionscode würden tatsächliche
    // Berechnungen basierend auf den Daten durchgeführt
    const avgConsumption = '8.5';
    const totalCosts = '1.250,00 €';
    const costPerKm = '0,12 €/km';

    // Elemente aktualisieren
    avgConsumptionElements.forEach(element => {
        if (element) element.textContent = avgConsumption;
    });

    totalFuelCostsElements.forEach(element => {
        if (element) element.textContent = totalCosts;
    });

    costPerKmElements.forEach(element => {
        if (element) element.textContent = costPerKm;
    });
}

// Tankkosten-Diagramm erstellen
function createFuelCostChart(entries) {
    const chartElement = document.getElementById('stats-fuel-costs-chart');
    if (!chartElement || typeof ApexCharts === 'undefined' || !entries.length) return;

    // Hier würde die tatsächliche Diagramm-Erstellung mit ApexCharts stattfinden
    // Die tatsächliche Implementierung hängt von der ApexCharts-Konfiguration ab

    // Beispielhafte Definition:
    const options = {
        chart: {
            type: 'bar',
            height: 350,
            toolbar: {
                show: false
            }
        },
        colors: ['#4F46E5'],
        series: [{
            name: 'Tankkosten',
            data: [300, 450, 280, 340, 520, 380, 490, 310, 240, 280, 390, 450]
        }],
        xaxis: {
            categories: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
        }
    };

    // Diagramm neu erstellen
    if (window.fuelCostsChart) {
        window.fuelCostsChart.destroy();
    }

    window.fuelCostsChart = new ApexCharts(chartElement, options);
    window.fuelCostsChart.render();
}

// Tab-Initialisierung
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.vehicle-tab-btn');
    const tabContents = document.querySelectorAll('.vehicle-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Alle Tabs ausblenden
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });

            // Alle Tab-Buttons zurücksetzen
            tabButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-500');
                btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            });

            // Ausgewählten Tab anzeigen
            document.getElementById(tabName).classList.remove('hidden');

            // Aktuellen Button hervorheben
            button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            button.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-500');
        });
    });

    // Mobile Tab-Auswahl aktualisieren
    const tabSelect = document.getElementById('tabs');
    if (tabSelect) {
        tabSelect.addEventListener('change', function() {
            document.querySelector(`.vehicle-tab-btn[data-tab="${this.value}"]`).click();
        });
    }
}

// Zulassungs-Tab initialisieren
function initRegistrationTab(vehicle) {
    updateRegistrationDisplay(vehicle);
}

// Funktionen exportieren
export {
    updateHeaderInfo,
    updateVehicleDisplay,
    updateCurrentUsageDisplay,
    updateMaintenanceTable,
    updateUsageTable,
    updateRegistrationDisplay,
    updateFuelCostsTable,
    updateFuelCostsStatistics,
    createFuelCostChart,
    initializeTabs,
    initRegistrationTab
};