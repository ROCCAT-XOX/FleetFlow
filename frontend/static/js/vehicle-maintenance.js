export default class VehicleMaintenance {
    constructor(vehicleId) {
        this.vehicleId = vehicleId;

        // Deaktiviere frühere Instanzen
        if (window._vehicleMaintenanceInstance) {
            window._vehicleMaintenanceInstance.deactivate();
        }
        window._vehicleMaintenanceInstance = this;

        this.active = true;
        this.isSubmitting = false;

        // Verzögerte Initialisierung
        setTimeout(() => {
            if (this.active) {
                this.initializeEventListeners();
            }
        }, 100);
    }

    deactivate() {
        console.log("Deaktiviere frühere VehicleMaintenance-Instanz");
        this.active = false;
        this.removeAllEventListeners();
    }

    removeAllEventListeners() {
        // Entferne alle bekannten Event-Listener
        const addButton = document.getElementById('add-maintenance-btn');
        if (addButton) {
            const newButton = addButton.cloneNode(true);
            addButton.parentNode.replaceChild(newButton, addButton);
        }

        const maintenanceForm = document.getElementById('maintenance-form');
        if (maintenanceForm) {
            // Klonen und ersetzen des Formulars, um alle Event-Listener zu entfernen
            const newForm = maintenanceForm.cloneNode(true);
            maintenanceForm.parentNode.replaceChild(newForm, maintenanceForm);
        }
    }

    initializeEventListeners() {
        console.log("Initialisiere VehicleMaintenance Event-Listener");

        // Entferne zuerst alle existierenden Event-Listener durch Klonen
        this.removeAllEventListeners();

        const addButton = document.getElementById('add-maintenance-btn');
        if (addButton) {
            addButton.onclick = (e) => {
                e.preventDefault();
                if (this.active) this.openAddModal();
                return false;
            };
        }

        // Überschreibe das Formular-Submit-Verhalten direkt
        const maintenanceForm = document.getElementById('maintenance-form');
        if (maintenanceForm) {
            // Entferne den Standard-Submit-Handler
            maintenanceForm.onsubmit = (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (this.active && !this.isSubmitting) {
                    console.log("Wartungsformular-Submission erkannt, rufe Handler auf");
                    this.handleFormSubmission(maintenanceForm);
                } else {
                    console.log("Wartungsformular-Submission blockiert: " +
                        (this.active ? "Bereits in Bearbeitung" : "Instanz inaktiv"));
                }

                return false; // Verhindere Standard-Submit
            };

            // Überschreibe auch jegliche Formular-Buttons
            const submitButtons = maintenanceForm.querySelectorAll('button[type="submit"]');
            submitButtons.forEach(button => {
                button.onclick = (e) => {
                    e.preventDefault();

                    if (this.active && !this.isSubmitting) {
                        console.log("Wartungs-Submit-Button geklickt, rufe Handler auf");
                        this.handleFormSubmission(maintenanceForm);
                    }

                    return false;
                };
            });
        }
    }

    async loadMaintenanceEntries() {
        if (!this.active) return;

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
        if (!tableBody || !this.active) return;

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
                    <button type="button" class="edit-maintenance-btn text-indigo-600 hover:text-indigo-900 mr-3" data-id="${entry.id}">
                        Bearbeiten
                    </button>
                    <button type="button" class="delete-maintenance-btn text-red-600 hover:text-red-900" data-id="${entry.id}">
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

        document.querySelectorAll('.edit-maintenance-btn').forEach(button => {
            button.onclick = (e) => {
                e.preventDefault();
                if (this.active) {
                    const maintenanceId = button.dataset.id;
                    this.openEditModal(maintenanceId);
                }
                return false;
            };
        });

        document.querySelectorAll('.delete-maintenance-btn').forEach(button => {
            button.onclick = (e) => {
                e.preventDefault();
                if (this.active) {
                    const maintenanceId = button.dataset.id;
                    if (confirm('Möchten Sie diesen Wartungseintrag wirklich löschen?')) {
                        this.deleteMaintenance(maintenanceId);
                    }
                }
                return false;
            };
        });
    }

    async deleteMaintenance(maintenanceId) {
        if (!this.active) return;

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
        if (!this.active) return;

        const event = new CustomEvent('openMaintenanceModal', {
            detail: { vehicleId: this.vehicleId }
        });
        document.dispatchEvent(event);
    }

    openEditModal(maintenanceId) {
        if (!this.active) return;

        const event = new CustomEvent('openMaintenanceModal', {
            detail: { vehicleId: this.vehicleId, maintenanceId: maintenanceId }
        });
        document.dispatchEvent(event);
    }

    // Die neue Hauptmethode zur Formularverarbeitung
    async handleFormSubmission(form) {
        if (!this.active || this.isSubmitting) {
            console.log("Wartungsformular-Submission blockiert: " +
                (this.active ? "Bereits in Bearbeitung" : "Instanz inaktiv"));
            return;
        }

        console.log("Verarbeite Wartungsformular-Submission");
        this.isSubmitting = true;

        try {
            const formData = new FormData(form);
            const maintenanceId = formData.get('maintenance-id');
            const isEdit = !!maintenanceId;

            // Erstelle Daten im Format, das der Server erwartet
            const maintenanceData = {
                vehicleId: this.vehicleId,
                date: formData.get('maintenance-date') || '',
                type: formData.get('maintenance-type') || '',
                mileage: parseInt(formData.get('mileage') || '0'),
                cost: parseFloat(formData.get('cost') || '0'),
                workshop: formData.get('workshop') || '',
                notes: formData.get('maintenance-notes') || ''
            };

            console.log('Sende Wartungsdaten an API:', maintenanceData);

            const url = isEdit ? `/api/maintenance/${maintenanceId}` : '/api/maintenance';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(maintenanceData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Fehler beim Speichern der Wartung: ${errorText}`);
            }

            // Schließe das Modal
            const modal = document.getElementById('maintenance-modal');
            if (modal) modal.classList.add('hidden');

            // Warte bevor Tabelle aktualisiert wird
            setTimeout(() => {
                if (this.active) {
                    this.loadMaintenanceEntries();
                }
            }, 500);

            alert(isEdit ? 'Wartungseintrag erfolgreich aktualisiert' : 'Wartungseintrag erfolgreich hinzugefügt');
        } catch (error) {
            console.error('Fehler bei der Wartungsformularverarbeitung:', error);
            alert(error.message);
        } finally {
            this.isSubmitting = false;
        }
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
        if (!tableBody || !this.active) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-red-500">${message}</td>
            </tr>
        `;
    }
}