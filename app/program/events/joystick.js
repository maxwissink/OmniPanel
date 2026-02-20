const { app } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');


const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'app/program/python/virtual-joystick.py')
    : path.join(__dirname, '../python/virtual-joystick.py');

let pyProcess = null;

if (app.isPackaged && process.platform !== 'win32') {
    const fs = require('fs');
    try {
        // Force executable permissions (rwxr-xr-x)
        fs.chmodSync(getPythonPath(), 0o755); 
        console.log("Permissions set for Python binary");
    } catch (err) {
        console.error("Failed to set Python permissions:", err);
    }
}

function getPythonPath() {
    if (!app.isPackaged) return 'python3';

    const resPath = process.resourcesPath;
    const unpackedPath = path.join(resPath, 'app.asar.unpacked');

    if (process.platform === 'win32') {
        return path.join(unpackedPath, 'python-env/windows/python-3.13.12-embed-amd64/python.exe');
    } else {
        return path.join(unpackedPath, 'python-env/linux/python/bin/python3');
    }
}

function startJoystickProcess() {
    let count = 1; // Default fallback

    try {
        let configPath = null;
        if (app.isPackaged) {
            configPath = path.join(path.dirname(process.execPath), 'config.json');
        } else {
            configPath = path.join(__dirname, '..', '..', '..', 'config.json');
        }

        if (fs.existsSync(configPath)) {
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            count = configData.numJoysticks || 1;
        }
    } catch (err) {
        console.error("[Node] Error reading config for Python startup:", err);
    }

    console.log(`[Node] Launching Python with ${count} joysticks...`);

    // Pass the count as the second argument in the array
    pyProcess = spawn(getPythonPath(), [scriptPath, count.toString()]);

    pyProcess.stdout.on('data', (data) => {
        console.log(`[Python Joystick]: ${data.toString().trim()}`);
    });

    pyProcess.stderr.on('data', (data) => {
        console.error(`[Python ERROR]: ${data.toString().trim()}`);
    });

    pyProcess.on('close', (code) => {
        console.log(`Joystick process exited with code ${code}. Restarting...`);
        setTimeout(startJoystickProcess, 1000);
    });
}

function reloadJoysticks() {
    if (pyProcess) {
        console.log("[Node] Config change detected. Restarting Python backend...");
        // This triggers the 'close' event, which calls startJoystickProcess() again
        pyProcess.kill();
    } else {
        startJoystickProcess();
    }
}

// Start the process once
startJoystickProcess();

module.exports = function (type, payload) {
    // NEW: Handle a manual reload request from the main process
    if (type === 'reload-backend') {
        reloadJoysticks();
        return;
    }

    if (!pyProcess) return;

    const jsIndex = payload.js !== undefined ? payload.js : 0;

    if (type === 'simulate-button') {
        const { id, state } = payload;
        pyProcess.stdin.write(`${jsIndex},btn,${id},${state}\n`);
    } else if (type === 'simulate-slider') {
        const { id, value } = payload;
        pyProcess.stdin.write(`${jsIndex},ax,${id},${value}\n`);
    }
};