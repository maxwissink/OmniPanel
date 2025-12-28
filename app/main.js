const { app, BrowserWindow } = require('electron');
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const setupThemeManager = require('./program/themes');
const securityFilter = require('./program/filter');
const initSocketManager = require('./program/socket-manager');

// Load logic modules
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));

const expressApp = express();
const server = http.createServer(expressApp);
const wss = initSocketManager(server);

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
expressApp.use((req, res, next) => {
    // Dynamically build the path based on the CURRENT config.theme
    const themeFolder = path.join(__dirname, '..', 'user', config.theme);

    // Use express.static's internal logic manually
    express.static(themeFolder)(req, res, next);
});


app.whenReady().then(() => {
    setupThemeManager(config, wss);
    server.listen(config.port, '0.0.0.0', () => {
        console.log(`Server: http://localhost:${config.port}`);
    });

    const win = new BrowserWindow({
        width: config.width || 600, 
        height: config.height || 400,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile(path.join(__dirname, 'resources', 'index.html'));

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('init-config', config);
    });
});
