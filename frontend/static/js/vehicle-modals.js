// frontend/static/js/vehicle-modals.js

// Globale Variable um Submit-Status zu tracken
let isSubmitting = false;

// Modal Initialisierung - wird bei DOMContentLoaded ausgeführt
function initializeModals() {
    initializeMaintenanceModal();
    initializeFuelCostModal();
    initializeUsageModal();
    initializeRegistrationModal();
    initializeVehicleEditModal();
    initializeFinancingModal()

    // Modal-Schließen bei Klick außerhalb
    document.querySelectorAll('.fixed.z-10').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
                resetSubmitStatus();
            }
        });
    });

    // Close-Button Event-Listener
    document.querySelectorAll('.close-modal-btn, .close-edit-modal-btn, .close-current-usage-modal-btn, #close-registration-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.fixed.z-10');
            if (modal) {
                modal.classList.add('hidden');
                resetSubmitStatus();
            }
        });
    });
}

// Reset Submit Status
function resetSubmitStatus() {
    isSubmitting = false;
}

// Wartungs-Modal
function initializeMaintenanceModal() {
    const form = document.getElementById('maintenance-form');
    const modal = document.getElementById('maintenance-modal');

    if (form) {
        // Event-Listener nur einmal hinzufügen
        form.removeEventListener('submit', handleMaintenanceSubmit);
        form.addEventListener('submit', handleMaintenanceSubmit);
    }
}

async function handleMaintenanceSubmit(e) {
    e.preventDefault();

    // Verhindere Doppel-Submit
    if (isSubmitting) {
        console.log('Submit already in progress');
        return;
    }
    isSubmitting = true;

    const form = e.target;
    const modal = document.getElementById('maintenance-modal');
    const vehicleId = window.location.pathname.split('/').pop();
    const formData = new FormData(form);

    const data = {
        vehicleId: vehicleId,
        date: formData.get('maintenance-date'),
        type: formData.get('maintenance-type'),
        mileage: parseInt(formData.get('mileage')) || 0,
        cost: parseFloat(formData.get('cost')) || 0,
        workshop: formData.get('workshop'),
        notes: formData.get('maintenance-notes')
    };

    try {
        const isEdit = form.dataset.isEdit === 'true';
        const maintenanceId = form.dataset.maintenanceId;

        const url = isEdit ? `/api/maintenance/${maintenanceId}` : '/api/maintenance';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Fehler beim Speichern');

        showNotification('Wartungseintrag erfolgreich gespeichert', 'success');
        modal.classList.add('hidden');

        setTimeout(() => {
            window.location.reload();
        }, 500);

    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Speichern des Wartungseintrags', 'error');
        isSubmitting = false;
    }
}

// Nutzungs-Modal
function initializeUsageModal() {
    const form = document.getElementById('usage-form');
    const modal = document.getElementById('usage-modal');

    if (form) {
        // Event-Listener nur einmal hinzufügen
        form.removeEventListener('submit', handleUsageSubmit);
        form.addEventListener('submit', handleUsageSubmit);
    }
}

