// frontend/static/js/vehicle-documents.js - Dokumentenverwaltung (KEINE Bilder)

// Namespace für Dokumentenverwaltung
const VehicleDocuments = {
    vehicleId: null,
    documents: []
};

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    // Nur initialisieren wenn wir auf der Fahrzeugdetails-Seite sind
    if (window.location.pathname.includes('/vehicle-details/')) {
        VehicleDocuments.vehicleId = window.location.pathname.split('/').pop();

        // Prüfen ob documents-Tab aktiv ist (DOM-Elemente existieren)
        const documentsTableBody = document.getElementById('documents-table-body');
        if (documentsTableBody) {
            VehicleDocuments.initialize();
        }
    }
});

// Dokumentenverwaltung initialisieren
VehicleDocuments.initialize = function() {
    if (!VehicleDocuments.isTabAvailable()) {
        return;
    }

    VehicleDocuments.setupEventListeners();
    VehicleDocuments.loadDocuments();
};

// Prüfen ob Documents-Tab verfügbar ist
VehicleDocuments.isTabAvailable = function() {
    return document.getElementById('documents-table-body') !== null;
};

// Event-Listener einrichten
VehicleDocuments.setupEventListeners = function() {
    // Upload Modal schließen
    document.querySelectorAll('.close-upload-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            VehicleDocuments.closeUploadModal();
        });
    });

    // Edit Modal schließen
    document.querySelectorAll('.close-edit-document-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            VehicleDocuments.closeEditModal();
        });
    });

    // Upload Form Submit
    const uploadForm = document.getElementById('upload-document-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', VehicleDocuments.handleUpload);
    }

    // Edit Form Submit
    const editForm = document.getElementById('edit-document-form');
    if (editForm) {
        editForm.addEventListener('submit', VehicleDocuments.handleEdit);
    }

    // Datei-Input Change
    const fileInput = document.getElementById('document-file');
    if (fileInput) {
        fileInput.addEventListener('change', VehicleDocuments.handleFileSelect);
    }

    // Drag & Drop
    const dropZone = document.getElementById('file-drop-zone');
    if (dropZone) {
        VehicleDocuments.setupDragAndDrop(dropZone);
    }

    // Automatischer Dokumentname basierend auf Typ
    const typeSelect = document.getElementById('document-type');
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            VehicleDocuments.updateDocumentNameSuggestion(this.value);
        });
    }
};

// Drag & Drop Setup (nur für Dokumente)
VehicleDocuments.setupDragAndDrop = function(dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, VehicleDocuments.preventDefaults, false);
        document.body.addEventListener(eventName, VehicleDocuments.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, VehicleDocuments.highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, VehicleDocuments.unhighlight, false);
    });

    dropZone.addEventListener('drop', VehicleDocuments.handleDrop, false);
};

VehicleDocuments.preventDefaults = function(e) {
    e.preventDefault();
    e.stopPropagation();
};

VehicleDocuments.highlight = function(e) {
    const dropZone = document.getElementById('file-drop-zone');
    if (dropZone) {
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50');
    }
};

VehicleDocuments.unhighlight = function(e) {
    const dropZone = document.getElementById('file-drop-zone');
    if (dropZone) {
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
    }
};

VehicleDocuments.handleDrop = function(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        const fileInput = document.getElementById('document-file');
        if (fileInput) {
            fileInput.files = files;
            VehicleDocuments.handleFileSelect({ target: fileInput });
        }
    }
};

// Datei-Auswahl behandeln
VehicleDocuments.handleFileSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Datei-Info anzeigen
    const fileInfo = document.getElementById('selected-file-info');
    const fileName = document.getElementById('selected-file-name');
    const fileSize = document.getElementById('selected-file-size');

    if (fileName && fileSize && fileInfo) {
        fileName.textContent = file.name;
        fileSize.textContent = VehicleDocuments.formatFileSize(file.size);
        fileInfo.classList.remove('hidden');
    }

    // Automatisch Dokumentname setzen wenn leer
    const nameInput = document.getElementById('document-name');
    if (nameInput && !nameInput.value) {
        nameInput.value = file.name.replace(/\.[^/.]+$/, "");
    }

    // Validierung
    VehicleDocuments.validateFile(file);
};

