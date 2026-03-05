const { ipcRenderer } = require('electron');
const Block = require('../models/block.js');
const fs = require('fs').promises;

let highestZ = 100;

const WORKSPACE_GRID_X = 12
const WORKSPACE_GRID_Y = 12;

const DEFAULT_NESTED_GRID = 10;

let blockToDelete = null; // Store which block is on death row

const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Renderer loaded")

    //GetBlocks();
    BuildEditorArea();
    initWorkspaceGrid();
    initModalListeners();
});

async function GetBlocks() {
    const blocksconstainer = document.getElementById("blocksconstainer");

    const blocksRaw = await ipcRenderer.invoke('get-blocks'); // gets an array with the blocks in format: { "name", "type", "path", "children" } childeren == repeatable forever
    const blocks = blocksRaw.map(item => {
        return new Block(item.name, item.type, item.path, item.children);
    });

    buildHtmlTree(blocks, blocksconstainer)
}

function initWorkspaceGrid() {
    const mainContainer = document.querySelector('#maincontainer');
    if (!mainContainer) return;

    const cellWidth = 100 / WORKSPACE_GRID_X;
    const cellHeight = 100 / WORKSPACE_GRID_Y;

    mainContainer.style.setProperty('--grid-w', `${cellWidth}%`);
    mainContainer.style.setProperty('--grid-h', `${cellHeight}%`);
}

function buildHtmlTree(blocksArray, parentElement) {
    const ul = document.createElement('ul');
    ul.classList.add('block-list');

    blocksArray.forEach(block => {
        const li = document.createElement('li');
        li.textContent = block.name;

        if (block.type === 'folder') {
            li.classList.add('block-folder');

            if (block.children && block.children.length > 0) {
                buildHtmlTree(block.children, li);
            }
        } else {
            li.classList.add('block-file');

            if (block.name.endsWith('.html')) {
                li.draggable = true;
                li.style.cursor = 'grab';

                li.addEventListener('dragstart', (event) => {
                    event.dataTransfer.setData('text/plain', block.path);
                    event.dataTransfer.setData('block-name', block.name);
                    event.dataTransfer.effectAllowed = 'copy';
                });
            }
        }

        ul.appendChild(li);
    });

    parentElement.appendChild(ul);
}

