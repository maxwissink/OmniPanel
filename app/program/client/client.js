let socket;
let reconnectInterval;

async function loadTheme(data) {
    const mainContainer = document.querySelector('body');
    mainContainer.innerHTML = "<button id='fullscreen-btn' class='fullscreen-toggle'>ENTER FULLSCREEN</button>";

    for (const blockData of data) {
        await renderBlockRecursive(blockData, mainContainer);
    }

    enableInputs();
}

async function renderBlockRecursive(blockData, parentElement) {
    try {
        const fileName = blockData.path.split('blocks').pop().replace(/\\/g, '/');
        const url = `/blocks/${fileName}`;
        const response = await fetch(url);
        const rawHtml = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');
        if (doc.querySelector('settings')) doc.querySelector('settings').remove();

        const blockWrapper = document.createElement('div');
        blockWrapper.classList.add('loaded-block');
        blockWrapper.id = blockData.id;

        Object.assign(blockWrapper.style, {
            position: 'absolute',
            left: blockData.left,
            top: blockData.top,
            width: blockData.width,
            height: blockData.height,
            zIndex: blockData.zIndex || 1
        });

        blockWrapper.settings = blockData.settings;
        blockWrapper.htmlTemplate = doc.head.innerHTML + doc.body.innerHTML;

        const contentArea = document.createElement('div');
        contentArea.classList.add('block-content-area');
        contentArea.style.width = '100%';
        contentArea.style.height = '100%';
        blockWrapper.appendChild(contentArea);

        renderBlockFromTemplate(blockWrapper);

        if (blockData.children && blockData.children.length > 0) {
            // Data structure: children: [{ pageIndex: 1, blocks: [...] }]
            for (const pageGroup of blockData.children) {
                const targetPage = blockWrapper.querySelector(`.page-wrapper[data-page-index="${pageGroup.pageIndex}"]`);

                if (targetPage) {
                    for (const childBlock of pageGroup.blocks) {
                        await renderBlockRecursive(childBlock, targetPage);
                    }
                }
            }
        }

        parentElement.appendChild(blockWrapper);

    } catch (e) {
        console.error("Recursive Load Error:", e);
    }
}

function renderBlockFromTemplate(blockWrapper) {
    let finalHtml = blockWrapper.htmlTemplate;
    const blockId = blockWrapper.id;

    Object.keys(blockWrapper.settings).forEach(key => {
        const value = blockWrapper.settings[key];
        const placeholder = new RegExp(`settings-${key}`, 'g');
        finalHtml = finalHtml.replace(placeholder, value);
    });

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = finalHtml;

    const styleTags = tempDiv.querySelectorAll('style');
    styleTags.forEach(style => {
        style.innerHTML = style.innerHTML.replace(/(^|}|;)\s*([^{};]+)\s*\{/g, (match, p1, p2) => {
            const scopedSelectors = p2.split(',').map(sel => `#${blockId} ${sel.trim()}`).join(', ');
            return `${p1} ${scopedSelectors} {`;
        });
    });

    const contentArea = blockWrapper.querySelector('.block-content-area');
    if (contentArea) {
        contentArea.innerHTML = tempDiv.innerHTML;

        // BUILD PAGES (Same as Editor)
        if (blockWrapper.settings.pages) {
            const numPages = parseInt(blockWrapper.settings.pages);
            const header = contentArea.querySelector('.tab-header');
            const pagesContainer = contentArea.querySelector('.pages-container');

            if (header && pagesContainer) {
                header.innerHTML = '';
                pagesContainer.innerHTML = '';
                for (let i = 1; i <= numPages; i++) {
                    const btn = document.createElement('button');
                    btn.className = `tab-btn ${i === 1 ? 'active' : ''}`;
                    btn.innerText = `Page ${i}`;

                    const page = document.createElement('div');
                    page.className = `page-wrapper ${i === 1 ? 'active' : ''}`;
                    page.dataset.pageIndex = i; // Crucial for the recursive loader to find it

                    btn.onclick = () => {
                        header.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        pagesContainer.querySelectorAll('.page-wrapper').forEach(p => p.classList.remove('active'));
                        btn.classList.add('active');
                        page.classList.add('active');
                    };

                    header.appendChild(btn);
                    pagesContainer.appendChild(page);
                }
            }
        }
    }
}

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

        if (msg.type === 'load-theme') {
            loadTheme(msg.data);
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

function enableInputs() {
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn != null) {
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

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
    if (buttons != null) {
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
    }

    const sliders = document.querySelectorAll('[emulate-slider]');
    if (sliders != null) {
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
    }

}

window.addEventListener('DOMContentLoaded', () => {
    connect();
    startWatchdog();
    keepScreenAlive();
});