// Datei validieren (nur Dokumente, keine Bilder)
VehicleDocuments.validateFile = function(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB für Dokumente

    // Erlaubte Dokumenttypen (KEINE Bilder)
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];

    // Größe prüfen
    if (file.size > maxSize) {
        VehicleDocuments.showNotification('Datei ist zu groß. Maximum: 10MB', 'error');
        return false;
    }

    // MIME-Type prüfen oder aus Dateiendung ermitteln
    let mimeType = file.type;
    if (!mimeType) {
        const extension = file.name.split('.').pop().toLowerCase();
        const mimeMap = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'txt': 'text/plain'
        };
        mimeType = mimeMap[extension];
    }

    if (!allowedTypes.includes(mimeType)) {
        VehicleDocuments.showNotification('Nur Dokumentformate sind erlaubt (PDF, DOC, DOCX, XLS, XLSX, TXT). Für Bilder nutzen Sie bitte den Bilder-Tab.', 'error');
        return false;
    }

    // Dateiname-Validierung
    if (file.name.length > 255) {
        VehicleDocuments.showNotification('Dateiname ist zu lang (max. 255 Zeichen)', 'error');
        return false;
    }

    // Gefährliche Zeichen im Dateinamen prüfen
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(file.name)) {
        VehicleDocuments.showNotification('Dateiname enthält nicht erlaubte Zeichen', 'error');
        return false;
    }

    return true;
};

// Dokumentname-Vorschlag basierend auf Typ
VehicleDocuments.updateDocumentNameSuggestion = function(type) {
    const nameInput = document.getElementById('document-name');
    if (!nameInput || nameInput.value) return; // Nur wenn noch kein Name eingegeben

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
};

// Upload Modal öffnen
window.openUploadDocumentModal = function(vehicleId) {
    VehicleDocuments.vehicleId = vehicleId;
    const modal = document.getElementById('upload-document-modal');
    const form = document.getElementById('upload-document-form');

    if (!modal || !form) {
        console.error('Upload modal Elemente nicht gefunden');
        return;
    }

    // Form zurücksetzen
    form.reset();
    const selectedFileInfo = document.getElementById('selected-file-info');
    if (selectedFileInfo) {
        selectedFileInfo.classList.add('hidden');
    }

    modal.classList.remove('hidden');
};

