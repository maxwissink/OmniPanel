const { exec } = require('child_process');


// You can use a library like 'robotjs' here for the actual OS-level typing
module.exports = function (type, data, ws) {
    if (type === 'simulate-key') {
        let safeKey = data.replace(/([\\$`"|])/g, '\\$1');
        safeKey = safeKey.replace("Super", "not_allowed");

        const command = `xdotool key "${safeKey}"`;
        //const command = `xdotool windowactivate $(xdotool search 'star citizen' | tail -n 1) && xdotool key "${safeKey}"`;

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
    }
};