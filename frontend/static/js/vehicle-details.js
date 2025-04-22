// frontend/static/js/vehicle-details.js


import VehicleBasicInfo from './vehicle-basic-info.js';
import VehicleCurrentUsage from './vehicle-current-usage.js';
import VehicleFuelCosts from './vehicle-fuel-costs.js';
import VehicleMaintenance from './vehicle-maintenance.js';
import VehicleModals from './vehicle-modals.js';
import VehicleRegistration from './vehicle-registration.js';
import VehicleStatistics from './vehicle-statistics.js';
import VehicleUsageHistory from './vehicle-usage-history.js';

// frontend/static/js/vehicle-details.js

class VehicleDetails {

    constructor() {
        this.vehicleId = this.getVehicleIdFromUrl();
        this.modules = {};
        this.initializeModules();
        this.initializeTabs();
        this.loadVehicleHeaderInfo();
    }

    getVehicleIdFromUrl() {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    }

    initializeModules() {
        // Prüfen, ob die Module existieren, bevor wir versuchen, sie zu initialisieren
        if (typeof VehicleBasicInfo !== 'undefined') {
            this.modules.basicInfo = new VehicleBasicInfo(this.vehicleId);
        }

        if (typeof VehicleCurrentUsage !== 'undefined') {
            this.modules.currentUsage = new VehicleCurrentUsage(this.vehicleId);
        }

        if (typeof VehicleFuelCosts !== 'undefined') {
            this.modules.fuelCosts = new VehicleFuelCosts(this.vehicleId);
        }

        if (typeof VehicleMaintenance !== 'undefined') {
            this.modules.maintenance = new VehicleMaintenance(this.vehicleId);
        }

        if (typeof VehicleModals !== 'undefined') {
            this.modules.modals = new VehicleModals(this.vehicleId);
        }

        if (typeof VehicleRegistration !== 'undefined') {
            this.modules.registration = new VehicleRegistration(this.vehicleId);
        }

        if (typeof VehicleStatistics !== 'undefined') {
            this.modules.statistics = new VehicleStatistics(this.vehicleId);
        }

        if (typeof VehicleUsageHistory !== 'undefined') {
            this.modules.usageHistory = new VehicleUsageHistory(this.vehicleId);
        }

        // Nur laden, wenn das Modul existiert
        if (this.modules.basicInfo && typeof this.modules.basicInfo.loadVehicleBasicInfo === 'function') {
            this.modules.basicInfo.loadVehicleBasicInfo();
        }
    }

    initializeTabs() {
        // Tab navigation functionality
        const tabButtons = document.querySelectorAll('.vehicle-tab-btn');
        const tabContents = document.querySelectorAll('.vehicle-tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;

                // Hide all tab contents
                tabContents.forEach(content => {
                    content.classList.add('hidden');
                });

                // Deactivate all tab buttons
                tabButtons.forEach(btn => {
                    btn.classList.remove('border-blue-500', 'text-blue-600');
                    btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                });

                // Show selected tab content
                const selectedContent = document.getElementById(tabId);
                if (selectedContent) {
                    selectedContent.classList.remove('hidden');
                }

                // Activate selected tab button
                button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                button.classList.add('border-blue-500', 'text-blue-600');

                // Load data for the selected tab
                this.loadTabData(tabId);
            });
        });

        // Mobile tab select
        const tabSelect = document.getElementById('tabs');
        if (tabSelect) {
            tabSelect.addEventListener('change', (e) => {
                const selectedTab = e.target.value;
                const tabButton = document.querySelector(`[data-tab="${selectedTab}"]`);
                if (tabButton) {
                    tabButton.click();
                }
            });
        }
    }

    loadTabData(tabId) {
        switch (tabId) {
            case 'basic-info':
                if (this.modules.basicInfo && typeof this.modules.basicInfo.loadVehicleBasicInfo === 'function') {
                    this.modules.basicInfo.loadVehicleBasicInfo();
                }
                break;
            case 'current-usage':
                if (this.modules.currentUsage && typeof this.modules.currentUsage.loadCurrentUsage === 'function') {
                    this.modules.currentUsage.loadCurrentUsage();
                }
                break;
            case 'usage-history':
                if (this.modules.usageHistory && typeof this.modules.usageHistory.loadUsageHistory === 'function') {
                    this.modules.usageHistory.loadUsageHistory();
                }
                break;
            case 'maintenance':
                if (this.modules.maintenance && typeof this.modules.maintenance.loadMaintenanceEntries === 'function') {
                    this.modules.maintenance.loadMaintenanceEntries();
                }
                break;
            case 'fuel-costs':
                if (this.modules.fuelCosts && typeof this.modules.fuelCosts.loadFuelCosts === 'function') {
                    this.modules.fuelCosts.loadFuelCosts();
                }
                break;
            case 'registration-insurance':
                if (this.modules.registration && typeof this.modules.registration.loadRegistrationInsurance === 'function') {
                    this.modules.registration.loadRegistrationInsurance();
                }
                break;
            case 'statistics':
                if (this.modules.statistics && typeof this.modules.statistics.loadStatistics === 'function') {
                    this.modules.statistics.loadStatistics();
                }
                break;
        }
    }

    async loadVehicleHeaderInfo() {
        try {
            const response = await fetch(`/api/vehicles/${this.vehicleId}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Fahrzeugdaten');

            const data = await response.json();
            const vehicle = data.vehicle;

            // Update header information
            const vehicleTitle = document.getElementById('vehicle-title');
            const vehicleHeader = document.getElementById('vehicle-header');
            const vehicleSubheader = document.getElementById('vehicle-subheader');
            const vehicleStatusBadge = document.getElementById('vehicle-status-badge');

            if (vehicleTitle) {
                vehicleTitle.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`;
            }

            if (vehicleHeader) {
                vehicleHeader.textContent = `${vehicle.brand} ${vehicle.model}`;
            }

            if (vehicleSubheader) {
                vehicleSubheader.textContent = `Kennzeichen: ${vehicle.licensePlate}`;
            }

            if (vehicleStatusBadge) {
                const { statusClass, statusText } = this.getStatusInfo(vehicle.status);
                vehicleStatusBadge.className = `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`;
                vehicleStatusBadge.textContent = statusText;
            }
        } catch (error) {
            console.error('Fehler beim Laden der Header-Informationen:', error);
        }
    }

    getStatusInfo(status) {
        switch (status) {
            case 'available':
                return { statusClass: 'bg-green-100 text-green-800', statusText: 'Verfügbar' };
            case 'inuse':
                return { statusClass: 'bg-red-100 text-red-800', statusText: 'In Benutzung' };
            case 'maintenance':
                return { statusClass: 'bg-yellow-100 text-yellow-800', statusText: 'In Wartung' };
            default:
                return { statusClass: 'bg-gray-100 text-gray-800', statusText: 'Unbekannt' };
        }
    }
}



// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.vehicleDetails = new VehicleDetails();
});