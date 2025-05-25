// frontend/static/js/vehicle-statistics.js

function renderStatisticsCharts(vehicle, fuelCosts, maintenance, usage) {
    // Kraftstoffverbrauch berechnen
    if (fuelCosts && fuelCosts.length > 0) {
        calculateFuelStatistics(fuelCosts);
        renderFuelCostChart(fuelCosts);
    }

    // Monatliche Kosten
    renderMonthlyCostsChart(fuelCosts, maintenance);

    // Nutzungsstatistiken
    renderUsageStatistics(usage);

    // Zusammenfassung
    renderSummaryStatistics(vehicle, fuelCosts, maintenance, usage);
}

function calculateFuelStatistics(fuelCosts) {
    if (!fuelCosts || fuelCosts.length === 0) return;

    // Sortieren nach Kilometerstand
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

    // Anzeige aktualisieren
    const avgConsumptionEl = document.getElementById('stats-avg-consumption');
    const totalCostsEl = document.getElementById('stats-total-fuel-costs');
    const costPerKmEl = document.getElementById('stats-cost-per-km');

    if (avgConsumptionEl) avgConsumptionEl.textContent = avgConsumption;
    if (totalCostsEl) totalCostsEl.textContent = `€ ${totalCost.toFixed(2)}`;
    if (costPerKmEl) costPerKmEl.textContent = `€ ${costPerKm}`;
}

function renderFuelCostChart(fuelCosts) {
    const chartContainer = document.getElementById('stats-fuel-costs-chart');
    if (!chartContainer) return;

    // Daten für Chart vorbereiten
    const monthlyData = {};

    fuelCosts.forEach(cost => {
        const date = new Date(cost.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { cost: 0, amount: 0 };
        }

        monthlyData[monthKey].cost += cost.totalCost;
        monthlyData[monthKey].amount += cost.amount;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month => {
        const [year, m] = month.split('-');
        return `${m}/${year}`;
    });

    const costData = sortedMonths.map(month => monthlyData[month].cost);

    const options = {
        series: [{
            name: 'Kraftstoffkosten',
            data: costData
        }],
        chart: {
            type: 'area',
            height: 288,
            toolbar: { show: false }
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth' },
        xaxis: {
            categories: labels,
            labels: { rotate: -45 }
        },
        yaxis: {
            title: { text: 'Kosten (€)' },
            labels: {
                formatter: function (val) {
                    return '€ ' + val.toFixed(0);
                }
            }
        },
        colors: ['#3B82F6'],
        tooltip: {
            y: {
                formatter: function (val) {
                    return '€ ' + val.toFixed(2);
                }
            }
        }
    };

    const chart = new ApexCharts(chartContainer, options);
    chart.render();
}

function renderMonthlyCostsChart(fuelCosts, maintenance) {
    const chartContainer = document.getElementById('costChart');
    if (!chartContainer) return;

    // Letzten 12 Monate
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
        });
    }

    // Kosten aggregieren
    const costsByMonth = {};
    months.forEach(m => {
        costsByMonth[m.key] = { fuel: 0, maintenance: 0 };
    });

    // Tankkosten
    (fuelCosts || []).forEach(cost => {
        const date = new Date(cost.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (costsByMonth[monthKey]) {
            costsByMonth[monthKey].fuel += cost.totalCost;
        }
    });

    // Wartungskosten
    (maintenance || []).forEach(m => {
        const date = new Date(m.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (costsByMonth[monthKey] && m.cost) {
            costsByMonth[monthKey].maintenance += m.cost;
        }
    });

    const options = {
        series: [{
            name: 'Kraftstoff',
            data: months.map(m => costsByMonth[m.key].fuel)
        }, {
            name: 'Wartung',
            data: months.map(m => costsByMonth[m.key].maintenance)
        }],
        chart: {
            type: 'bar',
            height: 320,
            stacked: true,
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
            }
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: months.map(m => m.label),
            labels: { rotate: -45 }
        },
        yaxis: {
            title: { text: 'Kosten (€)' },
            labels: {
                formatter: function (val) {
                    return '€ ' + val.toFixed(0);
                }
            }
        },
        legend: {
            position: 'top'
        },
        fill: {
            opacity: 1
        },
        colors: ['#3B82F6', '#10B981']
    };

    const chart = new ApexCharts(chartContainer, options);
    chart.render();
}

