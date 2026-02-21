const fs = require('fs');
const https = require('https');
const path = require('path');
const extract = require('extract-zip');

const downloadUrl = 'https://github.com/maxwissink/OmniPanel/releases/download/Python-env/python-env.zip';
const zipName = 'python-env.zip';

const zipPath = path.join(__dirname, '..', zipName);
const targetDir = path.join(__dirname, '..');

console.log(`Downloading Python environment...`);
const file = fs.createWriteStream(zipPath);

https.get(downloadUrl, (response) => {
    // Handle redirects (GitHub uses redirects for releases)
    if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, handleDownload);
    } else {
        handleDownload(response);
    }
}).on('error', (err) => {
    console.error('Download failed:', err.message);
});

function handleDownload(res) {
    res.pipe(file);
    file.on('finish', async () => {
        file.close();
        console.log('Download complete. Extracting...');
        
        try {
            await extract(zipPath, { dir: targetDir });
            console.log('Extraction complete! Cleaning up zip file...');
            fs.unlinkSync(zipPath);
        } catch (err) {
            console.error('Extraction failed:', err);
        }
    });
}