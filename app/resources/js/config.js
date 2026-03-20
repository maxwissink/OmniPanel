document.addEventListener("DOMContentLoaded", function () {
    const { ipcRenderer } = require('electron');
    const select = document.getElementById('panel-select');
    const refreshPanels = document.getElementById('refresh');

    function detectMaxJoystick(panelData) {
    const panelString = typeof panelData === 'string' ? panelData : JSON.stringify(panelData);
    
    const regex = /"joystick"\s*:\s*"?(\d+)"?/g;
    let match;
    let maxFound = -1;

    while ((match = regex.exec(panelString)) !== null) {
        const val = parseInt(match[1]);
        if (val > maxFound) maxFound = val;
    }

    return maxFound === -1 ? 1 : maxFound + 1;
}

    async function initializeSettings() {
        const panels = await ipcRenderer.invoke('get-panels');
        select.innerHTML = '';
        panels.allPanels.forEach(panel => {
            const opt = document.createElement('option');
            opt.value = panel;
            opt.textContent = panel;
            select.appendChild(opt);
        });

        ipcRenderer.on('init-config', (event, currentConfig) => {
            select.value = currentConfig.panel;
        });

        ipcRenderer.send('request-current-config'); 
    }

    select.addEventListener('change', async () => {
        const panelName = select.value;     
        
        ipcRenderer.send('save-panel', panelName);

        const panelContent = await ipcRenderer.invoke('get-panel-content', panelName);
        console.log(panelContent);
        if (panelContent) {
            const newCount = detectMaxJoystick(panelContent);
            
            ipcRenderer.send('save-joystick-count', newCount);
            console.log(`Auto-detected ${newCount} joysticks for panel: ${panelName}`);
        }
    });

    refreshPanels.addEventListener('click', async () => {
        const selected = select.value;
        await initializeSettings();
        select.value = selected;
    });

    initializeSettings();
});