document.addEventListener("DOMContentLoaded", function () {
    const { ipcRenderer } = require('electron');
    const select = document.getElementById('theme-select');
    const refreshThemes = document.getElementById('refresh');

    function detectMaxJoystick(themeData) {
        const themeString = typeof themeData === 'string' ? themeData : JSON.stringify(themeData);
        
        const regex = /"joystick"\s*:\s*"(\d+)"/g;
        let match;
        let maxFound = -1;

        while ((match = regex.exec(themeString)) !== null) {
            const val = parseInt(match[1]);
            if (val > maxFound) maxFound = val;
        }

        return maxFound === -1 ? 1 : maxFound + 1;
    }

    async function initializeSettings() {
        const themes = await ipcRenderer.invoke('get-themes');
        select.innerHTML = '';
        themes.allThemes.forEach(theme => {
            const opt = document.createElement('option');
            opt.value = theme;
            opt.textContent = theme;
            select.appendChild(opt);
        });

        ipcRenderer.on('init-config', (event, currentConfig) => {
            select.value = currentConfig.theme;
        });

        ipcRenderer.send('request-current-config'); 
    }

    select.addEventListener('change', async () => {
        const themeName = select.value;     
        
        ipcRenderer.send('save-theme', themeName);

        const themeContent = await ipcRenderer.invoke('get-theme-content', themeName);
        console.log(themeContent);
        if (themeContent) {
            const newCount = detectMaxJoystick(themeContent);
            
            ipcRenderer.send('save-joystick-count', newCount);
            console.log(`Auto-detected ${newCount} joysticks for theme: ${themeName}`);
        }
    });

    refreshThemes.addEventListener('click', async () => {
        const selected = select.value;
        await initializeSettings();
        select.value = selected;
    });

    initializeSettings();
});