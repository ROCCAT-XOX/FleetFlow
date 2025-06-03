// frontend/static/js/vehicle-images.js - Bildergalerie-Verwaltung

// Namespace für Bildergalerie-Funktionen
const VehicleGallery = {
    vehicleId: null,
    images: [],
    selectedImageId: null
};

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    // Nur initialisieren wenn wir auf der Fahrzeugdetails-Seite sind
    if (window.location.pathname.includes('/vehicle-details/')) {
        VehicleGallery.vehicleId = window.location.pathname.split('/').pop();

        // Prüfen ob images-Tab aktiv ist (DOM-Elemente existieren)
        const imagesGrid = document.getElementById('images-grid');
        if (imagesGrid) {
            VehicleGallery.initialize();
        }
    }
});

// Bildergalerie initialisieren
VehicleGallery.initialize = function() {
    if (!VehicleGallery.isTabAvailable()) {
        return;
    }

    VehicleGallery.setupEventListeners();
    VehicleGallery.loadImages();
};

// Prüfen ob Images-Tab verfügbar ist
VehicleGallery.isTabAvailable = function() {
    return document.getElementById('images-grid') !== null;
};

// Event-Listener einrichten
VehicleGallery.setupEventListeners = function() {
    // Upload Modal schließen
    document.querySelectorAll('.close-upload-image-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            VehicleGallery.closeUploadModal();
        });
    });

    // Upload Form Submit
    const uploadForm = document.getElementById('upload-image-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', VehicleGallery.handleUpload);
    }

    // Datei-Input Change
    const fileInput = document.getElementById('image-file');
    if (fileInput) {
        fileInput.addEventListener('change', VehicleGallery.handleFileSelect);
    }

    // Drag & Drop
    const dropZone = document.getElementById('image-drop-zone');
    if (dropZone) {
        VehicleGallery.setupDragAndDrop(dropZone);
    }

    // View Modal schließen
    document.addEventListener('click', function(e) {
        if (e.target.id === 'view-image-modal') {
            VehicleGallery.closeViewModal();
        }
    });
};

// Drag & Drop Setup für Bilder
VehicleGallery.setupDragAndDrop = function(dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, VehicleGallery.preventDefaults, false);
        document.body.addEventListener(eventName, VehicleGallery.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, VehicleGallery.highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, VehicleGallery.unhighlight, false);
    });

    dropZone.addEventListener('drop', VehicleGallery.handleDrop, false);
};

VehicleGallery.preventDefaults = function(e) {
    e.preventDefault();
    e.stopPropagation();
};

VehicleGallery.highlight = function(e) {
    const dropZone = document.getElementById('image-drop-zone');
    if (dropZone) {
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50');
    }
};

VehicleGallery.unhighlight = function(e) {
    const dropZone = document.getElementById('image-drop-zone');
    if (dropZone) {
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
    }
};

VehicleGallery.handleDrop = function(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        const fileInput = document.getElementById('image-file');
        if (fileInput) {
            fileInput.files = files;
            VehicleGallery.handleFileSelect({ target: fileInput });
        }
    }
};

// Datei-Auswahl behandeln
VehicleGallery.handleFileSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validierung
    if (!VehicleGallery.validateImageFile(file)) {
        return;
    }

    // Datei-Info anzeigen
    const fileInfo = document.getElementById('selected-image-info');
    const fileName = document.getElementById('selected-image-name');
    const fileSize = document.getElementById('selected-image-size');

    if (fileName && fileSize && fileInfo) {
        fileName.textContent = file.name;
        fileSize.textContent = VehicleGallery.formatFileSize(file.size);
        fileInfo.classList.remove('hidden');
    }

    // Automatisch Namen setzen wenn leer
    const nameInput = document.getElementById('image-name');
    if (nameInput && !nameInput.value) {
        nameInput.value = file.name.replace(/\.[^/.]+$/, "");
    }
};

// Bild validieren
VehicleGallery.validateImageFile = function(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB für Bilder
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
        VehicleGallery.showNotification('Bild ist zu groß. Maximum: 5MB', 'error');
        return false;
    }

    if (!allowedTypes.includes(file.type)) {
        VehicleGallery.showNotification('Nur Bildformate sind erlaubt (JPG, PNG, GIF, WebP)', 'error');
        return false;
    }

    if (file.name.length > 255) {
        VehicleGallery.showNotification('Dateiname ist zu lang (max. 255 Zeichen)', 'error');
        return false;
    }

    return true;
};

