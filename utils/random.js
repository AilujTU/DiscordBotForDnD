const crypto = require('crypto');

function rollDice(max, option = {}) {
    const { mod, type } = option;

    const first = crypto.randomInt(1,max+1);
    let chosen = first;
    let second = null;

    if (type != 'normal') {
        second = crypto.randomInt(1,max+1);
        chosen = type == 'advantage'? Math.max(first, second): Math.min(first, second);
    }

    const total = chosen+mod;

    return {
        max,
        first,
        second,
        chosen,
        mod,
        total,
        advantage: type == 'advantage',
        disadvantage: type == 'disadvantage',
        crit: chosen == max,
        fail: chosen == 1,
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