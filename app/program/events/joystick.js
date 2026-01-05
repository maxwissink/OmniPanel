const { spawn } = require('child_process');
const fs = require('fs'); // Make sure this is at the top of the file
const path = require('path');
const scriptPath = path.join(__dirname, '../python/virtual-joystick.py');

let pyProcess = null;

function startJoystickProcess() {
    let count = 1; // Default fallback

    try {
        // Path to your config.json (adjust path if necessary)
        const configPath = path.join(__dirname, '..', '..', '..', 'config.json');

        if (fs.existsSync(configPath)) {
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            count = configData.numJoysticks || 1;
        }
    } catch (err) {
        console.error("[Node] Error reading config for Python startup:", err);
    }

    console.log(`[Node] Launching Python with ${count} joysticks...`);

    // Pass the count as the second argument in the array
    pyProcess = spawn('python3', [scriptPath, count.toString()]);

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