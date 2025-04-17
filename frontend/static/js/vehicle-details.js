// Funktion zum Laden und Anzeigen der Tankkosten für ein Fahrzeug
function loadVehicleFuelCosts() {
    const vehicleId = window.location.pathname.split('/').pop();

    fetch(`/api/fuelcosts/vehicle/${vehicleId}`)
        .then(response => {
            if (!response.ok) throw new Error('Fehler beim Laden der Tankkosten');
            return response.json();
        })
        .then(data => {
            renderVehicleFuelCostsTable(data.fuelCosts || []);
            calculateFuelStatistics(data.fuelCosts || [], data.vehicle);
            createFuelCostsChart(data.fuelCosts || []);
        })
        .catch(error => {
            console.error('Fehler beim Laden der Tankkosten:', error);
            const tableBody = document.getElementById('vehicle-fuel-costs-body');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="py-4 text-center text-gray-500">
                            Fehler beim Laden der Tankkosten: ${error.message}
                        </td>
                    </tr>
                `;
            }
        });

    // Fahrer für das Formular laden
    loadDriversForVehicleFuelCost();
}

// Funktion zum Darstellen der Tankkosten in der Tabelle
function renderVehicleFuelCostsTable(fuelCosts) {
    const tableBody = document.getElementById('vehicle-fuel-costs-body');
    if (!tableBody) return;

    if (!fuelCosts.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="py-4 text-center text-gray-500">
                    Keine Tankkosten gefunden.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = fuelCosts.map(entry => {
        const date = formatDate(entry.date);
        const amount = formatNumber(entry.amount, 2);
        const pricePerUnit = formatCurrency(entry.pricePerUnit);
        const totalCost = formatCurrency(entry.totalCost);

        return `
            <tr class="hover:bg-gray-50">
                <td class="py-3.5 pl-4 pr-3 text-left text-sm text-gray-900 sm:pl-6">${date}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900">${entry.fuelType || '-'}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900">${amount} ${entry.fuelType === 'Elektro' ? 'kWh' : 'L'}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900">${pricePerUnit}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900">${totalCost}</td>
                <td class="px-3 py-3.5 text-left text-sm text-gray-900">${entry.mileage} km</td>
                <td class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-medium">
                    <button type="button" class="edit-vehicle-fuel-cost-btn text-indigo-600 hover:text-indigo-900 mr-3" data-id="${entry.id}">
                        Bearbeiten
                    </button>
                    <button type="button" class="delete-vehicle-fuel-cost-btn text-red-600 hover:text-red-900" data-id="${entry.id}">
                        Löschen
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Event-Listener für Bearbeiten-Buttons
    document.querySelectorAll('.edit-vehicle-fuel-cost-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            openVehicleFuelCostModal(true, id);
        });
    });

    // Event-Listener für Löschen-Buttons
    document.querySelectorAll('.delete-vehicle-fuel-cost-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            if (confirm('Möchten Sie diesen Tankkosteneintrag wirklich löschen?')) {
                deleteVehicleFuelCost(id);
            }
        });
    });
}

