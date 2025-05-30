// frontend/static/js/peopleflow.js
// PeopleFlow Integration JavaScript

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    // PeopleFlow-Status laden wenn auf Settings-Seite
    if (document.getElementById('peopleflowStatus')) {
        loadPeopleFlowStatus();
    }
});

// === PeopleFlow Credentials Management ===

// PeopleFlow Anmeldedaten speichern
function savePeopleFlowCredentials() {
    const baseUrl = document.getElementById('peopleflow-base-url').value;
    const username = document.getElementById('peopleflow-username').value;
    const password = document.getElementById('peopleflow-password').value;
    const autoSync = document.getElementById('peopleflow-auto-sync').checked;
    const syncInterval = parseInt(document.getElementById('peopleflow-sync-interval').value) || 30;

    if (!baseUrl || !username || !password) {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
    }

    // Button deaktivieren während des Tests
    const button = event.target;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Teste Verbindung...';

    const data = {
        baseUrl: baseUrl,
        username: username,
        password: password,
        autoSync: autoSync,
        syncInterval: syncInterval
    };

    fetch('/api/integrations/peopleflow/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showIntegrationMessage('PeopleFlow-Integration erfolgreich eingerichtet und getestet', 'success', 'PeopleFlow');
                loadPeopleFlowStatus(); // Status neu laden
            } else {
                showIntegrationMessage(data.message || 'Verbindungstest fehlgeschlagen', 'error', 'PeopleFlow');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showIntegrationMessage('Netzwerkfehler beim Einrichten der Integration', 'error', 'PeopleFlow');
        })
        .finally(() => {
            button.disabled = false;
            button.textContent = originalText;
        });
}

// === Connection Testing ===

// Testet die Verbindung zu PeopleFlow
function testPeopleFlowConnection() {
    showPeopleFlowMessage('Teste Verbindung zu PeopleFlow...', 'info');

    fetch('/api/integrations/peopleflow/test')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showPeopleFlowMessage('Verbindung erfolgreich!', 'success');
                // Status aktualisieren
                setTimeout(loadPeopleFlowStatus, 1000);
            } else {
                showPeopleFlowMessage('Verbindungsfehler: ' + (data.message || 'Unbekannter Fehler'), 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showPeopleFlowMessage('Fehler beim Testen der Verbindung.', 'error');
        });
}

// === Status Management ===

// Lädt den aktuellen PeopleFlow-Status
function loadPeopleFlowStatus() {
    console.log('Loading PeopleFlow status...');

    fetch('/api/integrations/peopleflow/status')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updatePeopleFlowUI(data.data);
            } else {
                console.error('Failed to load PeopleFlow status:', data.message);
                updatePeopleFlowUI({
                    connected: false,
                    lastSync: null,
                    syncedEmployees: 0
                });
            }
        })
        .catch(error => {
            console.error('Error loading PeopleFlow status:', error);
            updatePeopleFlowUI({
                connected: false,
                lastSync: null,
                syncedEmployees: 0
            });
        });
}

