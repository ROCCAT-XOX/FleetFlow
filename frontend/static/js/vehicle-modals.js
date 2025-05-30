// frontend/static/js/vehicle-modals.js

// Modal Initialisierung - wird bei DOMContentLoaded ausgeführt
function initializeModals() {
    initializeMaintenanceModal();
    initializeFuelCostModal();
    initializeUsageModal();
    initializeRegistrationModal();
    initializeVehicleEditModal();

    // Modal-Schließen bei Klick außerhalb
    document.querySelectorAll('.fixed.z-10').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    });

    // Close-Button Event-Listener
    document.querySelectorAll('.close-modal-btn, .close-edit-modal-btn, .close-current-usage-modal-btn, #close-registration-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.fixed.z-10');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

// Wartungs-Modal
function initializeMaintenanceModal() {
    const form = document.getElementById('maintenance-form');
    const modal = document.getElementById('maintenance-modal');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
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
                setTimeout(() => window.location.reload(), 1000);

            } catch (error) {
                console.error('Fehler:', error);
                showNotification('Fehler beim Speichern des Wartungseintrags', 'error');
            }
        });
    }
}

// Tankkosten-Modal
function initializeFuelCostModal() {
    const form = document.getElementById('vehicle-fuel-cost-form');
    const modal = document.getElementById('vehicle-fuel-cost-modal');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
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
                setTimeout(() => window.location.reload(), 1000);

            } catch (error) {
                console.error('Fehler:', error);
                showNotification('Fehler beim Speichern der Tankkosten', 'error');
            }
        });
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

        amountInput.addEventListener('input', calculateTotal);
        priceInput.addEventListener('input', calculateTotal);
    }
}

// Nutzungs-Modal
function initializeUsageModal() {
    const form = document.getElementById('usage-form');
    const modal = document.getElementById('usage-modal');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vehicleId = window.location.pathname.split('/').pop();
            const formData = new FormData(form);

            const data = {
                vehicleId: vehicleId,
                driverId: formData.get('driver'),
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

                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) throw new Error('Fehler beim Speichern');

                showNotification('Nutzungseintrag erfolgreich gespeichert', 'success');
                modal.classList.add('hidden');
                setTimeout(() => window.location.reload(), 1000);

            } catch (error) {
                console.error('Fehler:', error);
                showNotification('Fehler beim Speichern des Nutzungseintrags', 'error');
            }
        });
    }
}

// Zulassungs-Modal
function initializeRegistrationModal() {
    const form = document.getElementById('registration-form');
    const modal = document.getElementById('registration-modal');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
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
                setTimeout(() => window.location.reload(), 1000);

            } catch (error) {
                console.error('Fehler:', error);
                showNotification('Fehler beim Aktualisieren der Zulassungsdaten', 'error');
            }
        });
    }
}

// Fahrzeug bearbeiten Modal
function initializeVehicleEditModal() {
    const form = document.getElementById('edit-vehicle-form');
    const modal = document.getElementById('edit-vehicle-modal');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
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
                setTimeout(() => window.location.reload(), 1000);

            } catch (error) {
                console.error('Fehler:', error);
                showNotification('Fehler beim Aktualisieren der Fahrzeugdaten', 'error');
            }
        });
    }

    // Tab-Funktionalität
    initializeModalTabs();
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

window.openAddFuelCostModal = async function(vehicleId) {
    const modal = document.getElementById('vehicle-fuel-cost-modal');
    const form = document.getElementById('vehicle-fuel-cost-form');

    if (form) {
        form.reset();
        form.dataset.isEdit = 'false';
        delete form.dataset.fuelCostId;

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

window.openAddUsageModal = async function(vehicleId) {
    const modal = document.getElementById('usage-modal');
    const form = document.getElementById('usage-form');

    if (form) {
        form.reset();
        form.dataset.isEdit = 'false';
        delete form.dataset.usageId;

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

// Close-Button Event-Listener
document.addEventListener('DOMContentLoaded', function() {
    // Alle Close-Buttons
    document.querySelectorAll('.close-modal-btn, .close-edit-modal-btn, .close-current-usage-modal-btn, #close-registration-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.fixed.z-10');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    });
});

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

document.addEventListener('DOMContentLoaded', function() {
    initializeModals();
});

// Debug-Funktion zum Testen
async function debugVehicleAPI() {
    const vehicleId = window.location.pathname.split('/').pop();
    console.log('Testing vehicle ID:', vehicleId);

    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        const text = await response.text();
        console.log('Raw response:', text);

        try {
            const json = JSON.parse(text);
            console.log('Parsed JSON:', json);
            console.log('Has vehicle property:', !!json.vehicle);
            console.log('Vehicle data:', json.vehicle);
        } catch (e) {
            console.error('JSON parse error:', e);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }

    // Check if modal exists
    console.log('Edit modal exists:', !!document.getElementById('edit-vehicle-modal'));
    console.log('Form exists:', !!document.getElementById('edit-vehicle-form'));
}

// Führen Sie diese Funktion aus
debugVehicleAPI();

// Debug-Funktion
async function checkVehicleData() {
    const vehicleId = window.location.pathname.split('/').pop();
    const response = await fetch(`/api/vehicles/${vehicleId}`);
    const data = await response.json();

    console.log('Vehicle data:', data);
    if (data.vehicle) {
        console.log('Mileage:', data.vehicle.mileage);
        console.log('FuelType:', data.vehicle.fuelType);
        console.log('All vehicle properties:', Object.keys(data.vehicle));
    }
}

checkVehicleData();