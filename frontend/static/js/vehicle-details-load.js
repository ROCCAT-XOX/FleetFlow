/**
 * Vehicle Data Loader
 * Handles all data loading functionality for vehicle details
 */

// Die Fahrzeug-ID aus der URL extrahieren
function getVehicleId() {
    return window.location.pathname.split('/').pop();
}

// Hauptfahrzeugdaten laden
function loadVehicleData(callback) {
    const vehicleId = getVehicleId();

    fetch(`/api/vehicles/${vehicleId}`)
        .then(response => {
            if (!response.ok) throw new Error('Fahrzeug nicht gefunden');
            return response.json();
        })
        .then(data => {
            if (callback && typeof callback === 'function') {
                callback(data.vehicle);
            }
        })
        .catch(error => {
            console.error('Fehler beim Laden der Fahrzeugdaten:', error);
            showNotification('Fehler beim Laden der Fahrzeugdaten: ' + error.message, 'error');
        });
}

// Fahrerdaten zum aktuellen Fahrzeug laden
function loadCurrentDriverData(driverId, callback) {
    const vehicleId = getVehicleId();

    fetch(`/api/drivers/${driverId}`)
        .then(response => {
            if (!response.ok) throw new Error('Fahrer nicht gefunden');
            return response.json();
        })
        .then(data => {
            const driver = data.driver;

            // Aktive Nutzung abfragen
            return fetch(`/api/usage/vehicle/${vehicleId}`)
                .then(response => {
                    if (!response.ok) throw new Error('Nutzungsdaten nicht gefunden');
                    return response.json();
                })
                .then(usageData => {
                    // Aktive Nutzung filtern
                    const activeUsage = usageData.usage.find(entry => entry.status === 'active');

                    if (callback && typeof callback === 'function') {
                        callback(driver, activeUsage);
                    }
                });
        })
        .catch(error => {
            console.error('Fehler beim Laden der Fahrerdaten:', error);
            if (callback && typeof callback === 'function') {
                callback(null);
            }
        });
}

// Wartungseinträge laden
function loadMaintenanceEntries(callback) {
    const vehicleId = getVehicleId();

    fetch(`/api/maintenance/vehicle/${vehicleId}`)
        .then(response => {
            if (!response.ok) throw new Error('Wartungseinträge nicht gefunden');
            return response.json();
        })
        .then(data => {
            if (callback && typeof callback === 'function') {
                callback(data.maintenance || []);
            }
        })
        .catch(error => {
            console.error('Fehler beim Laden der Wartungseinträge:', error);
            if (callback && typeof callback === 'function') {
                callback([]);
            }
        });
}

// Nutzungshistorie laden
function loadUsageHistory(callback) {
    const vehicleId = getVehicleId();

    fetch(`/api/usage/vehicle/${vehicleId}`)
        .then(response => {
            if (!response.ok) throw new Error('Nutzungshistorie nicht gefunden');
            return response.json();
        })
        .then(data => {
            if (callback && typeof callback === 'function') {
                callback(data.usage || []);
            }
        })
        .catch(error => {
            console.error('Fehler beim Laden der Nutzungshistorie:', error);
            if (callback && typeof callback === 'function') {
                callback([]);
            }
        });
}

// Fahrer für Dropdown-Listen laden
function loadDriversForSelect(selectElementId) {
    const driverSelect = document.getElementById(selectElementId);
    if (!driverSelect) return;

    fetch('/api/drivers')
        .then(response => {
            if (!response.ok) throw new Error('Fehler beim Laden der Fahrer');
            return response.json();
        })
        .then(data => {
            const drivers = data.drivers || [];

            // Erste Option speichern (falls vorhanden)
            const firstOption = driverSelect.querySelector('option:first-child');
            driverSelect.innerHTML = '';
            if (firstOption) driverSelect.appendChild(firstOption);

            // Fahrer hinzufügen
            drivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = `${driver.firstName} ${driver.lastName}`;
                driverSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Fehler beim Laden der Fahrer:', error);
        });
}

// Tankkosten-Daten laden
function loadFuelCostsData(callback) {
    const vehicleId = getVehicleId();

    fetch(`/api/fuelcosts/vehicle/${vehicleId}`)
        .then(response => {
            if (!response.ok) throw new Error('Fehler beim Laden der Tankkosten');
            return response.json();
        })
        .then(data => {
            const fuelCosts = data.fuelCosts || [];

            if (callback && typeof callback === 'function') {
                callback(fuelCosts);
            }
        })
        .catch(error => {
            console.error('Fehler beim Laden der Tankkosten:', error);
            if (callback && typeof callback === 'function') {
                callback([]);
            }
        });
}

// Hilfsfunktion für Fehlerbenachrichtigungen
function showNotification(message, type = 'info') {
    // Einfache Konsolen-Ausgabe für Fehler
    console.log(`${type.toUpperCase()}: ${message}`);

    // Hier kann später eine richtige Notification-Funktion implementiert werden
}

// Export der Funktionen
export {
    getVehicleId,
    loadVehicleData,
    loadCurrentDriverData,
    loadMaintenanceEntries,
    loadUsageHistory,
    loadDriversForSelect,
    loadFuelCostsData
};