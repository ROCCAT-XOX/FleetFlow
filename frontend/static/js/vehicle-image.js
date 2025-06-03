// frontend/static/js/vehicle-image.js - KORRIGIERTE VERSION

// Globale Variablen für Bilder
let vehicleImageId = null;
let isImageLoading = false;

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    // Nur initialisieren wenn wir auf der Fahrzeugdetails-Seite sind
    if (window.location.pathname.includes('/vehicle-details/')) {
        vehicleImageId = window.location.pathname.split('/').pop();
        console.log('Vehicle image module initialized for vehicle:', vehicleImageId);

        // Kurz warten, damit alle DOM-Elemente geladen sind
        setTimeout(() => {
            initializeVehicleImage();
        }, 200);
    }
});

// Fahrzeugbild-System initialisieren
function initializeVehicleImage() {
    if (!vehicleImageId) {
        console.error('Vehicle ID not available');
        return;
    }

    console.log('Initializing vehicle image system...');
    loadVehicleImage();
    setupVehicleImageDragDrop();
    setupImageContainerHover();
}

// Fahrzeugbild laden
async function loadVehicleImage() {
    if (!vehicleImageId || isImageLoading) {
        console.log('Skipping image load:', !vehicleImageId ? 'no vehicle ID' : 'already loading');
        return;
    }

    const imageElement = document.getElementById('vehicle-image');
    const placeholder = document.getElementById('vehicle-image-placeholder');
    const overlay = document.getElementById('image-overlay');

    // Prüfen ob Elemente existieren
    if (!imageElement || !placeholder) {
        console.log('Fahrzeugbild-Elemente nicht gefunden');
        return;
    }

    isImageLoading = true;
    console.log('Loading vehicle image for ID:', vehicleImageId);

    try {
        const response = await fetch(`/api/vehicles/${vehicleImageId}/image`, {
            method: 'GET',
            headers: {
                'Accept': 'image/*'
            }
        });

        console.log('Image API response status:', response.status);

        if (response.ok) {
            // Bild gefunden - Blob URL erstellen
            const blob = await response.blob();
            console.log('Image blob size:', blob.size, 'bytes');

            if (blob.size > 0) {
                const imageUrl = URL.createObjectURL(blob);
                console.log('Created image URL:', imageUrl);
                showVehicleImage(imageUrl);
            } else {
                console.log('Empty blob received');
                showVehicleImagePlaceholder();
            }
        } else if (response.status === 404) {
            // Kein Bild gefunden - das ist normal
            console.log('No vehicle image found (404) - showing placeholder');
            showVehicleImagePlaceholder();
        } else {
            console.warn('Unexpected response status:', response.status);
            showVehicleImagePlaceholder();
        }
    } catch (error) {
        console.log('Error loading vehicle image (this is normal if no image exists):', error.message);
        showVehicleImagePlaceholder();
    } finally {
        isImageLoading = false;
    }
}

// Fahrzeugbild anzeigen
function showVehicleImage(imageUrl) {
    console.log('Showing vehicle image:', imageUrl);

    const imageElement = document.getElementById('vehicle-image');
    const placeholder = document.getElementById('vehicle-image-placeholder');
    const container = document.getElementById('vehicle-image-container');
    const overlay = document.getElementById('image-overlay');

    if (imageElement && placeholder && container) {
        // Bild laden und anzeigen
        imageElement.onload = function() {
            console.log('Image loaded successfully');
            imageElement.classList.remove('hidden');
            placeholder.classList.add('hidden');

            // Container-Style anpassen
            container.classList.remove('border-dashed', 'border-gray-300');
            container.classList.add('border-solid', 'border-gray-200');

            // Overlay für Hover-Effekt anzeigen
            if (overlay) {
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
            }
        };

        imageElement.onerror = function() {
            console.error('Failed to load image');
            showVehicleImagePlaceholder();
            // URL freigeben bei Fehler
            URL.revokeObjectURL(imageUrl);
        };

        imageElement.src = imageUrl;
    }
}