// Verbesserte Funktion zum Berechnen der Verbrauchsstatistiken
function calculateFuelStatistics(fuelCosts, vehicle) {
    if (!fuelCosts || !fuelCosts.length) return;

    // Gesamtkosten berechnen
    let totalCosts = 0;
    let totalDistance = 0;
    let totalFuel = 0;

    // Monatliche Kosten für Diagramm
    const monthlyCosts = {};
    const currentYear = new Date().getFullYear();

    // Sortieren nach Datum (älteste zuerst)
    fuelCosts.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Erste Berechnung für Gesamtkosten und monatliche Aufschlüsselung
    fuelCosts.forEach(entry => {
        totalCosts += entry.totalCost;

        // Für das monatliche Kostendiagramm
        const entryDate = new Date(entry.date);
        const monthKey = `${entryDate.getFullYear()}-${entryDate.getMonth() + 1}`;

        if (!monthlyCosts[monthKey]) {
            monthlyCosts[monthKey] = {
                total: 0,
                month: entryDate.toLocaleString('de-DE', { month: 'short' }),
                year: entryDate.getFullYear()
            };
        }

        monthlyCosts[monthKey].total += entry.totalCost;
    });

    // Berechnung der gefahrenen Kilometer und Verbrauch
    for (let i = 1; i < fuelCosts.length; i++) {
        const current = fuelCosts[i];
        const previous = fuelCosts[i-1];

        // Differenz der Kilometerstände berechnen
        const distance = current.mileage - previous.mileage;

        // Nur positive Distanzen berücksichtigen
        if (distance > 0) {
            totalDistance += distance;

            // Verbrauch je nach Kraftstofftyp hinzufügen
            // Wir betrachten nur den Verbrauch zwischen zwei Tankfüllungen mit gleichem Kraftstofftyp
            if (current.fuelType === previous.fuelType &&
                (current.fuelType === 'Diesel' || current.fuelType === 'Benzin' || current.fuelType === 'Gas')) {
                totalFuel += previous.amount; // Der Verbrauch basiert auf der vorherigen Tankfüllung
            }
        }
    }

    // Durchschnittsverbrauch berechnen (L/100km oder kWh/100km)
    let avgConsumption = 0;
    let consumptionUnit = 'L/100km';

    if (totalDistance > 0 && totalFuel > 0) {
        avgConsumption = (totalFuel / totalDistance) * 100;

        if (fuelCosts[0].fuelType === 'Elektro') {
            consumptionUnit = 'kWh/100km';
        }
    }

    // Kosten pro Kilometer berechnen
    const costPerKm = totalDistance > 0 ? totalCosts / totalDistance : 0;

    // Statistik-Elemente aktualisieren
    document.getElementById('avg-consumption').textContent = avgConsumption.toFixed(2);
    document.getElementById('consumption-unit').textContent = consumptionUnit;
    document.getElementById('total-fuel-costs').textContent = formatCurrency(totalCosts);
    document.getElementById('cost-per-km').textContent = formatCurrency(costPerKm) + '/km';

    // Monatliche Kosten ins Vehicle-Statistik-Widget übertragen
    updateMonthlyCostsInStatistics(monthlyCosts);

    // Aktualisiertes Chart erstellen mit monatlichen Daten
    createMonthlyFuelCostsChart(monthlyCosts);
}

// Funktion zum Aktualisieren der monatlichen Kosten in der Fahrzeugstatistik
function updateMonthlyCostsInStatistics(monthlyCosts) {
    // Diese Funktion fügt die Tankkosten zu den Gesamtkosten im Statistik-Tab hinzu
    // Hier müsste der Code ergänzt werden, der die Tankkosten zu den vorhandenen monatlichen Kosten addiert

    // Beispiel:
    const vehicleStatsCost = document.getElementById('vehicle-monthly-costs');
    if (vehicleStatsCost) {
        let totalYearCosts = 0;

        // Aktuelle Jahresdaten summieren
        const currentYear = new Date().getFullYear();
        Object.values(monthlyCosts).forEach(month => {
            if (month.year === currentYear) {
                totalYearCosts += month.total;
            }
        });

        // Gesamtkosten für das laufende Jahr anzeigen
        vehicleStatsCost.textContent = formatCurrency(totalYearCosts);
    }
}

