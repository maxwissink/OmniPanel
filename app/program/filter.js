const fs = require('fs');
module.exports = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            // If the file doesn't exist, we can't check it, so let the main loader handle the 'not found' error.
            return false; 
        }
        
        // Read the first chunk (e.g., 1MB) of the file to check for script tags.
        // Reading the whole file is safest, but we'll stick to a simple read for speed.
        const htmlContent = fs.readFileSync(filePath, 'utf8');

        // Check for the opening <script tag. We ignore closing tags and comments 
        // because the goal is to be highly conservative.
        // Using a simple case-insensitive string check is fast and strict.
        if (htmlContent.toLowerCase().includes('<script')) {
            return true;
        }

        // Optional: Check for 'on...' attributes like 'onclick' 
        // This is highly recommended as a secondary check.
        const dangerousAttrRegex = /\s(on[a-z]+)=["']/i;
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