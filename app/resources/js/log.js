document.addEventListener("DOMContentLoaded", function () {
    const { ipcRenderer } = require('electron');
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
            container.prepend(entry);
            while (container.children.length > 500) {
                container.lastElementChild.remove();
            }
        }
    });
});