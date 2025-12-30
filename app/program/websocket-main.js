const fs = require('fs');
const path = require('path');

// Path to your modular event handlers
const eventsFolder = path.join(__dirname, 'events');
const eventHandlers = [];

// Dynamically load every .js file in the events folder
if (fs.existsSync(eventsFolder)) {
    fs.readdirSync(eventsFolder).forEach(file => {
        if (file.endsWith('.js')) {
            const handler = require(path.join(eventsFolder, file));
            eventHandlers.push(handler);
        }
    });
}

module.exports = function handleSocket(ws) {
    ws.isAlive = true;

    // When the phone responds to our ping, set isAlive to true
    ws.on('pong', () => {
        ws.isAlive = true;
        console.log("ping pong")
    });

    ws.on('message', (rawMessage) => {
        try {
            // Parse the JSON we sent from the phone
            const message = JSON.parse(rawMessage.toString());
            const { type, data } = message;

            let displayData = data;
            if (typeof data === 'object' && data !== null) {
                displayData = Object.entries(data)
                    .map(([key, val]) => `${key}: ${val}`)
                    .join(', ');
            }
            console.log(`[WS] Event Received: ${type} -> ${displayData}`);

            // Loop through all loaded event files and execute them
            eventHandlers.forEach(handler => {
                handler(type, data, ws);
            });

        } catch (err) {
            console.error("Failed to parse JSON message:", err.message);
        }
    });
};