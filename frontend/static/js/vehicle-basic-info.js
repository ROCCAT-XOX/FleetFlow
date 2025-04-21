// frontend/static/js/vehicle-basic-info.js

import { getManufacturerLogo } from './car-manufacturers.js';

export default class VehicleBasicInfo {
    constructor(vehicleId) {
        this.vehicleId = vehicleId;
        this.elements = {
            licensePlateDisplay: document.getElementById('license-plate-display'),
            brandModelDisplay: document.getElementById('brand-model-display'),
            yearDisplay: document.getElementById('year-display'),
            colorDisplay: document.getElementById('color-display'),
            vehicleIdDisplay: document.getElementById('vehicle-id-display'),
            vinDisplay: document.getElementById('vin-display'),
            fuelTypeDisplay: document.getElementById('fuel-type-display'),
            mileageDisplay: document.getElementById('mileage-display'),
            brandLogo: document.getElementById('brand-logo')
        };
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const editButton = document.getElementById('edit-vehicle-btn');
        if (editButton) {
            editButton.addEventListener('click', () => this.openEditModal());
        }
    }

    async loadVehicleBasicInfo() {
        try {
            const response = await fetch(`/api/vehicles/${this.vehicleId}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Fahrzeugdaten');

            const data = await response.json();
            const vehicle = data.vehicle;

            // Update display elements
            this.elements.licensePlateDisplay.textContent = vehicle.licensePlate || '-';
            this.elements.brandModelDisplay.textContent = vehicle.brand ? `${vehicle.brand} ${vehicle.model}` : '-';
            this.elements.yearDisplay.textContent = vehicle.year || '-';
            this.elements.colorDisplay.textContent = vehicle.color || '-';
            this.elements.vehicleIdDisplay.textContent = vehicle.vehicleId || '-';
            this.elements.vinDisplay.textContent = vehicle.vin || '-';
            this.elements.fuelTypeDisplay.textContent = vehicle.fuelType || '-';
            this.elements.mileageDisplay.textContent = vehicle.mileage ? `${vehicle.mileage} km` : '-';

            // Update brand logo
            if (this.elements.brandLogo && vehicle.brand) {
                const logoUrl = getManufacturerLogo(vehicle.brand);
                this.elements.brandLogo.src = logoUrl;
                this.elements.brandLogo.alt = `${vehicle.brand} Logo`;
                this.elements.brandLogo.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Fehler beim Laden der Basisdaten:', error);
            this.showError('Fehler beim Laden der Fahrzeugdaten');
        }
    }

    openEditModal() {
        // Trigger the edit vehicle modal
        const editEvent = new CustomEvent('editVehicle', { detail: { vehicleId: this.vehicleId } });
        document.dispatchEvent(editEvent);
    }

    showError(message) {
        // Display error message
        Object.values(this.elements).forEach(element => {
            if (element && element.textContent !== undefined) {
                element.textContent = message;
            }
        });
    }
}