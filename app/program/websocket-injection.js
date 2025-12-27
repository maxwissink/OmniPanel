// This file lives in app/program/ and is injected into the theme
const socket = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);

socket.onopen = () => console.log("Connected to Host");

window.addEventListener('DOMContentLoaded', () => {
    // Select any element with the emulate-key attribute
    const buttons = document.querySelectorAll('[emulate-key]');
    console.log(`Binder found ${buttons.length} buttons`);

    buttons.forEach(button => {
        let rawkey = button.getAttribute('emulate-key');
        
        // Cleanup: Remove spaces just like your original version
        const key = rawkey.replace(/ /g, '');

        button.addEventListener('click', () => {
            
            
            // Construct the JSON payload
            const payload = {
                type: 'simulate-key',
                data: key
            };

            console.log("Button clicked, sending:", payload);
            
            // Send as a string
            socket.send(JSON.stringify(payload));
        });
    });
});