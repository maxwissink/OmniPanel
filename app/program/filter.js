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
            htmlContent.includes('<iframe')) {
            return true;
        }
        
        // 2. Check for the JavaScript pseudo-protocol (a common attack vector in <a> tags)
        if (htmlContent.includes('javascript:')) {
            return true;
        }

        // 3. Check for any 'on' event handlers (e.g., onclick, onerror)
        // We use a regex here to be more precise: ' on' followed by one or more letters
        // Using a regex on the whole string is generally safe for this one-time check.
        const dangerousAttrRegex = /\son[a-z]+=/i; 
        if (dangerousAttrRegex.test(htmlContent)) {
             return true;
        }

        return false;
    } catch (error) {
        console.error(`Error during security check for ${filePath}: ${error.message}`);
        // If we can't read the file for some reason, we assume it's unsafe or broken.
        return true; 
    }
}