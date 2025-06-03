// frontend/static/js/vehicle-images.js - Bildergalerie-Verwaltung

// Globale Variablen
let currentVehicleId = null;
let currentImages = [];
let selectedImageId = null;

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    // Nur initialisieren wenn wir auf der Fahrzeugdetails-Seite sind
    if (window.location.pathname.includes('/vehicle-details/')) {
        currentVehicleId = window.location.pathname.split('/').pop();

        // Prüfen ob images-Tab aktiv ist (DOM-Elemente existieren)
        const imagesGrid = document.getElementById('images-grid');
        if (imagesGrid) {
            initializeImages();
        } else {
            console.log('Images tab nicht aktiv - keine Initialisierung');
        }
    }
});

// Bildergalerie initialisieren
function initializeImages() {
    if (!isImagesTabAvailable()) {
        console.log('Images tab Elemente nicht verfügbar');
        return;
    }

    setupImageEventListeners();
    loadVehicleImages();
}

// Prüfen ob Images-Tab verfügbar ist
function isImagesTabAvailable() {
    return document.getElementById('images-grid') !== null;
}

// Event-Listener einrichten
function setupImageEventListeners() {
    // Upload Modal schließen
    document.querySelectorAll('.close-upload-image-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            closeUploadImageModal();
        });
    });

    // Upload Form Submit
    const uploadForm = document.getElementById('upload-image-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleImageUpload);
    }

    // Datei-Input Change
    const fileInput = document.getElementById('image-file');
    if (fileInput) {
        fileInput.addEventListener('change', handleImageFileSelect);
    }

    // Drag & Drop
    const dropZone = document.getElementById('image-drop-zone');
    if (dropZone) {
        setupImageDragAndDrop(dropZone);
    }

    // View Modal schließen
    document.addEventListener('click', function(e) {
        if (e.target.id === 'view-image-modal') {
            closeViewImageModal();
        }
    });
}

// Drag & Drop Setup für Bilder
function setupImageDragAndDrop(dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    dropZone.addEventListener('drop', handleImageDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50');
    }

    function unhighlight(e) {
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
    }

    function handleImageDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const fileInput = document.getElementById('image-file');
            if (fileInput) {
                fileInput.files = files;
                handleImageFileSelect({ target: fileInput });
            }
        }
    }
}

// Datei-Auswahl behandeln
function handleImageFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validierung
    if (!validateImageFile(file)) {
        return;
    }

    // Datei-Info anzeigen
    const fileInfo = document.getElementById('selected-image-info');
    const fileName = document.getElementById('selected-image-name');
    const fileSize = document.getElementById('selected-image-size');

    if (fileName && fileSize && fileInfo) {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.classList.remove('hidden');
    }

    // Automatisch Namen setzen wenn leer
    const nameInput = document.getElementById('image-name');
    if (nameInput && !nameInput.value) {
        nameInput.value = file.name.replace(/\.[^/.]+$/, ""); // Dateierweiterung entfernen
    }
}

// Bild validieren
function validateImageFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB für Bilder
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    // Größe prüfen
    if (file.size > maxSize) {
        showImageNotification('Bild ist zu groß. Maximum: 5MB', 'error');
        return false;
    }

    // MIME-Type prüfen
    if (!allowedTypes.includes(file.type)) {
        showImageNotification('Nur Bildformate sind erlaubt (JPG, PNG, GIF, WebP)', 'error');
        return false;
    }

    // Dateiname-Validierung
    if (file.name.length > 255) {
        showImageNotification('Dateiname ist zu lang (max. 255 Zeichen)', 'error');
        return false;
    }

    return true;
}

// Upload Modal öffnen
function openUploadImageModal(vehicleId) {
    currentVehicleId = vehicleId;
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
}

