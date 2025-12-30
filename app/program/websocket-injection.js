// This file lives in app/program/ and is injected into the theme
let socket;// = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);
let reconnectInterval;

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

function connect() {
    // Prevent multiple simultaneous connection attempts
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        return;
    }

    console.log("Attempting to connect...");
    socket = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);

    socket.onopen = () => {
        console.log("Connected to OmniPanel Host");
    };

    socket.onmessage = (event) => {
        // Handle incoming messages from PC if needed
        const msg = JSON.parse(event.data);

        if (msg.type === 'force-reload') {
            console.log("Host changed theme. Reloading...");
            location.reload(); // This refreshes the phone browser instantly
        }
    };
}

// THE WATCHDOG: Check every 3 seconds if we are still connected
function startWatchdog() {
    if (reconnectInterval) clearInterval(reconnectInterval);

    reconnectInterval = setInterval(() => {
        if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
            console.warn("Watchdog detected closed connection. Reconnecting...");
            connect();
        }
    }, 3000);
}

window.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('[emulate-button]');

    buttons.forEach(button => {
        const btnId = button.getAttribute('emulate-button');

        // MOUSE DOWN / TOUCH START (Press)
        ['mousedown', 'touchstart'].forEach(type => {
            button.addEventListener(type, (e) => {
                e.preventDefault();
                socket.send(JSON.stringify({
                    type: 'simulate-button',
                    data: { id: btnId, state: 1 }
                }));
                button.classList.add('active'); // CSS feedback
            });
        });

        // MOUSE UP / TOUCH END (Release)
        ['mouseup', 'touchend', 'touchcancel'].forEach(type => {
            button.addEventListener(type, () => {
                socket.send(JSON.stringify({
                    type: 'simulate-button',
                    data: { id: btnId, state: 0 }
                }));
                button.classList.remove('active');
            });
        });
    });

    // Select any element with the emulate-slider attribute
    const sliders = document.querySelectorAll('[emulate-slider]');
    console.log(`Binder found ${sliders.length} sliders`);

    sliders.forEach(slider => {
        // Get the Axis ID (e.g., "1" from your HTML)
        const axisId = parseInt(slider.getAttribute('emulate-slider'));

        slider.addEventListener('input', (event) => {
            // Construct the payload with both ID and Value
            const payload = {
                type: 'simulate-slider',
                data: {
                    id: axisId,
                    value: parseInt(event.target.value)
                }
            };

            // Send to your Node.js server
            socket.send(JSON.stringify(payload));
        });
    });

    connect();
    startWatchdog();
    keepScreenAlive();
});

