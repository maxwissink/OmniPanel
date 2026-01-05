const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');
const joystickHandler = require('./events/joystick');

module.exports = function (config, wss, restartPythonCallback) {
    const userPath = path.join(__dirname, '..', '..', 'user');
    const configPath = path.join(__dirname, '..', '..', 'config.json');

    // 1. Get List of Folders in /user
    ipcMain.handle('get-themes', async () => {
        const themes = fs.readdirSync(userPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        return {
            allThemes: themes,
            current: config.theme
        };
    });

    // 2. Save Theme Selection
    ipcMain.on('save-theme', (event, selectedTheme) => {
        config.theme = selectedTheme;
        saveConfig(config);

        // Broadcast Refresh to mobile devices
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ type: 'force-reload' }));
            }
        });
    });

    // 3. NEW: Save Joystick Count
    ipcMain.on('save-joystick-count', (event, count) => {
        config.numJoysticks = parseInt(count) || 1;
        saveConfig(config);
        console.log(`Joystick count updated to: ${config.numJoysticks}`);
        joystickHandler('reload-backend', {});
    });

    // Helper function to keep code clean
    function saveConfig(data) {
        try {
            fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error("Failed to save config:", err);
        }
    }
};