function BuildEditorArea() {
    console.log("Editor area initializing...");
    GetBlocks();

    const mainContainer = document.querySelector('#maincontainer');

    mainContainer.addEventListener('mousedown', (e) => {
        if (e.target === mainContainer) {
            document.querySelectorAll('.loaded-block.selected').forEach(el => {
                el.classList.remove('selected');
            });
        }
    });

    mainContainer.addEventListener('dragover', (event) => {
        event.preventDefault();

        document.querySelectorAll('.nested-dropzone').forEach(dz => {
            dz.style.outline = 'none';
            dz.style.backgroundColor = '';
        });

        const targetDropZone = event.target.closest('.nested-dropzone');
        if (targetDropZone) {
            targetDropZone.style.outline = '2px dashed #00ff00';
            targetDropZone.style.outlineOffset = '-2px';
            targetDropZone.style.backgroundColor = 'rgba(0, 255, 0, 0.05)';
        }
    });

    mainContainer.addEventListener('dragleave', (event) => {
        const targetDropZone = event.target.closest('.nested-dropzone');
        if (targetDropZone) {
            targetDropZone.style.outline = 'none';
            targetDropZone.style.backgroundColor = '';
        }
    });

    mainContainer.addEventListener('drop', async (event) => {
        event.preventDefault();
        const targetDropZone = event.target.closest('.nested-dropzone') || mainContainer;
        targetDropZone.style.outline = 'none';
        targetDropZone.style.backgroundColor = '';
        const rect = targetDropZone.getBoundingClientRect();

        let currentGridX, currentGridY;

        if (targetDropZone === mainContainer) {
            // Use the global Master Variables
            currentGridX = WORKSPACE_GRID_X;
            currentGridY = WORKSPACE_GRID_Y;
        } else {
            // Use the container's specific grid settings
            currentGridX = targetDropZone.dataset.gridx ? parseInt(targetDropZone.dataset.gridx) : DEFAULT_NESTED_GRID;
            currentGridY = targetDropZone.dataset.gridy ? parseInt(targetDropZone.dataset.gridy) : DEFAULT_NESTED_GRID;
        }

        const snapStepX = 100 / currentGridX;
        const snapStepY = 100 / currentGridY;

        const action = event.dataTransfer.getData('action');

        if (action === 'move' && window.draggedElement) {
            const block = window.draggedElement;
            let finalTarget = targetDropZone;

            if (block.contains(finalTarget)) {
                finalTarget = block.parentElement.closest('.nested-dropzone') || document.querySelector('#maincontainer');
            }

            const newParent = finalTarget;
            const parentRect = newParent.getBoundingClientRect();

            const blockRect = block.getBoundingClientRect();
            const physWidth = blockRect.width;
            const physHeight = blockRect.height;

            const offset = JSON.parse(event.dataTransfer.getData('offset'));

            const finalXPixels = event.clientX - parentRect.left - offset.x;
            const finalYPixels = event.clientY - parentRect.top - offset.y;

            let nWPct = (physWidth / parentRect.width) * 100;
            let nHPct = (physHeight / parentRect.height) * 100;
            let nLPct = (finalXPixels / parentRect.width) * 100;
            let nTPct = (finalYPixels / parentRect.height) * 100;

            // Clamp
            nWPct = Math.min(nWPct, 100);
            nHPct = Math.min(nHPct, 100);
            nLPct = Math.max(0, Math.min(nLPct, 100 - nWPct));
            nTPct = Math.max(0, Math.min(nTPct, 100 - nHPct));

            const gX = parseInt(newParent.dataset.gridx) || 12;
            const gY = parseInt(newParent.dataset.gridy) || 12;
            const sX = 100 / gX;
            const sY = 100 / gY;

            block.style.width = `${Math.round(nWPct / sX) * sX}%`;
            block.style.height = `${Math.round(nHPct / sY) * sY}%`;
            block.style.left = `${Math.round(nLPct / sX) * sX}%`;
            block.style.top = `${Math.round(nTPct / sY) * sY}%`;

            if (block.parentElement !== newParent) {
                newParent.appendChild(block);
            }
        } else {
            const filePath = event.dataTransfer.getData('text/plain');

            if (filePath && filePath.endsWith('.html')) {
                try {
                    const rawHtml = await fs.readFile(filePath, 'utf-8');
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(rawHtml, 'text/html');
                    const settingsTag = doc.querySelector('settings');

                    let initialSettings = {};
                    let settingsMeta = {};

                    if (settingsTag) {
                        for (let attr of settingsTag.attributes) {
                            const name = attr.name;
                            const value = attr.value;

                            if (name.startsWith('type-')) {
                                const key = name.replace('type-', '');
                                if (!settingsMeta[key]) settingsMeta[key] = {};
                                settingsMeta[key].type = value;
                            } else if (name.startsWith('min-')) {
                                const key = name.replace('min-', '');
                                if (!settingsMeta[key]) settingsMeta[key] = {};
                                settingsMeta[key].min = value;
                            } else if (name.startsWith('max-')) {
                                const key = name.replace('max-', '');
                                if (!settingsMeta[key]) settingsMeta[key] = {};
                                settingsMeta[key].max = value;
                            } else {
                                // It's a standard value
                                initialSettings[name] = value;
                            }
                        }
                        settingsTag.remove();
                    }

                    const blockWrapper = document.createElement('div');

                    blockWrapper.settings = initialSettings;
                    blockWrapper.settingsMeta = settingsMeta;

                    blockWrapper.classList.add('loaded-block');
                    blockWrapper.id = generateId();
                    blockWrapper.style.position = 'absolute';

                    blockWrapper.style.width = `${snapStepX * 2}%`;
                    blockWrapper.style.height = `${snapStepY * 2}%`;

                    blockWrapper.settings = initialSettings;
                    blockWrapper.htmlTemplate = doc.body.innerHTML;

                    let blockWidthPercent = 0;
                    let blockHeightPercent = 0;

                    if (blockWrapper.offsetWidth > 0) {
                        blockWidthPercent = (blockWrapper.offsetWidth / rect.width) * 100;
                        blockHeightPercent = (blockWrapper.offsetHeight / rect.height) * 100;
                    } else {
                        blockWidthPercent = parseFloat(blockWrapper.style.width) || snapStepX;
                        blockHeightPercent = parseFloat(blockWrapper.style.height) || snapStepY;
                    }

                    let xPercent = (((event.clientX - rect.left) / rect.width) * 100) - (snapStepX);
                    let yPercent = (((event.clientY - rect.top) / rect.height) * 100) - (snapStepY);

                    let snappedX = Math.round(xPercent / snapStepX) * snapStepX;
                    let snappedY = Math.round(yPercent / snapStepY) * snapStepY;

                    snappedX = Math.max(0, Math.min(snappedX, 100 - blockWidthPercent));
                    snappedY = Math.max(0, Math.min(snappedY, 100 - blockHeightPercent));

                    blockWrapper.style.left = `${snappedX}%`;
                    blockWrapper.style.top = `${snappedY}%`;

                    // UI Components
                    const moveHandle = document.createElement('div');
                    moveHandle.classList.add('move-handle');
                    moveHandle.innerHTML = '☩';
                    moveHandle.draggable = true;
                    blockWrapper.appendChild(moveHandle);

                    const settingsBtn = document.createElement('div');
                    settingsBtn.classList.add('settings-button');
                    settingsBtn.innerHTML = '⚙';
                    blockWrapper.appendChild(settingsBtn);

                    const resizeHandle = document.createElement('div');
                    resizeHandle.classList.add('resize-handle');
                    blockWrapper.appendChild(resizeHandle);

                    const contentArea = document.createElement('div');
                    contentArea.classList.add('block-content-area');
                    contentArea.style.height = '100%';
                    blockWrapper.appendChild(contentArea);

                    const deleteBtn = document.createElement('div');
                    deleteBtn.classList.add('delete-button');
                    deleteBtn.innerHTML = '🗑';
                    blockWrapper.appendChild(deleteBtn);

                    blockWrapper.dataset.sourcePath = filePath;

                    renderBlockFromTemplate(blockWrapper);

                    // Event Listeners
                    addSelectionListeners(blockWrapper);
                    addWorkspaceDragListeners(blockWrapper, moveHandle);
                    addResizeListeners(blockWrapper, resizeHandle);
                    addDeleteFunctionality(blockWrapper, deleteBtn);

                    settingsBtn.addEventListener('mousedown', (e) => e.stopPropagation());
                    settingsBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openSettingsModal(blockWrapper);
                    });

                    targetDropZone.appendChild(blockWrapper);

                    targetDropZone.style.outline = 'none';
                    targetDropZone.style.backgroundColor = '';

                    CloseMenu();

                } catch (error) {
                    console.error("Failed to load/parse the block:", error);
                }
            }
        }
    });
}

