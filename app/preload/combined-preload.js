const { contextBridge, ipcRenderer } = require('electron');
const binder = require('../program/binder.js');

console.log("Preload running");

const omniAPI = {
    simulateKey: (keys) => ipcRenderer.send('simulate-key', keys),
    log: (msg) => ipcRenderer.send('renderer-log', msg)
};

contextBridge.exposeInMainWorld('omniAPI', omniAPI);

window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, running binder...");
    
    binder(omniAPI); 
});