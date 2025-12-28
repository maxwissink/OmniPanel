// Use Electron's IPC to listen for the log
const { ipcRenderer } = require('electron');

document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById('log-container');

    ipcRenderer.on('log-event', (event, log) => {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
                <span class="timestamp">[${log.timestamp}]</span>
                <span class="type">${log.type}:</span> 
                <span>${log.data}</span>
            `;
        console.log(log);
        if (container) {
            container.prepend(entry); // Newest logs at the top
        }
    });
});