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

    let debounceTimer = null;

    ipcMain.handle('get-config', async () => {
        let config = null;
        if (app.isPackaged) {
            const packagedConfigPath = path.join(path.dirname(process.execPath), 'config.json');
            config = JSON.parse(fs.readFileSync(packagedConfigPath, 'utf8'));
        } else {
            config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config.json'), 'utf8'));
        }
        return config;
    });

    ipcMain.handle('get-themes', async () => {
        const themesPath = path.join(userPath, 'themes');
        const themes = fs.readdirSync(themesPath, { withFileTypes: true })
            .filter(file => file.isFile() && file.name.toLowerCase().endsWith('.json'))
            .map(file => file.name.replace('.json', ''));

        return {
            allThemes: themes,
            current: config.theme
        };
    });

    ipcMain.on('save-theme', (event, selectedTheme) => {
        config.theme = selectedTheme;
        saveConfig(config);

        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ type: 'force-reload' }));
            }
        });
    });

    ipcMain.handle('get-theme-content', async (event, themeName) => {
        try {
            const themesPath = path.join(userPath, 'themes');
            const filePath = path.join(themesPath, themeName.endsWith('.json') ? themeName : `${themeName}.json`);

            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                return content;
            } else {
                console.error("Theme file not found:", filePath);
                return null;
            }
        } catch (error) {
            console.error("Failed to read theme content:", error);
            return null;
        }
    });

    ipcMain.on('save-joystick-count', (event, count) => {
        config.numJoysticks = parseInt(count) || 1;
        saveConfig(config);
        console.log(`Joystick count saved to config: ${config.numJoysticks}`);

        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
            console.log("[Node] Restarting virtual joysticks...");
            joystickHandler('reload-backend', {});
        }, 1000);
    });

    function saveConfig(data) {
        try {
            fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error("Failed to save config:", err);
        }
    }

    ipcMain.on('enter-fullscreen', (event) => {
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ type: 'enter-fullscreen' }));
            }
        });
    });

    ipcMain.on('exit-fullscreen', (event) => {
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ type: 'exit-fullscreen' }));
            }
        });
    });
};