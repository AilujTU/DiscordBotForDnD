const crypto = require('crypto');

function rollDice(max) {
    return crypto.randomInt(1,max+1);
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
};