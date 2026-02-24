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
    console.log("Renderer loaded");

    GetBlocks();

    const mainContainer = document.querySelector('#maincontainer');

    mainContainer.addEventListener('dragover', (event) => {
        event.preventDefault(); // important
        event.dataTransfer.dropEffect = 'copy';
    });

    mainContainer.addEventListener('drop', async (event) => {
        event.preventDefault(); // important

        const action = event.dataTransfer.getData('action');
        const rect = mainContainer.getBoundingClientRect();

        if (action === 'move' && window.draggedElement) {
            // --- LOGIC FOR MOVING EXISTING BLOCK ---
            const offset = JSON.parse(event.dataTransfer.getData('offset'));

            const rawX = event.clientX - rect.left - offset.x;
            const rawY = event.clientY - rect.top - offset.y;

            window.draggedElement.style.left = `${Math.round(rawX / 64) * 64}px`;
            window.draggedElement.style.top = `${Math.round(rawY / 64) * 64}px`;

        } else {

            const filePath = event.dataTransfer.getData('text/plain');
            const blockName = event.dataTransfer.getData('block-name');

            if (filePath && filePath.endsWith('.html')) {
                try {
                    const htmlContent = await fs.readFile(filePath, 'utf-8');
                    const blockWrapper = document.createElement('div');

                    blockWrapper.classList.add('loaded-block');
                    blockWrapper.draggable = true;
                    blockWrapper.style.position = 'absolute';

                    const rect = mainContainer.getBoundingClientRect();
                    blockWrapper.style.left = `${Math.round((event.clientX - rect.left) / 64) * 64}px`;
                    blockWrapper.style.top = `${Math.round((event.clientY - rect.top) / 64) * 64}px`;

                    blockWrapper.innerHTML = htmlContent;

                    addWorkspaceDragListeners(blockWrapper);

                    mainContainer.appendChild(blockWrapper);

                    CloseMenu();

                } catch (error) {
                    console.error("Failed to load the HTML file:", error);
                }
            }
        }
    });
}

function addWorkspaceDragListeners(el) {
    el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('action', 'move');

        const rect = el.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        e.dataTransfer.setData('offset', JSON.stringify({ x: offsetX, y: offsetY }));
        
        window.draggedElement = el;

        el.style.opacity = '0.5';
        document.getElementById('trash-zone').classList.add('visible');
    });

    el.addEventListener('dragend', (e) => {
        document.getElementById('trash-zone').classList.remove('visible');
        el.style.opacity = '1';
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

function OpenMenu() {
    const menu = document.getElementById("menu");
    menu.classList.add("open");
}

function CloseMenu() {
    const menu = document.getElementById("menu");
    menu.classList.remove("open");
}