// Upload Modal schließen
function closeUploadImageModal() {
    const modal = document.getElementById('upload-image-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    resetUploadImageForm();
}

// Upload Form zurücksetzen
function resetUploadImageForm() {
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
}

// Upload behandeln
async function handleImageUpload(event) {
    event.preventDefault();

    const form = event.target;
    const fileInput = document.getElementById('image-file');

    if (!fileInput || !fileInput.files[0]) {
        showImageNotification('Bitte wählen Sie ein Bild aus', 'error');
        return;
    }

    if (!validateImageFile(fileInput.files[0])) {
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
        formData.append('type', 'vehicle_image'); // Wichtig: Als Bild markieren
        formData.append('name', form.name.value || 'Fahrzeugbild');
        formData.append('notes', form.notes.value || '');

        const response = await fetch(`/api/vehicles/${currentVehicleId}/documents`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Upload fehlgeschlagen');
        }

        showImageNotification('Bild erfolgreich hochgeladen', 'success');
        closeUploadImageModal();
        loadVehicleImages(); // Liste neu laden

        // Auch das Hauptbild neu laden falls es das erste Bild ist
        if (typeof loadVehicleImage === 'function') {
            setTimeout(() => loadVehicleImage(), 500);
        }

    } catch (error) {
        console.error('Upload error:', error);
        showImageNotification('Fehler beim Hochladen: ' + error.message, 'error');
    } finally {
        resetUploadImageForm();
    }
}

// Fahrzeugbilder laden
async function loadVehicleImages() {
    if (!currentVehicleId || !isImagesTabAvailable()) {
        console.log('Kann Bilder nicht laden - Tab nicht verfügbar oder fehlende Vehicle ID');
        return;
    }

    try {
        const response = await fetch(`/api/vehicles/${currentVehicleId}/documents`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Fehler beim Laden der Bilder');
        }

        // Nur Bilder filtern (vehicle_image type)
        currentImages = (data.documents || []).filter(doc => doc.type === 'vehicle_image');
        renderImages();

    } catch (error) {
        console.error('Error loading images:', error);
        showImageLoadError();
    }
}

// Bilder rendern
function renderImages() {
    const grid = document.getElementById('images-grid');
    if (!grid) {
        console.error('images-grid Element nicht gefunden');
        return;
    }

    const loadingElement = document.getElementById('images-loading');
    if (loadingElement) {
        loadingElement.remove();
    }

    grid.innerHTML = '';

    if (currentImages.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full">
                <div class="flex flex-col items-center py-12">
                    <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Bilder vorhanden</h3>
                    <p class="text-gray-500 mb-4">Laden Sie das erste Bild für dieses Fahrzeug hoch.</p>
                    <button onclick="openUploadImageModal('${currentVehicleId}')" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
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

    currentImages.forEach(image => {
        const imageElement = createImageThumbnail(image);
        grid.appendChild(imageElement);
    });
}

// Bild-Thumbnail erstellen
function createImageThumbnail(image) {
    const div = document.createElement('div');
    div.className = 'relative group cursor-pointer bg-gray-200 rounded-lg overflow-hidden aspect-square';
    div.onclick = () => viewImage(image);

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
    loadImageThumbnail(div, image.id);

    return div;
}

// Bild-Thumbnail laden
async function loadImageThumbnail(container, imageId) {
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
}

// Bild anzeigen
function viewImage(image) {
    selectedImageId = image.id;
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
}

// View Modal schließen
function closeViewImageModal() {
    const modal = document.getElementById('view-image-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    selectedImageId = null;
}

// Fehler beim Laden anzeigen
function showImageLoadError() {
    const grid = document.getElementById('images-grid');
    if (!grid) {
        console.error('Kann Fehler nicht anzeigen - grid Element nicht gefunden');
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
                <button onclick="loadVehicleImages()" class="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                    Erneut versuchen
                </button>
            </div>
        </div>
    `;
}

// Hilfsfunktionen
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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
        notification.remove();
    }, 3000);
}

// Globale Funktionen für HTML-Event-Handler
window.openUploadImageModal = openUploadImageModal;

window.deleteImage = async function() {
    if (!selectedImageId) return;

    if (!confirm('Möchten Sie dieses Bild wirklich löschen?')) {
        return;
    }

    try {
        const response = await fetch(`/api/documents/${selectedImageId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Löschen fehlgeschlagen');
        }

        showImageNotification('Bild erfolgreich gelöscht', 'success');
        closeViewImageModal();
        loadVehicleImages();

        // Auch das Hauptbild neu laden
        if (typeof loadVehicleImage === 'function') {
            setTimeout(() => loadVehicleImage(), 500);
        }

    } catch (error) {
        console.error('Delete error:', error);
        showImageNotification('Fehler beim Löschen: ' + error.message, 'error');
    }
};

window.downloadImage = function() {
    if (selectedImageId) {
        window.open(`/api/documents/${selectedImageId}/download`, '_blank');
    }
};

// Tastatur-Navigation
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const uploadModal = document.getElementById('upload-image-modal');
        const viewModal = document.getElementById('view-image-modal');

        if (uploadModal && !uploadModal.classList.contains('hidden')) {
            closeUploadImageModal();
        }
        if (viewModal && !viewModal.classList.contains('hidden')) {
            closeViewImageModal();
        }
    }
});

