const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const eventLoader = require('./program/events/index');
const { exec } = require('child_process');

function createWindow() {

    const displays = screen.getAllDisplays();

    const targetDisplay = displays.find((d) => {return d.id == 35});

    //console.log(targetDisplay);

    const mainWindow = new BrowserWindow({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        focusable: false,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload', 'combined-preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    var theme = "default";

    mainWindow.loadFile(path.join(__dirname, '..', 'user', theme, 'html', 'index.html'));
    //mainWindow.webContents.openDevTools(); // debugger
}

app.whenReady().then(() => {
    createWindow();

    eventLoader.loadEventHandlers();
});
