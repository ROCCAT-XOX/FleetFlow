// frontend/static/js/vehicle-modals.js

import { carManufacturers } from './car-manufacturers.js';

export default class VehicleModals {
    constructor(vehicleId) {
        this.vehicleId = vehicleId;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Event listeners for modal triggers
        document.addEventListener('editVehicle', (e) => this.openEditVehicleModal(e.detail.vehicleId));
        document.addEventListener('editCurrentUsage', (e) => this.openEditCurrentUsageModal(e.detail.vehicleId));
        document.addEventListener('openMaintenanceModal', (e) => this.handleMaintenanceModal(e.detail));
        document.addEventListener('openVehicleFuelCostModal', (e) => this.handleFuelCostModal(e.detail));

        // Close modal buttons
        document.querySelectorAll('.close-modal-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.fixed');
                if (modal) modal.classList.add('hidden');
            });
        });

        // Close on background click
        document.querySelectorAll('.fixed.z-10').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Form submissions
        this.initializeFormSubmissions();
    }

    initializeFormSubmissions() {
        // Vehicle edit form
        const vehicleForm = document.getElementById('edit-vehicle-form');
        if (vehicleForm) {
            vehicleForm.addEventListener('submit', (e) => this.handleVehicleFormSubmit(e));
        }

        // Current usage form
        const usageForm = document.getElementById('edit-current-usage-form');
        if (usageForm) {
            usageForm.addEventListener('submit', (e) => this.handleUsageFormSubmit(e));
        }

        // Maintenance form
        const maintenanceForm = document.getElementById('maintenance-form');
        if (maintenanceForm) {
            maintenanceForm.addEventListener('submit', (e) => this.handleMaintenanceFormSubmit(e));
        }

        // Fuel cost form
        const fuelCostForm = document.getElementById('vehicle-fuel-cost-form');
        if (fuelCostForm) {
            fuelCostForm.addEventListener('submit', (e) => this.handleFuelCostFormSubmit(e));
        }

        // Registration form
        const registrationForm = document.getElementById('registration-form');
        if (registrationForm) {
            registrationForm.addEventListener('submit', (e) => this.handleRegistrationFormSubmit(e));
        }
    }

    initializeManufacturerDropdown() {
        const brandSelect = document.getElementById('vehicle_brand');
        if (brandSelect) {
            // Clear existing options
            brandSelect.innerHTML = '<option value="">Marke auswählen</option>';

            // Add manufacturers from the list
            carManufacturers.forEach(manufacturer => {
                const option = document.createElement('option');
                option.value = manufacturer.name;
                option.textContent = manufacturer.name;
                brandSelect.appendChild(option);
            });
        }
    }

    async openEditVehicleModal(vehicleId) {
        const modal = document.getElementById('edit-vehicle-modal');
        if (!modal) return;

        try {
            const response = await fetch(`/api/vehicles/${vehicleId}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Fahrzeugdaten');

            const data = await response.json();
            const vehicle = data.vehicle;

            // Initialize manufacturer dropdown
            this.initializeManufacturerDropdown();

            // Fill form fields
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
        } catch (error) {
            console.error('Fehler beim Öffnen des Modals:', error);
            alert('Fehler beim Laden der Fahrzeugdaten');
        }
    }

    async handleVehicleFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const vehicleData = {
            licensePlate: formData.get('license_plate'),
            brand: formData.get('vehicle_brand'),
            model: formData.get('model'),
            year: parseInt(formData.get('year')),
            color: formData.get('color'),
            vehicleId: formData.get('vehicle_id'),
            vin: formData.get('vin'),
            fuelType: formData.get('fuel_type'),
            mileage: parseInt(formData.get('current_mileage'))
        };

        try {
            const response = await fetch(`/api/vehicles/${this.vehicleId}/basic-info`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(vehicleData)
            });

            if (!response.ok) throw new Error('Fehler beim Speichern');

            // Close modal and reload data
            document.getElementById('edit-vehicle-modal').classList.add('hidden');
            window.location.reload();
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Speichern der Daten');
        }
    }

    async handleMaintenanceModal(detail) {
        const modal = document.getElementById('maintenance-modal');
        if (!modal) return;

        const form = document.getElementById('maintenance-form');
        const modalTitle = document.getElementById('maintenance-modal-title');

        // Reset form
        form.reset();

        if (detail.maintenanceId) {
            // Edit mode
            modalTitle.textContent = 'Wartung/Inspektion bearbeiten';

            try {
                const response = await fetch(`/api/maintenance/${detail.maintenanceId}`);
                if (!response.ok) throw new Error('Fehler beim Laden der Wartungsdaten');

                const data = await response.json();
                const maintenance = data.maintenance;

                // Fill form fields
                document.getElementById('maintenance-date').value = this.formatDateForInput(maintenance.date);
                document.getElementById('maintenance-type').value = maintenance.type;
                document.getElementById('mileage').value = maintenance.mileage;
                document.getElementById('cost').value = maintenance.cost;
                document.getElementById('workshop').value = maintenance.workshop || '';
                document.getElementById('maintenance-notes').value = maintenance.notes || '';

                // Add maintenance ID to form
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'maintenanceId';
                hiddenInput.value = detail.maintenanceId;
                form.appendChild(hiddenInput);
            } catch (error) {
                console.error('Fehler:', error);
                alert('Fehler beim Laden der Wartungsdaten');
                return;
            }
        } else {
            // Add mode
            modalTitle.textContent = 'Wartung/Inspektion hinzufügen';
        }

        modal.classList.remove('hidden');
    }

    async handleMaintenanceFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const maintenanceData = {
            vehicleId: this.vehicleId,
            date: formData.get('maintenance-date'),
            type: formData.get('maintenance-type'),
            mileage: parseInt(formData.get('mileage')),
            cost: parseFloat(formData.get('cost')),
            workshop: formData.get('workshop'),
            notes: formData.get('maintenance-notes')
        };

        const maintenanceId = formData.get('maintenanceId');
        const isEdit = !!maintenanceId;

        try {
            const url = isEdit ? `/api/maintenance/${maintenanceId}` : '/api/maintenance';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(maintenanceData)
            });

            if (!response.ok) throw new Error('Fehler beim Speichern');

            // Close modal and reload data
            document.getElementById('maintenance-modal').classList.add('hidden');
            window.vehicleDetails.modules.maintenance.loadMaintenanceEntries();
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Speichern der Wartungsdaten');
        }
    }

    async handleFuelCostModal(detail) {
        const modal = document.getElementById('vehicle-fuel-cost-modal');
        if (!modal) return;

        const form = document.getElementById('vehicle-fuel-cost-form');
        const modalTitle = document.getElementById('vehicle-fuel-modal-title');

        // Reset form
        form.reset();

        // Set vehicle ID
        document.getElementById('vehicle-fuel-vehicle-id').value = detail.vehicleId;

        // Load drivers for dropdown
        await this.loadDriversForSelect();

        if (detail.fuelCostId) {
            // Edit mode
            modalTitle.textContent = 'Tankkosten bearbeiten';

            try {
                const response = await fetch(`/api/fuelcosts/${detail.fuelCostId}`);
                if (!response.ok) throw new Error('Fehler beim Laden der Tankdaten');

                const data = await response.json();
                const fuelCost = data.fuelCost;

                // Fill form fields
                document.getElementById('vehicle-fuel-date').value = this.formatDateForInput(fuelCost.date);
                document.getElementById('vehicle-fuel-driver').value = fuelCost.driverId || '';
                document.getElementById('vehicle-fuel-type').value = fuelCost.fuelType;
                document.getElementById('vehicle-fuel-amount').value = fuelCost.amount;
                document.getElementById('vehicle-fuel-price-per-unit').value = fuelCost.pricePerUnit;
                document.getElementById('vehicle-fuel-total-cost').value = fuelCost.totalCost;
                document.getElementById('vehicle-fuel-mileage').value = fuelCost.mileage;
                document.getElementById('vehicle-fuel-location').value = fuelCost.location || '';
                document.getElementById('vehicle-fuel-receipt-number').value = fuelCost.receiptNumber || '';
                document.getElementById('vehicle-fuel-notes').value = fuelCost.notes || '';

                // Add fuel cost ID to form
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'fuelCostId';
                hiddenInput.value = detail.fuelCostId;
                form.appendChild(hiddenInput);
            } catch (error) {
                console.error('Fehler:', error);
                alert('Fehler beim Laden der Tankdaten');
                return;
            }
        } else {
            // Add mode
            modalTitle.textContent = 'Tankkosten hinzufügen';
            document.getElementById('vehicle-fuel-date').value = this.formatDateForInput(new Date());
        }

        modal.classList.remove('hidden');
    }

    async loadDriversForSelect() {
        try {
            const response = await fetch('/api/drivers');
            if (!response.ok) throw new Error('Fehler beim Laden der Fahrer');

            const data = await response.json();
            const drivers = data.drivers || [];

            const select = document.getElementById('vehicle-fuel-driver');
            if (!select) return;

            // Keep the first option and add drivers
            const firstOption = select.querySelector('option:first-child');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);

            drivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = `${driver.firstName} ${driver.lastName}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Fehler beim Laden der Fahrer:', error);
        }
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }
}