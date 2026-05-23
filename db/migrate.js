const db = require('./knex');

async function migrate() {

    const hasCombatTable = await db.schema.hasTable('combat');

    if (!hasCombatTable) {
        await db.schema.createTable('combat', table => {
            table.increments('id').primary();
            table.string('guild_id').notNullable();
            table.string('channel_id').notNullable();
            table.integer('rounds').defaultTo(1);
            table.integer('turn').defaultTo(0);
            table.boolean('active').defaultTo(true);
            table.string('msg_id').nullable();
        });
    }

    const hasCombatantTable = await db.schema.hasTable('combatant');

    if (!hasCombatantTable) {
        await db.schema.createTable('combatant', table => {
            table.increments('id').primary();
            table.integer('combat_id').references('id').inTable('combat').onDelete('CASCADE');
            table.string('name').notNullable();
            table.integer('initiative').notNullable();
            table.boolean('is_player').defaultTo(false);
        });
    }

    const hasTrackedChannelsTable = await db.schema.hasTable('trackedChannels');

    if (!hasTrackedChannelsTable) {
        await db.schema.createTable('trackedChannel', table => {
            table.increments('id').primary();
            table.string('channel_id').notNullable();
            table.boolean('active').defaultTo(false);
            table.integer('uptime').defaultTo(0);
        });
    }

    const hasTrackedUsersTable = await db.schema.hasTable('trackedUsers');

    if (!hasTrackedUsersTable) {
        await db.schema.createTable('trackedUser', table => {
            table.increments('id').primary();
            table.integer('channel_id').references('id').inTable('trackedChannels').onDelete('CASCADE');
            table.string('user_id').notNullable();
            table.integer('talk_time').defaultTo(0);
        });
    }

    console.log('Database successfully migrated.')
    await db.destroy();
}

migrate();