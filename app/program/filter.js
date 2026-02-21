const fs = require('fs');
module.exports = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return false;
        }
        const htmlContent = fs.readFileSync(filePath, 'utf8').toLowerCase();

        if (htmlContent.includes('<script') ||
            htmlContent.includes('<svg') ||
            htmlContent.includes('<iframe') ||
            htmlContent.includes('<object') ||
            htmlContent.includes('<embed')) {
            return true;
        }

        if (htmlContent.includes('javascript:') ||
            htmlContent.includes('expression(') ||
            /\son[a-z]+=/i.test(htmlContent)) {
            return true;
        }

        if (htmlContent.includes('url(')) {
            return true;
        }

        return false;
    } catch (error) {
        console.error(`Error during security check for ${filePath}: ${error.message}`);
        // If we can't read the file for some reason, we assume it's unsafe or broken.
        return true;
    }
}