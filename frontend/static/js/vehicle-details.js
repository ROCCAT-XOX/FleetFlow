/**
 * Vehicle Details Functionality
 * This file contains functionality for the vehicle details page.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    const vehicleId = window.location.pathname.split('/').pop();
    let currentVehicle = null;

    // Initialize the page
    initializePage();

    /**
     * Initialize the page
     */
    function initializePage() {
        // Initialize tab functionality
        initializeTabs();

        // Load vehicle data
        loadVehicleData();

        // Set up event listeners for modals
        setupModalEventListeners();
    }

    /**
     * Initialize the tab functionality
     */
    function initializeTabs() {
        const tabButtons = document.querySelectorAll('.vehicle-tab-btn');
        const tabContents = document.querySelectorAll('.vehicle-tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');

                // Hide all tabs
                tabContents.forEach(content => {
                    content.classList.add('hidden');
                });

                // Reset all tab buttons
                tabButtons.forEach(btn => {
                    btn.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-500');
                    btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                });

                // Show selected tab
                document.getElementById(tabName).classList.remove('hidden');

                // Highlight current button
                button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                button.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-500');

                // Load specific data for statistics or fuel costs tab
                if (tabName === 'statistics') {
                    loadFuelCostsData();
                } else if (tabName === 'fuel-costs') {
                    loadFuelCostsData();
                }
            });
        });

        // Also update mobile tab selector
        const tabSelect = document.getElementById('tabs');
        if (tabSelect) {
            tabSelect.addEventListener('change', function() {
                document.querySelector(`.vehicle-tab-btn[data-tab="${this.value}"]`).click();
            });
        }
    }

    /**
     * Set up event listeners for all modals
     */
    function setupModalEventListeners() {
        setupMaintenanceModals();
        setupUsageModals();
        setupVehicleEditModal();
        setupFuelCostModals();
        setupRegistrationModal();
    }

    /**
     * Load vehicle data from API
     */
    function loadVehicleData() {
        fetch(`/api/vehicles/${vehicleId}`)
            .then(response => {
                if (!response.ok) throw new Error('Vehicle not found');
                return response.json();
            })
            .then(data => {
                const vehicle = data.vehicle;
                currentVehicle = vehicle; // Store vehicle data globally

                if (!vehicle) {
                    throw new Error('No vehicle data in response');
                }

                // Update UI with vehicle data
                updateHeaderInfo(vehicle);
                updateVehicleDisplay(vehicle);

                // Load additional data
                if (vehicle.currentDriverId && vehicle.currentDriverId !== '000000000000000000000000') {
                    loadCurrentDriverData(vehicle.currentDriverId);
                } else {
                    updateCurrentUsageDisplay(null);
                }

                loadMaintenanceEntries();
                loadUsageHistory();

                // Initialize tabs with vehicle data
                initRegistrationTab(vehicle);
            })
            .catch(error => {
                console.error('Error loading vehicle data:', error);
                showNotification('Error loading vehicle data: ' + error.message, 'error');
            });
    }

    /**
     * Update the header information (title and status)
     */
    function updateHeaderInfo(vehicle) {
        // Update vehicle title in header and breadcrumb
        const vehicleTitle = document.getElementById('vehicle-title');
        const vehicleHeader = document.getElementById('vehicle-header');
        const vehicleSubheader = document.getElementById('vehicle-subheader');
        const vehicleStatus = document.getElementById('vehicle-status-badge');

        const fullVehicleName = `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`;

        if (vehicleTitle) vehicleTitle.textContent = fullVehicleName;
        if (vehicleHeader) vehicleHeader.textContent = fullVehicleName;
        if (vehicleSubheader) vehicleSubheader.textContent = `${vehicle.year || ''} · ${vehicle.fuelType || 'Unknown fuel type'}`;

        // Update vehicle status badge
        if (vehicleStatus) {
            let statusConfig = getStatusConfig(vehicle.status);
            vehicleStatus.className = `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.bg} ${statusConfig.text} dark:${statusConfig.darkBg} dark:${statusConfig.darkText}`;
            vehicleStatus.textContent = statusConfig.label;
        }
    }

    /**
     * Get the status configuration (colors, labels)
     */
    function getStatusConfig(status) {
        switch(status) {
            case 'available':
                return {
                    bg: 'bg-green-100',
                    text: 'text-green-800',
                    darkBg: 'bg-green-900/30',
                    darkText: 'text-green-400',
                    label: 'Verfügbar'
                };
            case 'inuse':
                return {
                    bg: 'bg-red-100',
                    text: 'text-red-800',
                    darkBg: 'bg-red-900/30',
                    darkText: 'text-red-400',
                    label: 'In Benutzung'
                };
            case 'maintenance':
                return {
                    bg: 'bg-yellow-100',
                    text: 'text-yellow-800',
                    darkBg: 'bg-yellow-900/30',
                    darkText: 'text-yellow-400',
                    label: 'In Wartung'
                };
            default:
                return {
                    bg: 'bg-gray-100',
                    text: 'text-gray-800',
                    darkBg: 'bg-gray-700',
                    darkText: 'text-gray-300',
                    label: status || 'Unbekannt'
                };
        }
    }

    /**
     * Update the vehicle details display
     */
    function updateVehicleDisplay(vehicle) {
        // Basic information
        setElementText('license-plate-display', vehicle.licensePlate || '-');
        setElementText('brand-model-display', (vehicle.brand + ' ' + vehicle.model) || '-');
        setElementText('year-display', vehicle.year || '-');
        setElementText('color-display', vehicle.color || '-');
        setElementText('vehicle-id-display', vehicle.vehicleId || '-');
        setElementText('vin-display', vehicle.vin || '-');
        setElementText('fuel-type-display', vehicle.fuelType || '-');
        setElementText('mileage-display', vehicle.mileage ? `${vehicle.mileage} km` : '-');

        // Prefill vehicle edit form if it exists
        prefillVehicleForm(vehicle);
    }

    /**
     * Prefill the vehicle edit form with vehicle data
     */
    function prefillVehicleForm(vehicle) {
        const form = document.getElementById('edit-vehicle-form');
        if (!form) return;

        // Basic info
        const fields = {
            'license_plate': vehicle.licensePlate,
            'model': vehicle.brand + ' ' + vehicle.model,
            'year': vehicle.year,
            'color': vehicle.color,
            'vehicle_id': vehicle.vehicleId,
            'vin': vehicle.vin,
            'fuel_type': vehicle.fuelType,
            'current_mileage': vehicle.mileage,
            'registration_date': formatDateForInput(vehicle.registrationDate),
            'next_inspection': formatDateForInput(vehicle.nextInspectionDate),
            'insurance': vehicle.insuranceCompany,
            'insurance_number': vehicle.insuranceNumber,
            'insurance_type': vehicle.insuranceType,
            'insurance_cost': vehicle.insuranceCost,
            'vehicle_notes': vehicle.notes
        };

        // Set form values
        for (const [id, value] of Object.entries(fields)) {
            const element = document.getElementById(id);
            if (element) element.value = value || '';
        }
    }

    /**
     * Load and display data for the current driver
     */
    function loadCurrentDriverData(driverId) {
        fetch(`/api/drivers/${driverId}`)
            .then(response => {
                if (!response.ok) throw new Error('Driver not found');
                return response.json();
            })
            .then(data => {
                const driver = data.driver;

                // Query active usage
                return fetch(`/api/usage/vehicle/${vehicleId}`)
                    .then(response => {
                        if (!response.ok) throw new Error('Usage data not found');
                        return response.json();
                    })
                    .then(usageData => {
                        // Filter active usage
                        const activeUsage = usageData.usage.find(entry => entry.status === 'active');
                        updateCurrentUsageDisplay(driver, activeUsage);
                    });
            })
            .catch(error => {
                console.error('Error loading driver data:', error);
                updateCurrentUsageDisplay(null);
            });
    }

    /**
     * Update the current usage display
     */
    function updateCurrentUsageDisplay(driver, activeUsage = null) {
        const currentUsageTab = document.getElementById('current-usage');
        if (!currentUsageTab) return;

        if (!driver) {
            // No driver assigned
            currentUsageTab.innerHTML = `
                <div class="bg-white overflow-hidden shadow rounded-lg dark:bg-gray-800">
                    <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                        <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Aktuelle Nutzung</h3>
                    </div>
                    <div class="px-4 py-5 sm:p-6 text-center text-gray-500 dark:text-gray-400">
                        <p>Dieses Fahrzeug wird derzeit nicht genutzt.</p>
                        <button id="start-usage-btn" type="button" class="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                            <svg class="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Nutzung starten
                        </button>
                    </div>
                </div>
            `;

            // Event listener for "Start Usage" button
            const startUsageBtn = document.getElementById('start-usage-btn');
            if (startUsageBtn) {
                startUsageBtn.addEventListener('click', () => {
                    openCurrentUsageModal(false);
                });
            }

            return;
        }

        // Driver is assigned, show details
        let usageStartDate = "Unbekannt";
        let usageEndDate = "Nicht gesetzt";
        let department = "";
        let project = "";

        if (activeUsage) {
            usageStartDate = formatDateTime(activeUsage.startDate);
            if (activeUsage.endDate) usageEndDate = formatDateTime(activeUsage.endDate);
            department = activeUsage.department || "";
            project = activeUsage.project || activeUsage.purpose || "";
        }

        currentUsageTab.innerHTML = `
            <div class="bg-white overflow-hidden shadow rounded-lg dark:bg-gray-800">
                <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 dark:bg-gray-700 dark:border-gray-600 flex justify-between items-center">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Aktuelle Nutzung</h3>
                    <button type="button" id="edit-current-usage-btn" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50">
                        <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Bearbeiten
                    </button>
                </div>
                <div class="px-4 py-5 sm:p-6">
                    <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Aktueller Fahrer</dt>
                            <dd class="mt-1 text-sm text-gray-900 dark:text-white">${driver.firstName} ${driver.lastName}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Abteilung</dt>
                            <dd class="mt-1 text-sm text-gray-900 dark:text-white">${department || "Nicht angegeben"}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Nutzung seit</dt>
                            <dd class="mt-1 text-sm text-gray-900 dark:text-white">${usageStartDate}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Geplante Rückgabe</dt>
                            <dd class="mt-1 text-sm text-gray-900 dark:text-white">${usageEndDate}</dd>
                        </div>
                        <div class="sm:col-span-2">
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Projekt/Zweck</dt>
                            <dd class="mt-1 text-sm text-gray-900 dark:text-white">${project || "Nicht angegeben"}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        `;

        // Event listener for the "Edit" button
        const editUsageBtn = document.getElementById('edit-current-usage-btn');
        if (editUsageBtn) {
            editUsageBtn.addEventListener('click', () => {
                openCurrentUsageModal(true, activeUsage);
            });
        }
    }

    // ===== MAINTENANCE FUNCTIONALITY =====

    /**
     * Set up maintenance modals
     */
    function setupMaintenanceModals() {
        // "Add Maintenance" button
        const addMaintenanceBtn = document.getElementById('add-maintenance-btn');
        if (addMaintenanceBtn) {
            addMaintenanceBtn.addEventListener('click', () => openMaintenanceModal(false));
        }

        // Close buttons for maintenance modal
        const closeModalBtns = document.querySelectorAll('.close-modal-btn');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', closeMaintenanceModal);
        });

        // Maintenance form submit
        const maintenanceForm = document.getElementById('maintenance-form');
        if (maintenanceForm) {
            maintenanceForm.addEventListener('submit', handleMaintenanceSubmit);
        }
    }

    /**
     * Load and display maintenance entries
     */
    function loadMaintenanceEntries() {
        fetch(`/api/maintenance/vehicle/${vehicleId}`)
            .then(response => {
                if (!response.ok) throw new Error('Maintenance entries not found');
                return response.json();
            })
            .then(data => {
                const maintenanceEntries = data.maintenance || [];
                updateMaintenanceTable(maintenanceEntries);
            })
            .catch(error => {
                console.error('Error loading maintenance entries:', error);
                updateMaintenanceTable([]);
            });
    }

    /**
     * Update the maintenance table
     */
    function updateMaintenanceTable(entries) {
        const tableBody = document.getElementById('maintenance-table-body');
        if (!tableBody) return;

        if (!entries || entries.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-center text-gray-500 dark:text-gray-400">
                        Keine Wartungseinträge gefunden.
                    </td>
                </tr>
            `;
            return;
        }

        // Sort entries by date (newest first)
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Fill table with entries
        tableBody.innerHTML = entries.map(entry => {
            const date = formatDate(entry.date);
            let type = 'Sonstiges';

            switch (entry.type) {
                case 'inspection': type = 'Inspektion'; break;
                case 'oil-change': type = 'Ölwechsel'; break;
                case 'tire-change': type = 'Reifenwechsel'; break;
                case 'repair': type = 'Reparatur'; break;
            }

            return `
                <tr>
                    <td class="py-3.5 pl-4 pr-3 text-left text-sm text-gray-900 dark:text-white sm:pl-0">${date}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${type}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.mileage} km</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.cost ? (entry.cost + ' €') : '-'}</td>
                    <td class="relative py-3.5 pl-3 pr-4 sm:pr-0 text-right">
                        <button class="edit-maintenance-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" data-id="${entry.id}">
                            Bearbeiten
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Event listeners for edit buttons
        const editButtons = tableBody.querySelectorAll('.edit-maintenance-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', function () {
                const entryId = this.getAttribute('data-id');
                openMaintenanceModal(true, entryId);
            });
        });
    }

    /**
     * Open the maintenance modal
     */
    function openMaintenanceModal(isEdit = false, maintenanceId = null) {
        const modal = document.getElementById('maintenance-modal');
        const modalTitle = document.getElementById('maintenance-modal-title');
        const form = document.getElementById('maintenance-form');

        if (!modal || !modalTitle || !form) return;

        // Reset form data
        form.reset();

        if (isEdit && maintenanceId) {
            modalTitle.textContent = 'Wartung/Inspektion bearbeiten';

            // Load maintenance entry from API
            fetch(`/api/maintenance/${maintenanceId}`)
                .then(response => {
                    if (!response.ok) throw new Error('Maintenance entry not found');
                    return response.json();
                })
                .then(data => {
                    const maintenance = data.maintenance;

                    // Fill form fields
                    if (maintenance.date) {
                        document.getElementById('maintenance-date').value = formatDateForInput(maintenance.date);
                    }

                    document.getElementById('maintenance-type').value = maintenance.type;
                    document.getElementById('mileage').value = maintenance.mileage || '';
                    document.getElementById('cost').value = maintenance.cost || '';
                    document.getElementById('workshop').value = maintenance.workshop || '';
                    document.getElementById('maintenance-notes').value = maintenance.notes || '';

                    // Add hidden field for maintenance ID
                    let idInput = form.querySelector('input[name="maintenance-id"]');
                    if (!idInput) {
                        idInput = document.createElement('input');
                        idInput.type = 'hidden';
                        idInput.name = 'maintenance-id';
                        form.appendChild(idInput);
                    }
                    idInput.value = maintenanceId;
                })
                .catch(error => {
                    console.error('Error loading maintenance entry:', error);
                    closeMaintenanceModal();
                    showNotification('Fehler beim Laden des Wartungseintrags', 'error');
                });
        } else {
            modalTitle.textContent = 'Wartung/Inspektion hinzufügen';

            // Prefill current date
            const today = new Date();
            document.getElementById('maintenance-date').value = formatDateForInput(today);

            // Remove the hidden ID field if it exists
            const idInput = form.querySelector('input[name="maintenance-id"]');
            if (idInput) idInput.remove();
        }

        modal.classList.remove('hidden');
    }

    /**
     * Close the maintenance modal
     */
    function closeMaintenanceModal() {
        const modal = document.getElementById('maintenance-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Handle the maintenance form submission
     */
    function handleMaintenanceSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const maintenanceData = {};

        // Convert form data to object
        for (let [key, value] of formData.entries()) {
            maintenanceData[key] = value;
        }

        // Check if it's an edit
        const maintenanceId = maintenanceData['maintenance-id'];
        const isEdit = !!maintenanceId;

        // Prepare API request
        const apiUrl = isEdit ? `/api/maintenance/${maintenanceId}` : '/api/maintenance';
        const method = isEdit ? 'PUT' : 'POST';

        // Convert data to API expected format
        const apiData = {
            vehicleId: vehicleId,
            date: maintenanceData['maintenance-date'],
            type: maintenanceData['maintenance-type'],
            mileage: parseInt(maintenanceData.mileage) || 0,
            cost: parseFloat(maintenanceData.cost) || 0,
            workshop: maintenanceData.workshop,
            notes: maintenanceData['maintenance-notes']
        };

        // Send API request
        fetch(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        })
            .then(response => {
                if (!response.ok) throw new Error('Error saving maintenance entry');
                return response.json();
            })
            .then(data => {
                closeMaintenanceModal();
                loadMaintenanceEntries(); // Refresh maintenance list
                showNotification(
                    isEdit ? 'Wartungseintrag erfolgreich aktualisiert' : 'Wartungseintrag erfolgreich erstellt',
                    'success'
                );
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Fehler beim Speichern: ' + error.message, 'error');
            });
    }

    // ===== USAGE HISTORY FUNCTIONALITY =====

    /**
     * Set up usage modals
     */
    function setupUsageModals() {
        // "Add Usage" button
        const addUsageBtn = document.getElementById('add-usage-btn');
        if (addUsageBtn) {
            addUsageBtn.addEventListener('click', () => openUsageModal(false));
        }

        // Close buttons for usage modal
        const closeModalBtns = document.querySelectorAll('.close-modal-btn');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', closeUsageModal);
        });

        // Close button for current usage modal
        const closeCurrentUsageModalBtns = document.querySelectorAll('.close-current-usage-modal-btn');
        closeCurrentUsageModalBtns.forEach(btn => {
            btn.addEventListener('click', closeCurrentUsageModal);
        });

        // Usage form submit
        const usageForm = document.getElementById('usage-form');
        if (usageForm) {
            usageForm.addEventListener('submit', handleUsageSubmit);
        }

        // Form for current usage submit
        const currentUsageForm = document.getElementById('edit-current-usage-form');
        if (currentUsageForm) {
            currentUsageForm.addEventListener('submit', handleCurrentUsageSubmit);
        }
    }

    /**
     * Load and display usage history
     */
    function loadUsageHistory() {
        fetch(`/api/usage/vehicle/${vehicleId}`)
            .then(response => {
                if (!response.ok) throw new Error('Usage history not found');
                return response.json();
            })
            .then(data => {
                const usageEntries = data.usage || [];
                updateUsageTable(usageEntries);
            })
            .catch(error => {
                console.error('Error loading usage history:', error);
                updateUsageTable([]);
            });
    }

    /**
     * Update the usage table
     */
    function updateUsageTable(entries) {
        const tableBody = document.getElementById('usage-table-body');
        if (!tableBody) return;

        if (!entries || entries.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-center text-gray-500 dark:text-gray-400">
                        Keine Nutzungseinträge gefunden.
                    </td>
                </tr>
            `;
            return;
        }

        // Sort entries by start date (newest first)
        entries.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        // Fill table with entries
        tableBody.innerHTML = entries.map(entry => {
            const startDate = formatDate(entry.startDate);
            const endDate = entry.endDate ? formatDate(entry.endDate) : '-';
            const timeframe = `${startDate} - ${endDate}`;

            // Calculate mileage difference
            let mileageInfo = `${entry.startMileage} km`;
            if (entry.endMileage && entry.endMileage > entry.startMileage) {
                const diff = entry.endMileage - entry.startMileage;
                mileageInfo = `${entry.startMileage} - ${entry.endMileage} km (+${diff} km)`;
            }

            return `
                <tr>
                    <td class="py-3.5 pl-4 pr-3 text-left text-sm text-gray-900 dark:text-white sm:pl-6">${timeframe}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.driverName || '-'}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.project || entry.purpose || '-'}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${mileageInfo}</td>
                    <td class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                        <button class="edit-usage-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" data-id="${entry.id}">
                            Bearbeiten
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Event listeners for edit buttons
        const editButtons = tableBody.querySelectorAll('.edit-usage-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const entryId = this.getAttribute('data-id');
                openUsageModal(true, entryId);
            });
        });
    }

    /**
     * Open the usage modal
     */
    function openUsageModal(isEdit = false, usageId = null) {
        const modal = document.getElementById('usage-modal');
        const modalTitle = document.getElementById('usage-modal-title');
        const form = document.getElementById('usage-form');

        if (!modal || !modalTitle || !form) return;

        // Reset form
        form.reset();

        if (isEdit && usageId) {
            modalTitle.textContent = 'Nutzung bearbeiten';

            // Load usage entry
            fetch(`/api/usage/${usageId}`)
                .then(response => {
                    if (!response.ok) throw new Error('Nutzungseintrag nicht gefunden');
                    return response.json();
                })
                .then(data => {
                    const usage = data.usage;

                    // Fill form with data
                    if (usage.startDate) {
                        const startDate = new Date(usage.startDate);
                        document.getElementById('start-date').value = formatDateForInput(startDate);
                        document.getElementById('start-time').value = formatTimeForInput(startDate);
                    }

                    if (usage.endDate) {
                        const endDate = new Date(usage.endDate);
                        document.getElementById('end-date').value = formatDateForInput(endDate);
                        document.getElementById('end-time').value = formatTimeForInput(endDate);
                    }

                    if (usage.driverId) {
                        const driverSelect = document.getElementById('driver');
                        if (driverSelect) driverSelect.value = usage.driverId;
                    }

                    document.getElementById('project').value = usage.project || usage.purpose || '';
                    document.getElementById('start-mileage').value = usage.startMileage || '';
                    document.getElementById('end-mileage').value = usage.endMileage || '';
                    document.getElementById('usage-notes').value = usage.notes || '';

                    // Add hidden field for usage ID
                    let idInput = form.querySelector('input[name="usage-id"]');
                    if (!idInput) {
                        idInput = document.createElement('input');
                        idInput.type = 'hidden';
                        idInput.name = 'usage-id';
                        form.appendChild(idInput);
                    }
                    idInput.value = usageId;
                })
                .catch(error => {
                    console.error('Error loading usage entry:', error);
                    closeUsageModal();
                    showNotification('Fehler beim Laden des Nutzungseintrags', 'error');
                });
        } else {
            modalTitle.textContent = 'Nutzung eintragen';

            // Prefill current date and time
            const now = new Date();
            document.getElementById('start-date').value = formatDateForInput(now);
            document.getElementById('start-time').value = formatTimeForInput(now);

            // Prefill mileage from vehicle if available
            if (currentVehicle && currentVehicle.mileage) {
                document.getElementById('start-mileage').value = currentVehicle.mileage;
            }

            // Remove usage-id if it exists
            const idInput = form.querySelector('input[name="usage-id"]');
            if (idInput) idInput.remove();
        }

        // Load drivers for selection
        loadDriversForSelect();

        modal.classList.remove('hidden');
    }

    /**
     * Close the usage modal
     */
    function closeUsageModal() {
        const modal = document.getElementById('usage-modal');
        if (modal) modal.classList.add('hidden');
    }

    /**
     * Handle the usage form submission
     */
    function handleUsageSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const usageData = {};

        // Convert form data to object
        for (let [key, value] of formData.entries()) {
            usageData[key] = value;
        }

        // Check if it's an edit
        const usageId = usageData['usage-id'];
        const isEdit = !!usageId;

        // Combine date and time
        const startDate = combineDateTime(usageData['start-date'], usageData['start-time']);
        const endDate = combineDateTime(usageData['end-date'], usageData['end-time']);

        // Prepare API request
        const apiUrl = isEdit ? `/api/usage/${usageId}` : '/api/usage';
        const method = isEdit ? 'PUT' : 'POST';

        // Convert to API format
        const apiData = {
            vehicleId: vehicleId,
            driverId: usageData.driver,
            startDate: startDate,
            endDate: endDate || null,
            startMileage: parseInt(usageData['start-mileage']) || 0,
            endMileage: parseInt(usageData['end-mileage']) || 0,
            project: usageData.project,
            notes: usageData['usage-notes']
        };

        // Send API request
        fetch(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        })
            .then(response => {
                if (!response.ok) throw new Error('Fehler beim Speichern der Nutzung');
                return response.json();
            })
            .then(data => {
                closeUsageModal();
                loadUsageHistory(); // Refresh
                loadVehicleData(); // Refresh vehicle data (for current usage)

                showNotification(
                    isEdit ? 'Nutzungseintrag erfolgreich aktualisiert' : 'Nutzungseintrag erfolgreich erstellt',
                    'success'
                );
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Fehler beim Speichern: ' + error.message, 'error');
            });
    }

    /**
     * Open the current usage modal (edit or create)
     */
    function openCurrentUsageModal(isEdit = false, currentUsage = null) {
        const modal = document.getElementById('edit-usage-modal');
        const modalTitle = document.getElementById('usage-modal-title');
        const form = document.getElementById('edit-current-usage-form');

        if (!modal || !form) return;

        // Reset form
        form.reset();

        if (isEdit && currentUsage) {
            modalTitle.textContent = 'Aktuelle Nutzung bearbeiten';

            // Fill form with data
            if (currentUsage.startDate) {
                const startDate = new Date(currentUsage.startDate);
                document.getElementById('current-start-date').value = formatDateForInput(startDate);
                document.getElementById('current-start-time').value = formatTimeForInput(startDate);
            }

            if (currentUsage.endDate) {
                const endDate = new Date(currentUsage.endDate);
                document.getElementById('current-end-date').value = formatDateForInput(endDate);
                document.getElementById('current-end-time').value = formatTimeForInput(endDate);
            }

            if (currentUsage.driverId) {
                const driverSelect = document.getElementById('current-driver');
                if (driverSelect) driverSelect.value = currentUsage.driverId;
            }

            document.getElementById('current-department').value = currentUsage.department || '';
            document.getElementById('usage-status').value = currentUsage.status || 'active';
            document.getElementById('current-project').value = currentUsage.project || currentUsage.purpose || '';
            document.getElementById('current-usage-notes').value = currentUsage.notes || '';

            // Add hidden field for usage ID
            let idInput = form.querySelector('input[name="usage-id"]');
            if (!idInput) {
                idInput = document.createElement('input');
                idInput.type = 'hidden';
                idInput.name = 'usage-id';
                form.appendChild(idInput);
            }
            idInput.value = currentUsage.id;
        } else {
            modalTitle.textContent = 'Neue Nutzung starten';

            // Prefill current date and time
            const now = new Date();
            document.getElementById('current-start-date').value = formatDateForInput(now);
            document.getElementById('current-start-time').value = formatTimeForInput(now);

            // A future date for expected return (default: +1 day)
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('current-end-date').value = formatDateForInput(tomorrow);
            document.getElementById('current-end-time').value = formatTimeForInput(now);

            // Remove usage-id if it exists
            const idInput = form.querySelector('input[name="usage-id"]');
            if (idInput) idInput.remove();
        }

        // Load drivers for selection
        loadDriversForCurrentUsageSelect();

        modal.classList.remove('hidden');
    }

    /**
     * Close the current usage modal
     */
    function closeCurrentUsageModal() {
        const modal = document.getElementById('edit-usage-modal');
        if (modal) modal.classList.add('hidden');
    }

    /**
     * Handle the current usage form submission
     */
    function handleCurrentUsageSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const usageData = {};

        // Convert form data to object
        for (let [key, value] of formData.entries()) {
            usageData[key] = value;
        }

        // Check if it's an edit
        const usageId = usageData['usage-id'];
        const isEdit = !!usageId;

        // Combine date and time
        const startDate = combineDateTime(usageData['current-start-date'], usageData['current-start-time']);
        const endDate = combineDateTime(usageData['current-end-date'], usageData['current-end-time']);

        // Prepare API request
        const apiUrl = isEdit ? `/api/usage/${usageId}` : '/api/usage';
        const method = isEdit ? 'PUT' : 'POST';

        // Convert to API format
        const apiData = {
            vehicleId: vehicleId,
            driverId: usageData['current-driver'],
            startDate: startDate,
            endDate: endDate || null,
            department: usageData['current-department'],
            status: usageData['usage-status'] || 'active',
            project: usageData['current-project'],
            notes: usageData['current-usage-notes']
        };

        // If creating new usage, update vehicle status
        if (!isEdit) {
            // Update vehicle status to "in use"
            fetch(`/api/vehicles/${vehicleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...currentVehicle,
                    status: 'inuse',
                    currentDriverId: usageData['current-driver']
                })
            }).catch(error => {
                console.error('Error updating vehicle status:', error);
            });
        }

        // Send API request for usage
        fetch(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        })
            .then(response => {
                if (!response.ok) throw new Error('Fehler beim Speichern der Nutzung');
                return response.json();
            })
            .then(data => {
                closeCurrentUsageModal();
                loadVehicleData(); // Refresh vehicle data and current usage

                showNotification(
                    isEdit ? 'Nutzung erfolgreich aktualisiert' : 'Nutzung erfolgreich gestartet',
                    'success'
                );
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Fehler beim Speichern: ' + error.message, 'error');
            });
    }

    /**
     * Load drivers for select element
     */
    function loadDriversForSelect() {
        const driverSelect = document.getElementById('driver');
        if (!driverSelect) return;

        fetch('/api/drivers')
            .then(response => {
                if (!response.ok) throw new Error('Fehler beim Laden der Fahrer');
                return response.json();
            })
            .then(data => {
                const drivers = data.drivers || [];

                // Keep first option (if exists)
                const firstOption = driverSelect.querySelector('option:first-child');
                driverSelect.innerHTML = '';
                if (firstOption) driverSelect.appendChild(firstOption);

                // Add drivers
                drivers.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = `${driver.firstName} ${driver.lastName}`;
                    driverSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading drivers:', error);
            });
    }

    /**
     * Load drivers for current usage select
     */
    function loadDriversForCurrentUsageSelect() {
        const driverSelect = document.getElementById('current-driver');
        if (!driverSelect) return;

        fetch('/api/drivers')
            .then(response => {
                if (!response.ok) throw new Error('Fehler beim Laden der Fahrer');
                return response.json();
            })
            .then(data => {
                const drivers = data.drivers || [];

                // Keep first option (if exists)
                const firstOption = driverSelect.querySelector('option:first-child');
                driverSelect.innerHTML = '';
                if (firstOption) driverSelect.appendChild(firstOption);

                // Add drivers
                drivers.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = `${driver.firstName} ${driver.lastName}`;
                    driverSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading drivers:', error);
            });
    }

    // ===== VEHICLE EDIT FUNCTIONALITY =====

    /**
     * Set up vehicle edit modal
     */
    function setupVehicleEditModal() {
        // "Edit Vehicle" button
        const editVehicleBtn = document.getElementById('edit-vehicle-btn');
        if (editVehicleBtn) {
            editVehicleBtn.addEventListener('click', openVehicleEditModal);
        }

        // Close button in edit modal
        const closeEditModalBtn = document.querySelector('.close-edit-modal-btn');
        if (closeEditModalBtn) {
            closeEditModalBtn.addEventListener('click', closeVehicleEditModal);
        }

        // Vehicle edit form submit
        const editVehicleForm = document.getElementById('edit-vehicle-form');
        if (editVehicleForm) {
            editVehicleForm.addEventListener('submit', handleVehicleEditSubmit);
        }
    }

    /**
     * Open the vehicle edit modal
     */
    function openVehicleEditModal() {
        const modal = document.getElementById('edit-vehicle-modal');
        if (!modal) return;

        // Show modal (form is already prefilled in updateVehicleDisplay)
        modal.classList.remove('hidden');
    }

    /**
     * Close the vehicle edit modal
     */
    function closeVehicleEditModal() {
        const modal = document.getElementById('edit-vehicle-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Handle the vehicle edit form submission
     */
    // Verbesserte handleVehicleEditSubmit Funktion
    function handleVehicleEditSubmit(event) {
        event.preventDefault();

        // Verhindere doppelte Ausführung
        if (event.submitting) return;
        event.submitting = true;

        const form = event.target;
        const formData = new FormData(form);
        const vehicleData = {};

        // Formulardaten sammeln
        for (let [key, value] of formData.entries()) {
            vehicleData[key] = value;
        }

        // Model und Brand aufteilen
        let brandAndModel = vehicleData.model ? vehicleData.model.trim().split(' ') : ['', ''];
        let brand = '';
        let model = '';

        if (brandAndModel.length >= 2) {
            brand = brandAndModel[0];
            model = brandAndModel.slice(1).join(' ');
        } else {
            brand = brandAndModel[0] || '';
            model = '';
        }

        // Deaktiviere den Submit-Button
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        // Erstelle eine tiefe Kopie des aktuellen Fahrzeugs
        const apiData = JSON.parse(JSON.stringify(currentVehicle || {}));

        // Aktualisiere nur die Grunddaten
        apiData.licensePlate = vehicleData.license_plate || apiData.licensePlate || '';
        apiData.brand = brand || apiData.brand || '';
        apiData.model = model || apiData.model || '';
        apiData.year = parseInt(vehicleData.year) || apiData.year || null;
        apiData.color = vehicleData.color || apiData.color || '';
        apiData.vehicleId = vehicleData.vehicle_id || apiData.vehicleId || '';
        apiData.vin = vehicleData.vin || apiData.vin || '';
        apiData.fuelType = vehicleData.fuel_type || apiData.fuelType || '';
        apiData.mileage = parseInt(vehicleData.current_mileage) || apiData.mileage || 0;
        apiData.notes = vehicleData.vehicle_notes || apiData.notes || '';

        // Stelle sicher, dass alle Versicherungsdaten und Datum-Felder explizit beibehalten werden
        if (currentVehicle) {
            apiData.insuranceCompany = currentVehicle.insuranceCompany;
            apiData.insuranceNumber = currentVehicle.insuranceNumber;
            apiData.insuranceType = currentVehicle.insuranceType;
            apiData.registrationDate = currentVehicle.registrationDate;
            apiData.registrationExpiry = currentVehicle.registrationExpiry;
            apiData.nextInspectionDate = currentVehicle.nextInspectionDate;
            apiData.insuranceExpiry = currentVehicle.insuranceExpiry;
            apiData.insuranceCost = currentVehicle.insuranceCost;
        }

        console.log('Updating vehicle with basic data while preserving insurance data:', apiData);

        // Update vehicle via API
        fetch(`/api/vehicles/${vehicleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error('Fehler beim Speichern des Fahrzeugs: ' + text);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Modal schließen
                closeVehicleEditModal();

                // Lokale Daten aktualisieren (nur wenn die Antwort gültig ist)
                if (data && data.vehicle) {
                    currentVehicle = data.vehicle;
                    // Nur die relevante Anzeige aktualisieren
                    updateVehicleDisplay(data.vehicle);
                }

                // Erfolgsbenachrichtigung
                showNotification('Fahrzeug erfolgreich aktualisiert', 'success');
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Fehler beim Speichern: ' + error.message, 'error');
            })
            .finally(() => {
                // Submit-Button reaktivieren und Flag zurücksetzen
                if (submitButton) submitButton.disabled = false;
                event.submitting = false;
            });
    }

    // ===== FUEL COSTS FUNCTIONALITY =====

    /**
     * Set up fuel cost modals
     */
    function setupFuelCostModals() {
        // "Add Fuel Cost" button
        const addFuelCostBtn = document.getElementById('add-vehicle-fuel-cost-btn');
        if (addFuelCostBtn) {
            addFuelCostBtn.addEventListener('click', () => openFuelCostModal(false));
        }

        // Close button for fuel cost modal
        const closeFuelModalBtn = document.getElementById('vehicle-close-fuel-modal-btn');
        if (closeFuelModalBtn) {
            closeFuelModalBtn.addEventListener('click', closeFuelCostModal);
        }

        // Fuel cost form submit
        const fuelCostForm = document.getElementById('vehicle-fuel-cost-form');
        if (fuelCostForm) {
            fuelCostForm.addEventListener('submit', handleFuelCostSubmit);
        }

        // Set up calculation events
        setupFuelCostCalculation();
    }

    /**
     * Set up calculation for fuel costs
     */
    function setupFuelCostCalculation() {
        const amountInput = document.getElementById('vehicle-fuel-amount');
        const pricePerUnitInput = document.getElementById('vehicle-fuel-price-per-unit');
        const totalCostInput = document.getElementById('vehicle-fuel-total-cost');

        if (!amountInput || !pricePerUnitInput || !totalCostInput) return;

        // Calculate total from amount and price per unit
        const calculateTotal = () => {
            const amount = parseFloat(amountInput.value) || 0;
            const pricePerUnit = parseFloat(pricePerUnitInput.value) || 0;

            if (amount > 0 && pricePerUnit > 0) {
                totalCostInput.value = (amount * pricePerUnit).toFixed(2);
            }
        };

        // Calculate price per unit from amount and total
        const calculatePricePerUnit = () => {
            const amount = parseFloat(amountInput.value) || 0;
            const totalCost = parseFloat(totalCostInput.value) || 0;

            if (amount > 0 && totalCost > 0) {
                pricePerUnitInput.value = (totalCost / amount).toFixed(3);
            }
        };

        // Add event listeners
        amountInput.addEventListener('input', calculateTotal);
        pricePerUnitInput.addEventListener('input', calculateTotal);
        totalCostInput.addEventListener('input', calculatePricePerUnit);
    }

    /**
     * Load fuel costs data
     */
    function loadFuelCostsData() {
        fetch(`/api/fuelcosts/vehicle/${vehicleId}`)
            .then(response => {
                if (!response.ok) throw new Error('Fehler beim Laden der Tankkosten');
                return response.json();
            })
            .then(data => {
                const fuelCosts = data.fuelCosts || [];
                updateFuelCostsTable(fuelCosts);
                updateFuelCostsStatistics(fuelCosts);

                if (typeof ApexCharts !== 'undefined') {
                    createFuelCostChart(fuelCosts);
                }
            })
            .catch(error => {
                console.error('Error loading fuel costs:', error);
                updateFuelCostsTable([]);
            });
    }

    /**
     * Update the fuel costs table
     */
    function updateFuelCostsTable(entries) {
        const tableBody = document.getElementById('vehicle-fuel-costs-body');
        if (!tableBody) return;

        if (!entries || entries.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-4 text-center text-gray-500 dark:text-gray-400">
                        Keine Tankkosten gefunden.
                    </td>
                </tr>
            `;
            return;
        }

        // Sort entries by date (newest first)
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Fill table with entries
        tableBody.innerHTML = entries.map(entry => {
            const date = formatDate(entry.date);
            const amount = formatNumber(entry.amount, 2);
            const pricePerUnit = formatCurrency(entry.pricePerUnit);
            const totalCost = formatCurrency(entry.totalCost);

            return `
                <tr>
                    <td class="py-3.5 pl-4 pr-3 text-left text-sm text-gray-900 dark:text-white sm:pl-6">${date}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.fuelType || '-'}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${amount} ${entry.fuelType === 'Elektro' ? 'kWh' : 'L'}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${pricePerUnit}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${totalCost}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.mileage} km</td>
                    <td class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                        <button class="edit-fuel-cost-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" data-id="${entry.id}">
                            Bearbeiten
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Event listeners for edit buttons
        const editButtons = tableBody.querySelectorAll('.edit-fuel-cost-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const entryId = this.getAttribute('data-id');
                openFuelCostModal(true, entryId);
            });
        });
    }

    /**
     * Update fuel costs statistics
     */
    function updateFuelCostsStatistics(entries) {
        if (!entries || entries.length === 0) return;

        // Elements for statistics
        const avgConsumptionElement = document.getElementById('avg-consumption');
        const consumptionUnitElement = document.getElementById('consumption-unit');
        const totalFuelCostsElement = document.getElementById('total-fuel-costs');
        const costPerKmElement = document.getElementById('cost-per-km');

        // Sort by date (oldest first for calculations)
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate statistics
        let totalCost = 0;
        let totalFuel = 0;
        let totalDistance = 0;

        // Get primary fuel type
        const fuelTypes = entries.map(entry => entry.fuelType);
        const primaryFuelType = getMostFrequent(fuelTypes) || 'Diesel';

        // Filter entries by primary fuel type
        const filteredEntries = entries.filter(entry => entry.fuelType === primaryFuelType);

        // Calculate consumption only if at least 2 entries for accurate mileage difference
        if (filteredEntries.length > 1) {
            // Get first and last entry by mileage
            const firstEntry = filteredEntries.reduce((min, entry) =>
                entry.mileage < min.mileage ? entry : min, filteredEntries[0]);
            const lastEntry = filteredEntries.reduce((max, entry) =>
                entry.mileage > max.mileage ? entry : max, filteredEntries[0]);

            totalDistance = lastEntry.mileage - firstEntry.mileage;

            // Only count fuel between these mileage points
            filteredEntries.forEach(entry => {
                if (entry.mileage > firstEntry.mileage && entry.mileage <= lastEntry.mileage) {
                    totalFuel += entry.amount || 0;
                    totalCost += entry.totalCost || 0;
                }
            });

            // Calculate consumption per 100km
            const consumptionPer100km = totalDistance > 0 ? (totalFuel * 100) / totalDistance : 0;

            // Calculate cost per km
            const costPerKm = totalDistance > 0 ? totalCost / totalDistance : 0;

            // Update UI
            if (avgConsumptionElement) {
                avgConsumptionElement.textContent = formatNumber(consumptionPer100km, 1);
            }

            if (consumptionUnitElement) {
                consumptionUnitElement.textContent = primaryFuelType === 'Elektro' ? 'kWh/100km' : 'L/100km';
            }

            if (totalFuelCostsElement) {
                totalFuelCostsElement.textContent = formatCurrency(totalCost);
            }

            if (costPerKmElement) {
                costPerKmElement.textContent = formatCurrency(costPerKm, 3) + '/km';
            }
        } else {
            // Not enough data
            if (avgConsumptionElement) avgConsumptionElement.textContent = '--';
            if (totalFuelCostsElement) totalFuelCostsElement.textContent = '--';
            if (costPerKmElement) costPerKmElement.textContent = '--';
        }
    }

    /**
     * Create fuel cost chart
     */
    function createFuelCostChart(entries) {
        const chartElement = document.getElementById('stats-fuel-costs-chart');
        if (!chartElement || typeof ApexCharts === 'undefined' || !entries.length) return;

        // Group entries by month
        const monthlyCosts = {};

        entries.forEach(entry => {
            const date = new Date(entry.date);
            const month = date.getMonth();
            const year = date.getFullYear();
            const monthYear = `${year}-${month + 1}`;

            if (!monthlyCosts[monthYear]) {
                monthlyCosts[monthYear] = {
                    total: 0,
                    amount: 0,
                    count: 0,
                    month: month,
                    year: year
                };
            }

            monthlyCosts[monthYear].total += entry.totalCost || 0;
            monthlyCosts[monthYear].amount += entry.amount || 0;
            monthlyCosts[monthYear].count += 1;
        });

        // Extract data for last 12 months
        const today = new Date();
        const last12Months = [];

        for (let i = 11; i >= 0; i--) {
            const d = new Date(today);
            d.setMonth(d.getMonth() - i);
            const yearMonth = `${d.getFullYear()}-${d.getMonth() + 1}`;
            const month = d.toLocaleString('de-DE', { month: 'short' });
            const year = d.getFullYear();

            last12Months.push({
                key: yearMonth,
                label: `${month} ${year}`,
                cost: monthlyCosts[yearMonth] ? monthlyCosts[yearMonth].total : 0
            });
        }

        // Prepare chart data
        const categories = last12Months.map(m => m.label);
        const costs = last12Months.map(m => m.cost);

        const options = {
            chart: {
                type: 'bar',
                height: 350,
                toolbar: {
                    show: false
                }
            },
            colors: ['#4F46E5'],
            series: [{
                name: 'Tankkosten',
                data: costs
            }],
            xaxis: {
                categories: categories,
                labels: {
                    style: {
                        fontSize: '12px'
                    }
                }
            },
            yaxis: {
                title: {
                    text: 'Kosten (€)'
                }
            },
            tooltip: {
                y: {
                    formatter: function(value) {
                        return formatCurrency(value);
                    }
                }
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    dataLabels: {
                        position: 'top'
                    }
                }
            },
            dataLabels: {
                enabled: false
            }
        };

        // Delete chart if it already exists
        if (window.fuelCostsChart) {
            window.fuelCostsChart.destroy();
        }

        // Create new chart and save globally
        window.fuelCostsChart = new ApexCharts(chartElement, options);
        window.fuelCostsChart.render();
    }

    /**
     * Open the fuel cost modal
     */
    function openFuelCostModal(isEdit = false, fuelCostId = null) {
        const modal = document.getElementById('vehicle-fuel-cost-modal');
        const modalTitle = document.getElementById('vehicle-fuel-modal-title');
        const form = document.getElementById('vehicle-fuel-cost-form');

        if (!modal || !modalTitle || !form) return;

        // Reset form
        form.reset();

        // Set vehicle ID in hidden field
        const vehicleIdField = document.getElementById('vehicle-fuel-vehicle-id');
        if (vehicleIdField) vehicleIdField.value = vehicleId;

        if (isEdit && fuelCostId) {
            modalTitle.textContent = 'Tankkosten bearbeiten';

            // Load fuel cost data
            fetch(`/api/fuelcosts/${fuelCostId}`)
                .then(response => {
                    if (!response.ok) throw new Error('Tankkosten nicht gefunden');
                    return response.json();
                })
                .then(data => {
                    const fuelCost = data.fuelCost;

                    // Fill form fields
                    if (fuelCost.date) {
                        document.getElementById('vehicle-fuel-date').value = formatDateForInput(fuelCost.date);
                    }

                    const driverSelect = document.getElementById('vehicle-fuel-driver');
                    if (driverSelect && fuelCost.driverId) {
                        driverSelect.value = fuelCost.driverId;
                    }

                    document.getElementById('vehicle-fuel-type').value = fuelCost.fuelType || 'Diesel';
                    document.getElementById('vehicle-fuel-amount').value = fuelCost.amount || '';
                    document.getElementById('vehicle-fuel-price-per-unit').value = fuelCost.pricePerUnit || '';
                    document.getElementById('vehicle-fuel-total-cost').value = fuelCost.totalCost || '';
                    document.getElementById('vehicle-fuel-mileage').value = fuelCost.mileage || '';
                    document.getElementById('vehicle-fuel-location').value = fuelCost.location || '';
                    document.getElementById('vehicle-fuel-receipt-number').value = fuelCost.receiptNumber || '';
                    document.getElementById('vehicle-fuel-notes').value = fuelCost.notes || '';

                    // Add hidden field for fuel cost ID
                    let idInput = form.querySelector('input[name="fuel-cost-id"]');
                    if (!idInput) {
                        idInput = document.createElement('input');
                        idInput.type = 'hidden';
                        idInput.name = 'fuel-cost-id';
                        form.appendChild(idInput);
                    }
                    idInput.value = fuelCostId;
                })
                .catch(error => {
                    console.error('Error loading fuel cost:', error);
                    closeFuelCostModal();
                    showNotification('Fehler beim Laden der Tankkosten', 'error');
                });
        } else {
            modalTitle.textContent = 'Tankkosten hinzufügen';

            // Prefill current date
            const today = new Date();
            document.getElementById('vehicle-fuel-date').value = formatDateForInput(today);

            // Prefill current mileage if available
            if (currentVehicle && currentVehicle.mileage) {
                document.getElementById('vehicle-fuel-mileage').value = currentVehicle.mileage;
            }

            // Prefill fuel type from vehicle
            if (currentVehicle && currentVehicle.fuelType) {
                const fuelType = document.getElementById('vehicle-fuel-type');
                // Map vehicle fuel type to options in select
                switch (currentVehicle.fuelType.toLowerCase()) {
                    case 'diesel':
                        fuelType.value = 'Diesel';
                        break;
                    case 'benzin':
                    case 'gasoline':
                        fuelType.value = 'Benzin';
                        break;
                    case 'elektro':
                    case 'electric':
                        fuelType.value = 'Elektro';
                        break;
                    case 'gas':
                        fuelType.value = 'Gas';
                        break;
                }
            }

            // Remove fuel-cost-id if it exists
            const idInput = form.querySelector('input[name="fuel-cost-id"]');
            if (idInput) idInput.remove();
        }

        // Load drivers for selection
        loadDriversForFuelCostSelect();

        modal.classList.remove('hidden');
    }

    /**
     * Close the fuel cost modal
     */
    function closeFuelCostModal() {
        const modal = document.getElementById('vehicle-fuel-cost-modal');
        if (modal) modal.classList.add('hidden');
    }

    /**
     * Handle the fuel cost form submission
     */
    function handleFuelCostSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const fuelCostData = {};

        // Convert form data to object
        for (let [key, value] of formData.entries()) {
            fuelCostData[key] = value;
        }

        // Check if it's an edit
        const fuelCostId = fuelCostData['fuel-cost-id'];
        const isEdit = !!fuelCostId;

        // Prepare API request
        const apiUrl = isEdit ? `/api/fuelcosts/${fuelCostId}` : '/api/fuelcosts';
        const method = isEdit ? 'PUT' : 'POST';

        // Convert data to API expected format
        const apiData = {
            vehicleId: fuelCostData['vehicle-id'] || vehicleId,
            driverId: fuelCostData['driver'] || '',
            date: fuelCostData['fuel-date'],
            fuelType: fuelCostData['fuel-type'],
            amount: parseFloat(fuelCostData['amount']) || 0,
            pricePerUnit: parseFloat(fuelCostData['price-per-unit']) || 0,
            totalCost: parseFloat(fuelCostData['total-cost']) || 0,
            mileage: parseInt(fuelCostData['mileage']) || 0,
            location: fuelCostData['location'] || '',
            receiptNumber: fuelCostData['receipt-number'] || '',
            notes: fuelCostData['notes'] || ''
        };

        // Send API request
        fetch(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        })
            .then(response => {
                if (!response.ok) throw new Error('Fehler beim Speichern der Tankkosten');
                return response.json();
            })
            .then(data => {
                closeFuelCostModal();
                loadFuelCostsData(); // Refresh

                // Update vehicle mileage if higher than current
                if (apiData.mileage > (currentVehicle?.mileage || 0)) {
                    updateVehicleMileage(apiData.mileage);
                }

                showNotification(
                    isEdit ? 'Tankkosten erfolgreich aktualisiert' : 'Tankkosten erfolgreich erfasst',
                    'success'
                );
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Fehler beim Speichern: ' + error.message, 'error');
            });
    }

    /**
     * Load drivers for fuel cost select
     */
    function loadDriversForFuelCostSelect() {
        const driverSelect = document.getElementById('vehicle-fuel-driver');
        if (!driverSelect) return;

        fetch('/api/drivers')
            .then(response => {
                if (!response.ok) throw new Error('Fehler beim Laden der Fahrer');
                return response.json();
            })
            .then(data => {
                const drivers = data.drivers || [];

                // Keep first option (if exists)
                const firstOption = driverSelect.querySelector('option:first-child');
                driverSelect.innerHTML = '';
                if (firstOption) driverSelect.appendChild(firstOption);

                // Add drivers
                drivers.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = `${driver.firstName} ${driver.lastName}`;
                    driverSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading drivers:', error);
            });
    }

    /**
     * Update vehicle mileage
     */
    function updateVehicleMileage(newMileage) {
        if (!currentVehicle || !newMileage || newMileage <= (currentVehicle.mileage || 0)) return;

        // Update vehicle with new mileage
        fetch(`/api/vehicles/${vehicleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...currentVehicle,
                mileage: newMileage
            })
        })
            .then(response => {
                if (!response.ok) throw new Error('Fehler beim Aktualisieren des Kilometerstands');
                return response.json();
            })
            .then(data => {
                // Update local vehicle data
                currentVehicle = data.vehicle;

                // Update display
                setElementText('mileage-display', `${newMileage} km`);
            })
            .catch(error => {
                console.error('Error updating vehicle mileage:', error);
            });
    }

    // ===== REGISTRATION FUNCTIONALITY =====

    /**
     * Set up registration modal
     */
    function setupRegistrationModal() {
        // "Edit Registration" button
        const editRegistrationBtn = document.getElementById('edit-registration-btn');
        if (editRegistrationBtn) {
            editRegistrationBtn.addEventListener('click', openRegistrationModal);
        }

        // Close button in Registration modal
        const closeRegistrationBtn = document.getElementById('close-registration-modal-btn');
        if (closeRegistrationBtn) {
            closeRegistrationBtn.addEventListener('click', closeRegistrationModal);
        }

        // Registration form submit
        const registrationForm = document.getElementById('registration-form');
        if (registrationForm) {
            registrationForm.addEventListener('submit', handleRegistrationSubmit);
        }
    }

    /**
     * Initialize registration tab
     */
    function initRegistrationTab(vehicle) {
        updateRegistrationDisplay(vehicle);
    }

    /**
     * Update registration display
     */
    function updateRegistrationDisplay(vehicle) {
        // Update registration data display
        setElementText('registration-date-display', formatDate(vehicle.registrationDate) || '-');
        setElementText('registration-expiry-display', formatDate(vehicle.registrationExpiry) || '-');
        setElementText('next-inspection-display', formatDate(vehicle.nextInspectionDate) || '-');
        setElementText('insurance-company-display', vehicle.insuranceCompany || '-');
        setElementText('insurance-number-display', vehicle.insuranceNumber || '-');
        setElementText('insurance-type-display', vehicle.insuranceType || '-');
        setElementText('insurance-expiry-display', formatDate(vehicle.insuranceExpiry) || '-');
        setElementText('insurance-cost-display', vehicle.insuranceCost ? formatCurrency(vehicle.insuranceCost) : '-');
    }

    /**
     * Open the registration modal
     */
    function openRegistrationModal() {
        const modal = document.getElementById('registration-modal');
        if (!modal) return;

        // Load current vehicle data
        fetch(`/api/vehicles/${vehicleId}`)
            .then(response => response.json())
            .then(data => {
                const vehicle = data.vehicle;

                // Fill form fields
                document.getElementById('registration-date').value = formatDateForInput(vehicle.registrationDate);
                document.getElementById('registration-expiry').value = formatDateForInput(vehicle.registrationExpiry);
                document.getElementById('next-inspection').value = formatDateForInput(vehicle.nextInspectionDate);
                document.getElementById('insurance-company').value = vehicle.insuranceCompany || '';
                document.getElementById('insurance-number').value = vehicle.insuranceNumber || '';
                document.getElementById('insurance-type').value = vehicle.insuranceType || 'Haftpflicht';
                document.getElementById('insurance-expiry').value = formatDateForInput(vehicle.insuranceExpiry);
                document.getElementById('insurance-cost').value = vehicle.insuranceCost || '';

                // Add hidden field for Vehicle ID
                let vehicleIdInput = document.querySelector('#registration-form input[name="vehicle-id"]');
                if (!vehicleIdInput) {
                    vehicleIdInput = document.createElement('input');
                    vehicleIdInput.type = 'hidden';
                    vehicleIdInput.name = 'vehicle-id';
                    document.getElementById('registration-form').appendChild(vehicleIdInput);
                }
                vehicleIdInput.value = vehicleId;

                // Show modal
                modal.classList.remove('hidden');
            })
            .catch(error => {
                console.error('Error loading vehicle data:', error);
                showNotification('Fehler beim Laden der Fahrzeugdaten', 'error');
            });
    }

    /**
     * Close the registration modal
     */
    function closeRegistrationModal() {
        const modal = document.getElementById('registration-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Handle the registration form submission
     */
    function handleRegistrationSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const registrationData = {};

        // Collect form data
        for (let [key, value] of formData.entries()) {
            registrationData[key] = value;
        }

        const vehicleId = registrationData['vehicle-id'];
        if (!vehicleId) {
            showNotification('Fahrzeug-ID fehlt. Bitte die Seite neu laden.', 'error');
            return;
        }

        // Get current vehicle data to retain existing state
        fetch(`/api/vehicles/${vehicleId}`)
            .then(response => response.json())
            .then(data => {
                const vehicle = data.vehicle;

                // Merge data
                const updateData = {
                    registrationDate: registrationData['registration-date'] || null,
                    registrationExpiry: registrationData['registration-expiry'] || null,
                    nextInspectionDate: registrationData['next-inspection'] || null,
                    insuranceCompany: registrationData['insurance-company'] || '',
                    insuranceNumber: registrationData['insurance-number'] || '',
                    insuranceType: registrationData['insurance-type'] || 'Haftpflicht',
                    insuranceExpiry: registrationData['insurance-expiry'] || null,
                    insuranceCost: parseFloat(registrationData['insurance-cost']) || 0
                };

                // Update vehicle
                return fetch(`/api/vehicles/${vehicleId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...vehicle,
                        ...updateData
                    })
                });
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.json();
            })
            .then(data => {
                closeRegistrationModal();
                showNotification('Zulassungs- und Versicherungsdaten erfolgreich aktualisiert', 'success');

                // Update current vehicle data
                currentVehicle = data.vehicle;

                // Update display
                updateRegistrationDisplay(data.vehicle);
            })
            .catch(error => {
                console.error('Error saving data:', error);
                showNotification('Fehler beim Speichern: ' + error.message, 'error');
            });
    }

    // ===== UTILITY FUNCTIONS =====

    /**
     * Combine date and time into ISO string
     */
    function combineDateTime(dateStr, timeStr) {
        if (!dateStr) return null;

        const date = new Date(dateStr);

        if (timeStr) {
            const [hours, minutes] = timeStr.split(':');
            date.setHours(parseInt(hours) || 0);
            date.setMinutes(parseInt(minutes) || 0);
        }

        return date.toISOString();
    }

    /**
     * Format date for display
     */
    function formatDate(dateString) {
        if (!dateString) return null;

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;

        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Format date and time for display
     */
    function formatDateTime(dateString) {
        if (!dateString) return null;

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;

        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) + ', ' + date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        }) + ' Uhr';
    }

    /**
     * Format date for input fields
     */
    function formatDateForInput(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    /**
     * Format time for input fields
     */
    function formatTimeForInput(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${hours}:${minutes}`;
    }

    /**
     * Format number for display
     */
    function formatNumber(number, decimals = 0) {
        if (number === undefined || number === null) return '-';
        return parseFloat(number).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    /**
     * Format currency for display
     */
    function formatCurrency(number) {
        if (number === undefined || number === null) return '-';
        return parseFloat(number).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    }

    /**
     * Get most frequent item in array
     */
    function getMostFrequent(arr) {
        if (!arr || !arr.length) return null;

        const frequency = {};
        let maxItem = arr[0];
        let maxCount = 1;

        arr.forEach(item => {
            if (item in frequency) {
                frequency[item]++;
            } else {
                frequency[item] = 1;
            }

            if (frequency[item] > maxCount) {
                maxItem = item;
                maxCount = frequency[item];
            }
        });

        return maxItem;
    }

    /**
     * Set element text with fallback
     */
    function setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text || '-';
        }
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        // Create or get container for notifications
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 items-end';
            document.body.appendChild(container);
        }

        // Create new notification
        const notification = document.createElement('div');

        // Set style based on type
        let bgColorClass, textColorClass, iconSvg;

        switch (type) {
            case 'success':
                bgColorClass = 'bg-green-100 dark:bg-green-800';
                textColorClass = 'text-green-800 dark:text-green-100';
                iconSvg = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>`;
                break;
            case 'error':
                bgColorClass = 'bg-red-100 dark:bg-red-800';
                textColorClass = 'text-red-800 dark:text-red-100';
                iconSvg = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>`;
                break;
            case 'warning':
                bgColorClass = 'bg-yellow-100 dark:bg-yellow-800';
                textColorClass = 'text-yellow-800 dark:text-yellow-100';
                iconSvg = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>`;
                break;
            default: // info
                bgColorClass = 'bg-blue-100 dark:bg-blue-800';
                textColorClass = 'text-blue-800 dark:text-blue-100';
                iconSvg = `<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"></path>
                </svg>`;
        }

        // Compose notification
        notification.className = `${bgColorClass} ${textColorClass} p-4 rounded-lg shadow-md flex items-center max-w-md transform transition-all duration-300 ease-in-out translate-x-full`;
        notification.innerHTML = `
            ${iconSvg}
            <div class="flex-1">${message}</div>
            <button type="button" class="ml-4 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100" onclick="this.parentElement.remove()">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </button>
        `;

        // Add to DOM
        container.appendChild(notification);

        // Animation to show
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 10);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            notification.addEventListener('transitionend', () => {
                notification.remove();
            });
        }, 5000);
    }
});