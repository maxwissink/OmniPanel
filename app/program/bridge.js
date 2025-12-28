// app/program/bridge.js
const { BrowserWindow } = require('electron');

module.exports = {
    push: (channel, data) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            win.webContents.send(channel, data);
        }
    }
};