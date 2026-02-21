// This file lives in app/program/ and is injected into the theme
let socket;
let reconnectInterval;

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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    console.log("Attempting to connect...");
    socket = new WebSocket(`${protocol}//${window.location.hostname}:${window.location.port}`);

    socket.onopen = () => {
        console.log("Connected to OmniPanel Host");
    };

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'force-reload') {
            console.log("Host changed theme. Reloading...");
            location.reload();
        }
    };
}

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
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fsBtn.innerText = "EXIT FULLSCREEN";
            fsBtn.style.borderColor = "#ff3333";
            fsBtn.style.color = "#ff3333";
        } else {
            fsBtn.innerText = "ENTER FULLSCREEN";
            fsBtn.style.borderColor = "#0dc8fc";
            fsBtn.style.color = "#0dc8fc";
        }
    });


    function getJoystickIndex(element) {
        return parent ? element.getAttribute('virtual-joystick') : "0";
    }

    const buttons = document.querySelectorAll('[emulate-button]');

    buttons.forEach(button => {
        const btnId = button.getAttribute('emulate-button');

        button.addEventListener('pointerdown', (e) => {
            const jsIndex = getJoystickIndex(button);

            socket.send(JSON.stringify({
                type: 'simulate-button',
                data: {
                    js: jsIndex,
                    id: btnId,
                    state: 1
                }
            }));
            button.classList.add('active');
            button.setPointerCapture(e.pointerId);
        });

        button.addEventListener('pointerup', () => {
            const jsIndex = getJoystickIndex(button);
            socket.send(JSON.stringify({
                type: 'simulate-button',
                data: { js: jsIndex, id: btnId, state: 0 }
            }));
            button.classList.remove('active');
        });

        button.addEventListener('pointercancel', () => {
            const jsIndex = getJoystickIndex(button);
            socket.send(JSON.stringify({
                type: 'simulate-button',
                data: { js: jsIndex, id: btnId, state: 0 }
            }));
            button.classList.remove('active');
        });
    });

    const sliders = document.querySelectorAll('[emulate-slider]');

    sliders.forEach(slider => {
        const axisId = parseInt(slider.getAttribute('emulate-slider'));

        slider.addEventListener('input', (event) => {
            const jsIndex = getJoystickIndex(slider);

            const payload = {
                type: 'simulate-slider',
                data: {
                    js: jsIndex,
                    id: axisId,
                    value: parseInt(event.target.value)
                }
            };
            socket.send(JSON.stringify(payload));
        });
    });

    connect();
    startWatchdog();
    keepScreenAlive();
});

