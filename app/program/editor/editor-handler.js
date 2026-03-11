const { app, BrowserWindow, ipcMain, dialog, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { existsSync, mkdirSync } = require('fs');
const Block = require('../models/block.js');


module.exports = function (config) {
    ipcMain.on('open-theme-editor', (event, newTheme) => {
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

        themeWindow.loadFile(path.join(__dirname, 'editor.html'), { query: { isNew: newTheme } });

        themeWindow.setMenuBarVisibility(false);
    });

    ipcMain.handle('get-userPath', async () => {
        let userPath = null;
        if (app.isPackaged) {
            userPath = path.join(path.dirname(process.execPath), 'user');
        } else {
            userPath = path.join(__dirname, '..', '..', '..', 'user');
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

    ipcMain.handle('save-workspace-json', async (event, data) => {

        let userPath = null;
        if (app.isPackaged) {
            userPath = path.join(path.dirname(process.execPath), 'user', 'themes');
        } else {
            userPath = path.join(app.getAppPath(), 'user', 'themes');
        }

        if (!existsSync(userPath)) {
            mkdirSync(userPath, { recursive: true });
        }

        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Workspace',
            defaultPath: path.join(userPath, "new_theme.json"),
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (filePath) {
            try {
                await fs.writeFile(filePath, JSON.stringify(data, null, 4));
                return true;
            } catch (err) {
                console.error("Save failed:", err);
                return false;
            }
        }
        return false;
    });

    ipcMain.handle('load-workspace-json', async () => {
        let userPath = app.isPackaged
            ? path.join(path.dirname(process.execPath), 'user', 'themes')
            : path.join(app.getAppPath(), 'user', 'themes');

        const { cancelled, filePaths } = await dialog.showOpenDialog({
            title: 'Load Workspace',
            defaultPath: userPath,
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });

        if (!cancelled && filePaths.length > 0) {
            const content = await fs.readFile(filePaths[0], 'utf-8');
            return JSON.parse(content);
        }
        return null;
    });

    ipcMain.handle('initiate-workspace-json', async () => {
        let userPath = app.isPackaged
            ? path.join(path.dirname(process.execPath), 'user', 'themes')
            : path.join(app.getAppPath(), 'user', 'themes');

        const filePath = path.join(userPath, `${config.theme}.json`);

        if (filePath) {
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        }
        return null;
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