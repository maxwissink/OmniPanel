document.addEventListener("DOMContentLoaded", function () {
    const { ipcRenderer } = require('electron');
    const enterFullscreen = document.getElementById('enter-fullscreen');
    const exitFullscreen = document.getElementById('exit-fullscreen');


    enterFullscreen.addEventListener('click', async () => {        
        ipcRenderer.send('enter-fullscreen');
    });

    exitFullscreen.addEventListener('click', async () => {        
        ipcRenderer.send('exit-fullscreen');
    });
});