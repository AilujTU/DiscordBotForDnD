const messageTemplates = require('./messageTemplates');
const random  = require('./random');
const combatHandler = require('./combatHandler');

module.exports = {
    colors: require('./colors'),
    ...messageTemplates,
    ...random,
    ...combatHandler,
};