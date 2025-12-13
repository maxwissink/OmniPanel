const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

const { exec } = require('child_process');

function createWindow() {

    const displays = screen.getAllDisplays();

    //console.log(displays);

    const targetDisplay = displays.find((d) => {return d.id == 35});

    console.log(targetDisplay);

    const mainWindow = new BrowserWindow({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        focusable: false,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'renderer', 'combined-preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    var theme = "default";

    mainWindow.loadFile(path.join(__dirname, '..', 'user', theme, 'html', 'index.html'));
    //mainWindow.webContents.openDevTools(); // debugger
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
