// frontend/static/js/vehicle-image.js - KORRIGIERTE VERSION

// Globale Variablen für Bilder (andere Namen verwenden)
let vehicleImageId = null;

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    // Nur initialisieren wenn wir auf der Fahrzeugdetails-Seite sind
    if (window.location.pathname.includes('/vehicle-details/')) {
        vehicleImageId = window.location.pathname.split('/').pop();

        // Kurz warten, damit alle DOM-Elemente geladen sind
        setTimeout(() => {
            initializeVehicleImage();
        }, 100);
    }
});

// Fahrzeugbild-System initialisieren
function initializeVehicleImage() {
    loadVehicleImage();
    setupVehicleImageDragDrop();
}

// Fahrzeugbild laden
async function loadVehicleImage() {
    if (!vehicleImageId) return;

    const imageElement = document.getElementById('vehicle-image');
    const placeholder = document.getElementById('vehicle-image-placeholder');

    // Prüfen ob Elemente existieren
    if (!imageElement || !placeholder) {
        console.log('Fahrzeugbild-Elemente nicht gefunden');
        return;
    }

    try {
        const response = await fetch(`/api/vehicles/${vehicleImageId}/image`);

        if (response.ok) {
            // Bild gefunden - Blob URL erstellen
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);

            showVehicleImage(imageUrl);
        } else {
            // Kein Bild gefunden - Placeholder anzeigen
            showVehicleImagePlaceholder();
        }
    } catch (error) {
        console.log('Kein Fahrzeugbild vorhanden oder Fehler beim Laden:', error);
        showVehicleImagePlaceholder();
    }
}

// Fahrzeugbild anzeigen
function showVehicleImage(imageUrl) {
    const imageElement = document.getElementById('vehicle-image');
    const placeholder = document.getElementById('vehicle-image-placeholder');
    const container = document.getElementById('vehicle-image-container');

    if (imageElement && placeholder && container) {
        imageElement.src = imageUrl;
        imageElement.classList.remove('hidden');
        placeholder.classList.add('hidden');

        // Container-Style anpassen
        container.classList.remove('border-dashed', 'border-gray-300');
        container.classList.add('border-solid', 'border-gray-200');
    }
}

// Placeholder anzeigen
function showVehicleImagePlaceholder() {
    const imageElement = document.getElementById('vehicle-image');
    const placeholder = document.getElementById('vehicle-image-placeholder');
    const container = document.getElementById('vehicle-image-container');

    if (imageElement && placeholder && container) {
        imageElement.classList.add('hidden');
        placeholder.classList.remove('hidden');

        // Container-Style zurücksetzen
        container.classList.add('border-dashed', 'border-gray-300');
        container.classList.remove('border-solid', 'border-gray-200');
    }
}

// Upload-Dialog öffnen
function openVehicleImageUpload() {
    const fileInput = document.getElementById('vehicle-image-input');
    if (fileInput) {
        fileInput.click();
    }
}

// Bildupload behandeln
async function handleVehicleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validierung
    if (!validateImageFile(file)) {
        return;
    }

    // Progress anzeigen
    showImageUploadProgress(true);

    try {
        // FormData für Upload erstellen
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'vehicle_image');
        formData.append('name', 'Fahrzeugbild');
        formData.append('notes', 'Hauptbild des Fahrzeugs');

        const response = await fetch(`/api/vehicles/${vehicleImageId}/documents`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Upload fehlgeschlagen');
        }

        showImageNotification('Fahrzeugbild erfolgreich hochgeladen', 'success');

        // Bild neu laden
        setTimeout(() => {
            loadVehicleImage();
        }, 500);

    } catch (error) {
        console.error('Image upload error:', error);
        showImageNotification('Fehler beim Hochladen: ' + error.message, 'error');
    } finally {
        showImageUploadProgress(false);
        // Input zurücksetzen
        event.target.value = '';
    }
}

// Bild validieren
function validateImageFile(file) {
    // Größe prüfen (max 5MB für Bilder)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showImageNotification('Bild ist zu groß. Maximum: 5MB', 'error');
        return false;
    }

    // Dateityp prüfen
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showImageNotification('Nur Bildformate sind erlaubt (JPG, PNG, GIF, WebP)', 'error');
        return false;
    }

    // Dateiname prüfen
    if (file.name.length > 255) {
        showImageNotification('Dateiname ist zu lang (max. 255 Zeichen)', 'error');
        return false;
    }

    return true;
}

// Upload-Progress anzeigen/verstecken
function showImageUploadProgress(show) {
    const progressElement = document.getElementById('image-upload-progress');
    const container = document.getElementById('vehicle-image-container');

    if (progressElement && container) {
        if (show) {
            progressElement.classList.remove('hidden');
            progressElement.classList.add('flex');
            container.style.pointerEvents = 'none';
        } else {
            progressElement.classList.add('hidden');
            progressElement.classList.remove('flex');
            container.style.pointerEvents = 'auto';
        }
    }
}

// Notification anzeigen (eigene Funktion um Konflikte zu vermeiden)
function showImageNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Drag & Drop für Fahrzeugbild
function setupVehicleImageDragDrop() {
    const container = document.getElementById('vehicle-image-container');
    if (!container) return;

    container.addEventListener('dragover', function(e) {
        e.preventDefault();
        container.classList.add('border-indigo-500', 'bg-indigo-50');
    });

    container.addEventListener('dragleave', function(e) {
        e.preventDefault();
        container.classList.remove('border-indigo-500', 'bg-indigo-50');
    });

    container.addEventListener('drop', function(e) {
        e.preventDefault();
        container.classList.remove('border-indigo-500', 'bg-indigo-50');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (validateImageFile(file)) {
                // Simuliere File-Input Event
                const fakeEvent = {
                    target: {
                        files: [file],
                        value: ''
                    }
                };
                handleVehicleImageUpload(fakeEvent);
            }
        }
    });
}

// Keyboard-Unterstützung
document.addEventListener('keydown', function(event) {
    // Strg+I für Image Upload (nur auf Fahrzeugdetails-Seite)
    if (event.ctrlKey && event.key === 'i' && window.location.pathname.includes('/vehicle-details/')) {
        event.preventDefault();
        openVehicleImageUpload();
    }
});

// Globale Funktionen für HTML-Event-Handler
window.openVehicleImageUpload = openVehicleImageUpload;
window.handleVehicleImageUpload = handleVehicleImageUpload;

// Funktion für das Template verfügbar machen
window.loadVehicleImage = function() {
    // Kurz warten für DOM
    setTimeout(loadVehicleImage, 100);
};