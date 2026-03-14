/**
 * tiResolve Desktop - Electron Preload Script
 * Expõe APIs seguras para o renderer process.
 */

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    isElectron: true,
    appVersion: require('../package.json').version,
});
