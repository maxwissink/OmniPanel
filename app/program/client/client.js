let socket;
let reconnectInterval;

async function loadTheme(data) {
    const mainContainer = document.querySelector('body');
    mainContainer.innerHTML = "<button id='fullscreen-btn' class='fullscreen-toggle'>ENTER FULLSCREEN</button>";

    for (const blockData of data) {
        if (blockData.backgroundColor) { // set inital settings
            mainContainer.style.setProperty('--workspace-bg', blockData.backgroundColor);
            continue;
        }
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
        const placeholder = new RegExp(`settings-${key}(?![a-zA-Z0-9_])`, 'g');
        finalHtml = finalHtml.replace(placeholder, value);
    });

    contentArea.innerHTML = finalHtml;

    if (blockWrapper.settings.pages) {
        applyBackground(blockWrapper, contentArea);

        const header = contentArea.querySelector('.tab-header');
        const container = contentArea.querySelector('.pages-container');

        if (header && container) {
            rebuildPages(blockWrapper, header, container, blockWrapper.settings.pages);
        }
    }

    requestAnimationFrame(() => {
        const hitbox = blockWrapper.querySelector('.joy-hitbox');
        if (hitbox) {
            initJoystick(blockWrapper);
        } else {
            //simply isnt a joystick then
            //console.error("Joystick initialization failed: .joy-hitbox not found in block", blockWrapper.id);
        }
    });
}

function initJoystick(blockWrapper) {
    const hitbox = blockWrapper.querySelector('.joy-hitbox');
    const base = blockWrapper.querySelector('.joy-base');
    const thumb = blockWrapper.querySelector('.joy-thumb');

    if (!hitbox || !base || !thumb) {
        console.warn("Joystick elements missing in block:", blockWrapper.id);
        return;
    }

    const maxTravel = parseInt(blockWrapper.settings.travel) || 60;
    const safeZone = parseInt(blockWrapper.settings.safe_zone) || 30;

    let active = false;
    let centerX, centerY;

    hitbox.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const rect = hitbox.getBoundingClientRect();
        active = true;

        centerX = e.clientX - rect.left;
        centerY = e.clientY - rect.top;

        base.style.display = 'block';
        base.style.left = `${centerX}px`;
        base.style.top = `${centerY}px`;
    });

    const onMouseMove = (e) => {
        if (!active) return;

        const rect = hitbox.getBoundingClientRect();
        const dx = Math.max(-maxTravel, Math.min(maxTravel, (e.clientX - rect.left) - centerX));
        const dy = Math.max(-maxTravel, Math.min(maxTravel, (e.clientY - rect.top) - centerY));

        thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        blockWrapper.dataset.joyX = Math.round(((dx / maxTravel + 1) / 2) * 255);
        blockWrapper.dataset.joyY = Math.round((((dy / maxTravel) + 1) / 2) * 255);

        const payload = {
            type: 'simulate-joystick',
            data: {
                js: blockWrapper.settings['joystick'],
                id: blockWrapper.settings['slider'],
                value: { x: parseInt(blockWrapper.dataset.joyX), y: parseInt(blockWrapper.dataset.joyY) }
            }
        };
        socket.send(JSON.stringify(payload));
    };

    const onMouseUp = () => {
        if (!active) return;
        active = false;
        base.style.display = 'none';
        blockWrapper.dataset.joyX = 127;
        blockWrapper.dataset.joyY = 127;
        thumb.style.transform = `translate(-50%, -50%)`;

        const payload = {
            type: 'simulate-joystick',
            data: {
                js: blockWrapper.settings['joystick'],
                id: blockWrapper.settings['slider'],
                value: { x: parseInt(blockWrapper.dataset.joyX), y: parseInt(blockWrapper.dataset.joyY) }
            }
        };
        socket.send(JSON.stringify(payload));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

async function applyBackground(blockWrapper, contentArea) {
    const bgFile = blockWrapper.settings['background_image'];
    const target = contentArea.querySelector('.ui-container') || contentArea;

    if (bgFile && bgFile !== 'none') {
        const assetsDir = '/assets';

        const normalizedPath = `${assetsDir}/${bgFile}`.replace(/\\/g, '/');
        const fullPath = `url('${normalizedPath}')`;

        target.style.backgroundImage = fullPath;
        target.style.backgroundSize = 'cover';
        target.style.backgroundPosition = 'center';
    } else {
        target.style.backgroundImage = 'none';
    }
}

function rebuildPages(blockWrapper, header, container, pagesSetting) {
    header.innerHTML = '';

    const pagesVal = pagesSetting.toString();
    let pageNames = [];
    let count = 0;

    if (pagesVal.includes(',')) {
        pageNames = pagesVal.split(',').map(s => s.trim());
        count = pageNames.length;
    } else if (!isNaN(pagesVal) && pagesVal.trim() !== "") {
        count = parseInt(pagesVal);
        for (let i = 1; i <= count; i++) pageNames.push(`Page ${i}`);
    } else {
        pageNames = [pagesVal];
        count = 1;
    }

    const rescued = [];
    container.querySelectorAll(':scope > .page-wrapper').forEach(page => {
        const idx = parseInt(page.dataset.pageIndex);
        const children = Array.from(page.querySelectorAll(':scope > .loaded-block'));
        children.forEach(child => rescued.push({ pageIndex: idx, element: child }));
    });

    container.innerHTML = '';

    if (!blockWrapper.currentPage) blockWrapper.currentPage = 1;

    for (let i = 1; i <= count; i++) {
        const isActive = (i === blockWrapper.currentPage);

        const btn = document.createElement('button');
        btn.className = `tab-btn ${isActive ? 'active' : ''}`;

        btn.innerText = pageNames[i - 1] || `Page ${i}`;

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
