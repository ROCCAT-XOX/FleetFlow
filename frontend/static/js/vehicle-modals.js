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

window.openAddMaintenanceModal = function(vehicleId) {
    const modal = document.getElementById('maintenance-modal');
    const form = document.getElementById('maintenance-form');
    form.reset();
    document.getElementById('maintenance-modal-title').textContent = 'Wartung/Inspektion hinzufügen';
    modal.classList.remove('hidden');
};

window.openAddFuelCostModal = async function(vehicleId) {
    const modal = document.getElementById('vehicle-fuel-cost-modal');
    const form = document.getElementById('vehicle-fuel-cost-form');
    form.reset();

    // Fahrzeug-ID setzen
    document.getElementById('vehicle-fuel-vehicle-id').value = vehicleId;

    // Fahrer laden
    await loadDriversForSelect('vehicle-fuel-driver');

    // Aktuelles Datum setzen
    document.getElementById('vehicle-fuel-date').value = new Date().toISOString().split('T')[0];

    modal.classList.remove('hidden');
};

window.openAddUsageModal = async function(vehicleId) {
    const modal = document.getElementById('usage-modal');
    const form = document.getElementById('usage-form');
    form.reset();

    // Fahrer laden
    await loadDriversForSelect('driver');

    // Aktuelles Datum und Zeit setzen
    const now = new Date();
    document.getElementById('start-date').value = now.toISOString().split('T')[0];
    document.getElementById('start-time').value = now.toTimeString().slice(0, 5);

    modal.classList.remove('hidden');
};

window.openEditRegistrationModal = async function(vehicleId) {
    const modal = document.getElementById('registration-modal');
    const response = await fetch(`/api/vehicles/${vehicleId}`);
    const data = await response.json();
    const vehicle = data.vehicle;

    // Formular mit Daten füllen
    if (vehicle.registrationDate) {
        document.getElementById('registration-date').value = vehicle.registrationDate.split('T')[0];
    }
    if (vehicle.registrationExpiry) {
        document.getElementById('registration-expiry').value = vehicle.registrationExpiry.split('T')[0];
    }
    if (vehicle.nextInspectionDate) {
        document.getElementById('next-inspection').value = vehicle.nextInspectionDate.split('T')[0];
    }
    document.getElementById('insurance-company').value = vehicle.insuranceCompany || '';
    document.getElementById('insurance-number').value = vehicle.insuranceNumber || '';
    document.getElementById('insurance-type').value = vehicle.insuranceType || '';
    if (vehicle.insuranceExpiry) {
        document.getElementById('insurance-expiry').value = vehicle.insuranceExpiry.split('T')[0];
    }
    document.getElementById('insurance-cost').value = vehicle.insuranceCost || '';

    modal.classList.remove('hidden');
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

window.openEditVehicleModal = async function(vehicleId) {
    const modal = document.getElementById('edit-vehicle-modal');
    const response = await fetch(`/api/vehicles/${vehicleId}`);
    const data = await response.json();
    const vehicle = data.vehicle;

    // Formular mit Daten füllen
    // Grunddaten
    document.getElementById('license_plate').value = vehicle.licensePlate || '';
    document.getElementById('vehicle_brand').value = vehicle.brand || '';
    document.getElementById('model').value = vehicle.model || '';
    document.getElementById('year').value = vehicle.year || '';
    document.getElementById('color').value = vehicle.color || '';
    document.getElementById('vehicle_id').value = vehicle.vehicleId || '';
    document.getElementById('vin').value = vehicle.vin || '';
    document.getElementById('vehicle_type').value = vehicle.vehicleType || '';
    document.getElementById('fuel_type').value = vehicle.fuelType || '';
    document.getElementById('current_mileage').value = vehicle.mileage || '';

    // Technische Daten
    document.getElementById('engine_displacement').value = vehicle.engineDisplacement || '';
    document.getElementById('power_rating').value = vehicle.powerRating || '';
    document.getElementById('number_of_axles').value = vehicle.numberOfAxles || '';
    document.getElementById('tire_size').value = vehicle.tireSize || '';
    document.getElementById('rim_type').value = vehicle.rimType || '';
    document.getElementById('emission_class').value = vehicle.emissionClass || '';
    document.getElementById('max_speed').value = vehicle.maxSpeed || '';
    document.getElementById('towing_capacity').value = vehicle.towingCapacity || '';

    // Abmessungen & Gewichte
    document.getElementById('length').value = vehicle.length || '';
    document.getElementById('width').value = vehicle.width || '';
    document.getElementById('height').value = vehicle.height || '';
    document.getElementById('curb_weight').value = vehicle.curbWeight || '';
    document.getElementById('gross_weight').value = vehicle.grossWeight || '';
    document.getElementById('technical_max_weight').value = vehicle.technicalMaxWeight || '';
    document.getElementById('special_features').value = vehicle.specialFeatures || '';

    // Tab-Funktionalität initialisieren
    initializeModalTabs();

    modal.classList.remove('hidden');
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
            document.getElementById(`${targetTab}-tab`).classList.remove('hidden');

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