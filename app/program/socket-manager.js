const { WebSocketServer } = require('ws');
const bridge = require('./bridge');
const handleSocket = require('./websocket-main');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');


module.exports = function (server) {
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

        // config, need to replace with global method
        let config = null;
        if (app.isPackaged) {
            const packagedConfigPath = path.join(path.dirname(process.execPath), 'config.json');
            config = JSON.parse(fs.readFileSync(packagedConfigPath, 'utf8'));
        } else {
            config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config.json'), 'utf8'));
        }

        const theme = config.theme;
        let themePath = app.isPackaged
                    ? path.join(path.dirname(process.execPath), 'user', 'themes', `${theme}.json`)
                    : path.join(app.getAppPath(), 'user', 'themes', `${theme}.json`);
        
        let themeJSON = null;
        if (themePath.length > 0) {
            const content = await fs.readFileSync(themePath, 'utf8');
            themeJSON = JSON.parse(content);
        }

        ws.send(JSON.stringify({ type: 'load-theme', data: themeJSON}));

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