// Upload Modal öffnen
window.openUploadImageModal = function(vehicleId) {
    VehicleGallery.vehicleId = vehicleId;
    const modal = document.getElementById('upload-image-modal');
    const form = document.getElementById('upload-image-form');

    if (!modal || !form) {
        console.error('Upload image modal Elemente nicht gefunden');
        return;
    }

    // Form zurücksetzen
    form.reset();
    const selectedFileInfo = document.getElementById('selected-image-info');
    if (selectedFileInfo) {
        selectedFileInfo.classList.add('hidden');
    }

    modal.classList.remove('hidden');
};

// Upload Modal schließen
VehicleGallery.closeUploadModal = function() {
    const modal = document.getElementById('upload-image-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    VehicleGallery.resetUploadForm();
};

// Upload Form zurücksetzen
VehicleGallery.resetUploadForm = function() {
    const form = document.getElementById('upload-image-form');
    if (form) {
        form.reset();
    }

    const selectedFileInfo = document.getElementById('selected-image-info');
    if (selectedFileInfo) {
        selectedFileInfo.classList.add('hidden');
    }

    // Button zurücksetzen
    const submitBtn = document.getElementById('upload-image-submit-btn');
    const btnText = document.getElementById('upload-image-btn-text');
    const spinner = document.getElementById('upload-image-spinner');

    if (submitBtn && btnText && spinner) {
        submitBtn.disabled = false;
        btnText.textContent = 'Hochladen';
        spinner.classList.add('hidden');
    }
};

// Upload behandeln
VehicleGallery.handleUpload = async function(event) {
    event.preventDefault();

    const form = event.target;
    const fileInput = document.getElementById('image-file');

    if (!fileInput || !fileInput.files[0]) {
        VehicleGallery.showNotification('Bitte wählen Sie ein Bild aus', 'error');
        return;
    }

    if (!VehicleGallery.validateImageFile(fileInput.files[0])) {
        return;
    }

    // Button deaktivieren und Spinner anzeigen
    const submitBtn = document.getElementById('upload-image-submit-btn');
    const btnText = document.getElementById('upload-image-btn-text');
    const spinner = document.getElementById('upload-image-spinner');

    if (submitBtn && btnText && spinner) {
        submitBtn.disabled = true;
        btnText.textContent = '';
        spinner.classList.remove('hidden');
    }

    try {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('type', 'vehicle_image');
        formData.append('name', form.name.value || 'Fahrzeugbild');
        formData.append('notes', form.notes.value || '');

        const response = await fetch(`/api/vehicles/${VehicleGallery.vehicleId}/documents`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Upload fehlgeschlagen');
        }

        VehicleGallery.showNotification('Bild erfolgreich hochgeladen', 'success');
        VehicleGallery.closeUploadModal();
        VehicleGallery.loadImages();

        // Auch das Hauptbild neu laden falls es das erste Bild ist
        if (typeof VehicleImage !== 'undefined' && VehicleImage.loadVehicleImage) {
            setTimeout(() => VehicleImage.loadVehicleImage(), 500);
        }

    } catch (error) {
        console.error('Upload error:', error);
        VehicleGallery.showNotification('Fehler beim Hochladen: ' + error.message, 'error');
    } finally {
        VehicleGallery.resetUploadForm();
    }
};

// Fahrzeugbilder laden
VehicleGallery.loadImages = async function() {
    if (!VehicleGallery.vehicleId || !VehicleGallery.isTabAvailable()) {
        return;
    }

    try {
        const response = await fetch(`/api/vehicles/${VehicleGallery.vehicleId}/documents`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Fehler beim Laden der Bilder');
        }

        // Nur Bilder filtern (vehicle_image type)
        VehicleGallery.images = (data.documents || []).filter(doc => doc.type === 'vehicle_image');
        VehicleGallery.renderImages();

    } catch (error) {
        console.error('Error loading images:', error);
        VehicleGallery.showLoadError();
    }
};

// Bilder rendern
VehicleGallery.renderImages = function() {
    const grid = document.getElementById('images-grid');
    if (!grid) {
        return;
    }

    const loadingElement = document.getElementById('images-loading');
    if (loadingElement) {
        loadingElement.remove();
    }

    grid.innerHTML = '';

    if (VehicleGallery.images.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full">
                <div class="flex flex-col items-center py-12">
                    <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Bilder vorhanden</h3>
                    <p class="text-gray-500 mb-4">Laden Sie das erste Bild für dieses Fahrzeug hoch.</p>
                    <button onclick="openUploadImageModal('${VehicleGallery.vehicleId}')" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                        <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        Erstes Bild hochladen
                    </button>
                </div>
            </div>
        `;
        return;
    }

    VehicleGallery.images.forEach(image => {
        const imageElement = VehicleGallery.createImageThumbnail(image);
        grid.appendChild(imageElement);
    });
};

// Bild-Thumbnail erstellen
VehicleGallery.createImageThumbnail = function(image) {
    const div = document.createElement('div');
    div.className = 'relative group cursor-pointer bg-gray-200 rounded-lg overflow-hidden aspect-square';
    div.onclick = () => VehicleGallery.viewImage(image);

    div.innerHTML = `
        <div class="w-full h-full bg-gray-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
        </div>
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div class="text-white text-center">
                <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                <span class="text-xs">${image.name}</span>
            </div>
        </div>
    `;

    // Bild laden und anzeigen
    VehicleGallery.loadImageThumbnail(div, image.id);

    return div;
};

// Bild-Thumbnail laden
VehicleGallery.loadImageThumbnail = async function(container, imageId) {
    try {
        const response = await fetch(`/api/documents/${imageId}/download`);
        if (response.ok) {
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);

            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'w-full h-full object-cover';
            img.onload = () => {
                container.innerHTML = '';
                container.appendChild(img);

                // Overlay wieder hinzufügen
                const overlay = document.createElement('div');
                overlay.className = 'absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center';
                overlay.innerHTML = `
                    <div class="text-white text-center">
                        <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        <span class="text-xs">Anzeigen</span>
                    </div>
                `;
                container.appendChild(overlay);
            };
        }
    } catch (error) {
        console.error('Error loading thumbnail:', error);
    }
};

// Bild anzeigen
VehicleGallery.viewImage = function(image) {
    VehicleGallery.selectedImageId = image.id;
    const modal = document.getElementById('view-image-modal');
    const title = document.getElementById('view-image-title');
    const content = document.getElementById('view-image-content');

    if (!modal || !title || !content) {
        console.error('View image modal Elemente nicht gefunden');
        return;
    }

    title.textContent = image.name || 'Fahrzeugbild';
    content.src = `/api/documents/${image.id}/download`;
    content.alt = image.name || 'Fahrzeugbild';

    modal.classList.remove('hidden');
};

// View Modal schließen
VehicleGallery.closeViewModal = function() {
    const modal = document.getElementById('view-image-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    VehicleGallery.selectedImageId = null;
};

window.closeViewImageModal = VehicleGallery.closeViewModal;

// Fehler beim Laden anzeigen
VehicleGallery.showLoadError = function() {
    const grid = document.getElementById('images-grid');
    if (!grid) {
        return;
    }

    grid.innerHTML = `
        <div class="col-span-full">
            <div class="flex flex-col items-center py-12">
                <svg class="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 class="text-sm font-medium text-gray-900">Fehler beim Laden</h3>
                <p class="text-sm text-gray-500 mt-1">Die Bilder konnten nicht geladen werden.</p>
                <button onclick="VehicleGallery.loadImages()" class="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                    Erneut versuchen
                </button>
            </div>
        </div>
    `;
};

// Hilfsfunktionen
VehicleGallery.formatFileSize = function(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

VehicleGallery.showNotification = function(message, type = 'info') {
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
};

// Globale Funktionen für HTML-Event-Handler
window.deleteImage = async function() {
    if (!VehicleGallery.selectedImageId) return;

    if (!confirm('Möchten Sie dieses Bild wirklich löschen?')) {
        return;
    }

    try {
        const response = await fetch(`/api/documents/${VehicleGallery.selectedImageId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Löschen fehlgeschlagen');
        }

        VehicleGallery.showNotification('Bild erfolgreich gelöscht', 'success');
        VehicleGallery.closeViewModal();
        VehicleGallery.loadImages();

        // Auch das Hauptbild neu laden
        if (typeof VehicleImage !== 'undefined' && VehicleImage.loadVehicleImage) {
            setTimeout(() => VehicleImage.loadVehicleImage(), 500);
        }

    } catch (error) {
        console.error('Delete error:', error);
        VehicleGallery.showNotification('Fehler beim Löschen: ' + error.message, 'error');
    }
};

window.downloadImage = function() {
    if (VehicleGallery.selectedImageId) {
        window.open(`/api/documents/${VehicleGallery.selectedImageId}/download`, '_blank');
    }
};

// Tastatur-Navigation
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const uploadModal = document.getElementById('upload-image-modal');
        const viewModal = document.getElementById('view-image-modal');

        if (uploadModal && !uploadModal.classList.contains('hidden')) {
            VehicleGallery.closeUploadModal();
        }
        if (viewModal && !viewModal.classList.contains('hidden')) {
            VehicleGallery.closeViewModal();
        }
    }
});

