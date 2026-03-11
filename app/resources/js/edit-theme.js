document.addEventListener("DOMContentLoaded", function () {
    document.getElementById('edit-theme-btn').addEventListener('click', () => {
        ipcRenderer.send('open-theme-editor', false);
    });
    document.getElementById('new-theme-btn').addEventListener('click', () => {
        ipcRenderer.send('open-theme-editor', true);
    });
});