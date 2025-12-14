const fs = require('fs');
const path = require('path');

const eventsDir = __dirname; 

/**
 * Loads all JavaScript files in the current directory (excluding this index.js)
 * and executes them to register event listeners (e.g., ipcMain.on handlers).
 */
function loadEventHandlers() {
    try {
        const files = fs.readdirSync(eventsDir);

        console.log(`--- Loading ${files.length - 1} event handler files from ${path.basename(eventsDir)} ---`);

        files.forEach(file => {
            const fullPath = path.join(eventsDir, file);
            const fileStats = fs.statSync(fullPath);

            if (fileStats.isFile() && file.endsWith('.js') && file !== 'index.js') {
                console.log(`[Event Loader] Registering handler: ${file}`);
                
                require(fullPath);
            }
        });

        console.log("--- Event handlers loaded successfully. ---");

    } catch (error) {
        console.error(`ERROR loading event handlers: ${error.message}`);
    }
}

module.exports = {
    loadEventHandlers
};