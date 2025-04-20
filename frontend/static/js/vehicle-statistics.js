// frontend/static/js/vehicle-statistics.js

export default class VehicleStatistics {
    constructor(vehicleId) {
        this.vehicleId = vehicleId;
        this.initializeCharts();
    }

    async loadStatistics() {
        try {
            // Statistikdaten von API laden
            const [
                vehicleResponse,
                fuelResponse,
                maintenanceResponse,
                usageResponse
            ] = await Promise.all([
                fetch(`/api/vehicles/${this.vehicleId}`),
                fetch(`/api/fuelcosts/vehicle/${this.vehicleId}`),
                fetch(`/api/maintenance/vehicle/${this.vehicleId}`),
                fetch(`/api/usage/vehicle/${this.vehicleId}`)
            ]);

            if (!vehicleResponse.ok || !fuelResponse.ok || !maintenanceResponse.ok || !usageResponse.ok) {
                throw new Error('Fehler beim Laden der Statistikdaten');
            }

            const vehicleData = await vehicleResponse.json();
            const fuelData = await fuelResponse.json();
            const maintenanceData = await maintenanceResponse.json();
            const usageData = await usageResponse.json();

            // Statistiken berechnen und anzeigen
            this.calculateFuelConsumption(fuelData.fuelCosts || []);
            this.calculateTotalCosts(maintenanceData.maintenance || [], fuelData.fuelCosts || []);
            this.processUsageStatistics(usageData.usage || []);

            // Charts aktualisieren
            this.updateCostChart(maintenanceData.maintenance || [], fuelData.fuelCosts || []);
            this.updateDriverPieChart(usageData.usage || []);
            this.updateProjectPieChart(usageData.usage || []);
            this.updateFuelCostsChart(fuelData.fuelCosts || []);
            this.updateSummary(vehicleData.vehicle, maintenanceData.maintenance || [], fuelData.fuelCosts || []);
        } catch (error) {
            console.error('Fehler beim Laden der Statistiken:', error);
            this.showError('Fehler beim Laden der Statistiken');
        }
    }

