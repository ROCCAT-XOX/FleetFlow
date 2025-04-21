// frontend/static/js/vehicles.js
import { carManufacturers } from './car-manufacturers.js';
// Funktion zum Speichern eines Fahrzeugs (Erstellen oder Aktualisieren)
function saveVehicle(vehicleData, isEdit = false) {
    console.log('Zu speichernde Fahrzeugdaten:', vehicleData);

    const url = isEdit ? `/api/vehicles/${vehicleData.id}` : '/api/vehicles';
    const method = isEdit ? 'PUT' : 'POST';

    // Sicherstellen, dass brand korrekt gesetzt ist
    const brand = vehicleData.vehicle_brand || vehicleData.brand;
    if (!brand) {
        throw new Error('Marke muss ausgewählt werden');
    }

    const requestData = {
        licensePlate: vehicleData.license || vehicleData.licensePlate || '',
        brand: brand,  // Verwendet die korrigierte Marke
        model: vehicleData.model || '',
        year: parseInt(vehicleData.year || 0),
        color: vehicleData.color || '',
        vin: vehicleData.vin || '',
        fuelType: vehicleData['fuel-type'] || vehicleData.fuelType || '',
        mileage: parseInt(vehicleData.mileage || 0),
        status: vehicleData.status || 'available',
        vehicleId: vehicleData.vehicleId || vehicleData.vehicle_id || '',
        registrationDate: vehicleData['registration-date'] || null,
        registrationExpiry: vehicleData['registration-expiry'] || null,
        insuranceCompany: vehicleData['insurance-company'] || vehicleData.insuranceCompany || '',
        insuranceNumber: vehicleData['insurance-policy'] || vehicleData.insuranceNumber || '',
        insuranceType: vehicleData['insurance-type'] || vehicleData.insuranceType || '',
        insuranceExpiry: vehicleData['insurance-expiry'] || null,
        nextInspectionDate: vehicleData['next-inspection'] || null,
        currentDriverId: vehicleData['assigned-driver'] || null
    };

    if (isEdit && (!requestData.vehicleId || requestData.vehicleId.trim() === '')) {
        delete requestData.vehicleId;
    }

    console.log('Anfrage an API:', JSON.stringify(requestData, null, 2));

    return fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    })
        .then(response => {
            console.log('API Response Status:', response.status);
            return response.text().then(text => {
                try {
                    const jsonResponse = JSON.parse(text);
                    console.log('API Response Body:', jsonResponse);

                    if (!response.ok) {
                        throw new Error('Fehler beim Speichern des Fahrzeugs: ' + text);
                    }

                    return jsonResponse;
                } catch (e) {
                    console.log('API Raw Response:', text);
                    if (!response.ok) {
                        throw new Error('Fehler beim Speichern des Fahrzeugs: ' + text);
                    }
                    return {};
                }
            });
        });
}

// Funktion zum Initialisieren des Marken-Dropdowns
function initializeBrandDropdown() {
    const brandSelect = document.getElementById('vehicle_brand');
    if (brandSelect) {
        brandSelect.innerHTML = '<option value="">Marke auswählen</option>';

        carManufacturers.forEach(manufacturer => {
            const option = document.createElement('option');
            option.value = manufacturer.name;
            option.textContent = manufacturer.name;
            brandSelect.appendChild(option);
        });
    } else {
        console.error('Brand Select Element nicht gefunden!');
    }
}

// Funktion zum Löschen eines Fahrzeugs
function deleteVehicle(vehicleId) {
    return fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Löschen des Fahrzeugs');
            }
            return response.json();
        });
}