function addWorkspaceDragListeners(blockWrapper, moveHandle) {
    moveHandle.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('action', 'move');

        document.querySelector('.openmenu').style.display = 'none';

        const rect = blockWrapper.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        e.dataTransfer.setData('offset', JSON.stringify({ x: offsetX, y: offsetY }));

        e.dataTransfer.setDragImage(blockWrapper, offsetX, offsetY);

        window.draggedElement = blockWrapper;

        setTimeout(() => { blockWrapper.style.pointerEvents = 'none'; }, 0);
    });

    moveHandle.addEventListener('dragend', (e) => {
        document.querySelector('.openmenu').style.display = 'block';
        blockWrapper.style.pointerEvents = 'all';
        window.draggedElement = null;
    });
}


function addSelectionListeners(blockWrapper) {
    blockWrapper.addEventListener('mousedown', (e) => {
        e.stopPropagation();

        document.querySelectorAll('.loaded-block.selected').forEach(el => {
            el.classList.remove('selected');
        });

        blockWrapper.classList.add('selected');

        highestZ++;
        blockWrapper.style.zIndex = highestZ;

        document.querySelectorAll('.loaded-block.selected').forEach(el => {
            if (el !== blockWrapper) el.classList.remove('selected');
        });

        blockWrapper.classList.add('selected');
    });

    document.querySelector('#maincontainer').addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('maincontainer')) {
            document.querySelectorAll('.loaded-block.selected').forEach(el => {
                el.classList.remove('selected');
            });
        }
    });
}