function renderUsageStatistics(usage) {
    // Nutzung nach Fahrer
    const driverChart = document.getElementById('driverPieChart');
    if (driverChart && usage && usage.length > 0) {
        const driverUsage = {};

        usage.forEach(u => {
            const driver = u.driverName || 'Unbekannt';
            if (!driverUsage[driver]) {
                driverUsage[driver] = 0;
            }

            if (u.startDate && u.endDate) {
                const start = new Date(u.startDate);
                const end = new Date(u.endDate);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                driverUsage[driver] += days;
            }
        });

        const driverOptions = {
            series: Object.values(driverUsage),
            labels: Object.keys(driverUsage),
            chart: {
                type: 'donut',
                height: 320
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '70%'
                    }
                }
            },
            legend: {
                position: 'bottom'
            }
        };

        const driverChartInstance = new ApexCharts(driverChart, driverOptions);
        driverChartInstance.render();
    }

    // Nutzung nach Projekt
    const projectChart = document.getElementById('projectPieChart');
    if (projectChart && usage && usage.length > 0) {
        const projectUsage = {};

        usage.forEach(u => {
            const project = u.purpose || 'Sonstiges';
            if (!projectUsage[project]) {
                projectUsage[project] = 0;
            }

            if (u.startDate && u.endDate) {
                const start = new Date(u.startDate);
                const end = new Date(u.endDate);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                projectUsage[project] += days;
            }
        });

        const projectOptions = {
            series: Object.values(projectUsage),
            labels: Object.keys(projectUsage),
            chart: {
                type: 'donut',
                height: 320
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '70%'
                    }
                }
            },
            legend: {
                position: 'bottom'
            }
        };

        const projectChartInstance = new ApexCharts(projectChart, projectOptions);
        projectChartInstance.render();
    }
}

function renderSummaryStatistics(vehicle, fuelCosts, maintenance, usage) {
    // Gesamtkilometer
    const totalKmEl = document.getElementById('total-kilometers');
    if (totalKmEl && vehicle) {
        totalKmEl.textContent = vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : '0 km';
    }

    // Kosten pro km
    const costPerKmEl = document.getElementById('cost-per-km');
    if (costPerKmEl && vehicle && vehicle.mileage > 0) {
        const totalFuelCost = (fuelCosts || []).reduce((sum, cost) => sum + cost.totalCost, 0);
        const totalMaintenanceCost = (maintenance || []).reduce((sum, m) => sum + (m.cost || 0), 0);
        const totalCost = totalFuelCost + totalMaintenanceCost;
        const costPerKm = totalCost / vehicle.mileage;
        costPerKmEl.textContent = '€ ' + costPerKm.toFixed(3);
    }

    // Gesamtkosten (12 Monate)
    const totalCostEl = document.getElementById('total-cost');
    if (totalCostEl) {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

        const recentFuelCosts = (fuelCosts || [])
            .filter(cost => new Date(cost.date) >= twelveMonthsAgo)
            .reduce((sum, cost) => sum + cost.totalCost, 0);

        const recentMaintenanceCosts = (maintenance || [])
            .filter(m => new Date(m.date) >= twelveMonthsAgo)
            .reduce((sum, m) => sum + (m.cost || 0), 0);

        const totalRecentCost = recentFuelCosts + recentMaintenanceCosts;
        totalCostEl.textContent = '€ ' + totalRecentCost.toFixed(2);
    }

    // Auslastung
    const utilizationEl = document.getElementById('utilization');
    if (utilizationEl && usage) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let usedDays = 0;
        usage.forEach(u => {
            if (u.startDate && u.endDate) {
                const start = new Date(Math.max(new Date(u.startDate), thirtyDaysAgo));
                const end = new Date(Math.min(new Date(u.endDate), new Date()));

                if (start <= end) {
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                    usedDays += days;
                }
            }
        });

        const utilization = Math.min(100, Math.round((usedDays / 30) * 100));
        utilizationEl.textContent = utilization + '%';
    }
}