// Funktion für dynamisches Laden wenn Tab gewechselt wird
window.initializeImagesIfAvailable = function() {
    if (window.location.pathname.includes('/vehicle-details/') && VehicleGallery.isTabAvailable()) {
        VehicleGallery.vehicleId = window.location.pathname.split('/').pop();
        VehicleGallery.initialize();
    }
};

// Fahrzeugbild Upload öffnen - GLOBALE Funktion
function openVehicleImageUpload() {
    console.log('openVehicleImageUpload called');
    const fileInput = document.getElementById('vehicle-image-input');
    if (fileInput) {
        fileInput.click();
    } else {
        console.error('vehicle-image-input not found');
    }
}

// Auch als window-Property setzen für Sicherheit
window.openVehicleImageUpload = openVehicleImageUpload;

// Namespace für Fahrzeugbild-Funktionen
const VehicleImage = {
    vehicleId: null,
    isLoading: false
};

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    // Nur initialisieren wenn wir auf der Fahrzeugdetails-Seite sind
    if (window.location.pathname.includes('/vehicle-details/')) {
        VehicleImage.vehicleId = window.location.pathname.split('/').pop();
        VehicleImage.loadVehicleImage();
        VehicleImage.setupEventListeners();
    }
});

// Event-Listener einrichten
VehicleImage.setupEventListeners = function() {
    const imageInput = document.getElementById('vehicle-image-input');
    if (imageInput) {
        imageInput.addEventListener('change', VehicleImage.handleVehicleImageUpload);
    }
};

