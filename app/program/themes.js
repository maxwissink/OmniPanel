const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');

module.exports = function (config, wss) {
    const userPath = path.join(__dirname, '..', '..', 'user');
    const configPath = path.join(__dirname, '..', '..', 'config.json');

    // 1. Get List of Folders in /user
    ipcMain.handle('get-themes', async () => {
        const themes = fs.readdirSync(userPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        return {
            allThemes: themes,
            current: config.theme // Pass the current selection along with the list
        };
    });

    // 2. Save Selection and (Optional) Force Mobile Refresh
    ipcMain.on('save-theme', (event, selectedTheme) => {
        config.theme = selectedTheme;

        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log(`Theme updated to: ${selectedTheme}`);

            // 3. BROADCAST REFRESH: Tell all connected phones to reload
            wss.clients.forEach((client) => {
                if (client.readyState === 1) { // 1 = OPEN
                    client.send(JSON.stringify({ type: 'force-reload' }));
                }
            });
        } catch (err) {
            console.error("Failed to save config:", err);
        }
    });
};