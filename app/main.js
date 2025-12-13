const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const { exec } = require('child_process');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        focusable: false,
        webPreferences: {
            preload: path.join(__dirname, 'renderer', 'combined-preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'user', 'html', 'index.html'));
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

// Handle single or multiple keys
ipcMain.on('simulate-key', (event, keyCombination) => {
    const safeKey = keyCombination.replace(/([\\$`"|])/g, '\\$1');

    const command = `xdotool key "${safeKey}"`;

    console.log(`Executing: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing xdotool: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`xdotool warning/info: ${stderr}`);
            return;
        }
    });
});

// Optional renderer logging
ipcMain.on('renderer-log', (event, msg) => console.log('[renderer]', msg));
