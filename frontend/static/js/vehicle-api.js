// frontend/static/js/vehicle-api.js

// Fahrzeug-Basisdaten aktualisieren
async function updateVehicleBasicInfo(vehicleId, data) {
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}/basic-info`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Fehler beim Aktualisieren');

        showNotification('Fahrzeugdaten erfolgreich aktualisiert', 'success');
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Aktualisieren der Fahrzeugdaten', 'error');
    }
}

// Wartungseintrag speichern
async function saveMaintenanceEntry(vehicleId, formData) {
    try {
        const data = {
            vehicleId: vehicleId,
            date: formData.get('maintenance-date'),
            type: formData.get('maintenance-type'),
            mileage: parseInt(formData.get('mileage')),
            cost: parseFloat(formData.get('cost')),
            workshop: formData.get('workshop'),
            notes: formData.get('maintenance-notes')
        };

        const response = await fetch('/api/maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Fehler beim Speichern');

        showNotification('Wartungseintrag erfolgreich gespeichert', 'success');
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Speichern des Wartungseintrags', 'error');
    }
}

// Tankkosten speichern
async function saveFuelCost(vehicleId, formData) {
    try {
        const data = {
            vehicleId: vehicleId,
            driverId: formData.get('driver') || null,
            date: formData.get('fuel-date'),
            fuelType: formData.get('fuel-type'),
            amount: parseFloat(formData.get('amount')),
            pricePerUnit: parseFloat(formData.get('price-per-unit')),
            totalCost: parseFloat(formData.get('total-cost')),
            mileage: parseInt(formData.get('mileage')),
            location: formData.get('location'),
            receiptNumber: formData.get('receipt-number'),
            notes: formData.get('notes')
        };

        const response = await fetch('/api/fuelcosts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Fehler beim Speichern');

        showNotification('Tankkosten erfolgreich gespeichert', 'success');
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Speichern der Tankkosten', 'error');
    }
}

// Nutzungseintrag speichern
async function saveUsageEntry(vehicleId, formData) {
    try {
        const data = {
            vehicleId: vehicleId,
            driverId: formData.get('driver'),
            startDate: formData.get('start-date'),
            startTime: formData.get('start-time'),
            endDate: formData.get('end-date'),
            endTime: formData.get('end-time'),
            startMileage: parseInt(formData.get('start-mileage')),
            endMileage: parseInt(formData.get('end-mileage')) || 0,
            department: formData.get('department') || '',
            purpose: formData.get('project'),
            status: formData.get('end-date') ? 'completed' : 'active',
            notes: formData.get('usage-notes')
        };

        const response = await fetch('/api/usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Fehler beim Speichern');

        showNotification('Nutzungseintrag erfolgreich gespeichert', 'success');
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Speichern des Nutzungseintrags', 'error');
    }
}

// Zulassungsdaten aktualisieren
async function updateRegistrationInfo(vehicleId, formData) {
    try {
        // Erst die aktuellen Fahrzeugdaten laden
        const vehicleResponse = await fetch(`/api/vehicles/${vehicleId}`);
        const vehicleData = await vehicleResponse.json();
        const vehicle = vehicleData.vehicle;

        // Alle Fahrzeugdaten mit den neuen Zulassungsdaten zusammenführen
        const data = {
            ...vehicle,
            registrationDate: formData.get('registration-date'),
            nextInspectionDate: formData.get('next-inspection'),
            insuranceCompany: formData.get('insurance-company'),
            insuranceNumber: formData.get('insurance-number'),
            insuranceType: formData.get('insurance-type'),
            insuranceExpiry: formData.get('insurance-expiry'),
            insuranceCost: parseFloat(formData.get('insurance-cost')) || 0
        };

        const response = await fetch(`/api/vehicles/${vehicleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Fehler beim Aktualisieren');

        showNotification('Zulassungsdaten erfolgreich aktualisiert', 'success');
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Aktualisieren der Zulassungsdaten', 'error');
    }
}

// Notification Helper
function showNotification(message, type = 'info') {
    // Einfache Konsolen-Ausgabe, kann später durch echte Notifications ersetzt werden
    console.log(`${type.toUpperCase()}: ${message}`);

    // Optional: Alert für wichtige Meldungen
    if (type === 'error') {
        alert(message);
    }
}