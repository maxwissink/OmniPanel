document.addEventListener("DOMContentLoaded", function () {
    document.getElementById('edit-panel-btn').addEventListener('click', () => {
        ipcRenderer.send('open-panel-editor', false);
    });
    document.getElementById('new-panel-btn').addEventListener('click', () => {
        ipcRenderer.send('open-panel-editor', true);
    });
});