async function handleUsageSubmit(e) {
    e.preventDefault();

    // Verhindere Doppel-Submit
    if (isSubmitting) {
        console.log('Submit already in progress');
        return;
    }
    isSubmitting = true;

    const form = e.target;
    const modal = document.getElementById('usage-modal');
    const vehicleId = window.location.pathname.split('/').pop();
    const formData = new FormData(form);

    // Validierung
    const driverId = formData.get('driver');
    if (!driverId) {
        showNotification('Bitte wählen Sie einen Fahrer aus', 'error');
        isSubmitting = false;
        return;
    }

    const data = {
        vehicleId: vehicleId,
        driverId: driverId,
        startDate: formData.get('start-date'),
        startTime: formData.get('start-time'),
        endDate: formData.get('end-date'),
        endTime: formData.get('end-time'),
        startMileage: parseInt(formData.get('start-mileage')) || 0,
        endMileage: parseInt(formData.get('end-mileage')) || 0,
        purpose: formData.get('project'),
        status: formData.get('end-date') ? 'completed' : 'active',
        notes: formData.get('usage-notes')
    };

    try {
        const isEdit = form.dataset.isEdit === 'true';
        const usageId = form.dataset.usageId;

        const url = isEdit ? `/api/usage/${usageId}` : '/api/usage';
        const method = isEdit ? 'PUT' : 'POST';

        console.log('Sending request to:', url, 'with method:', method);
        console.log('Data:', JSON.stringify(data));

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response text:', responseText);

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${responseText}`);
        }

        showNotification('Nutzungseintrag erfolgreich gespeichert', 'success');
        modal.classList.add('hidden');

        setTimeout(() => {
            window.location.reload();
        }, 500);

    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Speichern des Nutzungseintrags: ' + error.message, 'error');
        isSubmitting = false;
    }
}

// Tankkosten-Modal
function initializeFuelCostModal() {
    const form = document.getElementById('vehicle-fuel-cost-form');
    const modal = document.getElementById('vehicle-fuel-cost-modal');

    if (form) {
        // Event-Listener nur einmal hinzufügen
        form.removeEventListener('submit', handleFuelCostSubmit);
        form.addEventListener('submit', handleFuelCostSubmit);
    }

    // Automatische Berechnung
    const amountInput = document.getElementById('vehicle-fuel-amount');
    const priceInput = document.getElementById('vehicle-fuel-price-per-unit');
    const totalInput = document.getElementById('vehicle-fuel-total-cost');

    if (amountInput && priceInput && totalInput) {
        const calculateTotal = () => {
            const amount = parseFloat(amountInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            totalInput.value = (amount * price).toFixed(2);
        };

        amountInput.removeEventListener('input', calculateTotal);
        priceInput.removeEventListener('input', calculateTotal);

        amountInput.addEventListener('input', calculateTotal);
        priceInput.addEventListener('input', calculateTotal);
    }
}

async function handleFuelCostSubmit(e) {
    e.preventDefault();

    // Verhindere Doppel-Submit
    if (isSubmitting) {
        console.log('Submit already in progress');
        return;
    }
    isSubmitting = true;

    const form = e.target;
    const modal = document.getElementById('vehicle-fuel-cost-modal');
    const vehicleId = window.location.pathname.split('/').pop();
    const formData = new FormData(form);

    const data = {
        vehicleId: vehicleId,
        driverId: formData.get('driver') || null,
        date: formData.get('fuel-date'),
        fuelType: formData.get('fuel-type'),
        amount: parseFloat(formData.get('amount')) || 0,
        pricePerUnit: parseFloat(formData.get('price-per-unit')) || 0,
        totalCost: parseFloat(formData.get('total-cost')) || 0,
        mileage: parseInt(formData.get('mileage')) || 0,
        location: formData.get('location'),
        receiptNumber: formData.get('receipt-number')
    };

    try {
        const isEdit = form.dataset.isEdit === 'true';
        const fuelCostId = form.dataset.fuelCostId;

        const url = isEdit ? `/api/fuelcosts/${fuelCostId}` : '/api/fuelcosts';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Fehler beim Speichern');

        showNotification('Tankkosten erfolgreich gespeichert', 'success');
        modal.classList.add('hidden');

        setTimeout(() => {
            window.location.reload();
        }, 500);

    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Speichern der Tankkosten', 'error');
        isSubmitting = false;
    }
}

// Zulassungs-Modal
function initializeRegistrationModal() {
    const form = document.getElementById('registration-form');
    const modal = document.getElementById('registration-modal');

    if (form) {
        form.removeEventListener('submit', handleRegistrationSubmit);
        form.addEventListener('submit', handleRegistrationSubmit);
    }
}

async function handleRegistrationSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const modal = document.getElementById('registration-modal');
    const vehicleId = window.location.pathname.split('/').pop();
    const formData = new FormData(form);

    try {
        // Erst die aktuellen Fahrzeugdaten laden
        const vehicleResponse = await fetch(`/api/vehicles/${vehicleId}`);
        const vehicleData = await vehicleResponse.json();
        const vehicle = vehicleData.vehicle;

        // Alle Fahrzeugdaten mit den neuen Zulassungsdaten zusammenführen
        const data = {
            ...vehicle,
            registrationDate: formData.get('registration-date'),
            registrationExpiry: formData.get('registration-expiry'),
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
        modal.classList.add('hidden');
        setTimeout(() => window.location.reload(), 500);

    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Aktualisieren der Zulassungsdaten', 'error');
    }
}

// Fahrzeug bearbeiten Modal
function initializeVehicleEditModal() {
    const form = document.getElementById('edit-vehicle-form');
    const modal = document.getElementById('edit-vehicle-modal');

    if (form) {
        form.removeEventListener('submit', handleVehicleEditSubmit);
        form.addEventListener('submit', handleVehicleEditSubmit);
    }

    // Tab-Funktionalität
    initializeModalTabs();
}

async function handleVehicleEditSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const modal = document.getElementById('edit-vehicle-modal');
    const vehicleId = window.location.pathname.split('/').pop();
    const formData = new FormData(form);

    const data = {
        licensePlate: formData.get('license_plate'),
        brand: formData.get('vehicle_brand'),
        model: formData.get('model'),
        year: parseInt(formData.get('year')),
        color: formData.get('color'),
        vehicleId: formData.get('vehicle_id'),
        vin: formData.get('vin'),
        vehicleType: formData.get('vehicle_type'),
        fuelType: formData.get('fuel_type'),
        mileage: parseInt(formData.get('current_mileage')) || 0,

        // Technische Daten
        engineDisplacement: parseInt(formData.get('engine_displacement')) || 0,
        powerRating: parseFloat(formData.get('power_rating')) || 0,
        numberOfAxles: parseInt(formData.get('number_of_axles')) || 0,
        tireSize: formData.get('tire_size'),
        rimType: formData.get('rim_type'),
        emissionClass: formData.get('emission_class'),
        maxSpeed: parseInt(formData.get('max_speed')) || 0,
        towingCapacity: parseInt(formData.get('towing_capacity')) || 0,

        // Abmessungen & Gewichte
        length: parseInt(formData.get('length')) || 0,
        width: parseInt(formData.get('width')) || 0,
        height: parseInt(formData.get('height')) || 0,
        curbWeight: parseInt(formData.get('curb_weight')) || 0,
        grossWeight: parseInt(formData.get('gross_weight')) || 0,
        technicalMaxWeight: parseInt(formData.get('technical_max_weight')) || 0,
        specialFeatures: formData.get('special_features')
    };

    try {
        const response = await fetch(`/api/vehicles/${vehicleId}/basic-info`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Fehler beim Aktualisieren');

        showNotification('Fahrzeugdaten erfolgreich aktualisiert', 'success');
        modal.classList.add('hidden');
        setTimeout(() => window.location.reload(), 500);

    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Aktualisieren der Fahrzeugdaten', 'error');
    }
}

// Tab-Funktionalität für Modal
function initializeModalTabs() {
    const tabButtons = document.querySelectorAll('#edit-vehicle-modal .tab-btn');
    const tabContents = document.querySelectorAll('#edit-vehicle-modal .tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Alle Tabs verstecken
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });

            // Alle Buttons deaktivieren
            tabButtons.forEach(btn => {
                btn.classList.remove('border-indigo-500', 'text-indigo-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });

            // Gewählten Tab anzeigen
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }

            // Gewählten Button aktivieren
            button.classList.add('border-indigo-500', 'text-indigo-600');
            button.classList.remove('border-transparent', 'text-gray-500');
        });
    });
}

// Modal öffnen Funktionen
window.openAddMaintenanceModal = function(vehicleId) {
    const modal = document.getElementById('maintenance-modal');
    const form = document.getElementById('maintenance-form');

    if (form) {
        form.reset();
        form.dataset.isEdit = 'false';
        delete form.dataset.maintenanceId;
        resetSubmitStatus();

        // Aktuelles Datum setzen
        const dateInput = document.getElementById('maintenance-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.openAddUsageModal = async function(vehicleId) {
    const modal = document.getElementById('usage-modal');
    const form = document.getElementById('usage-form');

    if (form) {
        form.reset();
        form.dataset.isEdit = 'false';
        delete form.dataset.usageId;
        resetSubmitStatus();

        // Aktuelles Datum und Zeit setzen
        const now = new Date();
        const startDateInput = document.getElementById('start-date');
        const startTimeInput = document.getElementById('start-time');

        if (startDateInput) {
            startDateInput.value = now.toISOString().split('T')[0];
        }
        if (startTimeInput) {
            startTimeInput.value = now.toTimeString().slice(0, 5);
        }
    }

    // Fahrer laden
    try {
        const response = await fetch('/api/drivers');
        const data = await response.json();
        const select = document.getElementById('driver');

        if (select) {
            select.innerHTML = '<option value="">Fahrer auswählen</option>';
            if (data.drivers) {
                data.drivers.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = `${driver.firstName} ${driver.lastName}`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Fehler beim Laden der Fahrer:', error);
    }

    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.openAddFuelCostModal = async function(vehicleId) {
    const modal = document.getElementById('vehicle-fuel-cost-modal');
    const form = document.getElementById('vehicle-fuel-cost-form');

    if (form) {
        form.reset();
        form.dataset.isEdit = 'false';
        delete form.dataset.fuelCostId;
        resetSubmitStatus();

        // Aktuelles Datum setzen
        const dateInput = document.getElementById('vehicle-fuel-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    // Fahrer laden
    try {
        const response = await fetch('/api/drivers');
        const data = await response.json();
        const select = document.getElementById('vehicle-fuel-driver');

        if (select) {
            select.innerHTML = '<option value="">Keinen Fahrer auswählen</option>';
            if (data.drivers) {
                data.drivers.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = `${driver.firstName} ${driver.lastName}`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Fehler beim Laden der Fahrer:', error);
    }

    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.openEditRegistrationModal = async function(vehicleId) {
    const modal = document.getElementById('registration-modal');

    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        const data = await response.json();
        const vehicle = data.vehicle;

        // Formular mit Daten füllen
        const setFieldValue = (id, value, isDate = false) => {
            const element = document.getElementById(id);
            if (element) {
                if (isDate && value) {
                    element.value = value.split('T')[0];
                } else {
                    element.value = value || '';
                }
            }
        };

        setFieldValue('registration-date', vehicle.registrationDate, true);
        setFieldValue('registration-expiry', vehicle.registrationExpiry, true);
        setFieldValue('next-inspection', vehicle.nextInspectionDate, true);
        setFieldValue('insurance-company', vehicle.insuranceCompany);
        setFieldValue('insurance-number', vehicle.insuranceNumber);
        setFieldValue('insurance-type', vehicle.insuranceType);
        setFieldValue('insurance-expiry', vehicle.insuranceExpiry, true);
        setFieldValue('insurance-cost', vehicle.insuranceCost);

        if (modal) {
            modal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeugdaten:', error);
        alert('Fehler beim Laden der Fahrzeugdaten');
    }
};

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

        // Modal mit Daten füllen
        const modal = document.getElementById('edit-usage-modal');
        if (modal) {
            modal.classList.remove('hidden');

            // Form mit der aktiven Nutzungs-ID konfigurieren
            const form = document.getElementById('edit-current-usage-form');
            if (form) {
                form.dataset.usageId = activeUsage.id;
            }
        }

    } catch (error) {
        console.error('Fehler beim Laden der aktuellen Nutzung:', error);
    }
};

window.openEditVehicleModal = async function(vehicleId) {
    console.log('Opening edit modal for vehicle:', vehicleId);

    // Falls vehicleId nicht übergeben wurde, aus URL extrahieren
    if (!vehicleId) {
        vehicleId = window.location.pathname.split('/').pop();
        console.log('Extracted vehicle ID from URL:', vehicleId);
    }

    const modal = document.getElementById('edit-vehicle-modal');

    if (!modal) {
        console.error('Edit vehicle modal not found');
        alert('Modal konnte nicht gefunden werden');
        return;
    }

    try {
        // Lade Fahrzeugdaten
        const url = `/api/vehicles/${vehicleId}`;
        console.log('Fetching from URL:', url);

        const response = await fetch(url);
        console.log('API Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('Complete API response:', data);

        // Flexiblere Datenextraktion
        let vehicle = null;

        // Prüfe verschiedene mögliche Response-Strukturen
        if (data.vehicle) {
            vehicle = data.vehicle;
        } else if (data.Vehicle) {
            vehicle = data.Vehicle;
        } else if (data.id) {
            // Direkte Fahrzeugdaten ohne Wrapper
            vehicle = data;
        } else {
            console.error('Unexpected response structure:', data);
            throw new Error('Unerwartete Antwortstruktur von der API');
        }

        console.log('Extracted vehicle data:', vehicle);

        // Marken-Dropdown initialisieren
        const brandSelect = document.getElementById('vehicle_brand');
        if (brandSelect) {
            // Prüfen ob carManufacturers geladen ist
            if (typeof carManufacturers !== 'undefined' && Array.isArray(carManufacturers)) {
                brandSelect.innerHTML = '<option value="">Marke auswählen</option>';
                carManufacturers.forEach(manufacturer => {
                    const option = document.createElement('option');
                    option.value = manufacturer.name;
                    option.textContent = manufacturer.name;
                    if (manufacturer.name === vehicle.brand) {
                        option.selected = true;
                    }
                    brandSelect.appendChild(option);
                });
            } else {
                console.warn('carManufacturers not loaded, adding current brand only');
                // Falls carManufacturers nicht geladen ist, füge nur die aktuelle Marke hinzu
                brandSelect.innerHTML = `
                    <option value="">Marke auswählen</option>
                    <option value="${vehicle.brand}" selected>${vehicle.brand}</option>
                `;
            }
        } else {
            console.error('Brand select element not found');
        }

        // Hilfsfunktion zum sicheren Setzen von Feldwerten
        const setFieldValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value !== null && value !== undefined ? value : '';
                console.log(`Set ${id} to:`, value);
            } else {
                console.warn(`Field not found: ${id}`);
            }
        };

        // Grunddaten
        setFieldValue('license_plate', vehicle.licensePlate);
        setFieldValue('model', vehicle.model);
        setFieldValue('year', vehicle.year);
        setFieldValue('color', vehicle.color);
        setFieldValue('vehicle_id', vehicle.vehicleId);
        setFieldValue('vin', vehicle.vin);
        setFieldValue('vehicle_type', vehicle.vehicleType);
        setFieldValue('fuel_type', vehicle.fuelType);
        setFieldValue('current_mileage', vehicle.mileage);

        // Technische Daten
        setFieldValue('engine_displacement', vehicle.engineDisplacement);
        setFieldValue('power_rating', vehicle.powerRating);
        setFieldValue('number_of_axles', vehicle.numberOfAxles);
        setFieldValue('tire_size', vehicle.tireSize);
        setFieldValue('rim_type', vehicle.rimType);
        setFieldValue('emission_class', vehicle.emissionClass);
        setFieldValue('max_speed', vehicle.maxSpeed);
        setFieldValue('towing_capacity', vehicle.towingCapacity);

        // Abmessungen & Gewichte
        setFieldValue('length', vehicle.length);
        setFieldValue('width', vehicle.width);
        setFieldValue('height', vehicle.height);
        setFieldValue('curb_weight', vehicle.curbWeight);
        setFieldValue('gross_weight', vehicle.grossWeight);
        setFieldValue('technical_max_weight', vehicle.technicalMaxWeight);
        setFieldValue('special_features', vehicle.specialFeatures);

        // Tab-Funktionalität initialisieren
        initializeModalTabs();

        // Modal anzeigen
        modal.classList.remove('hidden');
        console.log('Modal opened successfully');

    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeugdaten:', error);
        alert('Fehler beim Laden der Fahrzeugdaten: ' + error.message);
    }
};

// Notification Helper
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

// Kraftstoffart ändern - Einheit anpassen
document.addEventListener('DOMContentLoaded', function() {
    const fuelTypeSelect = document.getElementById('vehicle-fuel-type');
    const fuelUnit = document.getElementById('fuel-unit');

    if (fuelTypeSelect && fuelUnit) {
        fuelTypeSelect.addEventListener('change', function() {
            if (this.value === 'Elektro') {
                fuelUnit.textContent = 'kWh';
            } else {
                fuelUnit.textContent = 'L';
            }
        });
    }
});

// Finanzierungs-Modal initialisieren
// Finanzierungs-Modal initialisieren
function initializeFinancingModal() {
    const form = document.getElementById('financing-form');
    const modal = document.getElementById('financing-modal');

    if (form) {
        form.removeEventListener('submit', handleFinancingSubmit);
        form.addEventListener('submit', handleFinancingSubmit);
    }

    // Close Button
    const closeBtn = document.querySelector('.close-financing-modal-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.add('hidden');
        });
    }
}

async function handleFinancingSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const modal = document.getElementById('financing-modal');
    const vehicleId = window.location.pathname.split('/').pop();
    const formData = new FormData(form);

    // Erwerbsart ermitteln
    const acquisitionType = formData.get('acquisition-type');

    try {
        // Erst die aktuellen Fahrzeugdaten laden
        const vehicleResponse = await fetch(`/api/vehicles/${vehicleId}`);
        const vehicleData = await vehicleResponse.json();
        const vehicle = vehicleData.vehicle;

        // Alle Fahrzeugdaten mit den neuen Finanzierungsdaten zusammenführen
        const data = {
            ...vehicle,
            acquisitionType: acquisitionType
        };

        // Je nach Erwerbsart die entsprechenden Felder setzen
        if (acquisitionType === 'purchased') {
            data.purchaseDate = formData.get('purchase-date');
            data.purchasePrice = parseFloat(formData.get('purchase-price')) || 0;
            data.purchaseVendor = formData.get('purchase-vendor');
        } else if (acquisitionType === 'financed') {
            data.financeStartDate = formData.get('finance-start-date');
            data.financeEndDate = formData.get('finance-end-date');
            data.financeMonthlyRate = parseFloat(formData.get('finance-monthly-rate')) || 0;
            data.financeInterestRate = parseFloat(formData.get('finance-interest-rate')) || 0;
            data.financeDownPayment = parseFloat(formData.get('finance-down-payment')) || 0;
            data.financeTotalAmount = parseFloat(formData.get('finance-total-amount')) || 0;
            data.financeBank = formData.get('finance-bank');
        } else if (acquisitionType === 'leased') {
            data.leaseStartDate = formData.get('lease-start-date');
            data.leaseEndDate = formData.get('lease-end-date');
            data.leaseMonthlyRate = parseFloat(formData.get('lease-monthly-rate')) || 0;
            data.leaseMileageLimit = parseInt(formData.get('lease-mileage-limit')) || 0;
            data.leaseExcessMileageCost = parseFloat(formData.get('lease-excess-mileage-cost')) || 0;
            data.leaseCompany = formData.get('lease-company');
            data.leaseContractNumber = formData.get('lease-contract-number');
            data.leaseResidualValue = parseFloat(formData.get('lease-residual-value')) || 0;
        }

        const response = await fetch(`/api/vehicles/${vehicleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Fehler beim Aktualisieren');

        showNotification('Finanzierungsdaten erfolgreich aktualisiert', 'success');
        modal.classList.add('hidden');
        setTimeout(() => window.location.reload(), 500);

    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Aktualisieren der Finanzierungsdaten', 'error');
    }
}

// Modal öffnen Funktion - WICHTIG: Als globale Funktion definieren
window.openEditFinancingModal = async function(vehicleId) {
    const modal = document.getElementById('financing-modal');

    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        const data = await response.json();
        const vehicle = data.vehicle;

        // Erwerbsart setzen
        if (vehicle.acquisitionType) {
            toggleFinancingFields(vehicle.acquisitionType);
        }

        // Felder mit Daten füllen
        const setFieldValue = (id, value, isDate = false) => {
            const element = document.getElementById(id);
            if (element) {
                if (isDate && value) {
                    element.value = value.split('T')[0];
                } else {
                    element.value = value || '';
                }
            }
        };

        // Kaufdaten
        setFieldValue('purchase-date', vehicle.purchaseDate, true);
        setFieldValue('purchase-price', vehicle.purchasePrice);
        setFieldValue('purchase-vendor', vehicle.purchaseVendor);

        // Finanzierungsdaten
        setFieldValue('finance-start-date', vehicle.financeStartDate, true);
        setFieldValue('finance-end-date', vehicle.financeEndDate, true);
        setFieldValue('finance-monthly-rate', vehicle.financeMonthlyRate);
        setFieldValue('finance-interest-rate', vehicle.financeInterestRate);
        setFieldValue('finance-down-payment', vehicle.financeDownPayment);
        setFieldValue('finance-total-amount', vehicle.financeTotalAmount);
        setFieldValue('finance-bank', vehicle.financeBank);

        // Leasingdaten
        setFieldValue('lease-start-date', vehicle.leaseStartDate, true);
        setFieldValue('lease-end-date', vehicle.leaseEndDate, true);
        setFieldValue('lease-monthly-rate', vehicle.leaseMonthlyRate);
        setFieldValue('lease-mileage-limit', vehicle.leaseMileageLimit);
        setFieldValue('lease-excess-mileage-cost', vehicle.leaseExcessMileageCost);
        setFieldValue('lease-company', vehicle.leaseCompany);
        setFieldValue('lease-contract-number', vehicle.leaseContractNumber);
        setFieldValue('lease-residual-value', vehicle.leaseResidualValue);

        if (modal) {
            modal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeugdaten:', error);
        alert('Fehler beim Laden der Fahrzeugdaten');
    }
};

// Funktion zum Umschalten der Finanzierungsfelder - WICHTIG: Als globale Funktion
window.toggleFinancingFields = function(type) {
    // Alle Felder verstecken
    document.querySelectorAll('.financing-fields').forEach(el => el.classList.add('hidden'));

    // Radio Button Styles aktualisieren
    document.querySelectorAll('input[name="acquisition-type"]').forEach(radio => {
        const label = radio.parentElement;
        const svg = label.querySelector('svg');
        const border = label.querySelector('.absolute');

        if (radio.value === type) {
            radio.checked = true;
            svg.classList.remove('hidden');
            border.classList.add('border-indigo-500');
        } else {
            svg.classList.add('hidden');
            border.classList.remove('border-indigo-500');
        }
    });

    // Entsprechende Felder anzeigen
    if (type === 'purchased') {
        document.getElementById('purchase-fields').classList.remove('hidden');
    } else if (type === 'financed') {
        document.getElementById('finance-fields').classList.remove('hidden');
    } else if (type === 'leased') {
        document.getElementById('lease-fields').classList.remove('hidden');
    }
};



// Initialisierung nur einmal beim Laden
document.addEventListener('DOMContentLoaded', function() {
    initializeModals();
    // In der initializeModals Funktion hinzufügen:
    initializeFinancingModal();
});