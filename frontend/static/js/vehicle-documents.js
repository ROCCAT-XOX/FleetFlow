// frontend/static/js/vehicle-documents.js

// Globale Variablen
let currentVehicleId = null;
let currentDocuments = [];

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    // Nur initialisieren wenn wir auf der Fahrzeugdetails-Seite sind
    if (window.location.pathname.includes('/vehicle-details/')) {
        currentVehicleId = window.location.pathname.split('/').pop();
        initializeDocuments();
    }
});

// Dokumentenverwaltung initialisieren
function initializeDocuments() {
    setupEventListeners();
    loadDocuments();
}

// Event-Listener einrichten
function setupEventListeners() {
    // Upload Modal schließen
    document.querySelectorAll('.close-upload-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            closeUploadModal();
        });
    });

    // Edit Modal schließen
    document.querySelectorAll('.close-edit-document-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            closeEditModal();
        });
    });

    // Upload Form Submit
    const uploadForm = document.getElementById('upload-document-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    // Edit Form Submit
    const editForm = document.getElementById('edit-document-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEdit);
    }

    // Datei-Input Change
    const fileInput = document.getElementById('document-file');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Drag & Drop
    const dropZone = document.getElementById('file-drop-zone');
    if (dropZone) {
        setupDragAndDrop(dropZone);
    }

    // Automatischer Dokumentname basierend auf Typ
    const typeSelect = document.getElementById('document-type');
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            updateDocumentNameSuggestion(this.value);
        });
    }
}

// Drag & Drop Setup
function setupDragAndDrop(dropZone) {
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fileInput = document.getElementById('document-file');
            fileInput.files = files;
            handleFileSelect({ target: fileInput });
        }
    });
}

// Datei-Auswahl behandeln
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Datei-Info anzeigen
    const fileInfo = document.getElementById('selected-file-info');
    const fileName = document.getElementById('selected-file-name');
    const fileSize = document.getElementById('selected-file-size');

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove('hidden');

    // Automatisch Dokumentname setzen wenn leer
    const nameInput = document.getElementById('document-name');
    if (!nameInput.value) {
        nameInput.value = file.name.replace(/\.[^/.]+$/, ""); // Dateierweiterung entfernen
    }

    // Validierung
    validateFile(file);
}

// Datei validieren
function validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (file.size > maxSize) {
        showNotification('Datei ist zu groß. Maximum: 10MB', 'error');
        return false;
    }

    // MIME-Type aus Dateiendung ermitteln wenn nötig
    let mimeType = file.type;
    if (!mimeType) {
        const extension = file.name.split('.').pop().toLowerCase();
        const mimeMap = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        mimeType = mimeMap[extension];
    }

    if (!allowedTypes.includes(mimeType)) {
        showNotification('Dateityp nicht erlaubt. Erlaubt: PDF, JPG, PNG, GIF, DOC, DOCX', 'error');
        return false;
    }

    return true;
}

// Dokumentname-Vorschlag basierend auf Typ
function updateDocumentNameSuggestion(type) {
    const nameInput = document.getElementById('document-name');
    if (nameInput.value) return; // Nur wenn noch kein Name eingegeben

    const suggestions = {
        'vehicle_registration': 'Fahrzeugbrief',
        'vehicle_license': 'Fahrzeugschein',
        'inspection': 'HU/AU Bescheinigung',
        'insurance': 'Versicherungspolice',
        'invoice': 'Rechnung',
        'warranty': 'Garantieurkunde',
        'other': 'Dokument'
    };

    if (suggestions[type]) {
        nameInput.placeholder = suggestions[type];
    }
}

// Upload Modal öffnen
function openUploadDocumentModal(vehicleId) {
    currentVehicleId = vehicleId;
    const modal = document.getElementById('upload-document-modal');
    const form = document.getElementById('upload-document-form');

    // Form zurücksetzen
    form.reset();
    document.getElementById('selected-file-info').classList.add('hidden');

    modal.classList.remove('hidden');
}

// Upload Modal schließen
function closeUploadModal() {
    const modal = document.getElementById('upload-document-modal');
    modal.classList.add('hidden');
    resetUploadForm();
}

