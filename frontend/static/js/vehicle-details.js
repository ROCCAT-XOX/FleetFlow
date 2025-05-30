// frontend/static/js/vehicle-details.js
document.addEventListener('DOMContentLoaded', async function() {
    const vehicleId = window.location.pathname.split('/').pop();

    // Initialisierungen
    initializeModals();

    // Tab-System ist bereits über URL-Parameter gesteuert
    // Wir brauchen nur Event-Handler für spezifische Tab-Funktionen
    const urlParams = new URLSearchParams(window.location.search);
    const currentTab = urlParams.get('tab') || 'basic';

    // Je nach aktivem Tab spezifische Initialisierungen
    switch(currentTab) {
        case 'statistics':
            await initializeStatisticsTab(vehicleId);
            break;
        case 'fuel':
            initializeFuelCalculations();
            break;
    }
});

// Statistiken Tab initialisieren
async function initializeStatisticsTab(vehicleId) {
    try {
        // Daten für Statistiken laden
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
            renderStatisticsCharts(
                vehicleData.vehicle,
                fuelData.fuelCosts || [],
                maintenanceData.maintenance || [],
                usageData.usage || []
            );
        }
    } catch (error) {
        console.error('Fehler beim Laden der Statistiken:', error);
    }
}

// Kraftstoffberechnungen initialisieren
function initializeFuelCalculations() {
    // Diese Funktion ist bereits in den Templates implementiert
    // Wir brauchen hier nur zusätzliche Berechnungen falls nötig
}

// Wartungseintrag bearbeiten
window.editMaintenance = async function(maintenanceId) {
    try {
        const response = await fetch(`/api/maintenance/${maintenanceId}`);
        const data = await response.json();

        // Modal mit Daten füllen
        document.getElementById('maintenance-date').value = data.maintenance.date.split('T')[0];
        document.getElementById('maintenance-type').value = data.maintenance.type;
        document.getElementById('mileage').value = data.maintenance.mileage;
        document.getElementById('cost').value = data.maintenance.cost;
        document.getElementById('workshop').value = data.maintenance.workshop || '';
        document.getElementById('maintenance-notes').value = data.maintenance.notes || '';

        // Modal öffnen
        document.getElementById('maintenance-modal').classList.remove('hidden');

        // Form für Update konfigurieren
        const form = document.getElementById('maintenance-form');
        form.dataset.maintenanceId = maintenanceId;
        form.dataset.isEdit = 'true';

    } catch (error) {
        console.error('Fehler beim Laden des Wartungseintrags:', error);
        alert('Fehler beim Laden des Wartungseintrags');
    }
};

// Tankkosteneintrag bearbeiten
window.editFuelCost = async function(fuelCostId) {
    try {
        const response = await fetch(`/api/fuelcosts/${fuelCostId}`);
        const data = await response.json();

        // Modal mit Daten füllen
        document.getElementById('vehicle-fuel-date').value = data.fuelCost.date.split('T')[0];
        document.getElementById('vehicle-fuel-type').value = data.fuelCost.fuelType;
        document.getElementById('vehicle-fuel-amount').value = data.fuelCost.amount;
        document.getElementById('vehicle-fuel-price-per-unit').value = data.fuelCost.pricePerUnit;
        document.getElementById('vehicle-fuel-total-cost').value = data.fuelCost.totalCost;
        document.getElementById('vehicle-fuel-mileage').value = data.fuelCost.mileage;
        document.getElementById('vehicle-fuel-location').value = data.fuelCost.location || '';
        document.getElementById('vehicle-fuel-receipt-number').value = data.fuelCost.receiptNumber || '';

        // Fahrer auswählen
        if (data.fuelCost.driverId) {
            document.getElementById('vehicle-fuel-driver').value = data.fuelCost.driverId;
        }

        // Modal öffnen
        document.getElementById('vehicle-fuel-cost-modal').classList.remove('hidden');

        // Form für Update konfigurieren
        const form = document.getElementById('vehicle-fuel-cost-form');
        form.dataset.fuelCostId = fuelCostId;
        form.dataset.isEdit = 'true';

    } catch (error) {
        console.error('Fehler beim Laden des Tankkosteneintrags:', error);
        alert('Fehler beim Laden des Tankkosteneintrags');
    }
};

