const bridge = require('../bridge');

module.exports = function(type, data) {
    let displayData = data;

    if (typeof data === 'object' && data !== null) {
        displayData = Object.entries(data)
            .map(([key, val]) => `${key}: ${Object.keys(val).length > 0 ? `x: ${val.x} y: ${val.y}` : val }`)
            .join(', ');
    }
    bridge.push('log-event', {
        timestamp: new Date().toLocaleTimeString(),
        type: type,
        data: displayData
    });
};