// Upload Form zurücksetzen
function resetUploadForm() {
    const form = document.getElementById('upload-document-form');
    form.reset();
    document.getElementById('selected-file-info').classList.add('hidden');

    // Button zurücksetzen
    const submitBtn = document.getElementById('upload-submit-btn');
    const btnText = document.getElementById('upload-btn-text');
    const spinner = document.getElementById('upload-spinner');

    submitBtn.disabled = false;
    btnText.textContent = 'Hochladen';
    spinner.classList.add('hidden');
}

// Upload behandeln (URL angepasst)
async function handleUpload(event) {
    event.preventDefault();

    const form = event.target;
    const fileInput = document.getElementById('document-file');

    if (!fileInput.files[0]) {
        showNotification('Bitte wählen Sie eine Datei aus', 'error');
        return;
    }

    if (!validateFile(fileInput.files[0])) {
        return;
    }

    // Button deaktivieren und Spinner anzeigen
    const submitBtn = document.getElementById('upload-submit-btn');
    const btnText = document.getElementById('upload-btn-text');
    const spinner = document.getElementById('upload-spinner');

    submitBtn.disabled = true;
    btnText.textContent = '';
    spinner.classList.remove('hidden');

    try {
        const formData = new FormData(form);

        // KORRIGIERTE URL - verwendet jetzt /api/vehicles/:id/documents
        const response = await fetch(`/api/vehicles/${currentVehicleId}/documents`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Upload fehlgeschlagen');
        }

        showNotification('Dokument erfolgreich hochgeladen', 'success');
        closeUploadModal();
        loadDocuments(); // Liste neu laden

    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Fehler beim Hochladen: ' + error.message, 'error');
    } finally {
        resetUploadForm();
    }
}

// Dokumente laden
async function loadDocuments() {
    if (!currentVehicleId) return;

    try {
        // KORRIGIERTE URL - verwendet jetzt /api/vehicles/:id/documents
        const response = await fetch(`/api/vehicles/${currentVehicleId}/documents`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Fehler beim Laden der Dokumente');
        }

        currentDocuments = data.documents || [];
        renderDocuments();
        updateDocumentCounts();

    } catch (error) {
        console.error('Error loading documents:', error);
        showDocumentLoadError();
    }
}