    initializeCharts() {
        // Kosten der letzten 12 Monate Chart
        if (!this.costChart) {
            this.costChart = new ApexCharts(document.querySelector("#costChart"), {
                series: [{
                    name: 'Wartung',
                    data: []
                }, {
                    name: 'Kraftstoff',
                    data: []
                }],
                chart: {
                    type: 'bar',
                    height: 320,
                    stacked: true,
                    toolbar: {
                        show: false
                    }
                },
                colors: ['#4F46E5', '#10B981'],
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: '55%',
                    },
                },
                dataLabels: {
                    enabled: false
                },
                xaxis: {
                    categories: [],
                },
                yaxis: {
                    title: {
                        text: 'Kosten (€)'
                    }
                },
                legend: {
                    position: 'top'
                },
                fill: {
                    opacity: 1
                }
            });
            this.costChart.render();
        }

        // Fahrer Pie Chart
        if (!this.driverPieChart) {
            this.driverPieChart = new ApexCharts(document.querySelector("#driverPieChart"), {
                series: [],
                chart: {
                    type: 'pie',
                    height: 320
                },
                labels: [],
                legend: {
                    position: 'bottom'
                },
                responsive: [{
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 300
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }]
            });
            this.driverPieChart.render();
        }

        // Projekt Pie Chart
        if (!this.projectPieChart) {
            this.projectPieChart = new ApexCharts(document.querySelector("#projectPieChart"), {
                series: [],
                chart: {
                    type: 'pie',
                    height: 320
                },
                labels: [],
                legend: {
                    position: 'bottom'
                },
                responsive: [{
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 300
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }]
            });
            this.projectPieChart.render();
        }

        // Kraftstoffkosten Chart
        if (!this.fuelCostsChart) {
            this.fuelCostsChart = new ApexCharts(document.querySelector("#stats-fuel-costs-chart"), {
                series: [{
                    name: 'Kraftstoffkosten',
                    data: []
                }],
                chart: {
                    type: 'line',
                    height: 288,
                    toolbar: {
                        show: false
                    }
                },
                stroke: {
                    width: 3,
                    curve: 'smooth'
                },
                xaxis: {
                    categories: [],
                    labels: {
                        rotate: -45,
                        rotateAlways: true
                    }
                },
                yaxis: {
                    title: {
                        text: 'Kosten (€)'
                    }
                },
                tooltip: {
                    y: {
                        formatter: function(value) {
                            return value.toFixed(2) + ' €';
                        }
                    }
                }
            });
            this.fuelCostsChart.render();
        }
    }

    calculateFuelConsumption(fuelCosts) {
        if (fuelCosts.length < 2) {
            document.getElementById('stats-avg-consumption').textContent = '--';
            return;
        }

        let totalConsumption = 0;
        let totalDistance = 0;

        // Sortiere nach Kilometerstand
        const sortedFuelCosts = [...fuelCosts].sort((a, b) => a.mileage - b.mileage);

        for (let i = 1; i < sortedFuelCosts.length; i++) {
            const prev = sortedFuelCosts[i - 1];
            const curr = sortedFuelCosts[i];

            const distance = curr.mileage - prev.mileage;
            if (distance > 0) {
                totalDistance += distance;
                totalConsumption += curr.amount;
            }
        }

        if (totalDistance > 0) {
            const avgConsumption = (totalConsumption / totalDistance) * 100;
            document.getElementById('stats-avg-consumption').textContent = avgConsumption.toFixed(2);
        } else {
            document.getElementById('stats-avg-consumption').textContent = '--';
        }
    }

    calculateTotalCosts(maintenance, fuelCosts) {
        const totalFuelCosts = fuelCosts.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
        document.getElementById('stats-total-fuel-costs').textContent =
            totalFuelCosts.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

        if (fuelCosts.length > 1) {
            const sortedFuelCosts = [...fuelCosts].sort((a, b) => a.mileage - b.mileage);
            const totalDistance = sortedFuelCosts[sortedFuelCosts.length - 1].mileage - sortedFuelCosts[0].mileage;

            if (totalDistance > 0) {
                const costPerKm = totalFuelCosts / totalDistance;
                document.getElementById('stats-cost-per-km').textContent =
                    costPerKm.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €/km';
            } else {
                document.getElementById('stats-cost-per-km').textContent = '--';
            }
        } else {
            document.getElementById('stats-cost-per-km').textContent = '--';
        }
    }

    processUsageStatistics(usageData) {
        // Gruppiere nach Fahrern und Projekten
        const driverUsage = {};
        const projectUsage = {};

        usageData.forEach(usage => {
            // Nach Fahrer gruppieren
            const driverName = usage.driverName || 'Unbekannt';
            if (!driverUsage[driverName]) {
                driverUsage[driverName] = 0;
            }
            if (usage.endMileage && usage.startMileage) {
                driverUsage[driverName] += usage.endMileage - usage.startMileage;
            }

            // Nach Projekt gruppieren
            const project = usage.project || usage.purpose || 'Sonstige';
            if (!projectUsage[project]) {
                projectUsage[project] = 0;
            }
            if (usage.endMileage && usage.startMileage) {
                projectUsage[project] += usage.endMileage - usage.startMileage;
            }
        });

        return { driverUsage, projectUsage };
    }

    updateCostChart(maintenance, fuelCosts) {
        // Kosten für die letzten 12 Monate aggregieren
        const months = [];
        const maintenanceCosts = [];
        const fuelCostsMonthly = [];

        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthYear = date.toLocaleString('de-DE', { month: 'short', year: 'numeric' });
            months.push(monthYear);

            // Wartungskosten dieses Monats
            const maintenanceInMonth = maintenance.filter(m => {
                const mDate = new Date(m.date);
                return mDate.getMonth() === date.getMonth() && mDate.getFullYear() === date.getFullYear();
            });
            maintenanceCosts.push(maintenanceInMonth.reduce((sum, m) => sum + (m.cost || 0), 0));

            // Kraftstoffkosten dieses Monats
            const fuelInMonth = fuelCosts.filter(f => {
                const fDate = new Date(f.date);
                return fDate.getMonth() === date.getMonth() && fDate.getFullYear() === date.getFullYear();
            });
            fuelCostsMonthly.push(fuelInMonth.reduce((sum, f) => sum + (f.totalCost || 0), 0));
        }

        this.costChart.updateOptions({
            xaxis: {
                categories: months
            }
        });

        this.costChart.updateSeries([{
            name: 'Wartung',
            data: maintenanceCosts
        }, {
            name: 'Kraftstoff',
            data: fuelCostsMonthly
        }]);
    }

    updateDriverPieChart(usageData) {
        const { driverUsage } = this.processUsageStatistics(usageData);

        const driverNames = Object.keys(driverUsage);
        const driverValues = Object.values(driverUsage);

        this.driverPieChart.updateOptions({
            labels: driverNames
        });

        this.driverPieChart.updateSeries(driverValues);
    }

    updateProjectPieChart(usageData) {
        const { projectUsage } = this.processUsageStatistics(usageData);

        const projectNames = Object.keys(projectUsage);
        const projectValues = Object.values(projectUsage);

        this.projectPieChart.updateOptions({
            labels: projectNames
        });

        this.projectPieChart.updateSeries(projectValues);
    }

    updateFuelCostsChart(fuelCosts) {
        // Sortiere nach Datum
        const sortedFuelCosts = [...fuelCosts].sort((a, b) => new Date(a.date) - new Date(b.date));

        const dates = sortedFuelCosts.map(entry =>
            new Date(entry.date).toLocaleDateString('de-DE')
        );
        const costs = sortedFuelCosts.map(entry => entry.totalCost || 0);

        this.fuelCostsChart.updateOptions({
            xaxis: {
                categories: dates
            }
        });

        this.fuelCostsChart.updateSeries([{
            name: 'Kraftstoffkosten',
            data: costs
        }]);
    }

    updateSummary(vehicle, maintenance, fuelCosts) {
        // Gesamtkilometer
        document.getElementById('total-kilometers').textContent =
            vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : '-';

        // Kosten pro km (bereits berechnet)

        // Gesamtkosten (letzte 12 Monate)
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

        const maintenanceLast12 = maintenance.filter(m => new Date(m.date) >= twelveMonthsAgo);
        const fuelCostsLast12 = fuelCosts.filter(f => new Date(f.date) >= twelveMonthsAgo);

        const totalMaintenance = maintenanceLast12.reduce((sum, m) => sum + (m.cost || 0), 0);
        const totalFuel = fuelCostsLast12.reduce((sum, f) => sum + (f.totalCost || 0), 0);
        const totalCosts = totalMaintenance + totalFuel;

        document.getElementById('total-cost').textContent =
            totalCosts.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

        // Auslastung (hier könnte man die tatsächliche Nutzungsdauer verwenden)
        document.getElementById('utilization').textContent = '-';
    }

    showError(message) {
        // Zeige Fehlermeldung in allen relevanten Bereichen
        const errorElements = [
            'stats-avg-consumption',
            'stats-total-fuel-costs',
            'stats-cost-per-km',
            'total-kilometers',
            'cost-per-km',
            'total-cost',
            'utilization'
        ];

        errorElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Fehler';
                element.classList.add('text-red-500');
            }
        });

        console.error(message);
    }
}