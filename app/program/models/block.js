class Block {
    constructor(name, type, absolutePath, children = []) {
        this.name = name;
        this.type = type; // 'folder' or 'file'
        this.path = absolutePath;
        this.children = children; // Nested Block objects if it's a folder
    }

    // Example: Check if this block contains a specific config file
    hasConfig() {
        return this.children.some(child => child.name === 'config.json');
    }

    // Example: Get only the image files from this block
    getImages() {
        const extensions = ['.png', '.jpg', '.svg'];
        return this.children.filter(child => 
            child.type === 'file' && extensions.includes(path.extname(child.name))
        );
    }
}
// prevents "module is not defined" errors in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Block;
} else {
    // explicitly attach it to window in browser
    window.Block = Block;
}