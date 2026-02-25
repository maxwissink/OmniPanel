const { ipcRenderer } = require('electron');
const Block = require('../models/block.js');
const fs = require('fs').promises;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Renderer loaded")

    //GetBlocks();
    BuildEditorArea();
    buildTrashcan();

    window.addEventListener('dragend', () => {
        document.getElementById('trash-zone').classList.remove('visible');
    });
});

async function GetBlocks() {
    const blocksconstainer = document.getElementById("blocksconstainer");

    const blocksRaw = await ipcRenderer.invoke('get-blocks'); // gets an array with the blocks in format: { "name", "type", "path", "children" } childeren == repeatable forever
    const blocks = blocksRaw.map(item => {
        return new Block(item.name, item.type, item.path, item.children);
    });

    buildHtmlTree(blocks, blocksconstainer)
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
        event.dataTransfer.dropEffect = 'copy';
    });

    mainContainer.addEventListener('drop', async (event) => {
        event.preventDefault();

        const action = event.dataTransfer.getData('action');
        const rect = mainContainer.getBoundingClientRect();

        if (action === 'move' && window.draggedElement) {
            const offset = JSON.parse(event.dataTransfer.getData('offset'));

            const xPercent = (((event.clientX - rect.left - offset.x) / rect.width) * 100);
            const yPercent = (((event.clientY - rect.top - offset.y) / rect.height) * 100);

            window.draggedElement.style.left = `${Math.round(xPercent / 10) * 10}%`;
            window.draggedElement.style.top = `${Math.round(yPercent / 20) * 20}%`;

        } else {

            const filePath = event.dataTransfer.getData('text/plain');

            if (filePath && filePath.endsWith('.html')) {
                try {
                    const htmlContent = await fs.readFile(filePath, 'utf-8');


                    const rect = mainContainer.getBoundingClientRect();

                    const xPercent = (((event.clientX - rect.left) / rect.width) * 100) - 5;
                    const yPercent = (((event.clientY - rect.top) / rect.height) * 100) - 10;

                    const blockWrapper = document.createElement('div');
                    blockWrapper.classList.add('loaded-block');
                    blockWrapper.style.position = 'absolute';
                    blockWrapper.style.width = '10%';
                    blockWrapper.style.height = '20%';
                    blockWrapper.style.left = `${Math.round(xPercent / 10) * 10}%`;
                    blockWrapper.style.top = `${Math.round(yPercent / 20) * 20}%`;

                    blockWrapper.innerHTML = htmlContent;

                    const moveHandle = document.createElement('div');
                    moveHandle.classList.add('move-handle');
                    moveHandle.innerHTML = '☩';
                    moveHandle.draggable = true;
                    blockWrapper.appendChild(moveHandle);

                    const resizeHandle = document.createElement('div');
                    resizeHandle.classList.add('resize-handle');
                    blockWrapper.appendChild(resizeHandle);

                    addSelectionListeners(blockWrapper);
                    addWorkspaceDragListeners(blockWrapper, moveHandle);
                    addResizeListeners(blockWrapper, resizeHandle);

                    mainContainer.appendChild(blockWrapper);

                    CloseMenu();

                } catch (error) {
                    console.error("Failed to load the HTML file:", error);
                }
            }
        }
    });
}

function addWorkspaceDragListeners(blockWrapper, moveHandle) {
    moveHandle.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('action', 'move');

        const rect = blockWrapper.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        e.dataTransfer.setData('offset', JSON.stringify({ x: offsetX, y: offsetY }));

        e.dataTransfer.setDragImage(blockWrapper, offsetX, offsetY);

        window.draggedElement = blockWrapper;

        document.getElementById('trash-zone').classList.add('visible');
        setTimeout(() => { blockWrapper.style.pointerEvents = 'none'; }, 0);
    });

    moveHandle.addEventListener('dragend', (e) => {
        document.getElementById('trash-zone').classList.remove('visible');
        blockWrapper.style.pointerEvents = 'all';
        window.draggedElement = null;
    });
}

function buildTrashcan() {
    const trashZone = document.getElementById('trash-zone');

    trashZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        trashZone.classList.add('drag-over');
    });

    trashZone.addEventListener('dragleave', () => {
        trashZone.classList.remove('drag-over');
    });

    trashZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        trashZone.classList.remove('drag-over');

        const action = e.dataTransfer.getData('action');

        if (action === 'move' && window.draggedElement) {
            window.draggedElement.remove();
            window.draggedElement = null;
            console.log("Block deleted successfully.");
        }
    });
}

function addSelectionListeners(blockWrapper) {
    blockWrapper.addEventListener('mousedown', (e) => {
        e.stopPropagation();

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

function addResizeListeners(blockWrapper, handle) {
    let isResizing = false;
    let startX, startY, startWidthPercent, startHeightPercent;
    const mainContainer = document.querySelector('#maincontainer');

    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();

        isResizing = true;
        blockWrapper.draggable = false;

        startX = e.clientX;
        startY = e.clientY;

        const blockRect = blockWrapper.getBoundingClientRect();
        const containerRect = mainContainer.getBoundingClientRect();

        startWidthPercent = (blockRect.width / containerRect.width) * 100;
        startHeightPercent = (blockRect.height / containerRect.height) * 100;

        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    });

    function resize(e) {
        if (!isResizing) return;

        const containerRect = mainContainer.getBoundingClientRect();

        const dxPercent = ((e.clientX - startX) / containerRect.width) * 100;
        const dyPercent = ((e.clientY - startY) / containerRect.height) * 100;

        let newWidthPercent = startWidthPercent + dxPercent;
        let newHeightPercent = startHeightPercent + dyPercent;

        let snappedWidth = Math.round(newWidthPercent / 10) * 10;
        let snappedHeight = Math.round(newHeightPercent / 20) * 20;

        snappedWidth = Math.max(10, snappedWidth);
        snappedHeight = Math.max(20, snappedHeight);

        blockWrapper.style.width = `${snappedWidth}%`;
        blockWrapper.style.height = `${snappedHeight}%`;
    }

    function stopResize() {
        if (isResizing) {
            isResizing = false;
            //blockWrapper.draggable = true;

            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }
    }
}

function OpenMenu() {
    const menu = document.getElementById("menu");
    menu.classList.add("open");
}

function CloseMenu() {
    const menu = document.getElementById("menu");
    menu.classList.remove("open");
}
