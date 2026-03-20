const { app, BrowserWindow } = require('electron');
const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const forge = require('node-forge');
const setupConfigHandler = require('./program/config-handler');
const securityFilter = require('./program/filter');
const initSocketManager = require('./program/socket-manager');
const editorHandler = require('./program/editor/editor-handler');

let config = null;
if (app.isPackaged) {
    const packagedConfigPath = path.join(path.dirname(process.execPath), 'config.json');
    config = JSON.parse(fs.readFileSync(packagedConfigPath, 'utf8'));
} else {
    config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
}

const expressApp = express();

// --- Certificate Generation Logic (Node-Forge) ---
function getCertificates() {
    const certDir = path.join(app.getPath('userData'), 'certs');
    const keyPath = path.join(certDir, 'key.pem');
    const certPath = path.join(certDir, 'cert.pem');

    if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
    }

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        console.log("OmniPanel: Loading existing SSL certificates...");
        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
    }

    console.log("OmniPanel: Generating new SSL certificate (this may take a moment)...");

    const keys = forge.pki.rsa.generateKeyPair(2048);

    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10); // 10 years

    const attrs = [
        { name: 'commonName', value: 'OmniPanel' },
        { name: 'organizationName', value: 'OmniPanel' },
        { shortName: 'OU', value: 'OmniPanel' }
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    cert.sign(keys.privateKey, forge.md.sha256.create());

    const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
    const pemCert = forge.pki.certificateToPem(cert);

    try {
        fs.writeFileSync(keyPath, pemKey);
        fs.writeFileSync(certPath, pemCert);
        console.log("OmniPanel: Certificates saved to " + certDir);
    } catch (err) {
        console.error("OmniPanel Error: Could not save certificates!", err);
    }

    return { key: pemKey, cert: pemCert };
}

expressApp.get('/', (req, res) => {
    const client = path.join(__dirname, 'program', 'client', 'index.html');
    // let panelPath = null;
    // if (app.isPackaged) {
    //     panelPath = path.join(path.dirname(process.execPath), 'user', config.panel, 'html', 'index.html');
    // } else {
    //     panelPath = path.join(__dirname, '..', 'user', config.panel, 'html', 'index.html');
    // }

    //if (!securityFilter(panelPath)) {
        if (fs.existsSync(client)) {
            let html = fs.readFileSync(client, 'utf8');
            res.send(html);
        } else {
            res.status(404).send("Panel not found");
        }
    // } else {
    //     res.status(500).send("Malicious code detected in panel.");
    // }
});

//injection script to client
expressApp.get('/client.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'program', 'client', 'client.js'));
});
const baseDir = app.isPackaged 
    ? path.join(path.dirname(process.execPath), 'user') 
    : path.join(__dirname, '..', 'user');
expressApp.use('/blocks/', express.static(path.join(baseDir, 'blocks')));
expressApp.use('/assets/', express.static(path.join(baseDir, 'assets')));
// dynamic exposing
// expressApp.use((req, res, next) => {
//     let panelFolder = null;
//     if (app.isPackaged) {
//         panelFolder = path.join(path.dirname(process.execPath), 'user', config.panel);
//     } else {
//         panelFolder = path.join(__dirname, '..', 'user', config.panel);
//     }
//     express.static(panelFolder)(req, res, next);
// });

// --- Initialization ---
app.whenReady().then(() => {
    let certs;
    try {
        certs = getCertificates();
    } catch (e) {
        console.error("Failed to load certificates:", e);
        return;
    }

    const server = https.createServer(certs, expressApp);
    const wss = initSocketManager(config, server);

    setupConfigHandler(config, wss);
    editorHandler(config);

    server.listen(config.port, '0.0.0.0', () => {
        console.log(`Server Secure: https://localhost:${config.port}`);
    });

    const win = new BrowserWindow({
        width: config.width || 600,
        height: config.height || 600,
        icon: path.join(__dirname, 'build', 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile(path.join(__dirname, 'resources', 'index.html'));
    win.setMenuBarVisibility(false);
    
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('init-config', config);
    });
});