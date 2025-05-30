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

// Speichert die PeopleFlow-Anmeldedaten
function savePeopleFlowCredentials() {
    const baseUrl = document.getElementById('peopleflow-base-url').value.trim();
    const username = document.getElementById('peopleflow-username').value.trim();
    const password = document.getElementById('peopleflow-password').value.trim();
    const autoSync = document.getElementById('peopleflow-auto-sync').checked;
    const syncInterval = parseInt(document.getElementById('peopleflow-sync-interval').value) || 30;

    // Validierung
    if (!baseUrl || !username || !password) {
        showPeopleFlowMessage('Bitte füllen Sie alle Pflichtfelder aus.', 'error');
        return;
    }

    // URL validieren
    try {
        new URL(baseUrl);
    } catch (e) {
        showPeopleFlowMessage('Bitte geben Sie eine gültige URL ein.', 'error');
        return;
    }

    // Sync-Intervall validieren
    if (syncInterval < 5) {
        showPeopleFlowMessage('Das Sync-Intervall muss mindestens 5 Minuten betragen.', 'error');
        return;
    }

    showPeopleFlowMessage('Speichere Konfiguration...', 'info');

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
                showPeopleFlowMessage('Konfiguration erfolgreich gespeichert!', 'success');
                // Verbindung testen
                setTimeout(testPeopleFlowConnection, 1000);
            } else {
                showPeopleFlowMessage('Fehler: ' + (data.message || 'Unbekannter Fehler'), 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showPeopleFlowMessage('Fehler beim Speichern der Konfiguration.', 'error');
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
    fetch('/api/integrations/status')
        .then(response => response.json())
        .then(data => {
            updatePeopleFlowUI(data.peopleflow || {});
        })
        .catch(error => {
            console.error('Error loading PeopleFlow status:', error);
            updatePeopleFlowUI({});
        });
}

// Aktualisiert die PeopleFlow-UI basierend auf dem Status
function updatePeopleFlowUI(status) {
    const statusElement = document.getElementById('peopleflowStatus');
    const configForm = document.getElementById('peopleflowConfigForm');
    const syncSettings = document.getElementById('peopleflowSyncSettings');
    const syncButtons = document.getElementById('peopleflowSyncButtons');
    const removeBtn = document.getElementById('removePeopleFlowBtn');

    if (!statusElement) return;

    if (status.connected) {
        // Verbunden
        statusElement.innerHTML = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Verbunden</span>';

        if (configForm) configForm.style.display = 'none';
        if (syncSettings) syncSettings.style.display = 'block';
        if (syncButtons) syncButtons.style.display = 'block';
        if (removeBtn) removeBtn.disabled = false;

        // Sync-Einstellungen aktualisieren
        updatePeopleFlowSyncInfo(status);
    } else {
        // Nicht verbunden
        statusElement.innerHTML = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Nicht verbunden</span>';

        if (configForm) configForm.style.display = 'block';
        if (syncSettings) syncSettings.style.display = 'none';
        if (syncButtons) syncButtons.style.display = 'none';
        if (removeBtn) removeBtn.disabled = true;
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

// Synchronisiert alle Mitarbeiter von PeopleFlow
function syncPeopleFlowEmployees() {
    showPeopleFlowMessage('Synchronisiere Mitarbeiterdaten...', 'info');

    fetch('/api/integrations/peopleflow/sync/employees?type=manual', {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const message = `Synchronisation abgeschlossen! ${data.employeesProcessed} Mitarbeiter verarbeitet (${data.employeesCreated} neu, ${data.employeesUpdated} aktualisiert)`;
                showPeopleFlowMessage(message, 'success');

                // Status aktualisieren
                setTimeout(loadPeopleFlowStatus, 2000);
            } else {
                let message = 'Synchronisation fehlgeschlagen: ' + (data.message || 'Unbekannter Fehler');
                if (data.errors && data.errors.length > 0) {
                    message += `\nFehler: ${data.errorCount}`;
                }
                showPeopleFlowMessage(message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showPeopleFlowMessage('Fehler bei der Synchronisation.', 'error');
        });
}

// Synchronisiert fahrtaugliche Mitarbeiter mit FleetFlow-Fahrern
function syncPeopleFlowDrivers() {
    showPeopleFlowMessage('Synchronisiere Fahrer-Daten...', 'info');

    fetch('/api/integrations/peopleflow/sync/drivers', {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showPeopleFlowMessage('Fahrer-Daten erfolgreich synchronisiert!', 'success');
            } else {
                showPeopleFlowMessage('Fehler beim Synchronisieren der Fahrer: ' + (data.message || 'Unbekannter Fehler'), 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showPeopleFlowMessage('Fehler bei der Fahrer-Synchronisation.', 'error');
        });
}

// Triggert eine vollständige Synchronisation
function triggerPeopleFlowFullSync() {
    showPeopleFlowMessage('Starte vollständige Synchronisation...', 'info');

    // Erst Mitarbeiter, dann Fahrer
    fetch('/api/integrations/peopleflow/sync/employees?type=manual', {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showPeopleFlowMessage('Mitarbeiterdaten synchronisiert, synchronisiere Fahrer-Daten...', 'info');
                return fetch('/api/integrations/peopleflow/sync/drivers', { method: 'POST' });
            } else {
                throw new Error(data.message || 'Mitarbeiter-Synchronisation fehlgeschlagen');
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showPeopleFlowMessage('Vollständige Synchronisation erfolgreich abgeschlossen!', 'success');
                setTimeout(loadPeopleFlowStatus, 2000);
            } else {
                showPeopleFlowMessage('Fahrer-Synchronisation fehlgeschlagen: ' + (data.message || 'Unbekannter Fehler'), 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showPeopleFlowMessage('Fehler bei der vollständigen Synchronisation: ' + error.message, 'error');
        });
}

// === Settings Management ===

// Aktualisiert die Sync-Einstellungen
function updatePeopleFlowSyncSettings() {
    const autoSync = document.getElementById('peopleflow-auto-sync-enabled').checked;
    const syncInterval = parseInt(document.getElementById('peopleflow-sync-interval-minutes').value) || 30;

    if (syncInterval < 5) {
        showPeopleFlowMessage('Das Sync-Intervall muss mindestens 5 Minuten betragen.', 'error');
        return;
    }

    const data = {
        autoSync: autoSync,
        syncInterval: syncInterval
    };

    fetch('/api/integrations/peopleflow/set-auto-sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showPeopleFlowMessage('Einstellungen erfolgreich gespeichert!', 'success');
            } else {
                showPeopleFlowMessage('Fehler beim Speichern: ' + (data.message || 'Unbekannter Fehler'), 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showPeopleFlowMessage('Fehler beim Speichern der Einstellungen.', 'error');
        });
}

// === Integration Removal ===

// Entfernt die PeopleFlow-Integration
function removePeopleFlowIntegration() {
    if (!confirm('Möchten Sie die PeopleFlow-Integration wirklich entfernen? Die synchronisierten Mitarbeiterdaten bleiben erhalten, aber die Verbindung wird getrennt.')) {
        return;
    }

    showPeopleFlowMessage('Entferne Integration...', 'info');

    fetch('/api/integrations/peopleflow/remove', {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showPeopleFlowMessage('Integration erfolgreich entfernt!', 'success');
                setTimeout(loadPeopleFlowStatus, 1000);
            } else {
                showPeopleFlowMessage('Fehler beim Entfernen: ' + (data.message || 'Unbekannter Fehler'), 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showPeopleFlowMessage('Fehler beim Entfernen der Integration.', 'error');
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