const fs = require('fs');
module.exports = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            // If the file doesn't exist, we can't check it, so let the main loader handle the 'not found' error.
            return false;
        }
        const htmlContent = fs.readFileSync(filePath, 'utf8').toLowerCase();

        // 1. Check for the opening <script tag and high-risk tags
        if (htmlContent.includes('<script') ||
            htmlContent.includes('<svg') ||
            htmlContent.includes('<iframe') ||
            htmlContent.includes('<object') ||
            htmlContent.includes('<embed')) {
            return true;
        }

        // 2. High-Risk Attributes (Event Handlers and Pseudo-Protocols)
        if (htmlContent.includes('javascript:') ||
            htmlContent.includes('expression(') || // Catches legacy IE attack
            /\son[a-z]+=/i.test(htmlContent)) {    // Catches onclick, onerror, etc.
            return true;
        }

        // 3. High-Risk Network Request Vectors (CSS Injection)
        // Check for "url(" in the content, which covers @import, background-image, etc.
        if (htmlContent.includes('url(')) {
            // You may want to relax this if your theme legitimately needs images, 
            // but for maximum security, blocking external URLs is key.
            return true;
        }

        return false;
    } catch (error) {
        console.error(`Error during security check for ${filePath}: ${error.message}`);
        // If we can't read the file for some reason, we assume it's unsafe or broken.
        return true;
    }
}