// UI basierend auf PeopleFlow Status aktualisieren
function updatePeopleFlowUI(status) {
    const statusElement = document.getElementById('peopleflowStatus');
    const configForm = document.getElementById('peopleflowConfigForm');
    const syncSettings = document.getElementById('peopleflowSyncSettings');
    const syncButtons = document.getElementById('peopleflowSyncButtons');
    const removeBtn = document.getElementById('removePeopleFlowBtn');

    if (!statusElement) {
        console.log('PeopleFlow UI elements not found');
        return;
    }

    if (status.connected) {
        // Verbunden - zeige Sync-Interface
        statusElement.innerHTML = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Verbunden</span>';

        if (configForm) configForm.style.display = 'none';
        if (syncSettings) {
            syncSettings.style.display = 'block';

            // Auto-sync Checkbox setzen
            const autoSyncCheckbox = document.getElementById('peopleflow-auto-sync-enabled');
            const syncIntervalInput = document.getElementById('peopleflow-sync-interval-minutes');

            if (autoSyncCheckbox) autoSyncCheckbox.checked = status.autoSync || false;
            if (syncIntervalInput) syncIntervalInput.value = status.syncInterval || 30;
        }
        if (syncButtons) syncButtons.style.display = 'block';
        if (removeBtn) removeBtn.disabled = false;

        // Letzte Sync-Info aktualisieren
        updateLastSyncInfo(status);

    } else {
        // Nicht verbunden - zeige Konfigurationsformular
        statusElement.innerHTML = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Nicht verbunden</span>';

        if (configForm) configForm.style.display = 'block';
        if (syncSettings) syncSettings.style.display = 'none';
        if (syncButtons) syncButtons.style.display = 'none';
        if (removeBtn) removeBtn.disabled = true;
    }
}

// Letzte Sync-Informationen aktualisieren
function updateLastSyncInfo(status) {
    const lastSyncElement = document.getElementById('peopleflow-last-sync');
    const syncedCountElement = document.getElementById('peopleflow-synced-count');

    if (lastSyncElement) {
        if (status.lastSync) {
            const lastSyncDate = new Date(status.lastSync);
            lastSyncElement.textContent = lastSyncDate.toLocaleString('de-DE');
        } else {
            lastSyncElement.textContent = 'Noch nie';
        }
    }

    if (syncedCountElement) {
        syncedCountElement.textContent = status.syncedEmployees || 0;
    }
}


// Aktualisiert die Sync-Informationen
function updatePeopleFlowSyncInfo(status) {
    // Letzte Synchronisation
    const lastSyncElement = document.getElementById('peopleflow-last-sync');
    if (lastSyncElement) {
        if (status.lastSync) {
            const lastSyncDate = new Date(status.lastSync);
            lastSyncElement.textContent = lastSyncDate.toLocaleString('de-DE');
        } else {
            lastSyncElement.textContent = 'Noch nie';
        }
    }

    // Anzahl synchronisierter Mitarbeiter
    const syncedCountElement = document.getElementById('peopleflow-synced-count');
    if (syncedCountElement) {
        syncedCountElement.textContent = status.syncedEmployees || 0;
    }

    // Auto-Sync Checkbox
    const autoSyncCheckbox = document.getElementById('peopleflow-auto-sync-enabled');
    if (autoSyncCheckbox) {
        autoSyncCheckbox.checked = status.autoSync || false;
    }

    // Sync-Intervall
    const syncIntervalInput = document.getElementById('peopleflow-sync-interval-minutes');
    if (syncIntervalInput) {
        syncIntervalInput.value = status.syncInterval || 30;
    }
}

// === Synchronization Functions ===

// Mitarbeiter von PeopleFlow synchronisieren
function syncPeopleFlowEmployees() {
    const button = event.target;
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Synchronisiere...';

    fetch('/api/integrations/peopleflow/sync/employees?type=manual', {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showIntegrationMessage(data.message, 'success', 'PeopleFlow');
                loadPeopleFlowStatus(); // Status neu laden
            } else {
                showIntegrationMessage(data.message || 'Synchronisation fehlgeschlagen', 'error', 'PeopleFlow');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showIntegrationMessage('Netzwerkfehler bei der Synchronisation', 'error', 'PeopleFlow');
        })
        .finally(() => {
            button.disabled = false;
            button.textContent = originalText;
        });
}

// Fahrer von PeopleFlow synchronisieren
function syncPeopleFlowDrivers() {
    const button = event.target;
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Synchronisiere...';

    fetch('/api/integrations/peopleflow/sync/drivers', {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showIntegrationMessage(data.message, 'success', 'PeopleFlow');
            } else {
                showIntegrationMessage(data.message || 'Fahrer-Synchronisation fehlgeschlagen', 'error', 'PeopleFlow');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showIntegrationMessage('Netzwerkfehler bei der Fahrer-Synchronisation', 'error', 'PeopleFlow');
        })
        .finally(() => {
            button.disabled = false;
            button.textContent = originalText;
        });
}

