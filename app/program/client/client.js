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
            for (const pageGroup of blockData.children) {
                const pagesContainer = contentArea.querySelector('.pages-container');
                if (pagesContainer) {
                    const targetPage = pagesContainer.querySelector(`:scope > .page-wrapper[data-page-index="${pageGroup.pageIndex}"]`);

                    if (targetPage) {
                        for (const childBlock of pageGroup.blocks) {
                            await renderBlockRecursive(childBlock, targetPage);
                        }
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
    const contentArea = blockWrapper.querySelector('.block-content-area');
    if (!contentArea) return;

    const rescuedBlocks = [];
    const existingPagesContainer = contentArea.querySelector('.pages-container');
    if (existingPagesContainer) {
        existingPagesContainer.querySelectorAll(':scope > .page-wrapper').forEach(page => {
            const pIndex = parseInt(page.dataset.pageIndex);
            const blocks = Array.from(page.querySelectorAll(':scope > .loaded-block'));
            blocks.forEach(b => {
                rescuedBlocks.push({ pageIndex: pIndex, element: b });
            });
        });
    }

    let finalHtml = blockWrapper.htmlTemplate;
    const blockId = blockWrapper.id;
    Object.keys(blockWrapper.settings).forEach(key => {
        const value = blockWrapper.settings[key];
        const placeholder = new RegExp(`settings-${key}`, 'g');
        finalHtml = finalHtml.replace(placeholder, value);
    });

    contentArea.innerHTML = finalHtml;

    if (blockWrapper.settings.pages) {
        const numPages = parseInt(blockWrapper.settings.pages);
        const header = contentArea.querySelector('.tab-header');
        const container = contentArea.querySelector('.pages-container');

        if (header && container) {
            rebuildPages(blockWrapper, header, container, numPages);
        }
    }
}

function rebuildPages(blockWrapper, header, container, numPages) {
    header.innerHTML = '';
    
    const rescued = [];
    container.querySelectorAll(':scope > .page-wrapper').forEach(page => {
        const idx = parseInt(page.dataset.pageIndex);
        const children = Array.from(page.querySelectorAll(':scope > .loaded-block'));
        children.forEach(child => rescued.push({ pageIndex: idx, element: child }));
    });

    container.innerHTML = '';

    if (!blockWrapper.currentPage) blockWrapper.currentPage = 1;

    for (let i = 1; i <= numPages; i++) {
        const isActive = (i === blockWrapper.currentPage);

        const btn = document.createElement('button');
        btn.className = `tab-btn ${isActive ? 'active' : ''}`;
        btn.innerText = `Page ${i}`;

        const page = document.createElement('div');
        page.className = `page-wrapper ${isActive ? 'active' : ''}`;
        page.dataset.pageIndex = i;

        rescued.forEach(item => {
            if (item.pageIndex === i) {
                page.appendChild(item.element);
            }
        });

        btn.onclick = (e) => {
            if (e) e.stopPropagation();
            
            blockWrapper.currentPage = i;

            header.querySelectorAll(':scope > .tab-btn').forEach(b => b.classList.remove('active'));
            container.querySelectorAll(':scope > .page-wrapper').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            page.classList.add('active');
        };

        header.appendChild(btn);
        container.appendChild(page);
    }
}

async function keepScreenAlive() {
    if ('wakeLock' in navigator) {
        try {
            const wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active! Screen will stay on.');

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
