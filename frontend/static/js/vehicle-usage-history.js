export default class VehicleUsageHistory {
    constructor(vehicleId) {
        this.vehicleId = vehicleId;

        // Deaktiviere frühere Instanzen
        if (window._vehicleUsageHistory) {
            window._vehicleUsageHistory.deactivate();
        }
        window._vehicleUsageHistory = this;

        this.active = true;
        this.isSubmitting = false;

        // Initialisierung mit verzögerung um sicherzustellen, dass DOM bereit ist
        setTimeout(() => {
            if (this.active) {
                this.initializeEventListeners();
            }
        }, 100);
    }

    deactivate() {
        console.log("Deaktiviere frühere VehicleUsageHistory-Instanz");
        this.active = false;
        this.removeAllEventListeners();
    }

    removeAllEventListeners() {
        // Entferne alle bekannten Event-Listener
        const addButton = document.getElementById('add-usage-btn');
        if (addButton) {
            const newButton = addButton.cloneNode(true);
            addButton.parentNode.replaceChild(newButton, addButton);
        }

        const usageForm = document.getElementById('usage-form');
        if (usageForm) {
            // Klonen und ersetzen des Formulars, um alle Event-Listener zu entfernen
            const newForm = usageForm.cloneNode(true);
            usageForm.parentNode.replaceChild(newForm, usageForm);
        }
    }

    initializeEventListeners() {
        console.log("Initialisiere VehicleUsageHistory Event-Listener");

        // Entferne zuerst alle existierenden Event-Listener durch Klonen
        this.removeAllEventListeners();

        const addButton = document.getElementById('add-usage-btn');
        if (addButton) {
            addButton.addEventListener('click', () => {
                if (this.active) this.openAddModal();
            });
        }

        // Überschreibe das Formular-Submit-Verhalten direkt
        const usageForm = document.getElementById('usage-form');
        if (usageForm) {
            // Entferne den Standard-Submit-Handler
            usageForm.onsubmit = (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (this.active && !this.isSubmitting) {
                    console.log("Formular-Submission erkannt, rufe Handler auf");
                    this.handleFormSubmission(usageForm);
                } else {
                    console.log("Formular-Submission blockiert: " +
                        (this.active ? "Bereits in Bearbeitung" : "Instanz inaktiv"));
                }

                return false; // Verhindere Standard-Submit
            };

            // Überschreibe auch jegliche Formular-Buttons
            const submitButtons = usageForm.querySelectorAll('button[type="submit"]');
            submitButtons.forEach(button => {
                button.onclick = (e) => {
                    e.preventDefault();

                    if (this.active && !this.isSubmitting) {
                        console.log("Submit-Button geklickt, rufe Handler auf");
                        this.handleFormSubmission(usageForm);
                    }

                    return false;
                };
            });
        }
    }

    async loadUsageHistory() {
        if (!this.active) return;

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
        if (!tableBody || !this.active) return;

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
                    <button type="button" class="edit-usage-btn text-indigo-600 hover:text-indigo-900 mr-3" data-id="${entry.id}">
                        Bearbeiten
                    </button>
                    <button type="button" class="delete-usage-btn text-red-600 hover:text-red-900" data-id="${entry.id}">
                        Löschen
                    </button>
                </td>
            </tr>
        `).join('');

        if (this.active) {
            this.attachRowEventListeners();
        }
    }

    attachRowEventListeners() {
        if (!this.active) return;

        document.querySelectorAll('.edit-usage-btn').forEach(button => {
            button.onclick = (e) => {
                e.preventDefault();
                if (this.active) {
                    const usageId = button.dataset.id;
                    this.openEditModal(usageId);
                }
                return false;
            };
        });

        document.querySelectorAll('.delete-usage-btn').forEach(button => {
            button.onclick = (e) => {
                e.preventDefault();
                if (this.active) {
                    const usageId = button.dataset.id;
                    if (confirm('Möchten Sie diesen Nutzungseintrag wirklich löschen?')) {
                        this.deleteUsage(usageId);
                    }
                }
                return false;
            };
        });
    }

    async deleteUsage(usageId) {
        if (!this.active) return;

        try {
            const response = await fetch(`/api/usage/${usageId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Fehler beim Löschen des Nutzungseintrags');

            this.loadUsageHistory();
            alert('Nutzungseintrag erfolgreich gelöscht');
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Löschen des Nutzungseintrags');
        }
    }

    openAddModal() {
        if (!this.active) return;

        const modal = document.getElementById('usage-modal');
        if (!modal) return;

        // Reset form
        const form = document.getElementById('usage-form');
        if (form) {
            form.reset();

            // Entferne alle versteckten ID-Felder
            const hiddenFields = form.querySelectorAll('input[type="hidden"]');
            hiddenFields.forEach(field => field.remove());
        }

        // Set current date and time as default
        const now = new Date();
        const dateField = document.getElementById('start-date');
        const timeField = document.getElementById('start-time');

        if (dateField) dateField.value = now.toISOString().split('T')[0];
        if (timeField) timeField.value = now.toTimeString().slice(0, 5);

        // Load drivers for dropdown
        this.loadDriversForUsageForm();

        modal.classList.remove('hidden');
    }

    async openEditModal(usageId) {
        if (!this.active) return;

        const modal = document.getElementById('usage-modal');
        if (!modal) return;

        try {
            const response = await fetch(`/api/usage/${usageId}`);
            if (!response.ok) throw new Error('Fehler beim Laden des Nutzungseintrags');

            const data = await response.json();
            const usage = data.usage;

            // Load drivers for dropdown
            await this.loadDriversForUsageForm();

            const form = document.getElementById('usage-form');
            if (form) {
                form.reset();

                // Entferne alle versteckten ID-Felder
                const hiddenFields = form.querySelectorAll('input[type="hidden"]');
                hiddenFields.forEach(field => field.remove());
            }

            // Fill form fields
            if (usage.startDate) {
                const startDateTime = new Date(usage.startDate);
                const dateField = document.getElementById('start-date');
                const timeField = document.getElementById('start-time');

                if (dateField) dateField.value = startDateTime.toISOString().split('T')[0];
                if (timeField) timeField.value = startDateTime.toTimeString().slice(0, 5);
            }

            if (usage.endDate) {
                const endDateTime = new Date(usage.endDate);
                const dateField = document.getElementById('end-date');
                const timeField = document.getElementById('end-time');

                if (dateField) dateField.value = endDateTime.toISOString().split('T')[0];
                if (timeField) timeField.value = endDateTime.toTimeString().slice(0, 5);
            }

            const driverField = document.getElementById('driver');
            if (driverField && usage.driverId) driverField.value = usage.driverId;

            const projectField = document.getElementById('project');
            if (projectField) projectField.value = usage.purpose || usage.project || '';

            const startMileageField = document.getElementById('start-mileage');
            if (startMileageField) startMileageField.value = usage.startMileage || '';

            const endMileageField = document.getElementById('end-mileage');
            if (endMileageField) endMileageField.value = usage.endMileage || '';

            const notesField = document.getElementById('usage-notes');
            if (notesField) notesField.value = usage.notes || '';

            // Add usage ID to form for editing
            const idInput = document.createElement('input');
            idInput.type = 'hidden';
            idInput.id = 'usage-id';
            idInput.name = 'usage-id';
            idInput.value = usageId;
            document.getElementById('usage-form').appendChild(idInput);

            modal.classList.remove('hidden');
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Laden des Nutzungseintrags');
        }
    }

    // Die neue Hauptmethode zur Formularverarbeitung
    async handleFormSubmission(form) {
        if (!this.active || this.isSubmitting) {
            console.log("Formular-Submission blockiert: " +
                (this.active ? "Bereits in Bearbeitung" : "Instanz inaktiv"));
            return;
        }

        console.log("Verarbeite Formular-Submission");
        this.isSubmitting = true;

        try {
            const formData = new FormData(form);
            const usageId = formData.get('usage-id');
            const isEdit = !!usageId;

            // Erstelle Daten im Format, das der Server erwartet
            const usageData = {
                vehicleId: this.vehicleId,
                driverId: formData.get('driver') || '',
                startDate: formData.get('start-date') || '',
                startTime: formData.get('start-time') || '00:00',
                endDate: formData.get('end-date') || '',
                endTime: formData.get('end-time') || '00:00',
                startMileage: parseInt(formData.get('start-mileage') || '0'),
                endMileage: parseInt(formData.get('end-mileage') || '0'),
                purpose: formData.get('project') || '',
                notes: formData.get('usage-notes') || '',
                status: formData.get('end-date') ? 'completed' : 'active'
            };

            console.log('Sende Nutzungsdaten an API:', usageData);

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

            // Schließe das Modal
            const modal = document.getElementById('usage-modal');
            if (modal) modal.classList.add('hidden');

            // Warte bevor Tabelle aktualisiert wird
            setTimeout(() => {
                if (this.active) {
                    this.loadUsageHistory();
                }
            }, 500);

            alert(isEdit ? 'Nutzung erfolgreich aktualisiert' : 'Nutzung erfolgreich hinzugefügt');
        } catch (error) {
            console.error('Fehler bei der Formularverarbeitung:', error);
            alert(error.message);
        } finally {
            this.isSubmitting = false;
        }
    }

    async loadDriversForUsageForm() {
        if (!this.active) return;

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
        if (!tableBody || !this.active) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-red-500">${message}</td>
            </tr>
        `;
    }
}