// Fahrzeugbild Upload öffnen - GLOBALE Funktion
function openVehicleImageUpload() {
    const fileInput = document.getElementById('vehicle-image-input');
    if (fileInput) {
        fileInput.click();
    }
}

// Auch als window-Property setzen für Sicherheit
window.openVehicleImageUpload = openVehicleImageUpload;

// Fahrzeugbild Upload behandeln
VehicleImage.handleVehicleImageUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validierung
    if (!VehicleImage.validateImageFile(file)) {
        return;
    }

    VehicleImage.uploadImage(file);
};

// Bild validieren
VehicleImage.validateImageFile = function(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
        VehicleImage.showNotification('Bild ist zu groß. Maximum: 5MB', 'error');
        return false;
    }

    if (!allowedTypes.includes(file.type)) {
        VehicleImage.showNotification('Nur Bildformate sind erlaubt (JPG, PNG, GIF, WebP)', 'error');
        return false;
    }

    return true;
};

// Bild hochladen
VehicleImage.uploadImage = async function(file) {
    if (!VehicleImage.vehicleId) {
        VehicleImage.showNotification('Fahrzeug-ID nicht gefunden', 'error');
        return;
    }

    VehicleImage.showProgress(true);

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'vehicle_image');
        formData.append('name', 'Hauptfahrzeugbild');
        formData.append('notes', 'Hauptbild des Fahrzeugs');

        const response = await fetch(`/api/vehicles/${VehicleImage.vehicleId}/documents`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Upload fehlgeschlagen');
        }

        VehicleImage.showNotification('Fahrzeugbild erfolgreich hochgeladen', 'success');

        // Bild neu laden
        setTimeout(() => {
            VehicleImage.loadVehicleImage();
        }, 500);

    } catch (error) {
        console.error('Upload error:', error);
        VehicleImage.showNotification('Fehler beim Hochladen: ' + error.message, 'error');
    } finally {
        VehicleImage.showProgress(false);
    }
};