// Upload Modal schließen
VehicleDocuments.closeUploadModal = function() {
    const modal = document.getElementById('upload-document-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    VehicleDocuments.resetUploadForm();
};

// Upload Form zurücksetzen
VehicleDocuments.resetUploadForm = function() {
    const form = document.getElementById('upload-document-form');
    if (form) {
        form.reset();
    }

    const selectedFileInfo = document.getElementById('selected-file-info');
    if (selectedFileInfo) {
        selectedFileInfo.classList.add('hidden');
    }

    // Button zurücksetzen
    const submitBtn = document.getElementById('upload-submit-btn');
    const btnText = document.getElementById('upload-btn-text');
    const spinner = document.getElementById('upload-spinner');

    if (submitBtn && btnText && spinner) {
        submitBtn.disabled = false;
        btnText.textContent = 'Hochladen';
        spinner.classList.add('hidden');
    }
};

// Upload behandeln
VehicleDocuments.handleUpload = async function(event) {
    event.preventDefault();

    const form = event.target;
    const fileInput = document.getElementById('document-file');

    if (!fileInput || !fileInput.files[0]) {
        VehicleDocuments.showNotification('Bitte wählen Sie eine Datei aus', 'error');
        return;
    }

    if (!VehicleDocuments.validateFile(fileInput.files[0])) {
        return;
    }

    // Button deaktivieren und Spinner anzeigen
    const submitBtn = document.getElementById('upload-submit-btn');
    const btnText = document.getElementById('upload-btn-text');
    const spinner = document.getElementById('upload-spinner');

    if (submitBtn && btnText && spinner) {
        submitBtn.disabled = true;
        btnText.textContent = '';
        spinner.classList.remove('hidden');
    }

    try {
        const formData = new FormData(form);

        // Sicherstellen, dass es kein vehicle_image type ist
        const docType = formData.get('type');
        if (docType === 'vehicle_image') {
            formData.set('type', 'other'); // Fallback falls versehentlich Bild-Typ gewählt
        }

        const response = await fetch(`/api/vehicles/${VehicleDocuments.vehicleId}/documents`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Upload fehlgeschlagen');
        }

        VehicleDocuments.showNotification('Dokument erfolgreich hochgeladen', 'success');
        VehicleDocuments.closeUploadModal();
        VehicleDocuments.loadDocuments();

    } catch (error) {
        console.error('Upload error:', error);
        VehicleDocuments.showNotification('Fehler beim Hochladen: ' + error.message, 'error');
    } finally {
        VehicleDocuments.resetUploadForm();
    }
};

// Dokumente laden (nur Nicht-Bilder)
VehicleDocuments.loadDocuments = async function() {
    if (!VehicleDocuments.vehicleId || !VehicleDocuments.isTabAvailable()) {
        return;
    }

    try {
        const response = await fetch(`/api/vehicles/${VehicleDocuments.vehicleId}/documents`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Fehler beim Laden der Dokumente');
        }

        // NUR Dokumente filtern (KEINE vehicle_image types)
        VehicleDocuments.documents = (data.documents || []).filter(doc => doc.type !== 'vehicle_image');
        VehicleDocuments.renderDocuments();
        VehicleDocuments.updateDocumentCounts();

    } catch (error) {
        console.error('Error loading documents:', error);
        VehicleDocuments.showDocumentLoadError();
    }
};

// Dokumente rendern
VehicleDocuments.renderDocuments = function() {
    const tbody = document.getElementById('documents-table-body');
    if (!tbody) {
        return;
    }

    const loadingRow = document.getElementById('documents-loading');
    if (loadingRow) {
        loadingRow.remove();
    }

    tbody.innerHTML = '';

    if (VehicleDocuments.documents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <h3 class="text-sm font-medium text-gray-900">Keine Dokumente vorhanden</h3>
                        <p class="text-sm text-gray-500 mt-1">Laden Sie das erste Dokument für dieses Fahrzeug hoch.</p>
                        <p class="text-xs text-gray-400 mt-1">Für Bilder nutzen Sie bitte den Bilder-Tab.</p>
                        <button onclick="openUploadDocumentModal('${VehicleDocuments.vehicleId}')" class="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                            Dokument hochladen
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    VehicleDocuments.documents.forEach(doc => {
        const row = VehicleDocuments.createDocumentRow(doc);
        tbody.appendChild(row);
    });
};

// Dokument-Zeile erstellen
VehicleDocuments.createDocumentRow = function(doc) {
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
                    ${VehicleDocuments.getDocumentIcon(doc.contentType)}
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
            ${VehicleDocuments.formatFileSize(doc.size)}
        </td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${VehicleDocuments.formatDate(doc.uploadedAt)}
        </td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
            ${doc.expiryDate ? VehicleDocuments.formatDate(doc.expiryDate) + statusBadge : '-'}
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
};

// Dokument-Icon basierend auf Content-Type (keine Bilder)
VehicleDocuments.getDocumentIcon = function(contentType) {
    const iconClass = "h-10 w-10 rounded-lg flex items-center justify-center";

    if (contentType.includes('pdf')) {
        return `<div class="${iconClass} bg-red-100"><svg class="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 18h12V6h-4V2H4v16zm-2 1V1h12l4 4v14H2z"/><path d="M9 13h2v2H9v-2zm0-8h2v6H9V5z"/></svg></div>`;
    } else if (contentType.includes('word') || contentType.includes('document')) {
        return `<div class="${iconClass} bg-blue-100"><svg class="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 18h12V6h-4V2H4v16zm-2 1V1h12l4 4v14H2z"/></svg></div>`;
    } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
        return `<div class="${iconClass} bg-green-100"><svg class="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 18h12V6h-4V2H4v16zm-2 1V1h12l4 4v14H2z"/></svg></div>`;
    } else if (contentType.includes('text')) {
        return `<div class="${iconClass} bg-gray-100"><svg class="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>`;
    } else {
        return `<div class="${iconClass} bg-gray-100"><svg class="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>`;
    }
};

// Dokument-Zählungen aktualisieren (nur für Dokumente)
VehicleDocuments.updateDocumentCounts = function() {
    const counts = {
        'vehicle_registration': 0,
        'vehicle_license': 0,
        'inspection': 0,
        'insurance': 0,
        'invoice': 0,
        'warranty': 0,
        'other': 0
    };

    VehicleDocuments.documents.forEach(doc => {
        if (counts.hasOwnProperty(doc.type)) {
            counts[doc.type]++;
        }
    });

    // Update UI elements
    const elements = {
        'vehicle-registration-count': counts.vehicle_registration,
        'vehicle-license-count': counts.vehicle_license,
        'inspection-count': counts.inspection
    };

    Object.keys(elements).forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            const count = elements[elementId];
            element.textContent = count > 0 ? `${count} Dokument(e)` : 'Keine Dokumente';
        }
    });
};