// Dokumente rendern
function renderDocuments() {
    const tbody = document.getElementById('documents-table-body');
    const loadingRow = document.getElementById('documents-loading');

    if (loadingRow) {
        loadingRow.remove();
    }

    tbody.innerHTML = '';

    if (currentDocuments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <h3 class="text-sm font-medium text-gray-900">Keine Dokumente vorhanden</h3>
                        <p class="text-sm text-gray-500 mt-1">Laden Sie das erste Dokument für dieses Fahrzeug hoch.</p>
                        <button onclick="openUploadDocumentModal('${currentVehicleId}')" class="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                            Dokument hochladen
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    currentDocuments.forEach(doc => {
        const row = createDocumentRow(doc);
        tbody.appendChild(row);
    });
}

// Dokument-Zeile erstellen
function createDocumentRow(doc) {
    const row = document.createElement('tr');

    // Status-Badge für Ablaufdatum
    let statusBadge = '';
    if (doc.isExpired) {
        statusBadge = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">Abgelaufen</span>';
    } else if (doc.isExpiring) {
        statusBadge = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ml-2">Läuft bald ab</span>';
    }

    row.innerHTML = `
        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
            <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                    ${getDocumentIcon(doc.contentType)}
                </div>
                <div class="ml-4">
                    <div class="font-medium text-gray-900">${doc.name}</div>
                    <div class="text-gray-500 text-xs">${doc.fileName}</div>
                </div>
            </div>
        </td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${doc.typeText}
        </td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${formatFileSize(doc.size)}
        </td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${formatDate(doc.uploadedAt)}
        </td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${doc.expiryDate ? formatDate(doc.expiryDate) + statusBadge : '-'}
        </td>
        <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
            <button onclick="downloadDocument('${doc.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3" title="Herunterladen">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
            </button>
            <button onclick="editDocument('${doc.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3" title="Bearbeiten">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            </button>
            <button onclick="deleteDocument('${doc.id}')" class="text-red-600 hover:text-red-900" title="Löschen">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </td>
    `;

    return row;
}

// Dokument-Icon basierend auf Content-Type
function getDocumentIcon(contentType) {
    const iconClass = "h-10 w-10 rounded-lg flex items-center justify-center";

    if (contentType.includes('pdf')) {
        return `<div class="${iconClass} bg-red-100"><svg class="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 18h12V6h-4V2H4v16zm-2 1V1h12l4 4v14H2z"/><path d="M9 13h2v2H9v-2zm0-8h2v6H9V5z"/></svg></div>`;
    } else if (contentType.includes('image')) {
        return `<div class="${iconClass} bg-green-100"><svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;
    } else if (contentType.includes('word') || contentType.includes('document')) {
        return `<div class="${iconClass} bg-blue-100"><svg class="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 18h12V6h-4V2H4v16zm-2 1V1h12l4 4v14H2z"/></svg></div>`;
    } else {
        return `<div class="${iconClass} bg-gray-100"><svg class="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>`;
    }
}

// Dokument-Zählungen aktualisieren
function updateDocumentCounts() {
    const counts = {
        'vehicle_registration': 0,
        'vehicle_license': 0,
        'inspection': 0
    };

    currentDocuments.forEach(doc => {
        if (counts.hasOwnProperty(doc.type)) {
            counts[doc.type]++;
        }
    });

    document.getElementById('vehicle-registration-count').textContent =
        counts.vehicle_registration > 0 ? `${counts.vehicle_registration} Dokument(e)` : 'Keine Dokumente';

    document.getElementById('vehicle-license-count').textContent =
        counts.vehicle_license > 0 ? `${counts.vehicle_license} Dokument(e)` : 'Keine Dokumente';

    document.getElementById('inspection-count').textContent =
        counts.inspection > 0 ? `${counts.inspection} Dokument(e)` : 'Keine Dokumente';
}

// Fehler beim Laden anzeigen
function showDocumentLoadError() {
    const tbody = document.getElementById('documents-table-body');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="py-8 text-center">
                <div class="flex flex-col items-center">
                    <svg class="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="text-sm font-medium text-gray-900">Fehler beim Laden</h3>
                    <p class="text-sm text-gray-500 mt-1">Die Dokumente konnten nicht geladen werden.</p>
                    <button onclick="loadDocuments()" class="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                        Erneut versuchen
                    </button>
                </div>
            </td>
        </tr>
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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
}

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

// Globale Funktionen für HTML-Event-Handler
window.openUploadDocumentModal = openUploadDocumentModal;

window.downloadDocument = function(documentId) {
    window.open(`/api/documents/${documentId}/download`, '_blank');
};

window.editDocument = function(documentId) {
    // Implementierung folgt in nächstem Schritt
    console.log('Edit document:', documentId);
};

window.deleteDocument = async function(documentId) {
    if (!confirm('Möchten Sie dieses Dokument wirklich löschen?')) {
        return;
    }

    try {
        const response = await fetch(`/api/documents/${documentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Löschen fehlgeschlagen');
        }

        showNotification('Dokument erfolgreich gelöscht', 'success');
        loadDocuments();

    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Fehler beim Löschen: ' + error.message, 'error');
    }
};

// Edit Modal öffnen
window.editDocument = async function(documentId) {
    try {
        // Dokument-Details aus aktueller Liste finden
        const document = currentDocuments.find(doc => doc.id === documentId);
        if (!document) {
            showNotification('Dokument nicht gefunden', 'error');
            return;
        }

        // Modal mit Daten füllen
        document.getElementById('edit-document-type').value = document.type;
        document.getElementById('edit-document-name').value = document.name;
        document.getElementById('edit-document-notes').value = document.notes || '';

        // Ablaufdatum setzen
        if (document.expiryDate) {
            const date = new Date(document.expiryDate);
            document.getElementById('edit-document-expiry').value = date.toISOString().split('T')[0];
        } else {
            document.getElementById('edit-document-expiry').value = '';
        }

        // Dokument-ID für Update speichern
        const form = document.getElementById('edit-document-form');
        form.dataset.documentId = documentId;

        // Modal öffnen
        const modal = document.getElementById('edit-document-modal');
        modal.classList.remove('hidden');

    } catch (error) {
        console.error('Error opening edit modal:', error);
        showNotification('Fehler beim Öffnen des Bearbeitungs-Dialogs', 'error');
    }
};

// Edit Modal schließen
function closeEditModal() {
    const modal = document.getElementById('edit-document-modal');
    modal.classList.add('hidden');

    // Form zurücksetzen
    const form = document.getElementById('edit-document-form');
    form.reset();
    delete form.dataset.documentId;
}

// Edit behandeln
async function handleEdit(event) {
    event.preventDefault();

    const form = event.target;
    const documentId = form.dataset.documentId;

    if (!documentId) {
        showNotification('Fehler: Dokument-ID nicht gefunden', 'error');
        return;
    }

    const formData = new FormData(form);
    const data = {
        type: formData.get('type'),
        name: formData.get('name'),
        notes: formData.get('notes'),
        expiryDate: formData.get('expiryDate')
    };

    try {
        const response = await fetch(`/api/documents/${documentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Aktualisierung fehlgeschlagen');
        }

        showNotification('Dokument erfolgreich aktualisiert', 'success');
        closeEditModal();
        loadDocuments(); // Liste neu laden

    } catch (error) {
        console.error('Update error:', error);
        showNotification('Fehler beim Aktualisieren: ' + error.message, 'error');
    }
}

// Drag & Drop für Upload verbessern
function setupDragAndDrop(dropZone) {
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

    dropZone.addEventListener('drop', handleDrop, false);

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

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const fileInput = document.getElementById('document-file');
            fileInput.files = files;
            handleFileSelect({ target: fileInput });
        }
    }
}

