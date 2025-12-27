const { app, BrowserWindow } = require('electron');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');

// Load logic modules
const handleSocket = require('./program/websocket-main');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));

const expressApp = express();
const server = http.createServer(expressApp);
const wss = new WebSocketServer({ server });

// 1. Serve Injected HTML
expressApp.get('/', (req, res) => {
    const themePath = path.join(__dirname, '..', 'user', config.theme, 'html', 'index.html');
    if (fs.existsSync(themePath)) {
        let html = fs.readFileSync(themePath, 'utf8');
        const scriptTag = `<script src="/internal/websocket-injection.js"></script>`;
        res.send(html.replace('</body>', `${scriptTag}</body>`));
    } else {
        res.status(404).send("Theme not found");
    }
});

const assetsPath = path.join(__dirname, '..', 'user', config.theme);
expressApp.use(express.static(assetsPath));

// 2. Serve Injection Script
expressApp.get('/internal/websocket-injection.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'program', 'websocket-injection.js'));
});

// 3. Static Assets (CSS/Images)
expressApp.use(express.static(path.join(__dirname, '..', 'user', config.theme, 'html')));

// 4. WebSocket Connection
wss.on('connection', (ws) => {
    console.log("Phone linked.");
    handleSocket(ws); // Delegate to our modular manager
});

app.whenReady().then(() => {
    server.listen(config.port, '0.0.0.0', () => {
        console.log(`Server: http://localhost:${config.port}`);
    });
    // Assuming your electron UI is in app/index.html
    new BrowserWindow({ width: 400, height: 250 }).loadFile(path.join(__dirname, 'index.html'));
});