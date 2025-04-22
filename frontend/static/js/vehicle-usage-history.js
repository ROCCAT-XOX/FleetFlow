export default class VehicleUsageHistory {
    constructor(vehicleId) {
        this.vehicleId = vehicleId;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const addButton = document.getElementById('add-usage-btn');
        if (addButton) {
            addButton.addEventListener('click', () => this.openAddModal());
        }

        // Formular-Eventlistener für Nutzungseinträge
        const usageForm = document.getElementById('usage-form');
        if (usageForm) {
            usageForm.addEventListener('submit', (e) => this.handleUsageFormSubmit(e));
        }
    }

    async loadUsageHistory() {
        try {
            const response = await fetch(`/api/usage/vehicle/${this.vehicleId}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Nutzungshistorie');

            const data = await response.json();
            this.renderUsageTable(data.usage || []);
        } catch (error) {
            console.error('Fehler beim Laden der Nutzungshistorie:', error);
            this.showError('Fehler beim Laden der Nutzungshistorie');
        }
    }

    renderUsageTable(usageEntries) {
        const tableBody = document.getElementById('usage-table-body');
        if (!tableBody) return;

        if (usageEntries.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-center text-gray-500">Keine Nutzungseinträge vorhanden</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = usageEntries.map(entry => `
            <tr class="hover:bg-gray-50">
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    ${this.formatTimeRange(entry.startDate, entry.endDate)}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    ${entry.driverName || 'Nicht zugewiesen'}
                </td>
                <td class="px-3 py-4 text-sm text-gray-900">
                    ${entry.purpose || entry.project || '-'}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    ${this.formatMileageRange(entry.startMileage, entry.endMileage)}
                </td>
                <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button class="edit-usage-btn text-indigo-600 hover:text-indigo-900 mr-3" data-id="${entry.id}">
                        Bearbeiten
                    </button>
                    <button class="delete-usage-btn text-red-600 hover:text-red-900" data-id="${entry.id}">
                        Löschen
                    </button>
                </td>
            </tr>
        `).join('');

        this.attachRowEventListeners();
    }

    attachRowEventListeners() {
        document.querySelectorAll('.edit-usage-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const usageId = e.target.dataset.id;
                this.openEditModal(usageId);
            });
        });

        document.querySelectorAll('.delete-usage-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const usageId = e.target.dataset.id;
                if (confirm('Möchten Sie diesen Nutzungseintrag wirklich löschen?')) {
                    this.deleteUsage(usageId);
                }
            });
        });
    }

    async deleteUsage(usageId) {
        try {
            const response = await fetch(`/api/usage/${usageId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Fehler beim Löschen des Nutzungseintrags');

            this.loadUsageHistory(); // Reload the table
            alert('Nutzungseintrag erfolgreich gelöscht');
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Löschen des Nutzungseintrags');
        }
    }

    openAddModal() {
        const modal = document.getElementById('usage-modal');
        if (!modal) return;

        // Reset form
        const form = document.getElementById('usage-form');
        if (form) form.reset();

        // Set current date and time as default
        const now = new Date();
        const dateField = document.getElementById('start-date');
        const timeField = document.getElementById('start-time');

        if (dateField) dateField.value = now.toISOString().split('T')[0];
        if (timeField) timeField.value = now.toTimeString().slice(0, 5);

        // Remove any existing hidden ID field
        const existingIdField = document.getElementById('usage-id');
        if (existingIdField) existingIdField.remove();

        // Load drivers for dropdown
        this.loadDriversForUsageForm();

        modal.classList.remove('hidden');
    }

    async openEditModal(usageId) {
        const modal = document.getElementById('usage-modal');
        if (!modal) return;

        try {
            const response = await fetch(`/api/usage/${usageId}`);
            if (!response.ok) throw new Error('Fehler beim Laden des Nutzungseintrags');

            const data = await response.json();
            const usage = data.usage;

            // Load drivers for dropdown
            await this.loadDriversForUsageForm();

            // Fill form fields
            const startDateTime = new Date(usage.startDate);
            document.getElementById('start-date').value = startDateTime.toISOString().split('T')[0];
            document.getElementById('start-time').value = startDateTime.toTimeString().slice(0, 5);

            if (usage.endDate) {
                const endDateTime = new Date(usage.endDate);
                document.getElementById('end-date').value = endDateTime.toISOString().split('T')[0];
                document.getElementById('end-time').value = endDateTime.toTimeString().slice(0, 5);
            }

            document.getElementById('driver').value = usage.driverId || '';
            document.getElementById('project').value = usage.purpose || usage.project || '';
            document.getElementById('start-mileage').value = usage.startMileage || '';
            document.getElementById('end-mileage').value = usage.endMileage || '';
            document.getElementById('usage-notes').value = usage.notes || '';

            // Add usage ID to form for editing
            let idInput = document.getElementById('usage-id');
            if (!idInput) {
                idInput = document.createElement('input');
                idInput.type = 'hidden';
                idInput.id = 'usage-id';
                idInput.name = 'usage-id';
                document.getElementById('usage-form').appendChild(idInput);
            }
            idInput.value = usageId;

            modal.classList.remove('hidden');
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Laden des Nutzungseintrags');
        }
    }
    // Event-Listener für das Formular hinzufügen

    // Event-Listener für das Formular hinzufügen

    if (usageForm) {
        usageForm.addEventListener('submit', (e) => this.handleUsageFormSubmit(e));
    }

    // Methode zur Verarbeitung des Nutzungsformulars
    async handleUsageFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const usageId = formData.get('usage-id');
        const isEdit = !!usageId;

        // Datum und Uhrzeit extrahieren
        const startDate = formData.get('start-date') || '';
        const startTime = formData.get('start-time') || '';
        const endDate = formData.get('end-date') || '';
        const endTime = formData.get('end-time') || '';

        // Validierung
        if (!startDate || !startTime) {
            alert('Bitte geben Sie ein gültiges Startdatum und eine Startzeit ein');
            return;
        }

        // Erstelle das Datenobjekt gemäß API-Anforderungen
        const usageData = {
            vehicleId: this.vehicleId,
            driverId: formData.get('driver') || '',
            startDate: startDate,
            startTime: startTime,
            endDate: endDate || '',
            endTime: endTime || '',
            startMileage: formData.get('start-mileage') ? parseInt(formData.get('start-mileage')) : 0,
            endMileage: formData.get('end-mileage') ? parseInt(formData.get('end-mileage')) : 0,
            purpose: formData.get('project') || '',
            notes: formData.get('usage-notes') || ''
        };

        console.log('Nutzungsdaten zum Senden:', usageData);

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

            // Schließe das Modal und lade die Tabelle neu
            const modal = document.getElementById('usage-modal');
            if (modal) modal.classList.add('hidden');
            this.loadUsageHistory();
            alert(isEdit ? 'Nutzung erfolgreich aktualisiert' : 'Nutzung erfolgreich hinzugefügt');
        } catch (error) {
            console.error('Fehler:', error);
            alert(error.message);
        }
    }

    async loadDriversForUsageForm() {
        try {
            const response = await fetch('/api/drivers');
            if (!response.ok) throw new Error('Fehler beim Laden der Fahrer');

            const data = await response.json();
            const drivers = data.drivers || [];

            const select = document.getElementById('driver');
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

    formatTimeRange(startDate, endDate) {
        const start = new Date(startDate);
        const formattedStart = start.toLocaleString('de-DE');

        if (!endDate) {
            return `Seit ${formattedStart}`;
        }

        const end = new Date(endDate);
        const formattedEnd = end.toLocaleString('de-DE');
        return `${formattedStart} - ${formattedEnd}`;
    }

    formatMileageRange(startMileage, endMileage) {
        if (!startMileage) return '-';
        if (!endMileage) return `Ab ${startMileage} km`;

        const distance = endMileage - startMileage;
        return `${startMileage} - ${endMileage} km (${distance} km)`;
    }

    showError(message) {
        const tableBody = document.getElementById('usage-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-red-500">${message}</td>
            </tr>
        `;
    }
}