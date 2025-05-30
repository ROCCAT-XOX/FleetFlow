// frontend/static/js/driver-form.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('driver-form');
    const isEdit = !window.location.pathname.includes('/new');

    if (isEdit) {
        loadDriverData();
    }

    form.addEventListener('submit', handleSubmit);
});

// Fahrerdaten laden (bei Bearbeitung)
function loadDriverData() {
    const driverId = window.location.pathname.split('/').pop();

    fetch(`/api/drivers/${driverId}`)
        .then(response => response.json())
        .then(data => {
            const driver = data.driver;

            // Grunddaten setzen
            document.getElementById('firstName').value = driver.firstName || '';
            document.getElementById('lastName').value = driver.lastName || '';
            document.getElementById('email').value = driver.email || '';
            document.getElementById('phone').value = driver.phone || '';
            document.getElementById('status').value = driver.status || 'available';
            document.getElementById('notes').value = driver.notes || '';

            // Führerscheinklassen setzen
            if (driver.licenseClasses) {
                driver.licenseClasses.forEach(licenseClass => {
                    const checkbox = document.querySelector(`input[value="${licenseClass}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
        })
        .catch(error => {
            console.error('Fehler beim Laden der Fahrerdaten:', error);
            showNotification('Fehler beim Laden der Fahrerdaten', 'error');
        });
}

// Form Submit Handler
function handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const driverData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        status: formData.get('status'),
        notes: formData.get('notes'),
        licenseClasses: formData.getAll('licenseClasses')
    };

    const isEdit = !window.location.pathname.includes('/new');
    const url = isEdit ? `/api/drivers/${window.location.pathname.split('/').pop()}` : '/api/drivers';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(driverData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.driver) {
                const message = isEdit ? 'Fahrer erfolgreich aktualisiert' : 'Fahrer erfolgreich erstellt';
                showNotification(message, 'success');

                setTimeout(() => {
                    window.location.href = '/drivers';
                }, 1000);
            } else {
                throw new Error(data.error || 'Unbekannter Fehler');
            }
        })
        .catch(error => {
            console.error('Fehler:', error);
            showNotification('Fehler beim Speichern: ' + error.message, 'error');
        });
}

// Notification anzeigen
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}