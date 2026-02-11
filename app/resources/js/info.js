const os = require('os');
const { ipcRenderer } = require('electron');


function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

function showLocalIp(config){
    // Display this on your PC app's main screen
const mobileURL = `https://${getLocalIP()}:${config.port}`;
document.getElementById('url-display').innerText = mobileURL;
}

// Inside your did-finish-load or where you send init-config:
ipcRenderer.on('init-config', (event, currentConfig) => {
    showLocalIp(currentConfig)
});