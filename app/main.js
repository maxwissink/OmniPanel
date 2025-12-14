const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const eventLoader = require('./program/events/index');
const { exec } = require('child_process');
const filter = require('./program/filter');

function createWindow() {

    const displays = screen.getAllDisplays();

    const targetDisplay = displays.find((d) => { return d.id == 35 });

    //console.log(targetDisplay);

    const mainWindow = new BrowserWindow({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        focusable: false,
        frame: false,
        alwaysOnTop: (true, 'floating'), // should make it so popups can still be shown (but not on most linux systems unfortunatly)
        webPreferences: {
            preload: path.join(__dirname, 'preload', 'combined-preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    var theme = "default"; // need to be user configurable from a config file

    const themePath = path.join(__dirname, '..', 'user', theme, 'html', 'index.html')

    if (!filter(themePath)) {
        mainWindow.loadFile(themePath)
            .catch(err => {
                console.warn(`Primary theme failed to load (${err.message}). Attempting fallback.`);
                return mainWindow.loadFile(path.join(__dirname, 'resources', 'fallback.html'));
            });
    } else {
        mainWindow.loadFile(path.join(__dirname, 'resources', 'scriptDetected.html'));
    }

    //mainWindow.webContents.openDevTools(); // debugger
}

app.whenReady().then(() => {
    createWindow();

    eventLoader.loadEventHandlers();
});
