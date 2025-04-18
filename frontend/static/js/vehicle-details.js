/**
 * Create fuel stats chart
 */
function createFuelStatsChart(monthlyCosts) {
    const chartElement = document.getElementById('stats-fuel-costs-chart');
    if (!chartElement || !window.ApexCharts) return;

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
            name: 'Fuel Costs',
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
                text: 'Costs (€)'
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
    if (window.statsChart) {
        window.statsChart.destroy();
    }

    // Create new chart and save globally
    window.statsChart = new ApexCharts(chartElement, options);
    window.statsChart.render();
}

/**
 * Update general statistics
 */
function updateGeneralStatistics(totalDistance, costPerKm, totalCosts) {
    const totalKilometers = document.getElementById('total-kilometers');
    const costPerKmElement = document.getElementById('cost-per-km');
    const totalCostElement = document.getElementById('total-cost');

    if (totalKilometers) totalKilometers.textContent = formatNumber(totalDistance) + ' km';
    if (costPerKmElement) costPerKmElement.textContent = formatCurrency(costPerKm) + '/km';
    if (totalCostElement) totalCostElement.textContent = formatCurrency(totalCosts);
}

// ===== REGISTRATION & INSURANCE FUNCTIONALITY =====

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

        // Load vehicle data
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
                showNotification('Error loading vehicle data: ' + error.message, 'error');
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
            showNotification('Vehicle ID missing. Please reload the page.', 'error');
            return;
        }

        // Get current vehicle to retain existing state
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

                // Update vehicle (only relevant fields)
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
                showNotification('Registration and insurance data updated successfully!', 'success');

                // Update display
                updateRegistrationDisplay(data.vehicle);
            })
            .catch(error => {
                console.error('Error saving data:', error);
                showNotification('Error saving data: ' + error.message, 'error');
            });
    }

    // ===== STATISTICS FUNCTIONALITY =====

    /**
     * Create charts for statistics page
     */
    function createCharts(vehicle) {
        // Only create charts if tab exists
        if (!document.getElementById('statistics')) return;

        // Calculate monthly insurance costs (if available)
        // Make sure we have a numeric value
        const insuranceCost = vehicle.insuranceCost ? parseFloat(vehicle.insuranceCost) : 0;
        const monthlyInsuranceCost = insuranceCost / 12;

        // Generate current data for last 12 months
        const currentDate = new Date();
        let costData = []; // Make sure it's an array

        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentDate);
            date.setMonth(currentDate.getMonth() - i);

            const monthName = date.toLocaleDateString('de-DE', {month: 'short'});
            const year = date.getFullYear();

            // Could add more costs like maintenance etc. in the future
            costData.push({
                month: monthName,
                year: year.toString(),
                cost: monthlyInsuranceCost.toFixed(2)
            });
        }

        console.log("Generated cost data:", costData);

        // Driver data - could be determined from actual usage history later
        const driverData = [
            {driver: 'Max Mustermann', usage: 42},
            {driver: 'Erika Musterfrau', usage: 28},
            {driver: 'John Doe', usage: 18},
            {driver: 'Other', usage: 12}
        ];

        const projectData = [
            {project: 'Digital Transformation', usage: 35},
            {project: 'Sales Visits', usage: 25},
            {project: 'Training', usage: 20},
            {project: 'Other', usage: 20}
        ];

        // Create cost chart
        createCostChart(costData);

        // Create driver pie chart
        createDriverPieChart(driverData);

        // Create project pie chart
        createProjectPieChart(projectData);

        // Update statistics
        updateStatisticsSummary(vehicle, costData, driverData);
    }

    /**
     * Create cost chart
     */
    function createCostChart(data) {
        const chartElement = document.getElementById('costChart');
        if (!chartElement) return;

        const options = {
            chart: {
                height: 350,
                type: 'bar',
                toolbar: {
                    show: false
                }
            },
            colors: ['#3b82f6'],
            plotOptions: {
                bar: {
                    columnWidth: '55%',
                    borderRadius: 4
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
            xaxis: {
                categories: data.map(item => `${item.month} ${item.year}`),
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                }
            },
            yaxis: {
                title: {
                    text: 'Costs (€)'
                }
            },
            fill: {
                opacity: 1
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + " €";
                    }
                }
            }
        };

        const series = [{
            name: 'Costs',
            data: data.map(item => parseFloat(item.cost))
        }];

        const chart = new ApexCharts(chartElement, {
            ...options,
            series: series
        });

        chart.render();
    }

    /**
     * Create driver pie chart
     */
    function createDriverPieChart(data) {
        const chartElement = document.getElementById('driverPieChart');
        if (!chartElement) return;

        const options = {
            chart: {
                type: 'pie',
                height: 320,
                toolbar: {
                    show: false
                }
            },
            colors: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'],
            labels: data.map(item => item.driver),
            series: data.map(item => item.usage),
            legend: {
                position: 'bottom'
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + "%";
                    }
                }
            }
        };

        const chart = new ApexCharts(chartElement, options);
        chart.render();
    }

    /**
     * Create project pie chart
     */
    function createProjectPieChart(data) {
        const chartElement = document.getElementById('projectPieChart');
        if (!chartElement) return;

        const options = {
            chart: {
                type: 'pie',
                height: 320,
                toolbar: {
                    show: false
                }
            },
            colors: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'],
            labels: data.map(item => item.project),
            series: data.map(item => item.usage),
            legend: {
                position: 'bottom'
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + "%";
                    }
                }
            }
        };

        const chart = new ApexCharts(chartElement, options);
        chart.render();
    }

    /**
     * Update statistics summary
     */
    function updateStatisticsSummary(vehicle, costData, driverData) {
        // Make sure costData is an array before using reduce
        if (!Array.isArray(costData)) {
            console.error("costData is not an array:", costData);
            costData = []; // Fallback to empty array
        }

        // Calculate total costs with error handling
        let totalCost = 0;
        try {
            totalCost = costData.reduce((sum, item) => {
                // Make sure cost is a numeric value
                const itemCost = parseFloat(item.cost) || 0;
                return sum + itemCost;
            }, 0);
        } catch (error) {
            console.error("Error calculating total costs:", error);
        }

        // Use real data where available
        const totalKilometers = vehicle.mileage || 0;
        const costPerKm = totalKilometers > 0 ? (totalCost / totalKilometers).toFixed(4) : 0;

        // Utilization could be calculated from usage history later
        const utilization = 65; // Placeholder until real data is available

        // Update UI
        setElementText('total-kilometers', `${totalKilometers.toLocaleString()} km`);
        setElementText('cost-per-km', `${costPerKm} € / km`);
        setElementText('total-cost', `${totalCost.toLocaleString()} €`);
        setElementText('utilization', `${utilization}%`);
    }

    // ===== UTILITY FUNCTIONS =====

    /**
     * Format date for display
     */
    function formatDate(dateString) {
        if (!dateString) return '-';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';

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
        if (!dateString) return '-';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';

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
     * Set element text with fallback
     */
    function setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text || '-'; // Fallback to "-" if no text
        } else {
            console.warn(`Element with ID ${elementId} not found`);
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

        // Log to console
        console.log(`Notification (${type}):`, message);
    }
});
/**
 * Vehicle Details Functionality
 * This file contains functionality for the vehicle details page.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    const vehicleId = window.location.pathname.split('/').pop();
    let fuelCostsChart = null;
    let statsChart = null;

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

        // Initialize fuel costs tab
        initializeFuelCosts();
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
                    btn.classList.remove('border-blue-500', 'text-blue-600');
                    btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                });

                // Show selected tab
                document.getElementById(tabName).classList.remove('hidden');

                // Highlight current button
                button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                button.classList.add('border-blue-500', 'text-blue-600');

                // Load specific data for statistics tab
                if (tabName === 'statistics') {
                    loadFuelStatsForStatisticsTab();
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
        // Set up modals for maintenance, usage, and vehicle editing
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
                console.log("Loaded vehicle data:", vehicle);

                if (!vehicle) {
                    throw new Error('No vehicle data in response');
                }

                // Update header info
                updateHeaderInfo(vehicle);

                // Update UI with vehicle data
                updateVehicleDisplay(vehicle);

                // Load driver data if driver is assigned
                if (vehicle.currentDriverId && vehicle.currentDriverId !== '000000000000000000000000') {
                    loadCurrentDriverData(vehicle.currentDriverId);
                } else {
                    updateCurrentUsageDisplay(null);
                }

                // Load maintenance entries
                loadMaintenanceEntries();

                // Load usage history
                loadUsageHistory();

                // Create charts with real vehicle data
                if (typeof ApexCharts !== 'undefined') {
                    createCharts(vehicle);
                }

                // Initialize registration tab
                initRegistrationTab(vehicle);
            })
            .catch(error => {
                console.error('Error loading vehicle data:', error);
                showNotification('Error loading vehicle data', 'error');
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

        if (vehicleTitle) {
            vehicleTitle.textContent = fullVehicleName;
        }

        if (vehicleHeader) {
            vehicleHeader.textContent = fullVehicleName;
        }

        if (vehicleSubheader) {
            vehicleSubheader.textContent = `${vehicle.year || ''} · ${vehicle.fuelType || 'Unknown fuel type'}`;
        }

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
                    label: 'Available'
                };
            case 'inuse':
                return {
                    bg: 'bg-red-100',
                    text: 'text-red-800',
                    darkBg: 'bg-red-900/30',
                    darkText: 'text-red-400',
                    label: 'In Use'
                };
            case 'maintenance':
                return {
                    bg: 'bg-yellow-100',
                    text: 'text-yellow-800',
                    darkBg: 'bg-yellow-900/30',
                    darkText: 'text-yellow-400',
                    label: 'Maintenance'
                };
            default:
                return {
                    bg: 'bg-gray-100',
                    text: 'text-gray-800',
                    darkBg: 'bg-gray-700',
                    darkText: 'text-gray-300',
                    label: status || 'Unknown'
                };
        }
    }

    /**
     * Update the vehicle details display
     */
    function updateVehicleDisplay(vehicle) {
        console.log("Updating vehicle details with:", vehicle);

        // Basic information
        setElementText('license-plate-display', vehicle.licensePlate || '-');
        setElementText('brand-model-display', (vehicle.brand + ' ' + vehicle.model) || '-');
        setElementText('year-display', vehicle.year || '-');
        setElementText('color-display', vehicle.color || '-');
        setElementText('vehicle-id-display', vehicle.vehicleId || '-');
        setElementText('vin-display', vehicle.vin || '-');
        setElementText('fuel-type-display', vehicle.fuelType || '-');
        setElementText('mileage-display', vehicle.mileage ? `${vehicle.mileage} km` : '-');

        // Registration and insurance
        setElementText('registration-date-display', formatDate(vehicle.registrationDate) || '-');
        setElementText('registration-expiry-display', formatDate(vehicle.registrationExpiry) || '-');
        setElementText('next-inspection-display', formatDate(vehicle.nextInspectionDate) || '-');
        setElementText('insurance-company-display', vehicle.insuranceCompany || '-');
        setElementText('insurance-number-display', vehicle.insuranceNumber || '-');
        setElementText('insurance-type-display', vehicle.insuranceType || '-');
        setElementText('insurance-expiry-display', formatDate(vehicle.insuranceExpiry) || '-');
        setElementText('insurance-cost-display', vehicle.insuranceCost ? formatCurrency(vehicle.insuranceCost) : '-');

        // Prefill forms (for modals)
        if (document.getElementById('edit-vehicle-form')) {
            document.getElementById('license_plate').value = vehicle.licensePlate || '';
            document.getElementById('model').value = (vehicle.brand + ' ' + vehicle.model) || '';
            document.getElementById('year').value = vehicle.year || '';
            document.getElementById('color').value = vehicle.color || '';
            document.getElementById('vehicle_id').value = vehicle.vehicleId || '';
            document.getElementById('vin').value = vehicle.vin || '';
            document.getElementById('fuel_type').value = vehicle.fuelType || '';
            document.getElementById('current_mileage').value = vehicle.mileage || 0;

            if (vehicle.registrationDate) {
                document.getElementById('registration_date').value = formatDateForInput(vehicle.registrationDate);
            }

            if (vehicle.nextInspectionDate) {
                document.getElementById('next_inspection').value = formatDateForInput(vehicle.nextInspectionDate);
            }

            document.getElementById('insurance').value = vehicle.insuranceCompany || '';
            document.getElementById('insurance_number').value = vehicle.insuranceNumber || '';
            document.getElementById('insurance_type').value = vehicle.insuranceType || '';
            document.getElementById('insurance_cost').value = vehicle.insuranceCost || '';
            document.getElementById('vehicle_notes').value = vehicle.notes || '';
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
                console.log("Loaded driver data:", driver);

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
                        return {driver, activeUsage};
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
                        <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Current Usage</h3>
                    </div>
                    <div class="px-4 py-5 sm:p-6 text-center text-gray-500 dark:text-gray-400">
                        <p>This vehicle is currently not in use.</p>
                        <button id="start-usage-btn" type="button" class="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                            <svg class="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Start Usage
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
        let usageStartDate = "Unknown";
        let usageEndDate = "Not set";
        let department = "";
        let project = "";

        if (activeUsage) {
            usageStartDate = formatDateTime(activeUsage.startDate);

            if (activeUsage.endDate) {
                usageEndDate = formatDateTime(activeUsage.endDate);
            }

            department = activeUsage.department || "";
            project = activeUsage.project || activeUsage.purpose || "";
        }

        currentUsageTab.innerHTML = `
            <div class="bg-white overflow-hidden shadow rounded-lg dark:bg-gray-800">
                <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 dark:bg-gray-700 dark:border-gray-600 flex justify-between items-center">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Current Usage</h3>
                    <button type="button" id="edit-current-usage-btn" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50">
                        <svg class="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                    </button>
                </div>
                <div class="px-4 py-5 sm:p-6">
                    <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Current Driver</dt>
                            <dd class="mt-1 text-sm text-gray-900 dark:text-white">${driver.firstName} ${driver.lastName}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Department</dt>
                            <dd class="mt-1 text-sm text-gray-900 dark:text-white">${department || "Not specified"}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">In use since</dt>
                            <dd class="mt-1 text-sm text-gray-900 dark:text-white">${usageStartDate}</dd>
                        </div>
                        <div class="sm:col-span-1">
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Planned return</dt>
                            <dd class="mt-1 text-sm text-gray-900 dark:text-white">${usageEndDate}</dd>
                        </div>
                        <div class="sm:col-span-2">
                            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Project/Purpose</dt>
                            <dd class="mt-1 text-sm text-gray-900 dark:text-white">${project || "Not specified"}</dd>
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
                console.log("Loaded maintenance entries:", maintenanceEntries);
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
                    <td class="py-3.5 pl-4 pr-3 text-left text-sm text-gray-900 dark:text-white sm:pl-6">${timeframe}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.driverName || '-'}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.project || entry.purpose || '-'}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${mileageInfo}</td>
                    <td class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                        <button class="edit-usage-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" data-id="${entry.id}">
                            Edit
                        </button>
                    </td>
                </tr>
                    <td colspan="5" class="py-4 text-center text-gray-500 dark:text-gray-400">
                        No maintenance entries found.
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
            let type = 'Other';

            switch (entry.type) {
                case 'inspection': type = 'Inspection'; break;
                case 'oil-change': type = 'Oil Change'; break;
                case 'tire-change': type = 'Tire Change'; break;
                case 'repair': type = 'Repair'; break;
            }

            return `
                <tr>
                    <td class="py-3.5 pl-4 pr-3 text-left text-sm text-gray-900 dark:text-white sm:pl-0">${date}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${type}</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.mileage} km</td>
                    <td class="px-3 py-3.5 text-left text-sm text-gray-900 dark:text-white">${entry.cost ? (entry.cost + ' €') : '-'}</td>
                    <td class="relative py-3.5 pl-3 pr-4 sm:pr-0 text-right">
                        <button class="edit-maintenance-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" data-id="${entry.id}">
                            Edit
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
            modalTitle.textContent = 'Edit Maintenance/Inspection';

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
                    showNotification('Error loading maintenance entry', 'error');
                });
        } else {
            modalTitle.textContent = 'Add Maintenance/Inspection';

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
                    isEdit ? 'Maintenance entry updated successfully' : 'Maintenance entry created successfully',
                    'success'
                );
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error saving: ' + error.message, 'error');
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
                console.log("Loaded usage entries:", usageEntries);
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
                        No usage entries found.
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
                            Edit
                        </button>
                    </td>
                </tr>