// frontend/static/js/vehicle-registration.js

export default class VehicleRegistration {
    constructor(vehicleId) {
        this.vehicleId = vehicleId;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const editButton = document.getElementById('edit-registration-btn');
        if (editButton) {
            editButton.addEventListener('click', () => this.openEditModal());
        }

        // Close modal button
        const closeButton = document.getElementById('close-registration-modal-btn');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                const modal = document.getElementById('registration-modal');
                if (modal) modal.classList.add('hidden');
            });
        }
    }

    async loadRegistrationInsurance() {
        try {
            const response = await fetch(`/api/vehicles/${this.vehicleId}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Zulassungsdaten');

            const data = await response.json();
            const vehicle = data.vehicle;

            // Store the current vehicle data
            this.currentVehicle = vehicle;

            // Update display elements
            this.updateDisplayElements(vehicle);
        } catch (error) {
            console.error('Fehler beim Laden der Zulassungsdaten:', error);
            this.showError('Fehler beim Laden der Zulassungsdaten');
        }
    }

    updateDisplayElements(vehicle) {
        const elements = {
            registrationDate: document.getElementById('registration-date-display'),
            registrationExpiry: document.getElementById('registration-expiry-display'),
            nextInspection: document.getElementById('next-inspection-display'),
            insuranceCompany: document.getElementById('insurance-company-display'),
            insuranceNumber: document.getElementById('insurance-number-display'),
            insuranceType: document.getElementById('insurance-type-display'),
            insuranceExpiry: document.getElementById('insurance-expiry-display'),
            insuranceCost: document.getElementById('insurance-cost-display')
        };

        if (elements.registrationDate) {
            elements.registrationDate.textContent = this.formatDate(vehicle.registrationDate);
        }

        if (elements.registrationExpiry) {
            elements.registrationExpiry.textContent = this.formatDate(vehicle.registrationExpiry);
        }

        if (elements.nextInspection) {
            const nextInspectionDate = this.formatDate(vehicle.nextInspectionDate);
            elements.nextInspection.textContent = nextInspectionDate;

            // Highlight if inspection is due soon
            if (vehicle.nextInspectionDate) {
                const dueDate = new Date(vehicle.nextInspectionDate);
                const today = new Date();
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    elements.nextInspection.classList.add('text-red-600', 'font-semibold');
                } else if (diffDays < 30) {
                    elements.nextInspection.classList.add('text-yellow-600', 'font-semibold');
                }
            }
        }

        if (elements.insuranceCompany) {
            elements.insuranceCompany.textContent = vehicle.insuranceCompany || '-';
        }

        if (elements.insuranceNumber) {
            elements.insuranceNumber.textContent = vehicle.insuranceNumber || '-';
        }

        if (elements.insuranceType) {
            elements.insuranceType.textContent = vehicle.insuranceType || '-';
        }

        if (elements.insuranceExpiry) {
            elements.insuranceExpiry.textContent = this.formatDate(vehicle.insuranceExpiry);
        }

        if (elements.insuranceCost) {
            elements.insuranceCost.textContent = vehicle.insuranceCost ?
                this.formatCurrency(vehicle.insuranceCost) : '-';
        }
    }

    openEditModal() {
        const modal = document.getElementById('registration-modal');
        if (!modal) return;

        // Load current vehicle data
        this.loadVehicleDataForModal();
        modal.classList.remove('hidden');
    }

    async loadVehicleDataForModal() {
        try {
            // Ensure current vehicle data is loaded
            if (!this.currentVehicle) {
                await this.loadRegistrationInsurance();
            }

            const vehicle = this.currentVehicle;

            // Fill form fields
            document.getElementById('registration-date').value = this.formatDateForInput(vehicle.registrationDate);
            document.getElementById('registration-expiry').value = this.formatDateForInput(vehicle.registrationExpiry);
            document.getElementById('next-inspection').value = this.formatDateForInput(vehicle.nextInspectionDate);
            document.getElementById('insurance-company').value = vehicle.insuranceCompany || '';
            document.getElementById('insurance-number').value = vehicle.insuranceNumber || '';
            document.getElementById('insurance-type').value = vehicle.insuranceType || 'Haftpflicht';
            document.getElementById('insurance-expiry').value = this.formatDateForInput(vehicle.insuranceExpiry);
            document.getElementById('insurance-cost').value = vehicle.insuranceCost || '';

            // Set up form submission handler
            const form = document.getElementById('registration-form');
            if (form) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    this.handleFormSubmit();
                };
            }
        } catch (error) {
            console.error('Fehler beim Laden der Fahrzeugdaten:', error);
            alert('Fehler beim Laden der Fahrzeugdaten');
        }
    }

    handleFormSubmit() {
        // Get form data
        const form = document.getElementById('registration-form');
        if (!form) return;

        // Disable the submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        // Get the values directly from the form elements
        const regDate = document.getElementById('registration-date').value;
        const regExpiry = document.getElementById('registration-expiry').value;
        const nextInsp = document.getElementById('next-inspection').value;
        const insCompany = document.getElementById('insurance-company').value;
        const insNumber = document.getElementById('insurance-number').value;
        const insType = document.getElementById('insurance-type').value;
        const insExpiry = document.getElementById('insurance-expiry').value;
        const insCost = document.getElementById('insurance-cost').value;

        // Create a request object using current vehicle data as base
        const requestData = {
            licensePlate: this.currentVehicle.licensePlate,
            brand: this.currentVehicle.brand,
            model: this.currentVehicle.model,
            year: this.currentVehicle.year,
            color: this.currentVehicle.color,
            vehicleId: this.currentVehicle.vehicleId,
            vin: this.currentVehicle.vin,
            fuelType: this.currentVehicle.fuelType,
            mileage: this.currentVehicle.mileage,
            status: this.currentVehicle.status,
            currentDriverID: this.currentVehicle.currentDriverID,

            // Registration and insurance fields - send raw strings without processing
            registrationDate: regDate,
            registrationExpiry: regExpiry,
            nextInspectionDate: nextInsp,
            insuranceCompany: insCompany,
            insuranceNumber: insNumber,
            insuranceType: insType,
            insuranceExpiry: insExpiry,
            insuranceCost: parseFloat(insCost) || 0
        };

        console.log('Sending to API:', requestData);

        // Send API request
        fetch(`/api/vehicles/${this.vehicleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
            .then(response => {
                // Parse the response
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Success:', data);

                // Close modal and reload data
                const modal = document.getElementById('registration-modal');
                if (modal) modal.classList.add('hidden');

                // Update the display
                this.loadRegistrationInsurance();

                alert('Daten erfolgreich gespeichert');
            })
            .catch(error => {
                console.error('Error:', error);
                alert(`Fehler beim Speichern: ${error.message}`);
            })
            .finally(() => {
                // Re-enable submit button
                if (submitBtn) submitBtn.disabled = false;
            });
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE');
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Error formatting date for input:', error);
            return '';
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    showError(message) {
        const displayElements = [
            'registration-date-display',
            'registration-expiry-display',
            'next-inspection-display',
            'insurance-company-display',
            'insurance-number-display',
            'insurance-type-display',
            'insurance-expiry-display',
            'insurance-cost-display'
        ];

        displayElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = message;
                element.classList.add('text-red-500');
            }
        });
    }
}