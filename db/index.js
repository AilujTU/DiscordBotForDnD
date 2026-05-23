const db = require('./knex');

module.exports = {
    db,
    combat: db('combat'),
    combatant: db('combatant'),
    trackedChannels: db('trackedChannels'),
};