// Funktion zum Laden der Fahrer mit einer verbesserten Methode zum Setzen des ausgewählten Fahrers
function loadDriversForVehicleAssignment(currentDriverId = null) {
    console.log('Lade Fahrer für Fahrzeugzuordnung, aktueller Fahrer ID:', currentDriverId);

    return fetch('/api/drivers')
        .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Laden der Fahrer');
            }
            return response.json();
        })
        .then(data => {
            const drivers = data.drivers || [];
            console.log('Geladene Fahrer für Zuweisung:', drivers);

            const assignedDriverSelect = document.getElementById('assigned-driver');
            if (!assignedDriverSelect) {
                console.error('Select-Element für Fahrerzuweisung nicht gefunden');
                return;
            }

            assignedDriverSelect.innerHTML = '';

            const noDriverOption = document.createElement('option');
            noDriverOption.value = '';
            noDriverOption.textContent = 'Keinen Fahrer zuweisen';
            assignedDriverSelect.appendChild(noDriverOption);

            drivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = `${driver.firstName} ${driver.lastName}`;
                assignedDriverSelect.appendChild(option);
            });

            if (currentDriverId) {
                console.log('Alle verfügbaren Optionen im Dropdown:');
                Array.from(assignedDriverSelect.options).forEach((option, index) => {
                    console.log(`Option ${index}: value='${option.value}', text='${option.textContent}'`);
                });

                const normalizedCurrentDriverId = currentDriverId.toString().trim();
                console.log('Normalisierte CurrentDriverId:', normalizedCurrentDriverId);

                assignedDriverSelect.value = normalizedCurrentDriverId;

                if (assignedDriverSelect.value !== normalizedCurrentDriverId) {
                    console.warn('Automatische Auswahl fehlgeschlagen, versuche manuelle Suche.');

                    for (let i = 0; i < assignedDriverSelect.options.length; i++) {
                        const option = assignedDriverSelect.options[i];
                        const optionValue = option.value.toString().trim();

                        console.log(`Vergleiche Option ${i}: '${optionValue}' mit '${normalizedCurrentDriverId}'`);

                        if (optionValue === normalizedCurrentDriverId) {
                            console.log(`Match gefunden bei Option ${i}, setze selectedIndex`);
                            assignedDriverSelect.selectedIndex = i;
                            break;
                        }
                    }
                }

                console.log('Finale Auswahl im Dropdown:', assignedDriverSelect.value);
            }

            return drivers;
        })
        .catch(error => {
            console.error('Fehler beim Laden der Fahrer:', error);
        });
}

// Funktion zum Laden aller Fahrzeuge für die Übersicht
function loadVehicles() {
    return fetch('/api/vehicles')
        .then(response => {
            if (!response.ok) {
                throw new Error('Fehler beim Laden der Fahrzeuge');
            }
            return response.json();
        })
        .then(data => {
            const vehicles = data.vehicles || [];
            console.log('Geladene Fahrzeugdaten:', vehicles);

            if (!vehicles.some(v => v.currentDriverId)) {
                renderVehicles(vehicles);
                return;
            }

            return fetch('/api/drivers')
                .then(response => {
                    if (!response.ok) {
                        renderVehicles(vehicles);
                        return;
                    }
                    return response.json();
                })
                .then(driversData => {
                    if (!driversData || !driversData.drivers) {
                        renderVehicles(vehicles);
                        return;
                    }

                    const driversMap = {};
                    driversData.drivers.forEach(driver => {
                        driversMap[driver.id] = driver;
                    });

                    console.log('Fahrer-Lookup-Tabelle:', driversMap);

                    const enrichedVehicles = vehicles.map(vehicle => {
                        if (vehicle.currentDriverId && driversMap[vehicle.currentDriverId]) {
                            const driver = driversMap[vehicle.currentDriverId];
                            vehicle.driverName = `${driver.firstName} ${driver.lastName}`;
                        }
                        return vehicle;
                    });

                    renderVehicles(enrichedVehicles);
                })
                .catch(error => {
                    console.error('Fehler beim Laden der Fahrer:', error);
                    renderVehicles(vehicles);
                });
        })
        .catch(error => {
            console.error('Fehler:', error);
            const container = document.querySelector('.grid');
            if (container) {
                container.innerHTML = `
                    <div class="col-span-full p-4 bg-red-50 text-red-700 rounded-lg">
                        <p>Fehler beim Laden der Fahrzeuge: ${error.message}</p>
                    </div>
                `;
            }
        });
}

// Funktion zum Rendern der Fahrzeuge in der Übersicht
function renderVehicles(vehicles) {
    if (!vehicles || !Array.isArray(vehicles)) {
        vehicles = [];
    }

    const container = document.querySelector('.grid.grid-cols-1.gap-6');
    if (!container) {
        console.error('Container für Fahrzeuge nicht gefunden');
        return;
    }

    container.innerHTML = '';

    if (vehicles.length === 0) {
        container.innerHTML = `
            <div class="col-span-full p-4 bg-gray-50 text-gray-500 rounded-lg text-center">
                <p>Keine Fahrzeuge gefunden.</p>
            </div>
        `;
        return;
    }

    vehicles.forEach(vehicle => {
        let statusClass, statusText;

        switch (vehicle.status) {
            case 'available':
                statusClass = 'bg-green-100 text-green-800';
                statusText = 'Verfügbar';
                break;
            case 'inuse':
                statusClass = 'bg-red-100 text-red-800';
                statusText = 'In Benutzung';
                break;
            case 'maintenance':
                statusClass = 'bg-yellow-100 text-yellow-800';
                statusText = 'In Wartung';
                break;
            default:
                statusClass = 'bg-gray-100 text-gray-800';
                statusText = vehicle.status || 'Unbekannt';
        }

        const card = document.createElement('div');
        card.className = 'bg-white overflow-hidden shadow rounded-lg';
        card.innerHTML = `
            <div class="p-5">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">${vehicle.brand || ''} ${vehicle.model || ''}</h3>
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                <div class="mt-3 grid grid-cols-3 gap-3 text-sm text-gray-500">
                    <div>
                        <span class="block font-medium text-gray-700">Kennzeichen</span>
                        <span>${vehicle.licensePlate || ''}</span>
                    </div>
                    <div>
                        <span class="block font-medium text-gray-700">Baujahr</span>
                        <span>${vehicle.year || ''}</span>
                    </div>
                    <div>
                        <span class="block font-medium text-gray-700">Fahrer</span>
                        <span>${vehicle.driverName || vehicle.currentDriverId ? vehicle.driverName : 'Nicht zugewiesen'}</span>
                    </div>
                </div>
            </div>
            <div class="border-t border-gray-200 px-5 py-3 bg-gray-50 flex justify-end space-x-3">
                <button type="button" class="edit-vehicle-btn inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" data-id="${vehicle.id}">
                    <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Bearbeiten
                </button>
                <a href="/vehicle-details/${vehicle.id}" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Details
                </a>
            </div>
        `;

        container.appendChild(card);
    });

    document.querySelectorAll('.edit-vehicle-btn').forEach(button => {
        button.addEventListener('click', function() {
            const vehicleId = this.dataset.id;
            openVehicleModal(true, vehicleId);
        });
    });
}

