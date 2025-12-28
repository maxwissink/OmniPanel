const { ipcMain, BrowserWindow } = require('electron');

module.exports = function(type, data) {
    // 1. Get the primary Electron window
    const mainWindow = BrowserWindow.getAllWindows()[0];

    if (mainWindow) {
        // 2. Send the data to the Host's index.html
        mainWindow.webContents.send('log-event', {
            timestamp: new Date().toLocaleTimeString(),
            type: type,
            data: data
        });
    }
};