// Erweiterte Datei-Validierung
function validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // Größe prüfen
    if (file.size > maxSize) {
        showNotification('Datei ist zu groß. Maximum: 10MB', 'error');
        return false;
    }

    // MIME-Type prüfen oder aus Dateiendung ermitteln
    let mimeType = file.type;
    if (!mimeType) {
        const extension = file.name.split('.').pop().toLowerCase();
        const mimeMap = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        mimeType = mimeMap[extension];
    }

    if (!allowedTypes.includes(mimeType)) {
        showNotification('Dateityp nicht erlaubt. Erlaubt: PDF, JPG, PNG, GIF, DOC, DOCX', 'error');
        return false;
    }

    // Dateiname-Validierung
    if (file.name.length > 255) {
        showNotification('Dateiname ist zu lang (max. 255 Zeichen)', 'error');
        return false;
    }

    // Gefährliche Zeichen im Dateinamen prüfen
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(file.name)) {
        showNotification('Dateiname enthält nicht erlaubte Zeichen', 'error');
        return false;
    }

    return true;
}

// Dokument-Vorschau (für Bilder)
function showDocumentPreview(doc) {
    if (doc.contentType.startsWith('image/')) {
        // Hier könnte eine Bildvorschau implementiert werden
        window.open(`/api/documents/${doc.id}/download`, '_blank');
    } else {
        // Für andere Dateitypen: Download
        window.open(`/api/documents/${doc.id}/download`, '_blank');
    }
}

// Tastatur-Navigation für Modals
document.addEventListener('keydown', function(event) {
    // ESC-Taste schließt Modals
    if (event.key === 'Escape') {
        const uploadModal = document.getElementById('upload-document-modal');
        const editModal = document.getElementById('edit-document-modal');

        if (!uploadModal.classList.contains('hidden')) {
            closeUploadModal();
        }
        if (!editModal.classList.contains('hidden')) {
            closeEditModal();
        }
    }
});

// Auto-Save für Formular-Entwürfe (optional)
let autoSaveTimeout;
function enableAutoSave() {
    const inputs = document.querySelectorAll('#upload-document-form input, #upload-document-form select, #upload-document-form textarea');

    inputs.forEach(input => {
        input.addEventListener('input', function() {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                saveFormDraft();
            }, 2000);
        });
    });
}

function saveFormDraft() {
    // Lokaler Speicher für Formular-Entwürfe (optional)
    const form = document.getElementById('upload-document-form');
    const formData = new FormData(form);
    const draft = {};

    for (let [key, value] of formData.entries()) {
        if (key !== 'file') { // Datei nicht im Draft speichern
            draft[key] = value;
        }
    }

    localStorage.setItem('documentUploadDraft', JSON.stringify(draft));
}

function loadFormDraft() {
    const draft = localStorage.getItem('documentUploadDraft');
    if (!draft) return;

    try {
        const data = JSON.parse(draft);
        Object.keys(data).forEach(key => {
            const element = document.querySelector(`[name="${key}"]`);
            if (element) {
                element.value = data[key];
            }
        });
    } catch (error) {
        console.error('Error loading form draft:', error);
    }
}

function clearFormDraft() {
    localStorage.removeItem('documentUploadDraft');
}