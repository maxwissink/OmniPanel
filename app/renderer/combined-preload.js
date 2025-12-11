const { contextBridge, ipcRenderer } = require('electron');
const binder = require('./binder.js');

console.log("Preload running");

// 1. Define the API object locally first
const omniAPI = {
    simulateKey: (keys) => ipcRenderer.send('simulate-key', keys),
    log: (msg) => ipcRenderer.send('renderer-log', msg)
};

// 2. Expose it to the Renderer (the web page)
contextBridge.exposeInMainWorld('omniAPI', omniAPI);

window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, running binder...");
    
    // 3. FIX: Pass the local 'omniAPI' variable, NOT 'window.omniAPI'
    // 'window.omniAPI' would be undefined here due to context isolation.
    binder(omniAPI); 
});