// Funktion zum Erstellen eines verbesserten monatlichen Kosten-Charts
function createMonthlyFuelCostsChart(monthlyCosts) {
    const chartElement = document.getElementById('fuel-costs-chart');
    if (!chartElement || !window.ApexCharts) return;

    // Daten für die letzten 12 Monate extrahieren
    const today = new Date();
    const last12Months = [];

    for (let i = 11; i >= 0; i--) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - i);
        const yearMonth = `${d.getFullYear()}-${d.getMonth() + 1}`;
        const month = d.toLocaleString('de-DE', { month: 'short' });
        const year = d.getFullYear();

        last12Months.push({
            key: yearMonth,
            label: `${month} ${year}`,
            cost: monthlyCosts[yearMonth] ? monthlyCosts[yearMonth].total : 0
        });
    }

    // Chart-Daten vorbereiten
    const categories = last12Months.map(m => m.label);
    const costs = last12Months.map(m => m.cost);

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
            data: costs
        }],
        xaxis: {
            categories: categories,
            labels: {
                style: {
                    fontSize: '12px'
                }
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
                    return formatCurrency(value);
                }
            }
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                dataLabels: {
                    position: 'top'
                }
            }
        },
        dataLabels: {
            enabled: false
        }
    };

    // Chart löschen, falls es bereits existiert
    if (window.fuelCostsChart) {
        window.fuelCostsChart.destroy();
    }

    // Neues Chart erstellen und global speichern
    window.fuelCostsChart = new ApexCharts(chartElement, options);
    window.fuelCostsChart.render();
}

// Funktion zum Aktualisieren der monatlichen Kosten in der Fahrzeugstatistik
function updateMonthlyCostsInStatistics(monthlyCosts) {
    // Diese Funktion fügt die Tankkosten zu den Gesamtkosten im Statistik-Tab hinzu
    // Hier müsste der Code ergänzt werden, der die Tankkosten zu den vorhandenen monatlichen Kosten addiert

    // Beispiel:
    const vehicleStatsCost = document.getElementById('vehicle-monthly-costs');
    if (vehicleStatsCost) {
        let totalYearCosts = 0;

        // Aktuelle Jahresdaten summieren
        const currentYear = new Date().getFullYear();
        Object.values(monthlyCosts).forEach(month => {
            if (month.year === currentYear) {
                totalYearCosts += month.total;
            }
        });

        // Gesamtkosten für das laufende Jahr anzeigen
        vehicleStatsCost.textContent = formatCurrency(totalYearCosts);
    }
}

// Funktion zum Erstellen eines verbesserten monatlichen Kosten-Charts
function createMonthlyFuelCostsChart(monthlyCosts) {
    const chartElement = document.getElementById('fuel-costs-chart');
    if (!chartElement || !window.ApexCharts) return;

    // Daten für die letzten 12 Monate extrahieren
    const today = new Date();
    const last12Months = [];

    for (let i = 11; i >= 0; i--) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - i);
        const yearMonth = `${d.getFullYear()}-${d.getMonth() + 1}`;
        const month = d.toLocaleString('de-DE', { month: 'short' });
        const year = d.getFullYear();

        last12Months.push({
            key: yearMonth,
            label: `${month} ${year}`,
            cost: monthlyCosts[yearMonth] ? monthlyCosts[yearMonth].total : 0
        });
    }

    // Chart-Daten vorbereiten
    const categories = last12Months.map(m => m.label);
    const costs = last12Months.map(m => m.cost);

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
            data: costs
        }],
        xaxis: {
            categories: categories,
            labels: {
                style: {
                    fontSize: '12px'
                }
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
                    return formatCurrency(value);
                }
            }
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                dataLabels: {
                    position: 'top'
                }
            }
        },
        dataLabels: {
            enabled: false
        }
    };

    // Chart löschen, falls es bereits existiert
    if (window.fuelCostsChart) {
        window.fuelCostsChart.destroy();
    }

    // Neues Chart erstellen und global speichern
    window.fuelCostsChart = new ApexCharts(chartElement, options);
    window.fuelCostsChart.render();
}

