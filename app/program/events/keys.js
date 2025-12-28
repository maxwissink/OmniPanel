const { exec } = require('child_process');
const bridge = require('../bridge');

// You can use a library like 'robotjs' here for the actual OS-level typing
module.exports = function (type, data, ws) {
    if (type === 'simulate-key') {
        let safeKey = data.replace(/([\\$`"|])/g, '\\$1');
        safeKey = safeKey.replace("Super", "not_allowed");

        const command = `xdotool key "${safeKey}"`;
        //const command = `xdotool windowactivate $(xdotool search 'star citizen' | tail -n 1) && xdotool key "${safeKey}"`;

        console.log(`Executing: ${command}`);

        exec(command, (error, stdout, stderr) => {
            let rawError = (error ? error.message : "") || stderr || "";

            if (rawError) {
                let cleanError = rawError.trim();

                const lines = cleanError.split('\n');
                const uniqueError = lines[0]; // had same error twice

                bridge.push('log-event', {
                    timestamp: new Date().toLocaleTimeString(),
                    type: "System Error",
                    data: uniqueError
                });

                console.error("Original stderr:", cleanError);
                return;
            }
        });
    }
};