// Funktion zum Öffnen des Fahrzeug-Modals mit vorausgefüllten Daten bei Bearbeitung
function openVehicleModal(isEdit = false, vehicleId = null) {
    const modal = document.getElementById('vehicle-modal');
    const modalTitle = document.getElementById('modal-title');
    const vehicleForm = document.getElementById('vehicle-form');

    if (!modal || !modalTitle || !vehicleForm) {
        console.error('Modal-Elemente nicht gefunden');
        return;
    }

    modal.classList.remove('hidden');

    // Marken-Dropdown initialisieren
    initializeBrandDropdown();

    document.querySelectorAll('.tab-btn').forEach(button => {
        if (button.dataset.tab === 'vehicle-data') {
            button.click();
        }
    });

    if (isEdit && vehicleId) {
        modalTitle.textContent = 'Fahrzeug bearbeiten';

        fetch(`/api/vehicles/${vehicleId}`)
            .then(response => response.json())
            .then(data => {
                const vehicle = data.vehicle;
                console.log('Geladene Fahrzeugdaten für Bearbeitung:', vehicle);

                if (!vehicle) {
                    throw new Error('Fahrzeugdaten nicht gefunden');
                }

                // Prüfe, ob alle Elements existieren, bevor Werte gesetzt werden
                const setElementValue = (id, value) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.value = value || '';
                    } else {
                        console.warn(`Element mit ID "${id}" nicht gefunden`);
                    }
                };

                // Fahrzeugdaten in Formular eintragen
                setElementValue('vehicle_brand', vehicle.brand);
                setElementValue('model', vehicle.model);
                setElementValue('year', vehicle.year);
                setElementValue('license', vehicle.licensePlate);
                setElementValue('color', vehicle.color);
                setElementValue('vin', vehicle.vin);
                setElementValue('fuel-type', vehicle.fuelType);
                setElementValue('mileage', vehicle.mileage);
                setElementValue('registration-date', formatDateForInput(vehicle.registrationDate));
                setElementValue('registration-expiry', formatDateForInput(vehicle.registrationExpiry));
                setElementValue('insurance-company', vehicle.insuranceCompany);
                setElementValue('insurance-policy', vehicle.insuranceNumber);
                setElementValue('insurance-type', vehicle.insuranceType);
                setElementValue('insurance-expiry', formatDateForInput(vehicle.insuranceExpiry));
                setElementValue('next-inspection', formatDateForInput(vehicle.nextInspectionDate));
                setElementValue('status', vehicle.status);

                const currentDriverId = vehicle.currentDriverId ? vehicle.currentDriverId.toString() : '';
                console.log('Zugewiesener Fahrer ID:', currentDriverId);

                const driverTab = document.getElementById('driver-assignment');
                if (driverTab) {
                    document.querySelectorAll('.tab-btn').forEach(button => {
                        if (button.dataset.tab === 'driver-assignment') {
                            button.click();
                        }
                    });

                    loadDriversForVehicleAssignment(currentDriverId)
                        .then(() => {
                            setTimeout(() => {
                                const assignedDriverSelect = document.getElementById('assigned-driver');
                                if (assignedDriverSelect && currentDriverId) {
                                    console.log('Zusätzlicher Versuch, den Fahrer zu setzen:', currentDriverId);
                                    assignedDriverSelect.value = currentDriverId;

                                    if (assignedDriverSelect.value !== currentDriverId) {
                                        const event = new Event('change', { bubbles: true });
                                        assignedDriverSelect.dispatchEvent(event);
                                        console.log('Nach Event-Auslösung:', assignedDriverSelect.value);
                                    }
                                }
                            }, 200);

                            document.querySelectorAll('.tab-btn').forEach(button => {
                                if (button.dataset.tab === 'vehicle-data') {
                                    button.click();
                                }
                            });
                        });
                }

                let idInput = vehicleForm.querySelector('input[name="id"]');
                if (!idInput) {
                    idInput = document.createElement('input');
                    idInput.type = 'hidden';
                    idInput.name = 'id';
                    vehicleForm.appendChild(idInput);
                }
                idInput.value = vehicleId;
            })
            .catch(error => {
                console.error('Fehler beim Laden des Fahrzeugs:', error);
                closeVehicleModal();
                alert('Fehler beim Laden des Fahrzeugs: ' + error.message);
            });
    } else {
        modalTitle.textContent = 'Fahrzeug hinzufügen';
        vehicleForm.reset();

        const driverTab = document.getElementById('driver-assignment');
        if (driverTab) {
            document.querySelectorAll('.tab-btn').forEach(button => {
                if (button.dataset.tab === 'driver-assignment') {
                    button.click();
                }
            });

            setTimeout(() => {
                loadDriversForVehicleAssignment();

                document.querySelectorAll('.tab-btn').forEach(button => {
                    if (button.dataset.tab === 'vehicle-data') {
                        button.click();
                    }
                });
            }, 100);
        }

        const existingIdInput = vehicleForm.querySelector('input[name="id"]');
        if (existingIdInput) {
            existingIdInput.remove();
        }
    }
}