// Funktion zum Erstellen des Tankkosten-Charts
function createFuelCostsChart(fuelCosts) {
    if (!fuelCosts || !fuelCosts.length || !window.ApexCharts) return;

    const chartElement = document.getElementById('fuel-costs-chart');
    if (!chartElement) return;

    // Nach Datum sortieren (älteste zuerst)
    fuelCosts.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Daten für das Chart vorbereiten
    const dates = fuelCosts.map(entry => formatDate(entry.date));
    const amounts = fuelCosts.map(entry => entry.amount);
    const costs = fuelCosts.map(entry => entry.totalCost);

    const options = {
        chart: {
            type: 'line',
            height: 350,
            toolbar: {
                show: false
            }
        },
        colors: ['#4F46E5', '#EF4444'],
        series: [
            {
                name: 'Menge',
                type: 'column',
                data: amounts
            },
            {
                name: 'Kosten',
                type: 'line',
                data: costs
            }
        ],
        stroke: {
            curve: 'smooth',
            width: [0, 4]
        },
        xaxis: {
            categories: dates
        },
        yaxis: [
            {
                title: {
                    text: 'Menge (L/kWh)'
                }
            },
            {
                opposite: true,
                title: {
                    text: 'Kosten (€)'
                }
            }
        ],
        tooltip: {
            shared: true,
            intersect: false
        }
    };

    const chart = new ApexCharts(chartElement, options);
    chart.render();
}

