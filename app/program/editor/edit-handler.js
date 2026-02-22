const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

module.exports = function () {
    // Listen for the button click signal
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
            parent: BrowserWindow.getFocusedWindow(), // Makes it a child of the host window
            modal: false, // Set to true if you want to block the host until closed
            webPreferences: {
                nodeIntegration: true, // Set based on your security needs
                contextIsolation: false
            }
        });

        themeWindow.loadFile(path.join(__dirname, 'editor.html')); // Path to your theme editor HTML

        // Optional: Hide the menu bar for a cleaner look
        themeWindow.setMenuBarVisibility(false);
    });

}