// Fahrzeugbild laden
VehicleImage.loadVehicleImage = async function() {
    if (!VehicleImage.vehicleId || VehicleImage.isLoading) {
        return;
    }

    const imageElement = document.getElementById('vehicle-image');
    const placeholder = document.getElementById('vehicle-image-placeholder');
    const overlay = document.getElementById('image-overlay');

    if (!imageElement || !placeholder) {
        return;
    }

    VehicleImage.isLoading = true;

    try {
        // Zuerst versuchen über die spezielle Image-API
        const response = await fetch(`/api/vehicles/${VehicleImage.vehicleId}/image`);

        if (response.ok) {
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.startsWith('image/')) {
                const blob = await response.blob();

                if (blob.size > 0) {
                    const imageUrl = URL.createObjectURL(blob);
                    VehicleImage.showVehicleImage(imageUrl);
                } else {
                    VehicleImage.showVehicleImagePlaceholder();
                }
            } else {
                VehicleImage.showVehicleImagePlaceholder();
            }
        } else if (response.status === 404) {
            // Kein Hauptbild gefunden, versuche erstes Bild aus Dokumenten
            await VehicleImage.loadFirstVehicleImageFromDocuments();
        } else {
            VehicleImage.showVehicleImagePlaceholder();
        }
    } catch (error) {
        console.log('Error loading vehicle image:', error);
        await VehicleImage.loadFirstVehicleImageFromDocuments();
    } finally {
        VehicleImage.isLoading = false;
    }
};

// Fallback: Erstes Fahrzeugbild aus Dokumenten laden
VehicleImage.loadFirstVehicleImageFromDocuments = async function() {
    try {
        const response = await fetch(`/api/vehicles/${VehicleImage.vehicleId}/documents`);
        if (response.ok) {
            const data = await response.json();
            const images = (data.documents || []).filter(doc => doc.type === 'vehicle_image');

            if (images.length > 0) {
                const firstImage = images[0];
                const imageResponse = await fetch(`/api/documents/${firstImage.id}/download`);

                if (imageResponse.ok) {
                    const blob = await imageResponse.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    VehicleImage.showVehicleImage(imageUrl);
                    return;
                }
            }
        }

        VehicleImage.showVehicleImagePlaceholder();
    } catch (error) {
        console.log('Error loading first image from documents:', error);
        VehicleImage.showVehicleImagePlaceholder();
    }
};

// Fahrzeugbild anzeigen
VehicleImage.showVehicleImage = function(imageUrl) {
    const imageElement = document.getElementById('vehicle-image');
    const placeholder = document.getElementById('vehicle-image-placeholder');
    const overlay = document.getElementById('image-overlay');

    if (imageElement && placeholder) {
        imageElement.src = imageUrl;
        imageElement.classList.remove('hidden');
        placeholder.classList.add('hidden');

        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }
};

// Placeholder anzeigen
VehicleImage.showVehicleImagePlaceholder = function() {
    const imageElement = document.getElementById('vehicle-image');
    const placeholder = document.getElementById('vehicle-image-placeholder');
    const overlay = document.getElementById('image-overlay');

    if (imageElement && placeholder) {
        imageElement.classList.add('hidden');
        placeholder.classList.remove('hidden');

        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
};

// Progress anzeigen/verstecken
VehicleImage.showProgress = function(show) {
    const progress = document.getElementById('image-upload-progress');
    if (progress) {
        if (show) {
            progress.classList.remove('hidden');
            progress.classList.add('flex');
        } else {
            progress.classList.add('hidden');
            progress.classList.remove('flex');
        }
    }
};

// Notification anzeigen
VehicleImage.showNotification = function(message, type = 'info') {
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
};