// Funktion zum Laden der Fahrer für das Auswahlfeld
function loadDriversForVehicleFuelCost() {
    fetch('/api/drivers')
        .then(response => {
            if (!response.ok) throw new Error('Fehler beim Laden der Fahrer');
            return response.json();
        })
        .then(data => {
            const drivers = data.drivers || [];
            const driverSelect = document.getElementById('vehicle-fuel-driver');

            if (driverSelect) {
                // Erste Option behalten
                const firstOption = driverSelect.firstElementChild;
                driverSelect.innerHTML = '';
                if (firstOption) driverSelect.appendChild(firstOption);

                // Fahrer hinzufügen
                drivers.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = `${driver.firstName} ${driver.lastName}`;
                    driverSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Fehler beim Laden der Fahrer:', error);
        });
}

// Funktion zum Öffnen des Modals für Fahrzeug-Tankkosten
function openVehicleFuelCostModal(isEdit = false, id = null) {
    const modal = document.getElementById('vehicle-fuel-cost-modal');
    const modalTitle = document.getElementById('vehicle-fuel-modal-title');
    const form = document.getElementById('vehicle-fuel-cost-form');
    const vehicleId = window.location.pathname.split('/').pop();

    if (!modal || !modalTitle || !form) return;

    // Formular zurücksetzen
    form.reset();

    // Fahrzeug-ID setzen
    document.getElementById('vehicle-fuel-vehicle-id').value = vehicleId;

    // Das heutige Datum als Standard setzen
    document.getElementById('vehicle-fuel-date').value = new Date().toISOString().split('T')[0];

    // Aktuellen Kilometerstand des Fahrzeugs vorausfüllen
    fetch(`/api/vehicles/${vehicleId}`)
        .then(response => response.json())
        .then(data => {
            if (data.vehicle && data.vehicle.mileage) {
                document.getElementById('vehicle-fuel-mileage').value = data.vehicle.mileage;
            }
        })
        .catch(error => {
            console.error('Fehler beim Laden des Fahrzeugkilometerstands:', error);
        });

    if (isEdit && id) {
        modalTitle.textContent = 'Tankkosten bearbeiten';

        // Tankkostendaten laden
        fetch(`/api/fuelcosts/${id}`)
            .then(response => {
                if (!response.ok) throw new Error('Fehler beim Laden der Tankkostendaten');
                return response.json();
            })
            .then(data => {
                const fuelCost = data.fuelCost;

                // Formularfelder füllen
                document.getElementById('vehicle-fuel-date').value = formatDateForInput(fuelCost.date);

                // Fahrer auswählen, falls vorhanden
                if (fuelCost.driverId && !fuelCost.driverId.match(/^0+$/)) {
                    const driverSelect = document.getElementById('vehicle-fuel-driver');
                    if (driverSelect) {
                        // Prüfen, ob die Option bereits existiert
                        const option = Array.from(driverSelect.options).find(option => option.value === fuelCost.driverId);
                        if (option) {
                            driverSelect.value = fuelCost.driverId;
                        } else if (data.driver) {
                            // Wenn nicht, eine neue Option hinzufügen (z.B. für inaktive Fahrer)
                            const newOption = document.createElement('option');
                            newOption.value = fuelCost.driverId;
                            newOption.textContent = `${data.driver.firstName} ${data.driver.lastName}`;
                            driverSelect.appendChild(newOption);
                            driverSelect.value = fuelCost.driverId;
                        }
                    }
                }

                // Weitere Felder füllen
                document.getElementById('vehicle-fuel-type').value = fuelCost.fuelType || 'Diesel';
                document.getElementById('vehicle-fuel-amount').value = fuelCost.amount || '';
                document.getElementById('vehicle-fuel-price-per-unit').value = fuelCost.pricePerUnit || '';
                document.getElementById('vehicle-fuel-total-cost').value = fuelCost.totalCost || '';
                document.getElementById('vehicle-fuel-mileage').value = fuelCost.mileage || '';
                document.getElementById('vehicle-fuel-location').value = fuelCost.location || '';
                document.getElementById('vehicle-fuel-receipt-number').value = fuelCost.receiptNumber || '';
                document.getElementById('vehicle-fuel-notes').value = fuelCost.notes || '';

                // ID zum Formular hinzufügen
                let idInput = form.querySelector('input[name="id"]');
                if (!idInput) {
                    idInput = document.createElement('input');
                    idInput.type = 'hidden';
                    idInput.name = 'id';
                    form.appendChild(idInput);
                }
                idInput.value = id;
            })
            .catch(error => {
                console.error('Fehler:', error);
                closeVehicleFuelCostModal();
                alert('Fehler beim Laden der Tankkostendaten: ' + error.message);
            });
    } else {
        modalTitle.textContent = 'Tankkosten hinzufügen';

        // Versteckte ID entfernen
        const idInput = form.querySelector('input[name="id"]');
        if (idInput) idInput.remove();
    }

    modal.classList.remove('hidden');
}

// Funktion zum Schließen des Modals
function closeVehicleFuelCostModal() {
    const modal = document.getElementById('vehicle-fuel-cost-modal');
    if (modal) modal.classList.add('hidden');
}

// Funktion zum Verarbeiten des Formularabsendens für Fahrzeug-Tankkosten
function handleVehicleFuelCostSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const fuelCostData = {};

    // Formulardaten sammeln
    for (let [key, value] of formData.entries()) {
        fuelCostData[key] = value;
    }

    // Validierung der Pflichtfelder
    if (!fuelCostData['fuel-date']) {
        alert('Bitte geben Sie ein Datum ein.');
        return;
    }

    if (!fuelCostData.amount || parseFloat(fuelCostData.amount) <= 0) {
        alert('Bitte geben Sie eine gültige Menge ein.');
        return;
    }

    if (!fuelCostData.mileage || parseInt(fuelCostData.mileage) <= 0) {
        alert('Bitte geben Sie einen gültigen Kilometerstand ein.');
        return;
    }

    // Gesamtkosten berechnen, falls nicht angegeben
    if (!fuelCostData['total-cost']) {
        const amount = parseFloat(fuelCostData.amount);
        const pricePerUnit = parseFloat(fuelCostData['price-per-unit']);
        if (amount > 0 && pricePerUnit > 0) {
            fuelCostData['total-cost'] = (amount * pricePerUnit).toFixed(2);
        } else {
            alert('Bitte geben Sie einen Preis pro Einheit oder Gesamtkosten ein.');
            return;
        }
    }

    // Prüfen, ob es eine Bearbeitung ist
    const isEdit = !!fuelCostData.id;

    // API-Daten vorbereiten
    const apiData = {
        vehicleId: fuelCostData.vehicle,
        driverId: fuelCostData.driver || '',
        date: fuelCostData['fuel-date'],
        fuelType: fuelCostData['fuel-type'],
        amount: parseFloat(fuelCostData.amount),
        pricePerUnit: parseFloat(fuelCostData['price-per-unit']),
        totalCost: parseFloat(fuelCostData['total-cost']),
        mileage: parseInt(fuelCostData.mileage),
        location: fuelCostData.location || '',
        receiptNumber: fuelCostData['receipt-number'] || '',
        notes: fuelCostData.notes || ''
    };

    // API-Anfrage senden
    const url = isEdit ? `/api/fuelcosts/${fuelCostData.id}` : '/api/fuelcosts';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text);
                });
            }
            return response.json();
        })
        .then(data => {
            closeVehicleFuelCostModal();
            loadVehicleFuelCosts();
            alert(isEdit ? 'Tankkosten erfolgreich aktualisiert!' : 'Tankkosten erfolgreich hinzugefügt!');
        })
        .catch(error => {
            console.error('Fehler:', error);
            alert('Fehler beim Speichern der Tankkosten: ' + error.message);
        });
}

