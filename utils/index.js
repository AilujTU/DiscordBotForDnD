const messageTemplates = require('./messageTemplates');
const random  = require('./random');

module.exports = {
    colors: require('./colors'),
    ...messageTemplates,
    ...random,
};