// Edit Modal öffnen
window.editDocument = async function(documentId) {
    try {
        // Dokument-Details aus aktueller Liste finden
        const documentData = VehicleDocuments.documents.find(doc => doc.id === documentId);
        if (!documentData) {
            VehicleDocuments.showNotification('Dokument nicht gefunden', 'error');
            return;
        }

        // Modal-Elemente prüfen
        const modal = document.getElementById('edit-document-modal');
        const form = document.getElementById('edit-document-form');

        if (!modal || !form) {
            console.error('Edit modal Elemente nicht gefunden');
            return;
        }

        // Modal mit Daten füllen
        const typeSelect = document.getElementById('edit-document-type');
        const nameInput = document.getElementById('edit-document-name');
        const notesInput = document.getElementById('edit-document-notes');
        const expiryInput = document.getElementById('edit-document-expiry');

        if (typeSelect) typeSelect.value = documentData.type;
        if (nameInput) nameInput.value = documentData.name;
        if (notesInput) notesInput.value = documentData.notes || '';

        // Ablaufdatum setzen
        if (expiryInput) {
            if (documentData.expiryDate) {
                const date = new Date(documentData.expiryDate);
                expiryInput.value = date.toISOString().split('T')[0];
            } else {
                expiryInput.value = '';
            }
        }

        // Dokument-ID für Update speichern
        form.dataset.documentId = documentId;

        // Modal öffnen
        modal.classList.remove('hidden');

    } catch (error) {
        console.error('Error opening edit modal:', error);
        VehicleDocuments.showNotification('Fehler beim Öffnen des Bearbeitungs-Dialogs', 'error');
    }
};

// Edit Modal schließen
VehicleDocuments.closeEditModal = function() {
    const modal = document.getElementById('edit-document-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // Form zurücksetzen
    const form = document.getElementById('edit-document-form');
    if (form) {
        form.reset();
        delete form.dataset.documentId;
    }
};

// Edit behandeln
VehicleDocuments.handleEdit = async function(event) {
    event.preventDefault();

    const form = event.target;
    const documentId = form.dataset.documentId;

    if (!documentId) {
        VehicleDocuments.showNotification('Fehler: Dokument-ID nicht gefunden', 'error');
        return;
    }

    const formData = new FormData(form);
    const data = {
        type: formData.get('type'),
        name: formData.get('name'),
        notes: formData.get('notes'),
        expiryDate: formData.get('expiryDate')
    };

    // Sicherstellen, dass es kein Bild-Typ ist
    if (data.type === 'vehicle_image') {
        data.type = 'other';
    }

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

        VehicleDocuments.showNotification('Dokument erfolgreich aktualisiert', 'success');
        VehicleDocuments.closeEditModal();
        VehicleDocuments.loadDocuments();

    } catch (error) {
        console.error('Update error:', error);
        VehicleDocuments.showNotification('Fehler beim Aktualisieren: ' + error.message, 'error');
    }
};

// Fehler beim Laden anzeigen
VehicleDocuments.showDocumentLoadError = function() {
    const tbody = document.getElementById('documents-table-body');
    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="py-8 text-center">
                <div class="flex flex-col items-center">
                    <svg class="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="text-sm font-medium text-gray-900">Fehler beim Laden</h3>
                    <p class="text-sm text-gray-500 mt-1">Die Dokumente konnten nicht geladen werden.</p>
                    <button onclick="VehicleDocuments.loadDocuments()" class="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                        Erneut versuchen
                    </button>
                </div>
            </td>
        </tr>
    `;
};

// Hilfsfunktionen
VehicleDocuments.formatFileSize = function(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

VehicleDocuments.formatDate = function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
};

VehicleDocuments.showNotification = function(message, type = 'info') {
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
window.downloadDocument = function(documentId) {
    window.open(`/api/documents/${documentId}/download`, '_blank');
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

        VehicleDocuments.showNotification('Dokument erfolgreich gelöscht', 'success');
        VehicleDocuments.loadDocuments();

    } catch (error) {
        console.error('Delete error:', error);
        VehicleDocuments.showNotification('Fehler beim Löschen: ' + error.message, 'error');
    }
};

// Tastatur-Navigation für Modals
document.addEventListener('keydown', function(event) {
    // ESC-Taste schließt Modals
    if (event.key === 'Escape') {
        const uploadModal = document.getElementById('upload-document-modal');
        const editModal = document.getElementById('edit-document-modal');

        if (uploadModal && !uploadModal.classList.contains('hidden')) {
            VehicleDocuments.closeUploadModal();
        }
        if (editModal && !editModal.classList.contains('hidden')) {
            VehicleDocuments.closeEditModal();
        }
    }
});

// Funktion für dynamisches Laden wenn Tab gewechselt wird
window.initializeDocumentsIfAvailable = function() {
    if (window.location.pathname.includes('/vehicle-details/') && VehicleDocuments.isTabAvailable()) {
        VehicleDocuments.vehicleId = window.location.pathname.split('/').pop();
        VehicleDocuments.initialize();
    }
};