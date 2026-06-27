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

    const hasTrackedChannelTable = await db.schema.hasTable('trackedChannel');

    if (!hasTrackedChannelTable) {
        await db.schema.createTable('trackedChannel', table => {
            table.increments('id').primary();
            table.string('channel_id').notNullable();
            table.boolean('active').defaultTo(false);
            table.boolean('keep').defaultTo(false);
        });
    }

    const hasTrackedMemberTable = await db.schema.hasTable('trackedMember');

    if (!hasTrackedMemberTable) {
        await db.schema.createTable('trackedMember', table => {
            table.increments('id').primary();
            table.string('member_id').notNullable();
            table.string('channel_id').notNullable();
            table.double('last_session_percentage');
            table.double('all_time_percentage');
        });
    }

    const hasSpeechPlacementStatTable = await db.schema.hasTable('speechPlacementStat');

    if (!hasSpeechPlacementStatTable) {
        await db.schema.createTable('speechPlacementStat', table => {
            table.increments('id').primary();
            table.integer('tracked_member_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('trackedMember')
                .onDelete('CASCADE');
            table.integer('position').notNullable();
            table.integer('count').notNullable().defaultTo(0);
        });
    }

    const hasSpeechYearlyStatTable = await db.schema.hasTable('speechYearlyStat');

    if (!hasSpeechPlacementStatTable) {
        await db.schema.createTable('speechYearlyStat', table => {
            table.increments('id').primary();
            table.integer('trackedMember_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('trackedMember');
            table.string('month');
            table.double('percentage').notNullable().defaultTo(0);
        });
    }

    console.log('Database successfully migrated.');
    await db.destroy();
}

migrate();