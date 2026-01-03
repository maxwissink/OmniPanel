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
    const fsBtn = document.getElementById('fullscreen-btn');

    fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            // ENTER FULLSCREEN
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            // EXIT FULLSCREEN
            document.exitFullscreen();
        }
    });

    // Update button text based on state
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fsBtn.innerText = "EXIT FULLSCREEN";
            fsBtn.style.borderColor = "#ff3333"; // Make it red when in fullscreen
            fsBtn.style.color = "#ff3333";
        } else {
            fsBtn.innerText = "ENTER FULLSCREEN";
            fsBtn.style.borderColor = "#0dc8fc";
            fsBtn.style.color = "#0dc8fc";
        }
    });


    const buttons = document.querySelectorAll('[emulate-button]');

    buttons.forEach(button => {
        const btnId = button.getAttribute('emulate-button');

        // Use pointerdown instead of touchstart/mousedown
        button.addEventListener('pointerdown', (e) => {
            // Do NOT use e.preventDefault() here! 
            // That is what kills the swipe.

            socket.send(JSON.stringify({
                type: 'simulate-button',
                data: { id: btnId, state: 1 }
            }));
            button.classList.add('active');

            // Ensure the button keeps tracking the pointer even if the finger 
            // moves off the button (important for fast gaming)
            button.setPointerCapture(e.pointerId);
        });

        button.addEventListener('pointerup', () => {
            socket.send(JSON.stringify({
                type: 'simulate-button',
                data: { id: btnId, state: 0 }
            }));
            button.classList.remove('active');
        });

        button.addEventListener('pointercancel', () => {
            // This triggers if the browser decides the touch is actually a SWIPE
            socket.send(JSON.stringify({
                type: 'simulate-button',
                data: { id: btnId, state: 0 }
            }));
            button.classList.remove('active');
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

