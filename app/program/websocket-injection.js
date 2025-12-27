// This file lives in app/program/ and is injected into the theme
const socket = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);

// Function to keep the screen awake
async function keepScreenAlive() {
    if ('wakeLock' in navigator) {
        try {
            const wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active! Screen will stay on.');

            // If the user switches tabs and comes back, we need to re-request it
            document.addEventListener('visibilitychange', async () => {
                if (document.visibilityState === 'visible') {
                    await navigator.wakeLock.request('screen');
                }
            });
        } catch (err) {
            console.error(`Wake Lock failed: ${err.name}, ${err.message}`);
        }
    } else {
        console.warn('Wake Lock API not supported in this browser.');
    }
}

// Call it when the socket opens
socket.onopen = () => {
    console.log("Connected to Host");
    keepScreenAlive();
};

window.addEventListener('DOMContentLoaded', () => {
    // Select any element with the emulate-key attribute
    const buttons = document.querySelectorAll('[emulate-key]');
    console.log(`Binder found ${buttons.length} buttons`);

    buttons.forEach(button => {
        let rawkey = button.getAttribute('emulate-key');
        
        // Cleanup: Remove spaces just like your original version
        const key = rawkey.replace(/ /g, '');

        button.addEventListener('click', () => {
            
            
            // Construct the JSON payload
            const payload = {
                type: 'simulate-key',
                data: key
            };

            console.log("Button clicked, sending:", payload);
            
            // Send as a string
            socket.send(JSON.stringify(payload));
        });
    });
});

