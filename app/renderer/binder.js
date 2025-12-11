// binder.js
module.exports = (api) => {
    if (!api) {
        console.error("Binder Error: API is missing or undefined!");
        return;
    }

    const buttons = document.querySelectorAll('[emulate-key]');
    console.log(`Binder found ${buttons.length} buttons`);

    buttons.forEach(button => {
        // Ensure we split the keys properly (e.g. "Ctrl+C" -> ['Ctrl', 'C'])
        const rawAttr = button.getAttribute('emulate-key');
        const keys = rawAttr.includes('+') ? rawAttr.split('+') : [rawAttr];
        
        button.addEventListener('click', () => {
            console.log("Button clicked, sending:", keys);
            api.simulateKey(keys); 
        });
    });
};