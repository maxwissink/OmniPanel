const { app, BrowserWindow } = require('electron');
const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const forge = require('node-forge'); // 1. Using node-forge directly
const setupConfigHandler = require('./program/config-handler');
const securityFilter = require('./program/filter');
const initSocketManager = require('./program/socket-manager');

// Load logic modules
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));

const expressApp = express();

// --- Certificate Generation Logic (Node-Forge) ---
function getCertificates() {
    const certDir = path.join(app.getPath('userData'), 'certs');
    const keyPath = path.join(certDir, 'key.pem');
    const certPath = path.join(certDir, 'cert.pem');

    // Create folder if it doesn't exist
    if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
    }

    // Return existing certs if found
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        console.log("OmniPanel: Loading existing SSL certificates...");
        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
    } 

    // Generate NEW certs using node-forge
    console.log("OmniPanel: Generating new SSL certificate (this may take a moment)...");

    // 1. Generate Keypair (2048-bit RSA)
    const keys = forge.pki.rsa.generateKeyPair(2048);
    
    // 2. Create Certificate
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10); // 10 years

    // 3. Set Attributes
    const attrs = [
        { name: 'commonName', value: 'OmniPanel' },
        { name: 'organizationName', value: 'OmniPanel' },
        { shortName: 'OU', value: 'OmniPanel' }
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // 4. Sign the certificate (Self-Signed)
    cert.sign(keys.privateKey, forge.md.sha256.create());

    // 5. Convert to PEM format
    const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
    const pemCert = forge.pki.certificateToPem(cert);

    // 6. Save to disk
    try {
        fs.writeFileSync(keyPath, pemKey);
        fs.writeFileSync(certPath, pemCert);
        console.log("OmniPanel: Certificates saved to " + certDir);
    } catch (err) {
        console.error("OmniPanel Error: Could not save certificates!", err);
    }

    return { key: pemKey, cert: pemCert };
}

// Routes
// 1. Serve Injected HTML
expressApp.get('/', (req, res) => {
    const themePath = path.join(__dirname, '..', 'user', config.theme, 'html', 'index.html');
    if (!securityFilter(themePath)) {
        if (fs.existsSync(themePath)) {
            let html = fs.readFileSync(themePath, 'utf8');
            // Ensure this connects via WSS (Secure WebSocket)
            const scriptTag = `<script src="/internal/websocket-injection.js"></script>`;
            res.send(html.replace('</body>', `${scriptTag}</body>`));
        } else {
            res.status(404).send("Theme not found");
        }
    } else {
        res.status(500).send("Malicious code detected in theme.");
    }
});

// 2. Serve Injection Script
expressApp.get('/internal/websocket-injection.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'program', 'websocket-injection.js'));
});

// 3. Static Assets
expressApp.use((req, res, next) => {
    const themeFolder = path.join(__dirname, '..', 'user', config.theme);
    express.static(themeFolder)(req, res, next);
});

// --- Initialization ---
app.whenReady().then(() => {
    // CRITICAL: We moved getCertificates inside here because app.getPath requires the app to be ready
    let certs;
    try {
        certs = getCertificates();
    } catch (e) {
        console.error("Failed to load certificates:", e);
        return; // Stop if we can't get certs
    }

    // Initialize HTTPS Server
    const server = https.createServer(certs, expressApp);
    const wss = initSocketManager(server);

    setupConfigHandler(config, wss);
    
    server.listen(config.port, '0.0.0.0', () => {
        console.log(`Server Secure: https://localhost:${config.port}`);
    });

    const win = new BrowserWindow({
        width: config.width || 600, 
        height: config.height || 400,
        icon: path.join(__dirname, 'resources', 'assets', 'icon.jpg'),
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