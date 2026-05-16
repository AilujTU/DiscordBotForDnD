const knex = require('knex');

const db = knex({
    client: 'better-sqlite3',
    connection: {
        filename: './database.sqlite'
    },
    useNullAsDefault: true,
    pool: {
        afterCreate: (conn, done) => {
            conn.pragma('foreign_keys = ON');
            done();
        }
    }
});


module.exports = db;