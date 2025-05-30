// frontend/static/js/vehicle-modals.js

// Wartungs-Modal
function initializeMaintenanceModal() {
    const form = document.getElementById('maintenance-form');
    const closeBtn = document.querySelector('#maintenance-modal .close-modal-btn');
    const modal = document.getElementById('maintenance-modal');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vehicleId = window.location.pathname.split('/').pop();
            await saveMaintenanceEntry(vehicleId, new FormData(form));
            modal.classList.add('hidden');
            loadMaintenance(vehicleId);
        });
    }
}

// Tankkosten-Modal
function initializeFuelCostModal() {
    const form = document.getElementById('vehicle-fuel-cost-form');
    const closeBtn = document.getElementById('vehicle-close-fuel-modal-btn');
    const modal = document.getElementById('vehicle-fuel-cost-modal');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vehicleId = window.location.pathname.split('/').pop();
            await saveFuelCost(vehicleId, new FormData(form));
            modal.classList.add('hidden');
            loadFuelCosts(vehicleId);
        });
    }

    // Automatische Berechnung der Gesamtkosten
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
    const closeBtn = document.querySelector('#usage-modal .close-modal-btn');
    const modal = document.getElementById('usage-modal');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vehicleId = window.location.pathname.split('/').pop();
            await saveUsageEntry(vehicleId, new FormData(form));
            modal.classList.add('hidden');
            loadUsageHistory(vehicleId);
            loadCurrentUsage(vehicleId);
        });
    }
}

// Zulassungs-Modal
function initializeRegistrationModal() {
    const form = document.getElementById('registration-form');
    const closeBtn = document.getElementById('close-registration-modal-btn');
    const modal = document.getElementById('registration-modal');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vehicleId = window.location.pathname.split('/').pop();
            await updateRegistrationInfo(vehicleId, new FormData(form));
            modal.classList.add('hidden');
            loadRegistration(vehicleId);
        });
    }
}

// Modal öffnen Funktionen
window.openEditVehicleModal = async function(vehicleId) {
    const modal = document.getElementById('edit-vehicle-modal');
    const response = await fetch(`/api/vehicles/${vehicleId}`);
    const data = await response.json();
    const vehicle = data.vehicle;

    // Formular mit Daten füllen
    document.getElementById('license_plate').value = vehicle.licensePlate || '';
    document.getElementById('vehicle_brand').value = vehicle.brand || '';
    document.getElementById('model').value = vehicle.model || '';
    document.getElementById('year').value = vehicle.year || '';
    document.getElementById('color').value = vehicle.color || '';
    document.getElementById('vehicle_id').value = vehicle.vehicleId || '';
    document.getElementById('vin').value = vehicle.vin || '';
    document.getElementById('fuel_type').value = vehicle.fuelType || '';
    document.getElementById('current_mileage').value = vehicle.mileage || '';

    modal.classList.remove('hidden');
};

