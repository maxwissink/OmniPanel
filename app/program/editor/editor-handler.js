const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Block = require('../models/block.js');


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

    ipcMain.handle('get-userPath', async () => {
        let userPath = null;
        if (app.isPackaged) {
            userPath = path.join(path.dirname(process.execPath), 'user');
        } else {
            userPath = path.join('user');
        }

        return userPath;
    });

    ipcMain.handle('get-blocks', async () => {
    let userPath = null;
    if (app.isPackaged) {
        userPath = path.join(path.dirname(process.execPath), 'user');
    } else {
        userPath = path.join('user');
    }
    const blocksPath = path.join(userPath, 'blocks');
    
    const blocksData = await buildDirectoryTree(blocksPath);
    
    return blocksData;
});
};
// end of export

async function buildDirectoryTree(targetPath) {
    try {
        const items = await fs.readdir(targetPath, { withFileTypes: true });

        return await Promise.all(items.map(async (item) => {
            const fullPath = path.join(targetPath, item.name);
            
            if (item.isDirectory()) {
                const subChildren = await buildDirectoryTree(fullPath);
                return new Block(item.name, 'folder', fullPath, subChildren);
            } else {
                return new Block(item.name, 'file', fullPath);
            }
        }));
    } catch (error) {
        return error;
    }
}