// Placeholder anzeigen
function showVehicleImagePlaceholder() {
    console.log('Showing vehicle image placeholder');

    const imageElement = document.getElementById('vehicle-image');
    const placeholder = document.getElementById('vehicle-image-placeholder');
    const container = document.getElementById('vehicle-image-container');
    const overlay = document.getElementById('image-overlay');

    if (imageElement && placeholder && container) {
        imageElement.classList.add('hidden');
        placeholder.classList.remove('hidden');

        // Container-Style zurücksetzen
        container.classList.add('border-dashed', 'border-gray-300');
        container.classList.remove('border-solid', 'border-gray-200');

        // Overlay verstecken
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }

        // Alte Blob URL freigeben falls vorhanden
        if (imageElement.src && imageElement.src.startsWith('blob:')) {
            URL.revokeObjectURL(imageElement.src);
        }
        imageElement.src = '';
    }
}

// Container Hover-Effekte einrichten
function setupImageContainerHover() {
    const container = document.getElementById('vehicle-image-container');
    const overlay = document.getElementById('image-overlay');

    if (!container || !overlay) return;

    container.addEventListener('mouseenter', function() {
        // Nur wenn ein Bild vorhanden ist
        const imageElement = document.getElementById('vehicle-image');
        if (imageElement && !imageElement.classList.contains('hidden')) {
            overlay.style.opacity = '1';
        }
    });

    container.addEventListener('mouseleave', function() {
        overlay.style.opacity = '0';
    });
}

// Upload-Dialog öffnen
function openVehicleImageUpload() {
    console.log('Opening vehicle image upload dialog');
    const fileInput = document.getElementById('vehicle-image-input');
    if (fileInput) {
        fileInput.click();
    } else {
        console.error('File input element not found');
    }
}

// Bildupload behandeln
async function handleVehicleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }

    console.log('Handling vehicle image upload:', file.name, 'Size:', file.size);

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

        console.log('Uploading image to API...');
        const response = await fetch(`/api/vehicles/${vehicleImageId}/documents`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        console.log('Upload response:', response.status, result);

        if (!response.ok) {
            throw new Error(result.error || 'Upload fehlgeschlagen');
        }

        showImageNotification('Fahrzeugbild erfolgreich hochgeladen', 'success');

        // Kurz warten und dann Bild neu laden
        setTimeout(() => {
            console.log('Reloading image after upload...');
            loadVehicleImage();
        }, 1000);

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

    console.log('Image file validation passed');
    return true;
}

// Upload-Progress anzeigen/verstecken
function showImageUploadProgress(show) {
    const progressElement = document.getElementById('image-upload-progress');
    const container = document.getElementById('vehicle-image-container');

    if (progressElement && container) {
        if (show) {
            console.log('Showing upload progress');
            progressElement.classList.remove('hidden');
            progressElement.classList.add('flex');
            container.style.pointerEvents = 'none';
        } else {
            console.log('Hiding upload progress');
            progressElement.classList.add('hidden');
            progressElement.classList.remove('flex');
            container.style.pointerEvents = 'auto';
        }
    }
}

// Notification anzeigen (eigene Funktion um Konflikte zu vermeiden)
function showImageNotification(message, type = 'info') {
    console.log('Showing notification:', type, message);

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
    }, 4000);
}

// Drag & Drop für Fahrzeugbild
function setupVehicleImageDragDrop() {
    const container = document.getElementById('vehicle-image-container');
    if (!container) {
        console.log('No container found for drag&drop setup');
        return;
    }

    console.log('Setting up drag & drop for vehicle image');

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
            console.log('File dropped:', file.name);
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
    console.log('loadVehicleImage called from template');
    // Kurz warten für DOM
    setTimeout(() => {
        if (vehicleImageId) {
            loadVehicleImage();
        } else {
            console.warn('vehicleImageId not set yet');
        }
    }, 100);
};

// Cleanup-Funktion für Blob URLs
window.addEventListener('beforeunload', function() {
    const imageElement = document.getElementById('vehicle-image');
    if (imageElement && imageElement.src && imageElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(imageElement.src);
    }
});