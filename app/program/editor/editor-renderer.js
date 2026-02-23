const { ipcRenderer } = require('electron');
const Block = require('../models/block.js');

document.addEventListener('DOMContentLoaded', () => {
    console.log("Renderer loaded")

    GetBlocks();
});

async function GetBlocks() {
    const blocksconstainer = document.getElementById("blocksconstainer");

    const blocksRaw = await ipcRenderer.invoke('get-blocks'); // gets an array with the blocks in format: { "name", "type", "path", "children" } childeren == repeatable forever
    const blocks = blocksRaw.map(item => {
        return new Block(item.name, item.type, item.path, item.children);
    });

    console.log(blocks);

    blocksconstainer.innerHTML = blocks;
}