// Kalender-Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // DOM-Elemente
    const currentMonthElement = document.getElementById('current-month');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');
    const viewModeSelect = document.getElementById('view-mode');
    const addReservationBtn = document.getElementById('add-reservation-btn');
    const reservationDetailModal = document.getElementById('reservation-detail-modal');
    const closeDetailModalBtn = document.getElementById('close-detail-modal');

    // Kalender-Views
    const monthView = document.getElementById('month-view');
    const weekView = document.getElementById('week-view');
    const dayView = document.getElementById('day-view');

    // Aktueller Zustand
    let currentDate = new Date();
    let currentView = 'month';
    let reservations = [];

    // Deutsche Monatsnamen
    const monthNames = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

    // Event Listeners
    prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
    nextMonthBtn.addEventListener('click', () => navigateMonth(1));
    todayBtn.addEventListener('click', goToToday);
    viewModeSelect.addEventListener('change', handleViewChange);
    addReservationBtn.addEventListener('click', () => window.location.href = '/reservations');
    closeDetailModalBtn.addEventListener('click', closeDetailModal);

    // Modal schließen bei Klick außerhalb
    reservationDetailModal.addEventListener('click', function(e) {
        if (e.target === reservationDetailModal) {
            closeDetailModal();
        }
    });

    // Initialisierung
    loadReservations();

    // Reservierungen laden
    async function loadReservations() {
        try {
            const response = await fetch('/api/reservations');
            if (response.ok) {
                reservations = await response.json();
                renderCurrentView();
            } else {
                console.error('Fehler beim Laden der Reservierungen');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Aktueller View rendern
    function renderCurrentView() {
        switch (currentView) {
            case 'month':
                renderMonthView();
                break;
            case 'week':
                renderWeekView();
                break;
            case 'day':
                renderDayView();
                break;
        }
    }

    // Monatsansicht rendern
    function renderMonthView() {
        showView('month');
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        currentMonthElement.textContent = `${monthNames[month]} ${year}`;
        
        // Ersten Tag des Monats
        const firstDay = new Date(year, month, 1);
        // Letzter Tag des Monats
        const lastDay = new Date(year, month + 1, 0);
        
        // Ersten Montag der Woche finden (kann im vorherigen Monat sein)
        const startDate = new Date(firstDay);
        const dayOfWeek = (firstDay.getDay() + 6) % 7; // Montag = 0
        startDate.setDate(firstDay.getDate() - dayOfWeek);
        
        // Kalender-Grid leeren
        calendarGrid.innerHTML = '';
        
        // 6 Wochen rendern (42 Tage)
        for (let i = 0; i < 42; i++) {
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate() + i);
            
            const dayElement = createDayElement(cellDate, month);
            calendarGrid.appendChild(dayElement);
        }
    }

    // Tag-Element erstellen
    function createDayElement(date, currentMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day bg-white p-2 border border-gray-100';
        
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = isDateToday(date);
        
        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
        }
        
        if (isToday) {
            dayElement.classList.add('today');
        }
        
        // Tag-Nummer
        const dayNumber = document.createElement('div');
        dayNumber.className = 'text-sm font-medium text-gray-900 mb-1';
        dayNumber.textContent = date.getDate();
        dayElement.appendChild(dayNumber);
        
        // Reservierungen für diesen Tag
        const dayReservations = getReservationsForDate(date);
        dayReservations.forEach(reservation => {
            const reservationElement = createReservationElement(reservation);
            dayElement.appendChild(reservationElement);
        });
        
        return dayElement;
    }

    // Reservierungs-Element erstellen
    function createReservationElement(reservation) {
        const element = document.createElement('div');
        element.className = 'reservation-item truncate';
        
        // Status-spezifische Klasse
        element.classList.add(`reservation-${reservation.status}`);
        
        // Text zusammenstellen
        const vehicleName = reservation.vehicle ? 
            `${reservation.vehicle.brand} ${reservation.vehicle.model}` : 'Unbekannt';
        const driverName = reservation.driver ? 
            `${reservation.driver.firstName} ${reservation.driver.lastName}` : 'Unbekannt';
        
        const startTime = new Date(reservation.startTime);
        const endTime = new Date(reservation.endTime);
        
        element.textContent = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')} ${vehicleName}`;
        element.title = `${vehicleName} - ${driverName} (${formatTime(startTime)} - ${formatTime(endTime)})`;
        
        // Click-Handler für Details
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            showReservationDetails(reservation);
        });
        
        return element;
    }

    // Reservierungen für ein bestimmtes Datum abrufen
    function getReservationsForDate(date) {
        return reservations.filter(reservation => {
            const startDate = new Date(reservation.startTime);
            const endDate = new Date(reservation.endTime);
            
            // Prüfen ob Reservierung an diesem Tag beginnt oder läuft
            return (
                isSameDay(startDate, date) || 
                isSameDay(endDate, date) ||
                (startDate < date && endDate > date)
            );
        });
    }

    // Wochenansicht rendern
    function renderWeekView() {
        showView('week');
        
        const startOfWeek = getStartOfWeek(currentDate);
        const weekHeader = document.getElementById('week-header');
        const weekGrid = document.getElementById('week-grid');
        
        // Header aktualisieren
        currentMonthElement.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        
        // Wochentage-Header leeren und neu erstellen
        weekHeader.innerHTML = '<div class="py-2 px-3 text-center text-xs font-semibold text-gray-900">Zeit</div>';
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'py-2 px-3 text-center text-xs font-semibold text-gray-900';
            dayHeader.textContent = `${dayNames[i]} ${day.getDate()}`;
            
            if (isDateToday(day)) {
                dayHeader.classList.add('bg-blue-100');
            }
            
            weekHeader.appendChild(dayHeader);
        }
        
        // Stunden-Grid erstellen
        weekGrid.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            // Zeit-Label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-slot bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 border-r border-gray-200';
            timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
            weekGrid.appendChild(timeLabel);
            
            // Tage der Woche
            for (let day = 0; day < 7; day++) {
                const daySlot = document.createElement('div');
                daySlot.className = 'time-slot bg-white border-r border-gray-100 p-1 week-day-column';
                
                const currentDay = new Date(startOfWeek);
                currentDay.setDate(startOfWeek.getDate() + day);
                currentDay.setHours(hour, 0, 0, 0);
                
                // Reservierungen für diese Stunde
                const hourReservations = getReservationsForHour(currentDay);
                hourReservations.forEach(reservation => {
                    const reservationElement = createReservationElement(reservation);
                    reservationElement.classList.add('text-xs', 'mb-1');
                    daySlot.appendChild(reservationElement);
                });
                
                weekGrid.appendChild(daySlot);
            }
        }
    }

    // Tagesansicht rendern
    function renderDayView() {
        showView('day');
        
        const dayTitle = document.getElementById('day-title');
        const dayGrid = document.getElementById('day-grid');
        
        dayTitle.textContent = `${dayNames[getDayOfWeek(currentDate)]} ${currentDate.getDate()}. ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        
        dayGrid.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            const hourSlot = document.createElement('div');
            hourSlot.className = 'flex min-h-16 border-b border-gray-100';
            
            // Zeit-Label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'w-20 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-500 border-r border-gray-200';
            timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
            hourSlot.appendChild(timeLabel);
            
            // Reservierungs-Bereich
            const reservationArea = document.createElement('div');
            reservationArea.className = 'flex-1 p-2 day-hour-slot';
            
            const hourDate = new Date(currentDate);
            hourDate.setHours(hour, 0, 0, 0);
            
            const hourReservations = getReservationsForHour(hourDate);
            hourReservations.forEach(reservation => {
                const reservationElement = createReservationElement(reservation);
                reservationElement.classList.add('mb-2', 'block');
                reservationArea.appendChild(reservationElement);
            });
            
            hourSlot.appendChild(reservationArea);
            dayGrid.appendChild(hourSlot);
        }
    }

    // Reservierungen für eine bestimmte Stunde abrufen
    function getReservationsForHour(hourDate) {
        return reservations.filter(reservation => {
            const startTime = new Date(reservation.startTime);
            const endTime = new Date(reservation.endTime);
            
            return startTime <= hourDate && endTime > hourDate;
        });
    }

    // View wechseln
    function showView(viewName) {
        monthView.classList.add('hidden');
        weekView.classList.add('hidden');
        dayView.classList.add('hidden');
        
        document.getElementById(`${viewName}-view`).classList.remove('hidden');
        currentView = viewName;
    }

    // Navigation
    function navigateMonth(direction) {
        if (currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() + direction);
        } else if (currentView === 'week') {
            currentDate.setDate(currentDate.getDate() + (direction * 7));
        } else if (currentView === 'day') {
            currentDate.setDate(currentDate.getDate() + direction);
        }
        renderCurrentView();
    }

    function goToToday() {
        currentDate = new Date();
        renderCurrentView();
    }

    function handleViewChange(e) {
        currentView = e.target.value;
        renderCurrentView();
    }

    // Reservierungs-Details anzeigen
    function showReservationDetails(reservation) {
        const content = document.getElementById('reservation-detail-content');
        
        const vehicleName = reservation.vehicle ? 
            `${reservation.vehicle.brand} ${reservation.vehicle.model} (${reservation.vehicle.licensePlate})` : 'Unbekannt';
        const driverName = reservation.driver ? 
            `${reservation.driver.firstName} ${reservation.driver.lastName}` : 'Unbekannt';
        
        const startTime = new Date(reservation.startTime);
        const endTime = new Date(reservation.endTime);
        
        const statusText = getStatusText(reservation.status);
        const statusClass = getStatusClass(reservation.status);
        
        content.innerHTML = `
            <div class="mb-4">
                <h3 class="text-lg font-medium text-gray-900">Reservierungs-Details</h3>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Fahrzeug</label>
                    <p class="text-sm text-gray-900">${vehicleName}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Fahrer</label>
                    <p class="text-sm text-gray-900">${driverName}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Zeitraum</label>
                    <p class="text-sm text-gray-900">${formatDateTime(startTime)} - ${formatDateTime(endTime)}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Status</label>
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                ${reservation.purpose ? `
                <div>
                    <label class="block text-sm font-medium text-gray-700">Zweck</label>
                    <p class="text-sm text-gray-900">${reservation.purpose}</p>
                </div>
                ` : ''}
                ${reservation.notes ? `
                <div>
                    <label class="block text-sm font-medium text-gray-700">Notizen</label>
                    <p class="text-sm text-gray-900">${reservation.notes}</p>
                </div>
                ` : ''}
            </div>
        `;
        
        reservationDetailModal.classList.remove('hidden');
    }

    function closeDetailModal() {
        reservationDetailModal.classList.add('hidden');
    }

    // Hilfsfunktionen
    function isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    function isDateToday(date) {
        const today = new Date();
        return isSameDay(date, today);
    }

    function getStartOfWeek(date) {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Montag als erster Tag
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek;
    }

    function getDayOfWeek(date) {
        const day = date.getDay();
        return day === 0 ? 6 : day - 1; // Montag = 0
    }

    function formatTime(date) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    function formatDateTime(date) {
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()} ${formatTime(date)}`;
    }

    function getStatusText(status) {
        switch (status) {
            case 'pending': return 'Ausstehend';
            case 'active': return 'Aktiv';
            case 'completed': return 'Abgeschlossen';
            case 'cancelled': return 'Storniert';
            default: return 'Unbekannt';
        }
    }

    function getStatusClass(status) {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'active': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }
});