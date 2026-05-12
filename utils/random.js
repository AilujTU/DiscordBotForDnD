const crypto = require('crypto');

function rollDice(max) {
    return crypto.randomInt(1,max+1);
}

module.exports = {
    rollDice,
};