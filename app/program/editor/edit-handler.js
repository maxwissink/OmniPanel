const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

module.exports = function () {
    ipcMain.on('open-theme-editor', (event) => {
        // Check if the window is already open to avoid duplicates
        const existingWindow = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'Theme Editor');
        if (existingWindow) {
            existingWindow.focus();
            return;
        }

        const themeWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            title: 'Theme Editor',
            parent: BrowserWindow.getFocusedWindow(),
            modal: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        themeWindow.loadFile(path.join(__dirname, 'editor.html'));

        themeWindow.setMenuBarVisibility(false);
    });

}