const { spawn } = require('child_process');
const path = require('path');
const scriptPath = path.join(__dirname, '../python/virtual-joystick.py');

let pyProcess = null;

function startJoystickProcess() {
    // Start the python script and keep it open
    pyProcess = spawn('python3', [scriptPath]);

    // This captures your print("...") statements from Python
    pyProcess.stdout.on('data', (data) => {
        console.log(`[Python Joystick]: ${data.toString().trim()}`);
    });

    // This captures Python errors (like missing libraries)
    pyProcess.stderr.on('data', (data) => {
        console.error(`[Python ERROR]: ${data.toString().trim()}`);
    });

    pyProcess.on('close', (code) => {
        console.log(`Joystick process exited with code ${code}. Restarting...`);
        setTimeout(startJoystickProcess, 1000); // Auto-restart if it crashes
    });
}

// Start the process once when the app starts
startJoystickProcess();

module.exports = function (type, payload) {
    // Inside your message listener
    if (type === 'simulate-button') {
        const { id, state } = payload;
        pyProcess.stdin.write(`btn,${id},${state}\n`);
    } else if (type === 'simulate-slider') {
        const { id, value } = payload;
        pyProcess.stdin.write(`ax,${id},${value}\n`);
    }
};