// Reservierungs-Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // DOM-Elemente
    const addReservationBtn = document.getElementById('add-reservation-btn');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const listView = document.getElementById('list-view');
    const calendarView = document.getElementById('calendar-view');
    const reservationModal = document.getElementById('reservation-modal');
    const availableVehiclesModal = document.getElementById('available-vehicles-modal');
    const reservationForm = document.getElementById('reservation-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const searchInput = document.getElementById('search');
    const statusFilter = document.getElementById('status-filter');
    const vehicleSelect = document.getElementById('vehicle-select');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const closeAvailableVehiclesBtn = document.getElementById('close-available-vehicles-btn');

    let currentReservationId = null;
    let currentView = 'list'; // 'list' oder 'calendar'
    let reservationsData = []; // Store reservations for calendar
    let includeCompletedReservations = false; // Track current filter state

    // Event Listeners
    addReservationBtn.addEventListener('click', function() {
        openReservationModal(null);
    });
    toggleViewBtn.addEventListener('click', toggleView);
    cancelBtn.addEventListener('click', closeReservationModal);
    closeAvailableVehiclesBtn.addEventListener('click', closeAvailableVehiclesModal);
    reservationForm.addEventListener('submit', handleReservationSubmit);
    searchInput.addEventListener('input', handleSearch);
    statusFilter.addEventListener('change', handleStatusFilter);
    
    // Verfügbare Fahrzeuge prüfen wenn Zeitraum geändert wird
    startTimeInput.addEventListener('change', checkAvailableVehicles);
    endTimeInput.addEventListener('change', checkAvailableVehicles);
    
    // Konfliktprüfung wenn Fahrzeug oder Zeitraum geändert wird
    vehicleSelect.addEventListener('change', checkReservationConflicts);
    startTimeInput.addEventListener('change', checkReservationConflicts);
    endTimeInput.addEventListener('change', checkReservationConflicts);
    
    // Kompatibilitätsprüfung wenn Fahrer oder Fahrzeug geändert wird
    const driverSelect = document.getElementById('driver-select');
    if (driverSelect && vehicleSelect) {
        driverSelect.addEventListener('change', checkReservationDriverCompatibility);
        vehicleSelect.addEventListener('change', checkReservationDriverCompatibility);
    }

    // Modal schließen bei Klick außerhalb
    reservationModal.addEventListener('click', function(e) {
        if (e.target === reservationModal) {
            closeReservationModal();
        }
    });

    availableVehiclesModal.addEventListener('click', function(e) {
        if (e.target === availableVehiclesModal) {
            closeAvailableVehiclesModal();
        }
    });

    // View Toggle Funktion
    function toggleView() {
        if (currentView === 'list') {
            currentView = 'calendar';
            listView.classList.add('hidden');
            calendarView.classList.remove('hidden');
            toggleViewBtn.innerHTML = `
                <svg class="-ml-0.5 mr-1.5 h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Liste
            `;
            initializeCalendar();
        } else {
            currentView = 'list';
            listView.classList.remove('hidden');
            calendarView.classList.add('hidden');
            toggleViewBtn.innerHTML = `
                <svg class="-ml-0.5 mr-1.5 h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Kalender
            `;
        }
    }

    // Reservierung Modal öffnen
    function openReservationModal(reservationId = null) {
        currentReservationId = reservationId;
        const modalTitle = document.getElementById('modal-title');
        const submitBtn = reservationForm.querySelector('button[type="submit"]');

        // Alte Warnungen entfernen
        clearConflictWarnings();

        if (reservationId && reservationId !== null) {
            modalTitle.textContent = 'Reservierung bearbeiten';
            submitBtn.textContent = 'Reservierung aktualisieren';
            loadReservationData(reservationId);
        } else {
            modalTitle.textContent = 'Neue Reservierung';
            submitBtn.textContent = 'Reservierung erstellen';
            reservationForm.reset();
            
            // Minimale Startzeit auf jetzt setzen
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            startTimeInput.min = now.toISOString().slice(0, 16);
            startTimeInput.value = now.toISOString().slice(0, 16);
            
            // Minimale Endzeit eine Stunde später
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
            endTimeInput.value = oneHourLater.toISOString().slice(0, 16);
        }

        reservationModal.classList.remove('hidden');
    }

    // Reservierung Modal schließen
    function closeReservationModal() {
        reservationModal.classList.add('hidden');
        currentReservationId = null;
        reservationForm.reset();
    }

    // Verfügbare Fahrzeuge Modal schließen
    function closeAvailableVehiclesModal() {
        availableVehiclesModal.classList.add('hidden');
    }

    // Reservierung Formular verarbeiten
    async function handleReservationSubmit(e) {
        e.preventDefault();

        const formData = new FormData(reservationForm);
        const reservationData = {
            vehicleId: formData.get('vehicleId'),
            driverId: formData.get('driverId'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            purpose: formData.get('purpose'),
            notes: formData.get('notes')
        };

        // Debug: Ausgabe der Formulardaten
        console.log('Reservation Data:', reservationData);

        // Frontend-Validierung
        if (!reservationData.vehicleId || reservationData.vehicleId === '') {
            showNotification('Bitte wählen Sie ein Fahrzeug aus', 'error');
            return;
        }

        if (!reservationData.driverId || reservationData.driverId === '') {
            showNotification('Bitte wählen Sie einen Fahrer aus', 'error');
            return;
        }

        if (!reservationData.startTime) {
            showNotification('Bitte geben Sie eine Startzeit an', 'error');
            return;
        }

        if (!reservationData.endTime) {
            showNotification('Bitte geben Sie eine Endzeit an', 'error');
            return;
        }

        try {
            let response;
            if (currentReservationId) {
                // Reservierung aktualisieren
                response = await fetch(`/api/reservations/${currentReservationId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(reservationData)
                });
            } else {
                // Neue Reservierung erstellen
                response = await fetch('/api/reservations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(reservationData)
                });
            }

            if (response.ok) {
                showNotification(
                    currentReservationId ? 'Reservierung erfolgreich aktualisiert!' : 'Reservierung erfolgreich erstellt!',
                    'success'
                );
                closeReservationModal();
                reloadReservations();
            } else {
                const error = await response.json();
                showNotification(error.error || 'Fehler beim Speichern der Reservierung', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Fehler beim Speichern der Reservierung', 'error');
        }
    }

    // Verfügbare Fahrzeuge prüfen
    async function checkAvailableVehicles() {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        if (!startTime || !endTime) {
            return;
        }

        if (new Date(startTime) >= new Date(endTime)) {
            showNotification('Startzeit muss vor Endzeit liegen', 'error');
            return;
        }

        try {
            // Bei Bearbeitung einer Reservierung: aktuelle Reservierung ausschließen
            const excludeParam = currentReservationId ? `&excludeReservationId=${currentReservationId}` : '';
            const response = await fetch(`/api/reservations/available-vehicles?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}${excludeParam}`);
            
            if (response.ok) {
                const availableVehicles = await response.json();
                updateVehicleSelect(availableVehicles);
                
                // Button hinzufügen um verfügbare Fahrzeuge anzuzeigen
                showAvailableVehiclesInfo(availableVehicles.length);
            } else {
                console.error('Fehler beim Laden verfügbarer Fahrzeuge');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Fahrzeug-Select aktualisieren
    function updateVehicleSelect(availableVehicles) {
        const currentValue = vehicleSelect.value;
        vehicleSelect.innerHTML = '<option value="">Fahrzeug auswählen</option>';

        availableVehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.id;
            option.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`;
            vehicleSelect.appendChild(option);
        });

        // Vorherige Auswahl wiederherstellen wenn noch verfügbar
        if (currentValue && [...vehicleSelect.options].some(opt => opt.value === currentValue)) {
            vehicleSelect.value = currentValue;
        }
    }

    // Info über verfügbare Fahrzeuge anzeigen
    function showAvailableVehiclesInfo(count) {
        const infoDiv = document.getElementById('available-vehicles-info') || createAvailableVehiclesInfo();
        infoDiv.textContent = `${count} Fahrzeug(e) verfügbar`;
        infoDiv.className = count > 0 ? 'text-sm text-green-600 mt-1' : 'text-sm text-red-600 mt-1';
    }

    // Info-Element für verfügbare Fahrzeuge erstellen
    function createAvailableVehiclesInfo() {
        const infoDiv = document.createElement('div');
        infoDiv.id = 'available-vehicles-info';
        vehicleSelect.parentNode.appendChild(infoDiv);
        return infoDiv;
    }

    // Reservierungen laden
    async function loadReservations(includeCompleted = false) {
        try {
            const url = includeCompleted ? '/api/reservations?includeCompleted=true' : '/api/reservations';
            const response = await fetch(url);
            if (response.ok) {
                const reservations = await response.json();
                reservationsData = reservations; // Store for calendar
                updateReservationsTable(reservations);
                if (currentView === 'calendar') {
                    updateCalendar(); // Update calendar if currently visible
                }
            } else {
                console.error('Fehler beim Laden der Reservierungen');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Reservierungstabelle aktualisieren
    function updateReservationsTable(reservations) {
        const tbody = document.getElementById('reservations-table-body');
        tbody.innerHTML = '';

        if (reservations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">
                        Keine Reservierungen gefunden
                    </td>
                </tr>
            `;
            return;
        }

        reservations.forEach(reservation => {
            const row = createReservationRow(reservation);
            tbody.appendChild(row);
        });
    }

    // Reservierungs-Zeile erstellen
    function createReservationRow(reservation) {
        const row = document.createElement('tr');
        row.dataset.id = reservation.id;
        row.dataset.status = reservation.status; // Store status for filtering

        const statusClass = getStatusClass(reservation.status);
        const statusText = getStatusText(reservation.status);

        row.innerHTML = `
            <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0">
                        <div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V7M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/>
                            </svg>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                            ${reservation.vehicle ? `${reservation.vehicle.brand} ${reservation.vehicle.model}` : 'Unbekannt'}
                        </div>
                        <div class="text-sm text-gray-500">
                            ${reservation.vehicle ? reservation.vehicle.licensePlate : '--'}
                        </div>
                    </div>
                </div>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                <div class="text-sm font-medium text-gray-900">
                    ${reservation.driver ? `${reservation.driver.firstName} ${reservation.driver.lastName}` : 'Unbekannt'}
                </div>
                <div class="text-sm text-gray-500">
                    ${reservation.driver ? reservation.driver.email : '--'}
                </div>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                <div class="text-sm font-medium text-gray-900">
                    ${formatDateTime(reservation.startTime)}
                </div>
                <div class="text-sm text-gray-500">
                    bis ${formatDateTime(reservation.endTime)}
                </div>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                <div class="text-sm text-gray-900">${reservation.purpose || '--'}</div>
                ${reservation.notes ? `<div class="text-sm text-gray-500">${reservation.notes}</div>` : ''}
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div class="flex items-center justify-end gap-2">
                    ${getActionButtons(reservation)}
                </div>
            </td>
        `;

        return row;
    }

    // Status-CSS-Klasse ermitteln
    function getStatusClass(status) {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'active': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    // Status-Text ermitteln
    function getStatusText(status) {
        switch (status) {
            case 'pending': return 'Reservierung';
            case 'active': return 'Aktiv';
            case 'completed': return 'Abgeschlossen';
            case 'cancelled': return 'Storniert';
            default: return 'Unbekannt';
        }
    }

    // Aktions-Buttons basierend auf Status
    function getActionButtons(reservation) {
        let buttons = '';

        if (reservation.status === 'pending') {
            buttons += `<button type="button" onclick="editReservation('${reservation.id}')" class="text-indigo-600 hover:text-indigo-900">Bearbeiten</button>`;
        }

        if (reservation.status === 'active') {
            buttons += `<button type="button" onclick="completeReservation('${reservation.id}')" class="text-green-600 hover:text-green-900">Abschließen</button>`;
        }

        if (reservation.status === 'pending' || reservation.status === 'active') {
            buttons += `<button type="button" onclick="cancelReservation('${reservation.id}')" class="text-red-600 hover:text-red-900">Stornieren</button>`;
        }

        return buttons;
    }

    // Datum und Zeit formatieren
    function formatDateTime(dateTimeString) {
        // Parse the timezone-aware timestamp directly
        const date = new Date(dateTimeString);
        
        return date.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Nur Zeit formatieren (für Kalender)
    function formatTimeOnly(dateTimeString) {
        // Parse the timezone-aware timestamp directly
        const date = new Date(dateTimeString);
        
        return date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Suche handhaben
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#reservations-table-body tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    // Reservierungen mit aktuellem Filter-Status laden
    async function reloadReservations() {
        await loadReservations(includeCompletedReservations);
    }

    // Status-Filter handhaben
    async function handleStatusFilter(e) {
        const filterValue = e.target.value;

        // Determine if we need all reservations (for completed filter or "all status")
        const needAllReservations = (filterValue === 'completed' || filterValue === '');
        
        // Update filter state
        includeCompletedReservations = needAllReservations;

        // Load appropriate data set
        if (needAllReservations) {
            await loadReservations(true); // Load all including completed
        } else {
            await loadReservations(false); // Load only active ones
        }

        // Client-seitige Filterung anwenden
        const rows = document.querySelectorAll('#reservations-table-body tr');
        rows.forEach(row => {
            if (!filterValue) {
                row.style.display = '';
                return;
            }

            // Verwende das data-status Attribut für die Filterung
            const rowStatus = row.dataset.status;
            if (rowStatus === filterValue) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Benachrichtigung anzeigen
    function showNotification(message, type = 'info') {
        // Einfache Benachrichtigung - könnte durch eine Toast-Library ersetzt werden
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
            type === 'success' ? 'bg-green-100 text-green-800' : 
            type === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Reservierungsdaten laden (für Bearbeitung)
    async function loadReservationData(reservationId) {
        if (!reservationId || reservationId === null) {
            console.error('No reservation ID provided');
            return;
        }

        try {
            const response = await fetch(`/api/reservations`);
            if (response.ok) {
                const reservations = await response.json();
                const reservation = reservations.find(r => r.id === reservationId);
                
                if (reservation) {
                    // Zeitwerte für datetime-local ohne UTC-Konvertierung setzen
                    const startDate = new Date(reservation.startTime);
                    const endDate = new Date(reservation.endTime);
                    
                    // Format: YYYY-MM-DDTHH:mm (lokale Zeit ohne UTC-Konvertierung)
                    const formatForDatetimeLocal = (date) => {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${year}-${month}-${day}T${hours}:${minutes}`;
                    };
                    
                    document.getElementById('start-time').value = formatForDatetimeLocal(startDate);
                    document.getElementById('end-time').value = formatForDatetimeLocal(endDate);
                    document.getElementById('purpose').value = reservation.purpose || '';
                    document.getElementById('notes').value = reservation.notes || '';
                    
                    // Fahrzeug- und Fahrer-Auswahl setzen
                    const vehicleSelect = document.getElementById('vehicle-select');
                    const driverSelect = document.getElementById('driver-select');
                    
                    // Verschiedene mögliche Feldnamen prüfen
                    const vehicleId = reservation.vehicleId || reservation.vehicleID || (reservation.vehicle && reservation.vehicle.id);
                    const driverId = reservation.driverId || reservation.driverID || (reservation.driver && reservation.driver.id);
                    
                    console.log('Setting vehicle ID:', vehicleId, 'Driver ID:', driverId);
                    
                    // Fahrer-Auswahl direkt setzen (da Fahrer-Liste sich nicht ändert)
                    if (driverSelect && driverId) {
                        driverSelect.value = driverId;
                        if (driverSelect.value !== driverId) {
                            for (let option of driverSelect.options) {
                                if (option.value === driverId) {
                                    option.selected = true;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Verfügbare Fahrzeuge neu laden (mit Ausschluss der aktuellen Reservierung)
                    // und dann die Fahrzeug-Auswahl setzen
                    if (vehicleId) {
                        // Speichere die gewünschte Fahrzeug-ID
                        vehicleSelect.dataset.pendingValue = vehicleId;
                        
                        // Lade verfügbare Fahrzeuge für den aktuellen Zeitraum
                        checkAvailableVehicles().then(() => {
                            // Setze Fahrzeug-Auswahl nach dem Laden der verfügbaren Fahrzeuge
                            const pendingValue = vehicleSelect.dataset.pendingValue;
                            if (pendingValue) {
                                vehicleSelect.value = pendingValue;
                                if (vehicleSelect.value !== pendingValue) {
                                    // Prüfe ob das Fahrzeug in der verfügbaren Liste ist
                                    let found = false;
                                    for (let option of vehicleSelect.options) {
                                        if (option.value === pendingValue) {
                                            option.selected = true;
                                            found = true;
                                            break;
                                        }
                                    }
                                    // Wenn das Fahrzeug nicht in der verfügbaren Liste ist, füge es hinzu
                                    if (!found && reservation.vehicle) {
                                        const option = document.createElement('option');
                                        option.value = pendingValue;
                                        option.textContent = `${reservation.vehicle.brand} ${reservation.vehicle.model} (${reservation.vehicle.licensePlate}) - Aktuell gewählt`;
                                        option.selected = true;
                                        vehicleSelect.appendChild(option);
                                    }
                                }
                                // Lösche den temporären Wert
                                delete vehicleSelect.dataset.pendingValue;
                            }
                        });
                    }
                } else {
                    console.error('Reservation not found with ID:', reservationId);
                    showNotification('Reservierung nicht gefunden', 'error');
                }
            } else {
                console.error('Failed to fetch reservations');
                showNotification('Fehler beim Laden der Reservierungen', 'error');
            }
        } catch (error) {
            console.error('Error loading reservation data:', error);
            showNotification('Fehler beim Laden der Reservierungsdaten', 'error');
        }
    }

    // =================================================================
    // KALENDER FUNKTIONALITÄT
    // =================================================================

    let currentDate = new Date();
    let currentViewMode = 'month';

    function initializeCalendar() {
        // Calendar controls
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        const todayBtn = document.getElementById('today-btn');
        const viewModeSelect = document.getElementById('view-mode');

        // Remove existing listeners
        prevBtn.replaceWith(prevBtn.cloneNode(true));
        nextBtn.replaceWith(nextBtn.cloneNode(true));
        todayBtn.replaceWith(todayBtn.cloneNode(true));
        viewModeSelect.replaceWith(viewModeSelect.cloneNode(true));

        // Get fresh references
        const newPrevBtn = document.getElementById('prev-month');
        const newNextBtn = document.getElementById('next-month');
        const newTodayBtn = document.getElementById('today-btn');
        const newViewModeSelect = document.getElementById('view-mode');

        // Add event listeners
        newPrevBtn.addEventListener('click', () => {
            if (currentViewMode === 'month') {
                currentDate.setMonth(currentDate.getMonth() - 1);
            } else if (currentViewMode === 'week') {
                currentDate.setDate(currentDate.getDate() - 7);
            } else {
                currentDate.setDate(currentDate.getDate() - 1);
            }
            updateCalendar();
        });

        newNextBtn.addEventListener('click', () => {
            if (currentViewMode === 'month') {
                currentDate.setMonth(currentDate.getMonth() + 1);
            } else if (currentViewMode === 'week') {
                currentDate.setDate(currentDate.getDate() + 7);
            } else {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            updateCalendar();
        });

        newTodayBtn.addEventListener('click', () => {
            currentDate = new Date();
            updateCalendar();
        });

        newViewModeSelect.addEventListener('change', (e) => {
            currentViewMode = e.target.value;
            updateCalendar();
        });

        updateCalendar();
    }

    function updateCalendar() {
        updateCalendarHeader();
        
        // Hide all views first
        document.getElementById('month-view').classList.add('hidden');
        document.getElementById('week-view').classList.add('hidden');
        document.getElementById('day-view').classList.add('hidden');

        // Show selected view
        if (currentViewMode === 'month') {
            document.getElementById('month-view').classList.remove('hidden');
            renderMonthView();
        } else if (currentViewMode === 'week') {
            document.getElementById('week-view').classList.remove('hidden');
            renderWeekView();
        } else {
            document.getElementById('day-view').classList.remove('hidden');
            renderDayView();
        }
    }

    function updateCalendarHeader() {
        const monthNames = [
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];

        const currentMonthElement = document.getElementById('current-month');
        if (currentViewMode === 'month') {
            currentMonthElement.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        } else if (currentViewMode === 'week') {
            const weekStart = getWeekStart(currentDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            currentMonthElement.textContent = `${weekStart.toLocaleDateString('de-DE')} - ${weekEnd.toLocaleDateString('de-DE')}`;
        } else {
            currentMonthElement.textContent = currentDate.toLocaleDateString('de-DE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    function renderMonthView() {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';

        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Start from Monday
        const startDate = getWeekStart(firstDay);
        
        // Generate 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayCell = createDayCell(date, currentDate.getMonth());
            grid.appendChild(dayCell);
        }
    }

    function createDayCell(date, currentMonth) {
        const cell = document.createElement('div');
        cell.className = 'bg-white p-2 border-r border-b border-gray-200 min-h-20';
        
        if (date.getMonth() !== currentMonth) {
            cell.className += ' bg-gray-50 text-gray-400';
        }

        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'text-sm font-medium text-gray-900 mb-1';
        dayNumber.textContent = date.getDate();
        cell.appendChild(dayNumber);

        // Reservations for this day
        const dayReservations = getReservationsForDate(date);
        dayReservations.forEach(reservation => {
            const reservationElement = createReservationElement(reservation, 'small');
            cell.appendChild(reservationElement);
        });

        return cell;
    }

    function renderWeekView() {
        // Implementation for week view - simplified for now
        const grid = document.getElementById('week-grid');
        const header = document.getElementById('week-header');
        
        // Clear existing content
        grid.innerHTML = '';
        header.innerHTML = '<div class="py-2 px-3 text-center text-xs font-semibold text-gray-900">Zeit</div>';

        // Generate week days
        const weekStart = getWeekStart(currentDate);
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'py-2 px-3 text-center text-xs font-semibold text-gray-900';
            dayHeader.textContent = date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
            header.appendChild(dayHeader);
        }

        // Create time slots (simplified)
        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'border-r border-b border-gray-200 p-2 text-xs';
            timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
            grid.appendChild(timeSlot);

            // Add cells for each day
            for (let day = 0; day < 7; day++) {
                const cell = document.createElement('div');
                cell.className = 'border-r border-b border-gray-200 p-1 min-h-8';
                
                // Check for reservations in this time slot
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + day);
                date.setHours(hour, 0, 0, 0);
                
                const reservations = getReservationsForHour(date);
                reservations.forEach(reservation => {
                    const element = createReservationElement(reservation, 'tiny');
                    cell.appendChild(element);
                });
                
                grid.appendChild(cell);
            }
        }
    }

    function renderDayView() {
        const grid = document.getElementById('day-grid');
        const title = document.getElementById('day-title');
        
        title.textContent = currentDate.toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Europe/Berlin'
        });

        grid.innerHTML = '';

        for (let hour = 0; hour < 24; hour++) {
            const hourDiv = document.createElement('div');
            hourDiv.className = 'py-2 px-3 border-b border-gray-200';
            
            const timeLabel = document.createElement('div');
            timeLabel.className = 'text-sm font-medium text-gray-900 mb-2';
            timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
            hourDiv.appendChild(timeLabel);

            const date = new Date(currentDate);
            date.setHours(hour, 0, 0, 0);
            
            const reservations = getReservationsForHour(date);
            reservations.forEach(reservation => {
                const element = createReservationElement(reservation, 'medium');
                hourDiv.appendChild(element);
            });

            grid.appendChild(hourDiv);
        }
    }

    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
        return new Date(d.setDate(diff));
    }

    function getReservationsForDate(date) {
        return reservationsData.filter(reservation => {
            // Nur aktive und ausstehende Reservierungen im Kalender anzeigen
            if (reservation.status !== 'active' && reservation.status !== 'pending') {
                return false;
            }
            
            const startDate = new Date(reservation.startTime);
            const endDate = new Date(reservation.endTime);
            
            // Reset time to 00:00:00 for date comparison only
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            
            const startDateOnly = new Date(startDate);
            startDateOnly.setHours(0, 0, 0, 0);
            
            const endDateOnly = new Date(endDate);
            endDateOnly.setHours(0, 0, 0, 0);
            
            // Check if the date falls within the reservation period (inclusive)
            return checkDate >= startDateOnly && checkDate <= endDateOnly;
        });
    }

    function getReservationsForHour(date) {
        return reservationsData.filter(reservation => {
            // Nur aktive und ausstehende Reservierungen im Kalender anzeigen
            if (reservation.status !== 'active' && reservation.status !== 'pending') {
                return false;
            }
            
            const startDate = new Date(reservation.startTime);
            const endDate = new Date(reservation.endTime);
            
            // Check if the date and hour falls within the reservation period
            const checkDateTime = new Date(date);
            
            // For hour-based comparison, check if the date/hour is between start and end
            return checkDateTime >= startDate && checkDateTime <= endDate;
        });
    }

    function createReservationElement(reservation, size = 'medium') {
        const element = document.createElement('div');
        
        const statusColors = {
            'pending': 'bg-yellow-400',
            'active': 'bg-green-500',
            'completed': 'bg-gray-400',
            'cancelled': 'bg-red-400'
        };

        const baseClasses = 'rounded px-2 py-1 text-white text-xs cursor-pointer mb-1';
        const statusColor = statusColors[reservation.status] || 'bg-gray-400';
        
        if (size === 'tiny') {
            element.className = `${baseClasses} ${statusColor} text-xs`;
            element.textContent = reservation.vehicle ? reservation.vehicle.licensePlate : 'Vehicle';
        } else if (size === 'small') {
            element.className = `${baseClasses} ${statusColor}`;
            element.textContent = `${reservation.vehicle ? reservation.vehicle.licensePlate : 'Vehicle'} - ${reservation.driver ? reservation.driver.firstName : 'Driver'}`;
        } else {
            element.className = `${baseClasses} ${statusColor}`;
            element.innerHTML = `
                <div class="font-medium">${reservation.vehicle ? `${reservation.vehicle.brand} ${reservation.vehicle.model}` : 'Vehicle'}</div>
                <div>${reservation.driver ? `${reservation.driver.firstName} ${reservation.driver.lastName}` : 'Driver'}</div>
                <div>${formatTimeOnly(reservation.startTime)} - ${formatTimeOnly(reservation.endTime)}</div>
            `;
        }

        // Add click handler to show reservation details
        element.addEventListener('click', () => {
            showReservationDetails(reservation);
        });

        return element;
    }

    function showReservationDetails(reservation) {
        const message = `Fahrzeug: ${reservation.vehicle ? `${reservation.vehicle.brand} ${reservation.vehicle.model} (${reservation.vehicle.licensePlate})` : 'Unbekannt'}
Fahrer: ${reservation.driver ? `${reservation.driver.firstName} ${reservation.driver.lastName}` : 'Unbekannt'}
Zeitraum: ${formatDateTime(reservation.startTime)} - ${formatDateTime(reservation.endTime)}
Zweck: ${reservation.purpose || 'Nicht angegeben'}
Status: ${getStatusText(reservation.status)}`;

        if (confirm(message + '\n\nMöchten Sie diese Reservierung bearbeiten?')) {
            if (reservation.status === 'pending') {
                editReservation(reservation.id);
            }
        }
    }

    // =================================================================
    // ENDE KALENDER FUNKTIONALITÄT
    // =================================================================

    // Globale Funktionen für Buttons
    window.editReservation = function(reservationId) {
        openReservationModal(reservationId);
    };

    window.cancelReservation = async function(reservationId) {
        if (confirm('Sind Sie sicher, dass Sie diese Reservierung stornieren möchten?')) {
            try {
                const response = await fetch(`/api/reservations/${reservationId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    showNotification('Reservierung erfolgreich storniert!', 'success');
                    reloadReservations();
                } else {
                    const error = await response.json();
                    showNotification(error.error || 'Fehler beim Stornieren der Reservierung', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Fehler beim Stornieren der Reservierung', 'error');
            }
        }
    };

    window.completeReservation = async function(reservationId) {
        if (confirm('Sind Sie sicher, dass Sie diese Reservierung abschließen möchten?')) {
            try {
                const response = await fetch(`/api/reservations/${reservationId}/complete`, {
                    method: 'POST'
                });

                if (response.ok) {
                    showNotification('Reservierung erfolgreich abgeschlossen!', 'success');
                    reloadReservations();
                } else {
                    const error = await response.json();
                    showNotification(error.error || 'Fehler beim Abschließen der Reservierung', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Fehler beim Abschließen der Reservierung', 'error');
            }
        }
    };

    // Konfliktprüfung für Reservierungen
    async function checkReservationConflicts() {
        const vehicleId = vehicleSelect.value;
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        // Entferne vorherige Warnungen
        clearConflictWarnings();

        if (!vehicleId || !startTime || !endTime) {
            return;
        }

        try {
            const excludeId = currentReservationId ? `&excludeId=${currentReservationId}` : '';
            const response = await fetch(`/api/reservations/check-conflict?vehicleId=${vehicleId}&startTime=${startTime}&endTime=${endTime}${excludeId}`);
            
            if (response.ok) {
                const conflictData = await response.json();
                
                if (conflictData.hasConflict) {
                    showConflictWarning(conflictData.message, conflictData.conflictingReservations);
                }
            }
        } catch (error) {
            console.error('Fehler bei Konfliktprüfung:', error);
        }
    }

    // Zeigt Konfliktwarnung an
    function showConflictWarning(message, conflicts) {
        // Erstelle Warnung-Element
        const warningDiv = document.createElement('div');
        warningDiv.id = 'conflict-warning';
        warningDiv.className = 'mt-4 p-4 border border-yellow-400 bg-yellow-50 rounded-md';
        
        let conflictList = '';
        if (conflicts && conflicts.length > 0) {
            conflictList = '<ul class="mt-2 list-disc list-inside text-sm">';
            conflicts.forEach(conflict => {
                const startDate = new Date(conflict.startTime).toLocaleString('de-DE');
                const endDate = new Date(conflict.endTime).toLocaleString('de-DE');
                conflictList += `<li>Reservierung vom ${startDate} bis ${endDate}</li>`;
            });
            conflictList += '</ul>';
        }

        warningDiv.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-yellow-800">
                        Reservierungskonflikt
                    </h3>
                    <div class="mt-2 text-sm text-yellow-700">
                        <p>${message}</p>
                        ${conflictList}
                    </div>
                </div>
            </div>
        `;

        // Füge Warnung nach dem Endzeit-Feld hinzu
        endTimeInput.parentNode.parentNode.appendChild(warningDiv);
    }

    // Entfernt Konfliktwarnung
    function clearConflictWarnings() {
        const existingWarning = document.getElementById('conflict-warning');
        if (existingWarning) {
            existingWarning.remove();
        }
    }

    // Fahrer-Fahrzeug-Kompatibilität prüfen für Reservierungen
    async function checkReservationDriverCompatibility() {
        const vehicleId = vehicleSelect.value;
        const driverId = document.getElementById('driver-select').value;
        
        if (!vehicleId || !driverId) {
            // Entferne Warnung wenn kein Fahrer oder Fahrzeug ausgewählt
            clearCompatibilityWarnings();
            return;
        }
        
        try {
            // Fahrzeug- und Fahrerdaten parallel laden
            const [vehicleResponse, driverResponse] = await Promise.all([
                fetch(`/api/vehicles/${vehicleId}`),
                fetch(`/api/drivers/${driverId}`)
            ]);
            
            const vehicleData = await vehicleResponse.json();
            const driverData = await driverResponse.json();
            
            const vehicle = vehicleData.vehicle || vehicleData;
            const driver = driverData.driver || driverData;
            
            // Kompatibilität prüfen
            const compatibility = checkDriverVehicleCompatibilityReservation(
                driver.licenseClasses || [], 
                vehicle
            );
            
            // Vorherige Warnung entfernen
            clearCompatibilityWarnings();
            
            // Neue Warnung anzeigen falls nötig
            if (!compatibility.compatible || compatibility.warning) {
                showReservationCompatibilityWarning(compatibility.message, !compatibility.compatible);
            }
            
        } catch (error) {
            console.error('Fehler bei Reservierungs-Kompatibilitätsprüfung:', error);
        }
    }
    
    // Kompatibilitätsprüfung für Reservierungen (verwendet dieselbe Logik wie vehicle-modals.js)
    function checkDriverVehicleCompatibilityReservation(driverLicenseClasses, vehicle) {
        if (!vehicle || !driverLicenseClasses || driverLicenseClasses.length === 0) {
            return {
                compatible: false,
                message: 'Fahrzeugdaten oder Führerscheinklassen nicht verfügbar'
            };
        }
        
        const requiredLicenses = determineRequiredLicenseClassesReservation(vehicle);
        
        if (!requiredLicenses.length) {
            return {
                compatible: true,
                message: 'Führerscheinanforderungen konnten nicht bestimmt werden - manuelle Prüfung erforderlich',
                warning: true
            };
        }
        
        // Prüfe ob der Fahrer mindestens eine der erforderlichen Klassen hat
        const compatibleLicenses = driverLicenseClasses.filter(license => 
            requiredLicenses.includes(license)
        );
        
        if (compatibleLicenses.length === 0) {
            return {
                compatible: false,
                message: `Fahrer benötigt eine der folgenden Führerscheinklassen: ${requiredLicenses.join(', ')}. Vorhanden: ${driverLicenseClasses.join(', ')}`
            };
        }
        
        return {
            compatible: true,
            message: `Fahrer ist berechtigt (${compatibleLicenses.join(', ')})`
        };
    }
    
    // Bestimme erforderliche Führerscheinklassen für Reservierungen (gleiche Logik wie vehicle-modals.js)
    function determineRequiredLicenseClassesReservation(vehicle) {
        const requiredLicenses = [];
        const grossWeight = vehicle.grossWeight || 0;
        const technicalMaxWeight = vehicle.technicalMaxWeight || grossWeight;
        const powerRating = vehicle.powerRating || 0; // kW
        const vehicleType = vehicle.vehicleType || '';
        const towingCapacity = vehicle.towingCapacity || 0;
        
        // Motorräder und Mopeds
        if (vehicleType.toLowerCase().includes('motorrad') || vehicleType.toLowerCase().includes('roller')) {
            if (powerRating <= 11) { // bis 11 kW (ca. 15 PS)
                requiredLicenses.push('A1');
            }
            if (powerRating <= 35) { // bis 35 kW (ca. 48 PS)
                requiredLicenses.push('A2');
            }
            requiredLicenses.push('A'); // unbeschränkt
            return requiredLicenses;
        }
        
        if (vehicleType.toLowerCase().includes('moped')) {
            requiredLicenses.push('AM', 'A1', 'A2', 'A', 'B');
            return requiredLicenses;
        }
        
        // Busse
        if (vehicleType.toLowerCase().includes('bus')) {
            if (technicalMaxWeight <= 7500) { // bis 7,5t
                requiredLicenses.push('D1');
                if (towingCapacity > 750) {
                    requiredLicenses.push('D1E');
                }
            }
            requiredLicenses.push('D'); // über 7,5t oder mehr als 16 Sitzplätze
            if (towingCapacity > 750) {
                requiredLicenses.push('DE');
            }
            return requiredLicenses;
        }
        
        // LKW und schwere Fahrzeuge
        if (technicalMaxWeight > 7500 || vehicleType.toLowerCase().includes('lkw')) {
            requiredLicenses.push('C'); // über 7,5t
            if (towingCapacity > 750) {
                requiredLicenses.push('CE');
            }
            return requiredLicenses;
        }
        
        // Mittelschwere Fahrzeuge (3,5t - 7,5t)
        if (technicalMaxWeight > 3500) {
            requiredLicenses.push('C1'); // 3,5t - 7,5t
            if (towingCapacity > 750) {
                requiredLicenses.push('C1E');
            }
            // C und CE berechtigen auch für kleinere Fahrzeuge
            requiredLicenses.push('C', 'CE');
            return requiredLicenses;
        }
        
        // PKW und leichte Fahrzeuge (bis 3,5t)
        if (technicalMaxWeight <= 3500) {
            requiredLicenses.push('B'); // Basis PKW-Führerschein
            
            // Mit schwerem Anhänger
            if (towingCapacity > 750) {
                const totalWeight = technicalMaxWeight + towingCapacity;
                if (totalWeight > 3500) {
                    requiredLicenses.push('BE');
                }
            }
            
            // Höhere Klassen berechtigen auch
            requiredLicenses.push('C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE');
            return requiredLicenses;
        }
        
        // Fallback für unbekannte Fahrzeuge
        requiredLicenses.push('B');
        return requiredLicenses;
    }
    
    // Kompatibilitäts-Warnung für Reservierungen anzeigen
    function showReservationCompatibilityWarning(message, isError = false) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'reservation-compatibility-warning';
        warningDiv.className = `mt-4 p-4 border rounded-md ${
            isError ? 'border-red-400 bg-red-50' : 'border-yellow-400 bg-yellow-50'
        }`;
        
        warningDiv.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 ${isError ? 'text-red-400' : 'text-yellow-400'}" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium ${isError ? 'text-red-800' : 'text-yellow-800'}">
                        ${isError ? 'Führerschein-Inkompatibilität' : 'Führerschein-Hinweis'}
                    </h3>
                    <div class="mt-2 text-sm ${isError ? 'text-red-700' : 'text-yellow-700'}">
                        <p>${message}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Warnung nach dem Fahrer-Select einfügen
        const driverSelect = document.getElementById('driver-select');
        if (driverSelect) {
            driverSelect.parentNode.parentNode.appendChild(warningDiv);
        }
    }
    
    // Kompatibilitäts-Warnungen entfernen
    function clearCompatibilityWarnings() {
        const existingWarning = document.getElementById('reservation-compatibility-warning');
        if (existingWarning) {
            existingWarning.remove();
        }
    }

    // Initiale Datenladung
    reloadReservations();
});