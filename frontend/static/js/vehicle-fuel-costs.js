// frontend/static/js/vehicle-fuel-costs.js

export default class VehicleFuelCosts {
    constructor(vehicleId) {
        this.vehicleId = vehicleId;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const addButton = document.getElementById('add-vehicle-fuel-cost-btn');
        if (addButton) {
            addButton.addEventListener('click', () => this.openAddModal());
        }
    }

    async loadFuelCosts() {
        try {
            const response = await fetch(`/api/fuelcosts/vehicle/${this.vehicleId}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Tankkosten');

            const data = await response.json();
            this.renderFuelCostsTable(data.fuelCosts || []);
        } catch (error) {
            console.error('Fehler beim Laden der Tankkosten:', error);
            this.showError('Fehler beim Laden der Tankkosten');
        }
    }

    renderFuelCostsTable(fuelCosts) {
        const tableBody = document.getElementById('vehicle-fuel-costs-body');
        if (!tableBody) return;

        if (fuelCosts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-4 text-center text-gray-500">Keine Tankkosten vorhanden</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = fuelCosts.map(entry => `
            <tr class="hover:bg-gray-50">
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                    ${this.formatDate(entry.date)}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    ${entry.fuelType || '-'}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    ${entry.amount} ${entry.fuelType === 'Elektro' ? 'kWh' : 'L'}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    ${this.formatCurrency(entry.pricePerUnit)}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    ${this.formatCurrency(entry.totalCost)}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    ${entry.mileage} km
                </td>
                <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button class="edit-fuel-cost-btn text-indigo-600 hover:text-indigo-900 mr-3" data-id="${entry.id}">
                        Bearbeiten
                    </button>
                    <button class="delete-fuel-cost-btn text-red-600 hover:text-red-900" data-id="${entry.id}">
                        Löschen
                    </button>
                </td>
            </tr>
        `).join('');

        // Add event listeners to edit and delete buttons
        this.attachRowEventListeners();
    }

    attachRowEventListeners() {
        document.querySelectorAll('.edit-fuel-cost-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const fuelCostId = e.target.dataset.id;
                this.openEditModal(fuelCostId);
            });
        });

        document.querySelectorAll('.delete-fuel-cost-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const fuelCostId = e.target.dataset.id;
                if (confirm('Möchten Sie diesen Tankkosteneintrag wirklich löschen?')) {
                    this.deleteFuelCost(fuelCostId);
                }
            });
        });
    }

    async deleteFuelCost(fuelCostId) {
        try {
            const response = await fetch(`/api/fuelcosts/${fuelCostId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Fehler beim Löschen des Tankkosteneintrags');

            this.loadFuelCosts(); // Reload the table
            alert('Tankkosteneintrag erfolgreich gelöscht');
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Löschen des Tankkosteneintrags');
        }
    }

    openAddModal() {
        const event = new CustomEvent('openVehicleFuelCostModal', {
            detail: { vehicleId: this.vehicleId }
        });
        document.dispatchEvent(event);
    }

    openEditModal(fuelCostId) {
        const event = new CustomEvent('openVehicleFuelCostModal', {
            detail: { vehicleId: this.vehicleId, fuelCostId: fuelCostId }
        });
        document.dispatchEvent(event);
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE');
    }

    formatCurrency(amount) {
        if (!amount && amount !== 0) return '-';
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    showError(message) {
        const tableBody = document.getElementById('vehicle-fuel-costs-body');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="py-4 text-center text-red-500">${message}</td>
            </tr>
        `;
    }
}