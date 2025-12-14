const { ipcMain } = require('electron');
const { exec } = require('child_process');

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