function addResizeListeners(block, handle) {
    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;

        const parentRect = block.parentElement.getBoundingClientRect();

        const startWidth = block.offsetWidth;
        const startHeight = block.offsetHeight;

        const gX = block.parentElement.dataset.gridx ? parseInt(block.parentElement.dataset.gridx) : WORKSPACE_GRID_X;
        const gY = block.parentElement.dataset.gridy ? parseInt(block.parentElement.dataset.gridy) : WORKSPACE_GRID_Y;
        const snapStepX = 100 / gX;
        const snapStepY = 100 / gY;

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            let newWidthPct = ((startWidth + deltaX) / parentRect.width) * 100;
            let newHeightPct = ((startHeight + deltaY) / parentRect.height) * 100;

            const currentLeft = parseFloat(block.style.left) || 0;
            const currentTop = parseFloat(block.style.top) || 0;

            const maxWidth = 100 - currentLeft;
            const maxHeight = 100 - currentTop;

            newWidthPct = Math.max(snapStepX, Math.min(newWidthPct, maxWidth));
            newHeightPct = Math.max(snapStepY, Math.min(newHeightPct, maxHeight));

            newWidthPct = Math.round(newWidthPct / snapStepX) * snapStepX;
            newHeightPct = Math.round(newHeightPct / snapStepY) * snapStepY;

            block.style.width = `${newWidthPct}%`;
            block.style.height = `${newHeightPct}%`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
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

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = finalHtml;

    const styleTags = tempDiv.querySelectorAll('style');
    styleTags.forEach(style => {
        style.innerHTML = style.innerHTML.replace(/(^|}|;)\s*([^{};]+)\s*\{/g, (match, p1, p2) => {
            const scopedSelectors = p2.split(',').map(sel => `#${blockId} ${sel.trim()}`).join(', ');
            return `${p1} ${scopedSelectors} {`;
        });
    });

    contentArea.innerHTML = tempDiv.innerHTML;

    if (blockWrapper.settings.pages) {
        const pagesSetting = blockWrapper.settings.pages.toString();
        let pageNames = [];
        let numPages = 0;

        if (pagesSetting.includes(',')) {
            pageNames = pagesSetting.split(',').map(s => s.trim());
            numPages = pageNames.length;
        } else if (!isNaN(pagesSetting) && pagesSetting.trim() !== "") {
            numPages = parseInt(pagesSetting);
            for (let i = 1; i <= numPages; i++) pageNames.push(`Page ${i}`);
        } else {
            pageNames = [pagesSetting];
            numPages = 1;
        }

        const gX = blockWrapper.settings.gridx || 10;
        const gY = blockWrapper.settings.gridy || 10;

        const header = contentArea.querySelector('.tab-header');
        const pagesContainer = contentArea.querySelector('.pages-container');

        if (header && pagesContainer) {
            header.innerHTML = '';
            pagesContainer.innerHTML = '';

            for (let i = 1; i <= numPages; i++) {
                const btn = document.createElement('button');
                btn.className = `tab-btn ${i === 1 ? 'active' : ''}`;

                btn.innerText = pageNames[i - 1] || `Page ${i}`;

                const page = document.createElement('div');
                page.className = `page-wrapper nested-dropzone ${i === 1 ? 'active' : ''}`;
                page.dataset.pageIndex = i;
                page.dataset.gridx = gX;
                page.dataset.gridy = gY;

                const cellWidth = 100 / gX;
                const cellHeight = 100 / gY;
                page.style.backgroundSize = `${cellWidth}% ${cellHeight}%`;
                page.style.backgroundImage = `
                    linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                `;

                rescuedBlocks.forEach(rescue => {
                    if (rescue.pageIndex === i) {
                        page.appendChild(rescue.element);
                        if (rescue.element.settings && rescue.element.settings.pages) {
                            renderBlockFromTemplate(rescue.element);
                        }
                    }
                });

                btn.onclick = (e) => {
                    e.stopPropagation();
                    header.querySelectorAll(':scope > .tab-btn').forEach(b => b.classList.remove('active'));
                    pagesContainer.querySelectorAll(':scope > .page-wrapper').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    page.classList.add('active');

                    page.querySelectorAll(':scope > .loaded-block').forEach(child => {
                        if (child.settings && child.settings.pages) {
                            renderBlockFromTemplate(child);
                        }
                    });
                };
                header.appendChild(btn);
                pagesContainer.appendChild(page);
            }
        }
    }
}

