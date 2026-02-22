document.addEventListener("DOMContentLoaded", function () {
    document.getElementById('edit-theme-btn').addEventListener('click', () => {
    ipcRenderer.send('open-theme-editor');
});
});