const { app, BrowserWindow } = require('electron');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');
const securityFilter = require('./program/filter');

// Load logic modules
const handleSocket = require('./program/websocket-main');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));

const expressApp = express();
const server = http.createServer(expressApp);
const wss = new WebSocketServer({ server });

// 1. Serve Injected HTML
expressApp.get('/', (req, res) => {
    const themePath = path.join(__dirname, '..', 'user', config.theme, 'html', 'index.html');
    if (!securityFilter(themePath)) {
        if (fs.existsSync(themePath)) {
            let html = fs.readFileSync(themePath, 'utf8');
            const scriptTag = `<script src="/internal/websocket-injection.js"></script>`;
            res.send(html.replace('</body>', `${scriptTag}</body>`));
        } else {
            res.status(404).send("Theme not found");
        }
    } else {
        res.status(500).send("Mallicious code detected in theme, be carefull where you get your themes");
    }
});

// 2. Serve Injection Script
expressApp.get('/internal/websocket-injection.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'program', 'websocket-injection.js'));
});

// 3. Static Assets (CSS/Images)
expressApp.use(express.static(path.join(__dirname, '..', 'user', config.theme)));

// 4. WebSocket Connection
wss.on('connection', (ws) => {
    console.log("Device connected.");
    handleSocket(ws); // Delegate to our modular manager
});

app.whenReady().then(() => {
    server.listen(config.port, '0.0.0.0', () => {
        console.log(`Server: http://localhost:${config.port}`);
    });

    const win = new BrowserWindow({ 
        width: 600, 
        height: 400,
        webPreferences: {
            nodeIntegration: true,    // Allows require('electron') in HTML
            contextIsolation: false   // Needed for simple nodeIntegration usage
        }
    });

    win.loadFile(path.join(__dirname, 'resources', 'index.html'));
});

//keepalive
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping(); // Send a ping to the phone
    });
}, 10000); // Check every 30 seconds

wss.on('close', () => {
    clearInterval(interval);
});