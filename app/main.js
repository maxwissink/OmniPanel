const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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
ipcMain.on('simulate-key', async (event, keys) => {
    try {
        if (!Array.isArray(keys)) keys = [keys];

        // Press all keys in order
        for (const keyName of keys) {
            // if (!(keyName in Key)) {
            //     console.warn(`Unknown key: ${keyName}`);
            //     continue;
            // }
            //await keyboard.pressKey(Key[keyName]);
        }

        // Release in reverse order
        for (const keyName of keys.slice().reverse()) {
            //if (keyName in Key) await keyboard.releaseKey(Key[keyName]);
        }

        console.log(`Keys pressed: ${keys.join('+')}`);
    } catch (err) {
        console.error('Failed to simulate keys:', err);
    }
});

// Optional renderer logging
ipcMain.on('renderer-log', (event, msg) => console.log('[renderer]', msg));
