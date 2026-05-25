const messageTemplates = require('./messageTemplates');
const random  = require('./random');
const combatHandler = require('./combatHandler');
const speechHandler = require('./speechHandler');

module.exports = {
    colors: require('./colors'),
    ...messageTemplates,
    ...random,
    ...combatHandler,
    ...speechHandler,
};