// Vollständige Synchronisation auslösen
function triggerPeopleFlowFullSync() {
    if (!confirm('Möchten Sie eine vollständige Synchronisation aller Mitarbeiter durchführen? Dies kann einige Zeit dauern.')) {
        return;
    }

    fetch('/api/integrations/peopleflow/sync/employees?type=full', {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showIntegrationMessage('Vollständige Synchronisation gestartet', 'success', 'PeopleFlow');
                loadPeopleFlowStatus(); // Status neu laden
            } else {
                showIntegrationMessage(data.message || 'Synchronisation fehlgeschlagen', 'error', 'PeopleFlow');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showIntegrationMessage('Netzwerkfehler bei der Synchronisation', 'error', 'PeopleFlow');
        });
}

// === Settings Management ===

// Sync-Einstellungen aktualisieren
function updatePeopleFlowSyncSettings() {
    const autoSync = document.getElementById('peopleflow-auto-sync-enabled').checked;
    const syncInterval = parseInt(document.getElementById('peopleflow-sync-interval-minutes').value) || 30;

    const data = {
        autoSync: autoSync,
        syncInterval: syncInterval
    };

    fetch('/api/integrations/peopleflow/auto-sync', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showIntegrationMessage('Sync-Einstellungen gespeichert', 'success', 'PeopleFlow');
            } else {
                showIntegrationMessage(data.message || 'Fehler beim Speichern der Einstellungen', 'error', 'PeopleFlow');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showIntegrationMessage('Netzwerkfehler beim Speichern der Einstellungen', 'error', 'PeopleFlow');
        });
}

// === Integration Removal ===

// PeopleFlow Integration entfernen
function removePeopleFlowIntegration() {
    if (!confirm('Möchten Sie die PeopleFlow-Integration wirklich entfernen? Die Konfiguration geht verloren.')) {
        return;
    }

    fetch('/api/integrations/peopleflow/remove', {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showIntegrationMessage('PeopleFlow-Integration entfernt', 'success', 'PeopleFlow');
                loadPeopleFlowStatus(); // Status neu laden
            } else {
                showIntegrationMessage(data.message || 'Fehler beim Entfernen der Integration', 'error', 'PeopleFlow');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showIntegrationMessage('Netzwerkfehler beim Entfernen der Integration', 'error', 'PeopleFlow');
        });
}

// === Helper Functions ===

// Zeigt eine Nachricht für PeopleFlow an
function showPeopleFlowMessage(message, type) {
    // Temporäre Nachricht im Status-Element anzeigen
    const statusElement = document.getElementById('peopleflowStatus');
    if (!statusElement) return;

    let className, icon;
    switch (type) {
        case 'success':
            className = 'bg-green-100 text-green-800';
            icon = '✓';
            break;
        case 'error':
            className = 'bg-red-100 text-red-800';
            icon = '✗';
            break;
        case 'info':
            className = 'bg-blue-100 text-blue-800';
            icon = 'ℹ';
            break;
        default:
            className = 'bg-gray-100 text-gray-800';
            icon = '';
    }

    const originalContent = statusElement.innerHTML;
    statusElement.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}">${icon} ${message}</span>`;

    // Nach 3 Sekunden wieder zum ursprünglichen Status zurückkehren
    if (type !== 'info') {
        setTimeout(() => {
            loadPeopleFlowStatus();
        }, 3000);
    }
}

// Debugging-Funktion für Entwicklung
function debugPeopleFlowStatus() {
    fetch('/api/integrations/status')
        .then(response => response.json())
        .then(data => {
            console.log('PeopleFlow Status:', data.peopleflow);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}