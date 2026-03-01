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
            const offset = JSON.parse(event.dataTransfer.getData('offset'));

            const mouseXInParent = event.clientX - rect.left - snapStepX;
            const mouseYInParent = event.clientY - rect.top - snapStepY;

            const finalXPixels = mouseXInParent - offset.x;
            const finalYPixels = mouseYInParent - offset.y;

            const xPercent = (finalXPixels / rect.width) * 100;
            const yPercent = (finalYPixels / rect.height) * 100;

            window.draggedElement.style.left = `${Math.round(xPercent / snapStepX) * snapStepX}%`;
            window.draggedElement.style.top = `${Math.round(yPercent / snapStepY) * snapStepY}%`;

            if (window.draggedElement.parentElement !== targetDropZone) {
                targetDropZone.appendChild(window.draggedElement);
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
                    if (settingsTag) {
                        for (let attr of settingsTag.attributes) {
                            initialSettings[attr.name] = attr.value;
                        }
                        settingsTag.remove();
                    }

                    const blockWrapper = document.createElement('div');
                    blockWrapper.classList.add('loaded-block');
                    blockWrapper.id = generateId();
                    blockWrapper.style.position = 'absolute';

                    blockWrapper.style.width = `${snapStepX * 2}%`;
                    blockWrapper.style.height = `${snapStepY * 2}%`;

                    blockWrapper.settings = initialSettings;
                    blockWrapper.htmlTemplate = doc.body.innerHTML;

                    const xPercent = (((event.clientX - rect.left) / rect.width) * 100) - (snapStepX);
                    const yPercent = (((event.clientY - rect.top) / rect.height) * 100) - (snapStepY);

                    blockWrapper.style.left = `${Math.round(xPercent / snapStepX) * snapStepX}%`;
                    blockWrapper.style.top = `${Math.round(yPercent / snapStepY) * snapStepY}%`;

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

            newWidthPct = Math.round(newWidthPct / snapStepX) * snapStepX;
            newHeightPct = Math.round(newHeightPct / snapStepY) * snapStepY;

            block.style.width = `${Math.max(snapStepX, newWidthPct)}%`;
            block.style.height = `${Math.max(snapStepY, newHeightPct)}%`;
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

    finalHtml = tempDiv.innerHTML;

    const contentArea = blockWrapper.querySelector('.block-content-area');
    if (contentArea) {
        contentArea.innerHTML = finalHtml;

        if (blockWrapper.settings.pages) {
            const numPages = parseInt(blockWrapper.settings.pages);

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
                    btn.innerText = `Page ${i}`;

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

                    btn.onclick = (e) => {
                        e.stopPropagation();
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

function openSettingsModal(blockWrapper) {
    const modal = document.getElementById('settings-modal');
    const fieldsContainer = document.getElementById('modal-fields');
    fieldsContainer.innerHTML = '';

    Object.keys(blockWrapper.settings).forEach(key => {
        const row = document.createElement('div');
        row.classList.add('setting-row');

        const label = document.createElement('label');
        label.textContent = key;

        const input = document.createElement('input');
        input.value = blockWrapper.settings[key];

        input.addEventListener('input', (e) => {
            blockWrapper.settings[key] = e.target.value;
            renderBlockFromTemplate(blockWrapper);
        });

        row.appendChild(label);
        row.appendChild(input);
        fieldsContainer.appendChild(row);
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

    const pages = block.querySelectorAll('.page-wrapper.nested-dropzone');

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

        if (doc.querySelector('settings')) doc.querySelector('settings').remove();

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

        // Render the inner HTML (Creates .page-wrapper nested-dropzones)
        renderBlockFromTemplate(blockWrapper);

        addSelectionListeners(blockWrapper);
        addWorkspaceDragListeners(blockWrapper, moveHandle);
        addResizeListeners(blockWrapper, resizeHandle);
        addDeleteFunctionality(blockWrapper, deleteBtn);


        settingsBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openSettingsModal(blockWrapper);
        });

        if (blockData.children && blockData.children.length > 0) {
            blockData.children.forEach(pageGroup => {
                // Find the specific page created by renderBlockFromTemplate
                const targetPage = blockWrapper.querySelector(`.page-wrapper[data-page-index="${pageGroup.pageIndex}"]`);

                if (targetPage) {
                    pageGroup.blocks.forEach(async (childBlockData) => {
                        await createBlockRecursive(childBlockData, targetPage);
                    });
                }
            });
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

        // Show the modal
        const modal = document.querySelector('#delete-modal');
        modal.style.display = 'flex';

        // Mark this block for deletion
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
            // Apply the fade-out we talked about
            blockToDelete.style.transition = "all 0.15s ease";
            blockToDelete.style.opacity = "0";
            blockToDelete.style.transform = "scale(0.95)";

            // Use a tiny timeout to let the animation play and signals clear
            const target = blockToDelete;
            setTimeout(() => target.remove(), 150);
        }
        modal.style.display = 'none';
        blockToDelete = null;
    };
}