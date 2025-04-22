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

        // Event-Listener für das Öffnen des Modals
        document.addEventListener('openCurrentUsageModal', (e) => {
            if (e.detail.vehicleId === this.vehicleId) {
                this.openEditCurrentUsageModal();
            }
        });

        // Event-Listener für das Formular
        const usageForm = document.getElementById('edit-current-usage-form');
        if (usageForm) {
            usageForm.addEventListener('submit', (e) => this.handleCurrentUsageFormSubmit(e));
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
                this.currentUsageData = activeUsage; // Speichere die aktuelle Nutzung für spätere Bearbeitungen
            } else {
                this.displayNoActiveUsage();
                this.currentUsageData = null;
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
        this.openEditCurrentUsageModal();
    }

    async openEditCurrentUsageModal() {
        const modal = document.getElementById('edit-current-usage-modal');
        if (!modal) return;

        const form = document.getElementById('edit-current-usage-form');
        if (form) form.reset();

        try {
            // Lade aktuelle Fahrer
            await this.loadDriversForEditModal();

            if (this.currentUsageData) {
                // Befülle das Formular mit den aktuellen Daten
                this.fillEditUsageForm(this.currentUsageData);
            } else {
                // Setze Defaults für neue Nutzung
                const now = new Date();
                const dateField = document.getElementById('current-usage-start-date');
                const timeField = document.getElementById('current-usage-start-time');

                if (dateField) dateField.value = now.toISOString().split('T')[0];
                if (timeField) timeField.value = now.toTimeString().slice(0, 5);

                // Entferne ID-Feld, falls vorhanden
                const idInput = form.querySelector('input[name="usage-id"]');
                if (idInput) idInput.remove();
            }

            modal.classList.remove('hidden');
        } catch (error) {
            console.error('Fehler beim Öffnen des Modals:', error);
            alert('Fehler beim Laden der Daten');
        }
    }

    async loadDriversForEditModal() {
        try {
            const response = await fetch('/api/drivers');
            if (!response.ok) throw new Error('Fehler beim Laden der Fahrer');

            const data = await response.json();
            const drivers = data.drivers || [];

            const select = document.getElementById('current-usage-driver');
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

    fillEditUsageForm(usage) {
        // Startdatum
        if (usage.startDate) {
            const startDateTime = new Date(usage.startDate);
            document.getElementById('current-usage-start-date').value = startDateTime.toISOString().split('T')[0];
            document.getElementById('current-usage-start-time').value = startDateTime.toTimeString().slice(0, 5);
        }

        // Enddatum
        if (usage.endDate) {
            const endDateTime = new Date(usage.endDate);
            document.getElementById('current-usage-end-date').value = endDateTime.toISOString().split('T')[0];
            document.getElementById('current-usage-end-time').value = endDateTime.toTimeString().slice(0, 5);
        }

        // Fahrer
        if (usage.driverId) {
            document.getElementById('current-usage-driver').value = usage.driverId;
        }

        // Weitere Felder
        document.getElementById('current-usage-project').value = usage.purpose || usage.project || '';
        document.getElementById('current-usage-start-mileage').value = usage.startMileage || '';
        document.getElementById('current-usage-notes').value = usage.notes || '';

        // ID für die Bearbeitung hinzufügen
        let idInput = document.querySelector('#edit-current-usage-form input[name="usage-id"]');
        if (!idInput) {
            idInput = document.createElement('input');
            idInput.type = 'hidden';
            idInput.name = 'usage-id';
            document.getElementById('edit-current-usage-form').appendChild(idInput);
        }
        idInput.value = usage.id;
    }

    if (usageForm) {
        usageForm.addEventListener('submit', (e) => this.handleCurrentUsageFormSubmit(e));
    }


    async handleCurrentUsageFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const usageId = formData.get('usage-id');
        const isEdit = !!usageId;

        // Datum und Uhrzeit korrekt kombinieren
        const startDate = formData.get('current-usage-start-date');
        const startTime = formData.get('current-usage-start-time');
        const startDateTime = startDate && startTime ? `${startDate}T${startTime}:00` : null;

        let endDateTime = null;
        const endDate = formData.get('current-usage-end-date');
        const endTime = formData.get('current-usage-end-time');
        if (endDate && endTime) {
            endDateTime = `${endDate}T${endTime}:00`;
        }

        // Erstelle das Datenobjekt
        const usageData = {
            vehicleId: this.vehicleId,
            driverId: formData.get('current-usage-driver') || null,
            startTime: startDateTime,
            endTime: endDateTime,
            startMileage: formData.get('current-usage-start-mileage') ? parseInt(formData.get('current-usage-start-mileage')) : null,
            purpose: formData.get('current-usage-project') || null,
            notes: formData.get('current-usage-notes') || null,
            status: 'active'
        };

        console.log('Aktuelle Nutzungsdaten zum Senden:', usageData);

        try {
            const url = isEdit ? `/api/usage/${usageId}` : '/api/usage';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(usageData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Fehler beim Speichern der Nutzung: ${errorText}`);
            }

            // Schließe das Modal und lade die aktuelle Nutzung neu
            const modal = document.getElementById('edit-current-usage-modal');
            if (modal) modal.classList.add('hidden');
            this.loadCurrentUsage();
            alert(isEdit ? 'Nutzung erfolgreich aktualisiert' : 'Nutzung erfolgreich hinzugefügt');
        } catch (error) {
            console.error('Fehler:', error);
            alert(error.message);
        }
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