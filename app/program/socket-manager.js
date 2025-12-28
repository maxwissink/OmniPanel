const { WebSocketServer } = require('ws');
const bridge = require('./bridge');
const handleSocket = require('./websocket-main');

module.exports = function(server) {
    const wss = new WebSocketServer({ server });

    // --- Heartbeat Logic ---
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 15000);

    wss.on('close', () => clearInterval(interval));

    // --- Connection Handling ---
    wss.on('connection', (ws, req) => {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        ws.deviceIp = ip.replace('::ffff:', '');
        ws.isAlive = true;

        ws.on('pong', () => { ws.isAlive = true; });

        // Log Connection
        bridge.push('log-event', {
            timestamp: new Date().toLocaleTimeString(),
            type: "System",
            data: `Connected: ${ws.deviceIp}`
        });

        // Log Disconnection
        ws.on('close', () => {
            bridge.push('log-event', {
                timestamp: new Date().toLocaleTimeString(),
                type: "System",
                data: `Disconnected: ${ws.deviceIp}`
            });
        });

        // Pass to your existing modular manager (for key presses, etc.)
        handleSocket(ws);
    });

    return wss; // Return it in case main.js needs it for broadcasting
};