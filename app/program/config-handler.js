const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
const joystickHandler = require('./events/joystick');

module.exports = function (config, wss) {
    let userPath = null;
    let configPath = null;
    if (app.isPackaged) {
        userPath = path.join(path.dirname(process.execPath), 'user');
        configPath = path.join(path.dirname(process.execPath), 'config.json');
    } else {
        userPath = path.join(__dirname, '..', '..', 'user');
        configPath = path.join(__dirname, '..', '..', 'config.json');
    }

    // Timer variable for the debounce
    let debounceTimer = null;

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

        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ type: 'force-reload' }));
            }
        });
    });

    // 3. Save Joystick Count with Debounced Restart
    ipcMain.on('save-joystick-count', (event, count) => {
        // Update local object and save to file immediately
        config.numJoysticks = parseInt(count) || 1;
        saveConfig(config);
        console.log(`Joystick count saved to config: ${config.numJoysticks}`);

        // DEBOUNCE LOGIC:
        // Clear any previous timer if the user clicked again quickly
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        // Wait 1 second after the LAST click before restarting Python
        debounceTimer = setTimeout(() => {
            console.log("[Node] Restarting virtual joysticks...");
            joystickHandler('reload-backend', {});
        }, 1000); 
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