// Modal: Wartung hinzufügen
window.openAddMaintenanceModal = function(vehicleId) {
    const modal = document.getElementById('maintenance-modal');
    const form = document.getElementById('maintenance-form');

    if (!modal) {
        console.error('Maintenance Modal nicht gefunden');
        return;
    }

    if (form) {
        form.reset();
    }

    const modalTitle = document.getElementById('maintenance-modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Wartung/Inspektion hinzufügen';
    }

    // Aktuelles Datum setzen
    const dateInput = document.getElementById('maintenance-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // VehicleId speichern für Submit
    if (form) {
        form.dataset.vehicleId = vehicleId;
    }

    modal.classList.remove('hidden');
};


// Modal: Tankkosten hinzufügen
window.openAddFuelCostModal = async function(vehicleId) {
    const modal = document.getElementById('vehicle-fuel-cost-modal');
    const form = document.getElementById('vehicle-fuel-cost-form');

    if (!modal) {
        console.error('Fuel Cost Modal nicht gefunden');
        return;
    }

    if (form) {
        form.reset();
    }

    // Fahrzeug-ID setzen
    const vehicleIdInput = document.getElementById('vehicle-fuel-vehicle-id');
    if (vehicleIdInput) {
        vehicleIdInput.value = vehicleId;
    }

    // Fahrer laden
    try {
        const response = await fetch('/api/drivers');
        const data = await response.json();
        const select = document.getElementById('vehicle-fuel-driver');

        if (select) {
            // Erste Option beibehalten
            select.innerHTML = '<option value="">Keinen Fahrer auswählen</option>';

            // Fahrer hinzufügen
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

    // Aktuelles Datum setzen
    const dateInput = document.getElementById('vehicle-fuel-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // VehicleId speichern für Submit
    if (form) {
        form.dataset.vehicleId = vehicleId;
    }

    modal.classList.remove('hidden');
};


// Modal: Nutzung hinzufügen
window.openAddUsageModal = async function(vehicleId) {
    const modal = document.getElementById('usage-modal');
    const form = document.getElementById('usage-form');

    if (!modal) {
        console.error('Usage Modal nicht gefunden');
        return;
    }

    if (form) {
        form.reset();
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

    // VehicleId speichern für Submit
    if (form) {
        form.dataset.vehicleId = vehicleId;
    }

    modal.classList.remove('hidden');
};

// Modal: Zulassung bearbeiten
window.openEditRegistrationModal = async function(vehicleId) {
    const modal = document.getElementById('registration-modal');
    const form = document.getElementById('registration-form');

    if (!modal) {
        console.error('Registration Modal nicht gefunden');
        return;
    }

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

        // VehicleId speichern für Submit
        if (form) {
            form.dataset.vehicleId = vehicleId;
        }

        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeugdaten:', error);
        alert('Fehler beim Laden der Fahrzeugdaten');
    }
};

// Hilfsfunktion zum Laden der Fahrer
async function loadDriversForSelect(selectId) {
    try {
        const response = await fetch('/api/drivers');
        const data = await response.json();
        const select = document.getElementById(selectId);

        // Erste Option beibehalten
        const firstOption = select.querySelector('option:first-child');
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }

        // Fahrer hinzufügen
        data.drivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.id;
            option.textContent = `${driver.firstName} ${driver.lastName}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Fahrer:', error);
    }
}

// Modal: Fahrzeug bearbeiten
window.openEditVehicleModal = async function(vehicleId) {
    const modal = document.getElementById('edit-vehicle-modal');
    if (!modal) {
        console.error('Edit Vehicle Modal nicht gefunden');
        return;
    }

    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        const data = await response.json();
        const vehicle = data.vehicle;

        // Formular-Elemente sicher abrufen
        const setFieldValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.value = value || '';
        };

        // Grunddaten
        setFieldValue('license_plate', vehicle.licensePlate);
        setFieldValue('vehicle_brand', vehicle.brand);
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
    } catch (error) {
        console.error('Fehler beim Laden der Fahrzeugdaten:', error);
        alert('Fehler beim Laden der Fahrzeugdaten');
    }
};

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
                btn.classList.remove('border-indigo-500', 'text-indigo-600', 'active');
                btn.classList.add('border-transparent', 'text-gray-500');
            });

            // Gewählten Tab anzeigen
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }

            // Gewählten Button aktivieren
            button.classList.add('border-indigo-500', 'text-indigo-600', 'active');
            button.classList.remove('border-transparent', 'text-gray-500');
        });
    });
}


// Fahrzeug bearbeiten Modal - Erweitere die Submit-Funktion
function initializeVehicleEditModal() {
    const form = document.getElementById('edit-vehicle-form');
    const closeBtn = document.querySelector('.close-edit-modal-btn');
    const modal = document.getElementById('edit-vehicle-modal');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vehicleId = window.location.pathname.split('/').pop();
            const formData = new FormData(form);

            // Erweiterte Daten sammeln
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

            await updateVehicleBasicInfo(vehicleId, data);
            modal.classList.add('hidden');
            loadBasicInfo(vehicleId);
        });
    }
}

// Modal Initialisierung
function initializeModals() {
    initializeVehicleEditModal();
    initializeMaintenanceModal();
    initializeFuelCostModal();
    initializeUsageModal();
    initializeRegistrationModal();
}