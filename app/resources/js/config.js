document.addEventListener("DOMContentLoaded", function () {
    const { ipcRenderer } = require('electron');
    const select = document.getElementById('theme-select');
    const joystickInput = document.getElementById('joystick-count'); // New reference

    async function initializeSettings() {
        // Populate Themes
        const themes = await ipcRenderer.invoke('get-themes');
        select.innerHTML = '';
        themes.allThemes.forEach(theme => {
            const opt = document.createElement('option');
            opt.value = theme;
            opt.textContent = theme;
            select.appendChild(opt);
        });

        // Handle Config Load
        ipcRenderer.on('init-config', (event, currentConfig) => {
            select.value = currentConfig.theme;
            joystickInput.value = currentConfig.numJoysticks || 1; // Load from config
            console.log("Config loaded:", currentConfig);
        });

        ipcRenderer.send('request-current-config'); 
    }

    // Save Theme change
    select.addEventListener('change', () => {
        ipcRenderer.send('save-theme', select.value);
    });

    // Save Joystick Count change
    joystickInput.addEventListener('change', () => {
        const count = parseInt(joystickInput.value);
        ipcRenderer.send('save-joystick-count', count);
    });

    initializeSettings();
});