// Funktion zum Schließen des Fahrzeug-Modals
function closeVehicleModal() {
    const modal = document.getElementById('vehicle-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function formatDateForInput(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);

        if (isNaN(date.getTime())) {
            console.warn('Ungültiges Datum:', dateString);
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Fehler beim Formatieren des Datums:', error);
        return '';
    }
}

// Event-Listener hinzufügen, wenn das DOM geladen ist
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM geladen, initialisiere Fahrzeugfunktionen...');

    loadVehicles();

    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    if (addVehicleBtn) {
        addVehicleBtn.addEventListener('click', () => openVehicleModal(false));
    }

    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeVehicleModal);
    }

    const vehicleModal = document.getElementById('vehicle-modal');
    if (vehicleModal) {
        vehicleModal.addEventListener('click', function(event) {
            if (event.target === vehicleModal) {
                closeVehicleModal();
            }
        });
    }

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.dataset.tab;

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });

            tabButtons.forEach(btn => {
                btn.classList.remove('border-indigo-500', 'text-indigo-600');
                btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            });

            const selectedTab = document.getElementById(tabId);
            if (selectedTab) {
                selectedTab.classList.remove('hidden');
            }

            this.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            this.classList.add('border-indigo-500', 'text-indigo-600');
        });
    });

    const vehicleForm = document.getElementById('vehicle-form');
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const formData = new FormData(vehicleForm);
            const vehicleData = {};

            for (let [key, value] of formData.entries()) {
                vehicleData[key] = value;
            }

            const isEdit = !!vehicleData.id;

            saveVehicle(vehicleData, isEdit)
                .then(response => {
                    console.log('Fahrzeug erfolgreich gespeichert:', response);
                    closeVehicleModal();
                    loadVehicles();
                    alert('Fahrzeug erfolgreich gespeichert!');
                })
                .catch(error => {
                    console.error('Fehler:', error);
                    alert(`Fehler beim Speichern des Fahrzeugs: ${error.message}`);
                });
        });
    }

    // Rest des Codes bleibt gleich...
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchText = this.value.toLowerCase();
            const vehicleCards = document.querySelectorAll('.grid > div');

            vehicleCards.forEach(card => {
                const cardText = card.textContent.toLowerCase();
                card.style.display = cardText.includes(searchText) ? '' : 'none';
            });
        });
    }

    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            const selectedStatus = this.value;
            const vehicleCards = document.querySelectorAll('.grid > div');

            vehicleCards.forEach(card => {
                if (selectedStatus === 'all') {
                    card.style.display = '';
                    return;
                }

                const statusElement = card.querySelector('.rounded-full');
                if (!statusElement) return;

                const statusText = statusElement.textContent.trim().toLowerCase();

                let matchesFilter = false;

                if (selectedStatus === 'available' && statusText === 'verfügbar') {
                    matchesFilter = true;
                } else if (selectedStatus === 'inuse' && statusText === 'in benutzung') {
                    matchesFilter = true;
                } else if (selectedStatus === 'maintenance' && statusText === 'in wartung') {
                    matchesFilter = true;
                }

                card.style.display = matchesFilter ? '' : 'none';
            });
        });
    }

    console.log('Initialisierung abgeschlossen.');
});