function openSettingsModal(blockWrapper) {
    const modal = document.querySelector('#settings-modal');
    const fieldsContainer = document.querySelector('#modal-fields');
    fieldsContainer.innerHTML = '';

    Object.keys(blockWrapper.settings).forEach(key => {
        const value = blockWrapper.settings[key];

        const meta = (blockWrapper.settingsMeta && blockWrapper.settingsMeta[key])
            ? blockWrapper.settingsMeta[key]
            : { type: 'string' };

        const fieldRow = document.createElement('div');
        fieldRow.className = 'setting-row';

        const label = document.createElement('label');
        label.innerText = key.charAt(0).toUpperCase() + key.slice(1);

        const input = document.createElement('input');

        if (meta.type === 'color') {
            input.type = 'color';
            input.classList.add('color-input');
        } else if (meta.type === 'number' || meta.type === 'percentage') {
            input.type = 'number';
            if (meta.min !== undefined) input.min = meta.min;
            if (meta.max !== undefined) input.max = meta.max;
        } else {
            input.type = 'text';
        }

        if (meta.type === 'percentage') {
            input.value = value.replace('%', '');
        } else {
            input.value = value;
        }

        input.oninput = () => {
            let newValue = input.value;

            if (meta.type === 'number' || meta.type === 'percentage') {
                let num = parseInt(newValue);
                if (!isNaN(num)) {
                    if (meta.min !== undefined && num < meta.min) num = meta.min;
                    if (meta.max !== undefined && num > meta.max) num = meta.max;
                    newValue = num;
                }
            }

            if (meta.type === 'percentage') {
                newValue += '%';
            }

            blockWrapper.settings[key] = newValue;

            renderBlockFromTemplate(blockWrapper);
        };

        fieldRow.appendChild(label);
        fieldRow.appendChild(input);
        fieldsContainer.appendChild(fieldRow);
    });

    modal.style.display = 'block';
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

function OpenMenu() {
    const menu = document.getElementById("menu");
    menu.classList.add("open");
}

function CloseMenu() {
    const menu = document.getElementById("menu");
    menu.classList.remove("open");
}

async function saveWorkspace() {
    const mainContainer = document.querySelector('#maincontainer');

    const topLevelElements = mainContainer.querySelectorAll(':scope > .loaded-block');

    const blocksTree = [];
    topLevelElements.forEach(el => {
        blocksTree.push(getBlockDataRecursive(el));
    });

    const success = await ipcRenderer.invoke('save-workspace-json', blocksTree);
    if (success) {
        alert("Workspace saved successfully!");
    }
}

function getBlockDataRecursive(block) {
    const blockData = {
        id: block.id,
        left: block.style.left,
        top: block.style.top,
        width: block.style.width,
        height: block.style.height,
        zIndex: block.style.zIndex || 1,
        settings: block.settings,
        path: block.dataset.sourcePath,
        children: []
    };

    const pagesContainer = block.querySelector('.pages-container');

    if (!pagesContainer) return blockData;

    const pages = pagesContainer.querySelectorAll(':scope > .page-wrapper');

    pages.forEach(page => {
        const pageIndex = page.dataset.pageIndex;

        const childBlocks = page.querySelectorAll(':scope > .loaded-block');

        if (childBlocks.length > 0) {
            const pageGroup = {
                pageIndex: parseInt(pageIndex),
                blocks: []
            };

            childBlocks.forEach(child => {
                pageGroup.blocks.push(getBlockDataRecursive(child));
            });

            blockData.children.push(pageGroup);
        }
    });

    return blockData;
}

async function loadWorkspace() {
    const data = await ipcRenderer.invoke('load-workspace-json');
    if (!data || !Array.isArray(data)) return;

    const mainContainer = document.querySelector('#maincontainer');
    mainContainer.querySelectorAll(':scope > .loaded-block').forEach(el => el.remove());

    // Start recursive load for each top-level block
    for (const blockData of data) {
        await createBlockRecursive(blockData, mainContainer);
    }

    CloseMenu();
}

async function createBlockRecursive(blockData, parentElement) {
    try {
        const rawHtml = await fs.readFile(blockData.path, 'utf-8');
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');

        const settingsTag = doc.querySelector('settings');
        const settingsMeta = {};

        if (!blockData.settings) blockData.settings = {};

        if (settingsTag) {
            for (let attr of settingsTag.attributes) {
                const name = attr.name;
                const value = attr.value;

                if (name.startsWith('type-')) {
                    const key = name.replace('type-', '');
                    if (!settingsMeta[key]) settingsMeta[key] = {};
                    settingsMeta[key].type = value;
                } else if (name.startsWith('min-')) {
                    const key = name.replace('min-', '');
                    if (!settingsMeta[key]) settingsMeta[key] = {};
                    settingsMeta[key].min = value;
                } else if (name.startsWith('max-')) {
                    const key = name.replace('max-', '');
                    if (!settingsMeta[key]) settingsMeta[key] = {};
                    settingsMeta[key].max = value;
                } else {
                    if (blockData.settings[name] === undefined) {
                        blockData.settings[name] = value;
                    }
                }
            }
            settingsTag.remove();
        }

        const blockWrapper = document.createElement('div');
        blockWrapper.classList.add('loaded-block');
        blockWrapper.id = blockData.id;
        blockWrapper.dataset.sourcePath = blockData.path;

        Object.assign(blockWrapper.style, {
            position: 'absolute',
            left: blockData.left,
            top: blockData.top,
            width: blockData.width,
            height: blockData.height,
            zIndex: blockData.zIndex || 1
        });

        blockWrapper.settings = blockData.settings;
        blockWrapper.settingsMeta = settingsMeta;
        blockWrapper.htmlTemplate = doc.head.innerHTML + doc.body.innerHTML;

        // --- EDITOR UI ELEMENTS ---
        const moveHandle = document.createElement('div');
        moveHandle.classList.add('move-handle');
        moveHandle.innerHTML = '☩';
        moveHandle.draggable = true;
        blockWrapper.appendChild(moveHandle);

        const settingsBtn = document.createElement('div');
        settingsBtn.classList.add('settings-button');
        settingsBtn.innerHTML = '⚙';
        blockWrapper.appendChild(settingsBtn);

        const resizeHandle = document.createElement('div');
        resizeHandle.classList.add('resize-handle');
        blockWrapper.appendChild(resizeHandle);

        const contentArea = document.createElement('div');
        contentArea.classList.add('block-content-area');
        contentArea.style.height = '100%';
        blockWrapper.appendChild(contentArea);

        const deleteBtn = document.createElement('div');
        deleteBtn.classList.add('delete-button');
        deleteBtn.innerHTML = '🗑';
        blockWrapper.appendChild(deleteBtn);

        renderBlockFromTemplate(blockWrapper);

        addSelectionListeners(blockWrapper);
        addWorkspaceDragListeners(blockWrapper, blockWrapper.querySelector('.move-handle'));
        addResizeListeners(blockWrapper, blockWrapper.querySelector('.resize-handle'));
        addDeleteFunctionality(blockWrapper, blockWrapper.querySelector('.delete-button'));

        settingsBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openSettingsModal(blockWrapper);
        });

        if (blockData.children && blockData.children.length > 0) {
            const pagesContainer = blockWrapper.querySelector('.pages-container');

            if (pagesContainer) {
                for (const pageGroup of blockData.children) {
                    const targetPage = pagesContainer.querySelector(`:scope > .page-wrapper[data-page-index="${pageGroup.pageIndex}"]`);

                    if (targetPage) {
                        for (const childBlockData of pageGroup.blocks) {
                            await createBlockRecursive(childBlockData, targetPage);
                        }
                    }
                }
            }
        }

        parentElement.appendChild(blockWrapper);

    } catch (error) {
        console.error(`Failed to reload block:`, error);
    }
}

function addDeleteFunctionality(blockWrapper, deleteBtn) {
    deleteBtn.addEventListener('mousedown', (e) => e.stopPropagation());

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        const modal = document.querySelector('#delete-modal');
        modal.style.display = 'flex';

        blockToDelete = blockWrapper;
    });
}

function initModalListeners() {
    const modal = document.querySelector('#delete-modal');

    document.querySelector('#modal-cancel').onclick = () => {
        modal.style.display = 'none';
        blockToDelete = null;
    };

    document.querySelector('#modal-confirm').onclick = () => {
        if (blockToDelete) {
            blockToDelete.style.transition = "all 0.15s ease";
            blockToDelete.style.opacity = "0";
            blockToDelete.style.transform = "scale(0.95)";

            const target = blockToDelete;
            setTimeout(() => target.remove(), 150);
        }
        modal.style.display = 'none';
        blockToDelete = null;
    };
}