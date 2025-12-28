// In your events/log.js
const bridge = require('../bridge');

module.exports = function(type, data) {
    bridge.push('log-event', {
        timestamp: new Date().toLocaleTimeString(),
        type: type,
        data: data
    });
};