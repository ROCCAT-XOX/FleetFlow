// frontend/static/js/vehicles.js

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
        brand: brand,
        model: vehicleData.model || '',
        year: parseInt(vehicleData.year || 0),
        color: vehicleData.color || '',
        fuelType: vehicleData['fuel-type'] || vehicleData.fuelType || 'Benzin',
        mileage: parseInt(vehicleData.mileage || 0),
        status: vehicleData.status || 'available'
    };

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

        // Prüfen ob carManufacturers verfügbar ist
        if (typeof carManufacturers !== 'undefined' && Array.isArray(carManufacturers)) {
            carManufacturers.forEach(manufacturer => {
                const option = document.createElement('option');
                option.value = manufacturer.name;
                option.textContent = manufacturer.name;
                brandSelect.appendChild(option);
            });
        } else {
            console.error('carManufacturers ist nicht verfügbar!');
            // Fallback: Nur grundlegende Marken hinzufügen
            const basicBrands = ['Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Ford', 'Toyota', 'Opel'];
            basicBrands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                brandSelect.appendChild(option);
            });
        }
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
            const tbody = document.getElementById('vehicles-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="px-6 py-4 text-center">
                            <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                                <p>Fehler beim Laden der Fahrzeuge: ${error.message}</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
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

    if (isEdit && vehicleId) {
        modalTitle.textContent = 'Fahrzeug bearbeiten';

        fetch(`/api/vehicles/${vehicleId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const vehicle = data.vehicle;
                console.log('Geladene Fahrzeugdaten für Bearbeitung:', vehicle);

                if (!vehicle) {
                    throw new Error('Fahrzeugdaten nicht gefunden');
                }

                // Nur die Kerndaten in Formular eintragen
                document.getElementById('license').value = vehicle.licensePlate || '';
                document.getElementById('vehicle_brand').value = vehicle.brand || '';
                document.getElementById('model').value = vehicle.model || '';
                document.getElementById('year').value = vehicle.year || '';
                document.getElementById('color').value = vehicle.color || '';
                document.getElementById('mileage').value = vehicle.mileage || '';
                document.getElementById('fuel-type').value = vehicle.fuelType || 'Benzin';
                document.getElementById('status').value = vehicle.status || 'available';

                // ID für Update speichern
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

        // ID-Input entfernen falls vorhanden
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

                    // Erfolgsmeldung
                    const message = isEdit ? 'Fahrzeug erfolgreich aktualisiert!' : 'Fahrzeug erfolgreich hinzugefügt!';

                    // Einfache Erfolgsmeldung
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50';
                    notification.textContent = message;
                    document.body.appendChild(notification);

                    setTimeout(() => {
                        notification.remove();
                    }, 3000);
                })
                .catch(error => {
                    console.error('Fehler:', error);
                    alert(`Fehler beim Speichern des Fahrzeugs: ${error.message}`);
                });
        });
    }

    // Suche
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchText = this.value.toLowerCase();
            const rows = document.querySelectorAll('#vehicles-table-body tr[data-status]');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchText)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    console.log('Initialisierung abgeschlossen.');
});