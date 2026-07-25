const db = require('./knex');

module.exports = {
    db,
    combat: db('combat'),
    combatant: db('combatant'),
    trackedChannels: db('trackedChannel'),
    trackedMembers: db('trackedMember'),
    speechPlacementStat: db('speechPlacementStat'),
    speechYearlyStat: db('speechYearlyStat'),
};