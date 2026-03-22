const { WebSocketServer } = require('ws');
const bridge = require('./bridge');
const handleSocket = require('./websocket-main');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');


module.exports = function (config ,server) {
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
    wss.on('connection', async (ws, req) => {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        ws.deviceIp = ip.replace('::ffff:', '');
        ws.isAlive = true;

        const panel = config.panel;
        let panelPath = app.isPackaged
                    ? path.join(path.dirname(process.execPath), 'user', 'panels', `${panel}.json`)
                    : path.join(app.getAppPath(), 'user', 'panels', `${panel}.json`);
        
        let panelJSON = null;
        if (panelPath.length > 0) {
            const content = await fs.readFileSync(panelPath, 'utf8');
            panelJSON = JSON.parse(content);
        }

        ws.send(JSON.stringify({ type: 'load-panel', data: panelJSON}));

        ws.on('pong', () => { ws.isAlive = true; });

        bridge.push('log-event', {
            timestamp: new Date().toLocaleTimeString(),
            type: "System",
            data: `Connected: ${ws.deviceIp}`
        });

        ws.on('close', () => {
            bridge.push('log-event', {
                timestamp: new Date().toLocaleTimeString(),
                type: "System",
                data: `Disconnected: ${ws.deviceIp}`
            });
        });

        handleSocket(ws);
    });

    return wss;
};