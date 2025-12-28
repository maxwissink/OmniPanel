document.addEventListener("DOMContentLoaded", function () {
    const { ipcRenderer } = require('electron');
    const select = document.getElementById('theme-select');

    async function initializeSettings() {
    // 1. Get the list (this is a simple array: ['theme1', 'theme2'])
    const themes = await ipcRenderer.invoke('get-themes');

    // 2. Clear and populate
    select.innerHTML = '';
    themes.forEach(theme => {
        const opt = document.createElement('option');
        opt.value = theme;
        opt.textContent = theme;
        select.appendChild(opt);
    });

    /** * THE TRICK: 
     * We don't know if 'init-config' will arrive BEFORE or AFTER 
     * the themes are loaded. So we handle both cases.
     **/

    // Case A: The 'init-config' event arrives from Main
    ipcRenderer.on('init-config', (event, currentConfig) => {
        select.value = currentConfig.theme;
        console.log("Config received. Theme set to:", currentConfig.theme);
    });

    // Case B: Request the config manually just in case 'did-finish-load' 
    // fired before this script was ready to listen.
    ipcRenderer.send('request-current-config'); 
}

    // Handle manual changes
    select.addEventListener('change', () => {
        ipcRenderer.send('save-theme', select.value);
    });

    // Run on startup
    initializeSettings();
});