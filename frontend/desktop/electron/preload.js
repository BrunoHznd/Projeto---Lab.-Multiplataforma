/**
 * tiResolve Desktop - Electron Preload Script
 * Expõe APIs seguras para o renderer process.
 */

const { contextBridge } = require('electron');

const versionArg = (process.argv.find((a) => a.startsWith('--app-version=')) || '').split('=')[1] || '';

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    isElectron: true,
    appVersion: versionArg,
});
