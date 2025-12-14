const { ipcMain } = require('electron');

ipcMain.on('log', (event, msg) => console.log('[log]', msg));