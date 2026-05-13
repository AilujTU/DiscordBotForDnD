const crypto = require('crypto');

function rollDice(max, option = {}) {
    const {
        mod = 0,
    } = option;

    const roll = crypto.randomInt(1,max+1);
    const total = roll + mod;


    return {
        max,
        roll,
        mod,
        total,
        crit: roll == max,
        fail: roll == 1,
    };
}

function randomInt(min,max) {
    return crypto.randomInt(min,max+1);
}

// fisher-yates-shuffle
function shuffle(array) {
    for (let i = array.length -1; i > 0; i--) {
        let j = crypto.randomInt(i,array.length);

        [array[i],array[j]] = [array[j],array[i]];
    }

    return array;
}

module.exports = {
    rollDice,
    shuffle,
    randomInt,
};