// frontend/static/js/vehicle-maintenance.js

export default class VehicleMaintenance {
    constructor(vehicleId) {
        this.vehicleId = vehicleId;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const addButton = document.getElementById('add-maintenance-btn');
        if (addButton) {
            addButton.addEventListener('click', () => this.openAddModal());
        }
    }

    async loadMaintenanceEntries() {
        try {
            const response = await fetch(`/api/maintenance/vehicle/${this.vehicleId}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Wartungsdaten');

            const data = await response.json();
            this.renderMaintenanceTable(data.maintenance || []);
        } catch (error) {
            console.error('Fehler beim Laden der Wartungsdaten:', error);
            this.showError('Fehler beim Laden der Wartungsdaten');
        }
    }

    renderMaintenanceTable(maintenanceEntries) {
        const tableBody = document.getElementById('maintenance-table-body');
        if (!tableBody) return;

        if (maintenanceEntries.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-center text-gray-500">Keine Wartungseinträge vorhanden</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = maintenanceEntries.map(entry => `
            <tr class="hover:bg-gray-50">
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                    ${this.formatDate(entry.date)}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    ${this.getMaintenanceTypeText(entry.type)}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    ${entry.mileage} km
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    ${this.formatCurrency(entry.cost)}
                </td>
                <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                    <button class="edit-maintenance-btn text-indigo-600 hover:text-indigo-900 mr-3" data-id="${entry.id}">
                        Bearbeiten
                    </button>
                    <button class="delete-maintenance-btn text-red-600 hover:text-red-900" data-id="${entry.id}">
                        Löschen
                    </button>
                </td>
            </tr>
        `).join('');

        // Add event listeners to edit and delete buttons
        this.attachRowEventListeners();
    }

    attachRowEventListeners() {
        document.querySelectorAll('.edit-maintenance-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const maintenanceId = e.target.dataset.id;
                this.openEditModal(maintenanceId);
            });
        });

        document.querySelectorAll('.delete-maintenance-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const maintenanceId = e.target.dataset.id;
                if (confirm('Möchten Sie diesen Wartungseintrag wirklich löschen?')) {
                    this.deleteMaintenance(maintenanceId);
                }
            });
        });
    }

    async deleteMaintenance(maintenanceId) {
        try {
            const response = await fetch(`/api/maintenance/${maintenanceId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Fehler beim Löschen des Wartungseintrags');

            this.loadMaintenanceEntries(); // Reload the table
            alert('Wartungseintrag erfolgreich gelöscht');
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Löschen des Wartungseintrags');
        }
    }

    openAddModal() {
        const event = new CustomEvent('openMaintenanceModal', {
            detail: { vehicleId: this.vehicleId }
        });
        document.dispatchEvent(event);
    }

    openEditModal(maintenanceId) {
        const event = new CustomEvent('openMaintenanceModal', {
            detail: { vehicleId: this.vehicleId, maintenanceId: maintenanceId }
        });
        document.dispatchEvent(event);
    }

    getMaintenanceTypeText(type) {
        switch (type) {
            case 'inspection':
                return 'Inspektion';
            case 'oil-change':
                return 'Ölwechsel';
            case 'tire-change':
                return 'Reifenwechsel';
            case 'repair':
                return 'Reparatur';
            case 'other':
                return 'Sonstiges';
            default:
                return type;
        }
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
        const tableBody = document.getElementById('maintenance-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-red-500">${message}</td>
            </tr>
        `;
    }
}