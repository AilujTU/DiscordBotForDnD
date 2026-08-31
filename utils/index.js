const messageTemplates = require('./messageTemplates');
const random  = require('./random');
const combatHandler = require('./combatHandler');
const speechHandler = require('./speechHandler');
const minecraftServerHandler = require('./minecraftServerHandler');

module.exports = {
    colors: require('./colors'),
    ...messageTemplates,
    ...random,
    ...combatHandler,
    ...speechHandler,
    ...minecraftServerHandler,
};