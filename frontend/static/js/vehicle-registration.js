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
    }

    async loadRegistrationInsurance() {
        try {
            const response = await fetch(`/api/vehicles/${this.vehicleId}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Zulassungsdaten');

            const data = await response.json();
            const vehicle = data.vehicle;

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
            const response = await fetch(`/api/vehicles/${this.vehicleId}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Fahrzeugdaten');

            const data = await response.json();
            const vehicle = data.vehicle;

            // Fill form fields
            document.getElementById('registration-date').value = this.formatDateForInput(vehicle.registrationDate);
            document.getElementById('registration-expiry').value = this.formatDateForInput(vehicle.registrationExpiry);
            document.getElementById('next-inspection').value = this.formatDateForInput(vehicle.nextInspectionDate);
            document.getElementById('insurance-company').value = vehicle.insuranceCompany || '';
            document.getElementById('insurance-number').value = vehicle.insuranceNumber || '';
            document.getElementById('insurance-type').value = vehicle.insuranceType || 'Haftpflicht';
            document.getElementById('insurance-expiry').value = this.formatDateForInput(vehicle.insuranceExpiry);
            document.getElementById('insurance-cost').value = vehicle.insuranceCost || '';

            // Add form submit handler
            const form = document.getElementById('registration-form');
            if (form) {
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    await this.handleFormSubmit(form);
                };
            }
        } catch (error) {
            console.error('Fehler beim Laden der Fahrzeugdaten:', error);
            alert('Fehler beim Laden der Fahrzeugdaten');
        }
    }

    async handleFormSubmit(form) {
        const formData = new FormData(form);

        const registrationData = {
            registrationDate: formData.get('registration-date'),
            registrationExpiry: formData.get('registration-expiry'),
            nextInspectionDate: formData.get('next-inspection'),
            insuranceCompany: formData.get('insurance-company'),
            insuranceNumber: formData.get('insurance-number'),
            insuranceType: formData.get('insurance-type'),
            insuranceExpiry: formData.get('insurance-expiry'),
            insuranceCost: parseFloat(formData.get('insurance-cost') || 0)
        };

        try {
            const response = await fetch(`/api/vehicles/${this.vehicleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registrationData)
            });

            if (!response.ok) throw new Error('Fehler beim Speichern');

            // Close modal and reload data
            document.getElementById('registration-modal').classList.add('hidden');
            this.loadRegistrationInsurance();
            alert('Daten erfolgreich gespeichert');
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Speichern der Daten');
        }
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE');
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
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