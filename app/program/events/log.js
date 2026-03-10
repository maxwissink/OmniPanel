const bridge = require('../bridge');

module.exports = function(type, data) {
    let displayData = data;

    if (typeof data === 'object' && data !== null) {
        displayData = Object.entries(data)
            .map(([key, val]) => {
                const hasChildren = val !== null && typeof val === 'object' && Object.keys(val).length > 0;
                const childString = hasChildren 
                    ? Object.entries(val).map(([k, v]) => `${k} ${v}`).join(' ') 
                    : val;

                return `${key}: ${childString}`;
            })
            .join(', ');
    }

    bridge.push('log-event', {
        timestamp: new Date().toLocaleTimeString(),
        type: type,
        data: displayData
    });
};