// Funktion zum Löschen eines Tankkosteneintrags
function deleteVehicleFuelCost(id) {
    fetch(`/api/fuelcosts/${id}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text);
                });
            }
            return response.json();
        })
        .then(data => {
            loadVehicleFuelCosts();
            alert('Tankkosten erfolgreich gelöscht!');
        })
        .catch(error => {
            console.error('Fehler:', error);
            alert('Fehler beim Löschen der Tankkosten: ' + error.message);
        });
}

// Hilfsfunktionen für Datums- und Zahlenformatierung
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

function formatNumber(number, decimals = 0) {
    if (number === undefined || number === null) return '-';
    return parseFloat(number).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatCurrency(number) {
    if (number === undefined || number === null) return '-';
    return parseFloat(number).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Event-Listener für Modal und Formular
document.addEventListener('DOMContentLoaded', function() {
    // "Tankkosten hinzufügen"-Button
    const addFuelCostBtn = document.getElementById('add-vehicle-fuel-cost-btn');
    if (addFuelCostBtn) {
        addFuelCostBtn.addEventListener('click', () => openVehicleFuelCostModal(false));
    }

    // "Schließen"-Button im Modal
    const closeFuelCostBtn = document.getElementById('vehicle-close-fuel-modal-btn');
    if (closeFuelCostBtn) {
        closeFuelCostBtn.addEventListener('click', closeVehicleFuelCostModal);
    }

    // Formular absenden
    const fuelCostForm = document.getElementById('vehicle-fuel-cost-form');
    if (fuelCostForm) {
        fuelCostForm.addEventListener('submit', handleVehicleFuelCostSubmit);
    }

    // Automatische Berechnung im Formular einrichten
    const amountInput = document.getElementById('vehicle-fuel-amount');
    const pricePerUnitInput = document.getElementById('vehicle-fuel-price-per-unit');
    const totalCostInput = document.getElementById('vehicle-fuel-total-cost');

    if (amountInput && pricePerUnitInput && totalCostInput) {
        // Bei Änderung von Menge oder Preis den Gesamtpreis berechnen
        const calculateTotal = () => {
            const amount = parseFloat(amountInput.value) || 0;
            const pricePerUnit = parseFloat(pricePerUnitInput.value) || 0;

            if (amount > 0 && pricePerUnit > 0) {
                totalCostInput.value = (amount * pricePerUnit).toFixed(2);
            }
        };

        amountInput.addEventListener('input', calculateTotal);
        pricePerUnitInput.addEventListener('input', calculateTotal);

        // Bei Änderung des Gesamtpreises den Preis pro Einheit berechnen
        totalCostInput.addEventListener('input', () => {
            const amount = parseFloat(amountInput.value) || 0;
            const totalCost = parseFloat(totalCostInput.value) || 0;

            if (amount > 0 && totalCost > 0) {
                pricePerUnitInput.value = (totalCost / amount).toFixed(3);
            }
        });
    }

    // Initial Tankkosten laden
    loadVehicleFuelCosts();
});