/**
 * tiResolve Desktop - Electron Preload Script
 * Expõe APIs seguras para o renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

let appVersion = '0.0.0';
try {
    const pkg = require(path.join(__dirname, '..', 'package.json'));
    appVersion = pkg?.version || appVersion;
} catch (_err) {
    // ignore
}

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    isElectron: true,
    appVersion,
    notifyTicketCreated: (payload) => ipcRenderer.send('notify-ticket-created', payload),
});
