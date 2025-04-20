// frontend/static/js/vehicle-current-usage.js

export default class VehicleCurrentUsage {
    constructor(vehicleId) {
        this.vehicleId = vehicleId;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const editButton = document.getElementById('edit-current-usage-btn');
        if (editButton) {
            editButton.addEventListener('click', () => this.openEditModal());
        }
    }

    async loadCurrentUsage() {
        try {
            const response = await fetch(`/api/usage/vehicle/${this.vehicleId}`);
            if (!response.ok) throw new Error('Fehler beim Laden der aktuellen Nutzung');

            const data = await response.json();
            const activeUsage = data.usage?.find(usage => usage.status === 'active');

            if (activeUsage) {
                this.displayCurrentUsage(activeUsage);
            } else {
                this.displayNoActiveUsage();
            }
        } catch (error) {
            console.error('Fehler beim Laden der aktuellen Nutzung:', error);
            this.showError('Fehler beim Laden der aktuellen Nutzung');
        }
    }

    displayCurrentUsage(usage) {
        const usageDetails = {
            driver: usage.driverName || 'Nicht zugewiesen',
            department: usage.department || '-',
            startDate: this.formatDateTime(usage.startDate),
            endDate: usage.endDate ? this.formatDateTime(usage.endDate) : 'Nicht festgelegt',
            purpose: usage.purpose || usage.project || '-'
        };

        // Update DOM elements
        const container = document.querySelector('#current-usage .grid');
        if (!container) return;

        container.innerHTML = `
            <div class="sm:col-span-1">
                <dt class="text-sm font-medium text-gray-500">Aktueller Fahrer</dt>
                <dd class="mt-1 text-sm text-gray-900">${usageDetails.driver}</dd>
            </div>
            <div class="sm:col-span-1">
                <dt class="text-sm font-medium text-gray-500">Abteilung</dt>
                <dd class="mt-1 text-sm text-gray-900">${usageDetails.department}</dd>
            </div>
            <div class="sm:col-span-1">
                <dt class="text-sm font-medium text-gray-500">Nutzung seit</dt>
                <dd class="mt-1 text-sm text-gray-900">${usageDetails.startDate}</dd>
            </div>
            <div class="sm:col-span-1">
                <dt class="text-sm font-medium text-gray-500">Geplante Rückgabe</dt>
                <dd class="mt-1 text-sm text-gray-900">${usageDetails.endDate}</dd>
            </div>
            <div class="sm:col-span-2">
                <dt class="text-sm font-medium text-gray-500">Projekt/Zweck</dt>
                <dd class="mt-1 text-sm text-gray-900">${usageDetails.purpose}</dd>
            </div>
        `;
    }

    displayNoActiveUsage() {
        const container = document.querySelector('#current-usage .grid');
        if (!container) return;

        container.innerHTML = `
            <div class="sm:col-span-2 text-center py-4">
                <p class="text-sm text-gray-500">Keine aktive Nutzung vorhanden</p>
            </div>
        `;
    }

    openEditModal() {
        // Trigger the edit current usage modal
        const editEvent = new CustomEvent('editCurrentUsage', { detail: { vehicleId: this.vehicleId } });
        document.dispatchEvent(editEvent);
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showError(message) {
        const container = document.querySelector('#current-usage .grid');
        if (!container) return;

        container.innerHTML = `
            <div class="sm:col-span-2 text-center py-4">
                <p class="text-sm text-red-500">${message}</p>
            </div>
        `;
    }
}