// Nutzungseintrag bearbeiten
window.editUsage = async function(usageId) {
    try {
        // Erst die Fahrer laden
        const driversResponse = await fetch('/api/drivers');
        const driversData = await driversResponse.json();
        const select = document.getElementById('driver');

        if (select) {
            select.innerHTML = '<option value="">Fahrer auswählen</option>';
            if (driversData.drivers) {
                driversData.drivers.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = `${driver.firstName} ${driver.lastName}`;
                    select.appendChild(option);
                });
            }
        }

        // Dann die Nutzungsdaten laden
        const response = await fetch(`/api/usage/${usageId}`);
        const data = await response.json();
        const usage = data.usage;

        // Modal mit Daten füllen
        document.getElementById('start-date').value = usage.startDate.split('T')[0];
        document.getElementById('start-time').value = usage.startDate.split('T')[1].substring(0, 5);

        if (usage.endDate) {
            document.getElementById('end-date').value = usage.endDate.split('T')[0];
            document.getElementById('end-time').value = usage.endDate.split('T')[1].substring(0, 5);
        }

        // Fahrer auswählen - WICHTIG: Nach dem Laden der Fahrerliste
        if (usage.driverId) {
            document.getElementById('driver').value = usage.driverId;
        }

        document.getElementById('project').value = usage.purpose || '';
        document.getElementById('start-mileage').value = usage.startMileage;
        document.getElementById('end-mileage').value = usage.endMileage || '';
        document.getElementById('usage-notes').value = usage.notes || '';

        // Modal öffnen
        document.getElementById('usage-modal').classList.remove('hidden');

        // Form für Update konfigurieren
        const form = document.getElementById('usage-form');
        form.dataset.usageId = usageId;
        form.dataset.isEdit = 'true';

        // Reset Submit Status
        if (typeof resetSubmitStatus === 'function') {
            resetSubmitStatus();
        }

    } catch (error) {
        console.error('Fehler beim Laden des Nutzungseintrags:', error);
        alert('Fehler beim Laden des Nutzungseintrags');
    }
};

// Aktuelle Nutzung bearbeiten
window.openEditCurrentUsageModal = async function(vehicleId) {
    try {
        // Aktive Nutzung finden
        const response = await fetch(`/api/usage/vehicle/${vehicleId}`);
        const data = await response.json();
        const activeUsage = data.usage.find(u => u.status === 'active');

        if (!activeUsage) {
            alert('Keine aktive Nutzung vorhanden');
            return;
        }

        // Modal mit Daten füllen (vereinfacht, da das Modal bereits Beispieldaten hat)
        const modal = document.getElementById('edit-usage-modal');
        if (modal) {
            modal.classList.remove('hidden');

            // Form mit der aktiven Nutzungs-ID konfigurieren
            const form = document.getElementById('edit-current-usage-form');
            form.dataset.usageId = activeUsage.id;
        }

    } catch (error) {
        console.error('Fehler beim Laden der aktuellen Nutzung:', error);
    }
};

// Hilfsfunktionen
function showNotification(message, type = 'info') {
    // Einfache Notification
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

// Nach erfolgreichem Speichern die Seite neu laden
window.reloadCurrentTab = function() {
    window.location.reload();
};

// Wartungseintrag löschen
window.deleteMaintenance = async function(maintenanceId) {
    if (!confirm('Möchten Sie diesen Wartungseintrag wirklich löschen?')) {
        return;
    }

    try {
        const response = await fetch(`/api/maintenance/${maintenanceId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Fehler beim Löschen');
        }

        showNotification('Wartungseintrag erfolgreich gelöscht', 'success');

        // Seite nach kurzer Verzögerung neu laden
        setTimeout(() => {
            window.location.reload();
        }, 500);

    } catch (error) {
        console.error('Fehler beim Löschen:', error);
        showNotification('Fehler beim Löschen des Wartungseintrags', 'error');
    }
};

// Nutzungseintrag löschen
window.deleteUsage = async function(usageId) {
    if (!confirm('Möchten Sie diesen Nutzungseintrag wirklich löschen?')) {
        return;
    }

    try {
        const response = await fetch(`/api/usage/${usageId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Fehler beim Löschen');
        }

        showNotification('Nutzungseintrag erfolgreich gelöscht', 'success');

        // Seite nach kurzer Verzögerung neu laden
        setTimeout(() => {
            window.location.reload();
        }, 500);

    } catch (error) {
        console.error('Fehler beim Löschen:', error);
        showNotification('Fehler beim Löschen des Nutzungseintrags', 'error');
    }
};