// Funktion für dynamisches Laden wenn Tab gewechselt wird
window.initializeImagesIfAvailable = function() {
    if (window.location.pathname.includes('/vehicle-details/') && isImagesTabAvailable()) {
        currentVehicleId = window.location.pathname.split('/').pop();
        initializeImages();
    }
};

// Fahrzeugbild laden - KORRIGIERT
async function loadVehicleImage() {
    if (!vehicleImageId || isImageLoading) {
        console.log('Skipping image load:', !vehicleImageId ? 'no vehicle ID' : 'already loading');
        return;
    }

    const imageElement = document.getElementById('vehicle-image');
    const placeholder = document.getElementById('vehicle-image-placeholder');

    // Prüfen ob Elemente existieren
    if (!imageElement || !placeholder) {
        console.log('Fahrzeugbild-Elemente nicht gefunden');
        return;
    }

    isImageLoading = true;
    console.log('Loading vehicle image for ID:', vehicleImageId);

    try {
        // Zuerst versuchen über die spezielle Image-API
        const response = await fetch(`/api/vehicles/${vehicleImageId}/image`, {
            method: 'GET',
            headers: {
                'Accept': 'image/*'
            }
        });

        console.log('Image API response status:', response.status);

        if (response.ok) {
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType);

            if (contentType && contentType.startsWith('image/')) {
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
            } else {
                console.log('Response is not an image, content-type:', contentType);
                showVehicleImagePlaceholder();
            }
        } else if (response.status === 404) {
            // Kein Bild über spezielle API gefunden, versuche über Documents API
            console.log('No main image found, trying to find first vehicle_image from documents...');
            await loadFirstVehicleImageFromDocuments();
        } else {
            console.warn('Unexpected response status:', response.status);
            showVehicleImagePlaceholder();
        }
    } catch (error) {
        console.log('Error loading vehicle image:', error);
        // Fallback: Versuche das erste Bild aus den Dokumenten zu laden
        await loadFirstVehicleImageFromDocuments();
    } finally {
        isImageLoading = false;
    }
}

// Fallback: Erstes Fahrzeugbild aus Dokumenten laden
async function loadFirstVehicleImageFromDocuments() {
    try {
        const response = await fetch(`/api/vehicles/${vehicleImageId}/documents`);
        if (response.ok) {
            const data = await response.json();
            const images = (data.documents || []).filter(doc => doc.type === 'vehicle_image');

            if (images.length > 0) {
                // Erstes Bild verwenden
                const firstImage = images[0];
                const imageResponse = await fetch(`/api/documents/${firstImage.id}/download`);

                if (imageResponse.ok) {
                    const blob = await imageResponse.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    showVehicleImage(imageUrl);
                    return;
                }
            }
        }

        // Wenn kein Bild gefunden, Placeholder anzeigen
        showVehicleImagePlaceholder();
    } catch (error) {
        console.log('Error loading first image from documents:', error);
        showVehicleImagePlaceholder();
    }
}