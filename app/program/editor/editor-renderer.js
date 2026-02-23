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

    buildHtmlTree(blocks, blocksconstainer)
}

// A helper function to build the UI recursively
function buildHtmlTree(blocksArray, parentElement) {
    // Create an unordered list for this level
    const ul = document.createElement('ul');
    ul.classList.add('block-list');

    blocksArray.forEach(block => {
        // Create a list item for the block
        const li = document.createElement('li');
        li.textContent = block.name; // Set the text

        if (block.type === 'folder') {
            li.classList.add('block-folder');
            
            // 🛑 THE RECURSION MAGIC 🛑
            // If this block has children, call THIS exact function again 
            // to build a sub-list inside this <li>
            if (block.children && block.children.length > 0) {
                buildHtmlTree(block.children, li);
            }
        } else {
            // If it's just a file, give it a different class for styling
            li.classList.add('block-file');
        }

        // Add the finished item to our list
        ul.appendChild(li);
    });

    // Attach the whole list to whatever parent was passed in
    parentElement.appendChild(ul);
}