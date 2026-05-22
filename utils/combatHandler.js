const db = require('../db/knex');
const { EmbedBuilder, MessageFlags, flatten } = require('discord.js');
const colors = require('./colors');

function buildCombatEmbed(combat, combatants, currentTurnIndex, round, color, title = 'Combat Tracker') {
    const current = combatants[currentTurnIndex] ?? null;

    const combatList = combatants.length
        ? combatants
            .map((c, index) => {
                const marker = index === currentTurnIndex
                    ? ':point_right:'
                    : ':small_blue_diamond:';

                const type = c.is_player ? ':green_square: ' : ':red_square:';

                return `${marker} **${c.name}** ${type} (\`${c.initiative}\`)`;
            })
            .join('\n\n')
        : '*No combatants added yet.*';

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .addFields(
            {
                name: 'Round',
                value: `${round}`,
                inline: true
            },
            {
                name: 'Current Turn',
                value: current ? current.name : 'Not Started',
                inline: true
            }
        )
        .setDescription(combatList)
        .setFooter({
            text: `Combat ID: ${combat.id}`
        });

    return embed;
}

async function fetchCombatMessage(interaction, combat) {
    const channel = await interaction.client.channels.fetch(combat.channel_id);
    return await channel.messages.fetch(combat.msg_id);
}

async function handleCombatBegin(interaction) {
    const combatExists = await db('combat')
        .where({
            guild_id: interaction.guild.id,
            channel_id: interaction.channel.id,
            active: true
        }).first();

    if (combatExists) {
        return interaction.reply({
            content: 'Combat is already active in this channel.',
            flags: MessageFlags.Ephemeral
        });
    }

    const [combat_id] = await db('combat').insert({
        guild_id: interaction.guild.id,
        channel_id: interaction.channel.id,
        rounds: 1,
        turn: 0,
        active: true
    });

    const combat = await db('combat')
        .where({ id: combat_id })
        .first();

    const embed = buildCombatEmbed(combat, [], 0, 1, colors.combat_active);

    const msg = await interaction.reply({
        embeds: [embed],
        fetchReply: true
    });

    await db('combat').where({ id: combat_id }).update({ msg_id: msg.id });
}

async function handleCombatNext(interaction) {
    const combat = await db('combat')
        .where({
            guild_id: interaction.guild.id,
            channel_id: interaction.channel.id,
            active: true,
        }).first();

    if (!combat) {
        return interaction.reply({
            content: 'No active combat in this channel.',
            flags: MessageFlags.Ephemeral
        });
    }

    const combatants = await db('combatant')
        .where({ combat_id: combat.id })
        .orderBy([
            { column: 'initiative', order: 'desc' },
            { column: 'id', order: 'asc' }
        ]);

    if (!combatants.length) {
        return interaction.reply({
            content: 'No combatants have been added.',
            flags: MessageFlags.Ephemeral
        });
    }

    let nextTurn = combat.turn + 1;
    let nextRound = combat.rounds;

    if (nextTurn >= combatants.length) {
        nextTurn = 0;
        nextRound++;
    }

    await db('combat')
        .where({ id: combat.id })
        .update({
            turn: nextTurn,
            rounds: nextRound
        });

    const embed = buildCombatEmbed(combat, combatants, nextTurn, nextRound, colors.combat_active);

    try {
        const msg = await fetchCombatMessage(interaction, combat);

        await msg.edit({
            embeds: [embed]
        });

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `Turn advanced to **${combatants[nextTurn].name}**`,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error(error);
        return interaction.reply({
            content: 'Couldn\'t update the combat message.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleCombatAdd(interaction) {
    const combat = await db('combat')
        .where({
            guild_id: interaction.guild.id,
            channel_id: interaction.channel.id,
            active: true,
        }).first();

    if (!combat) {
        return interaction.reply({
            content: 'No active combat in this channel.',
            flags: MessageFlags.Ephemeral
        });
    }

    const name = interaction.options.getString('name');
    const initiative = interaction.options.getInteger('initiative');
    const isPlayer = interaction.options.getBoolean('is_player') ?? false;

    await db('combatant').insert({
        combat_id: combat.id,
        name,
        initiative,
        is_player: isPlayer
    });

    const combatants = await db('combatant')
        .where({ combat_id: combat.id })
        .orderBy([
            { column: 'initiative', order: 'desc' },
            { column: 'id', order: 'asc' }
        ]);

    const embed = buildCombatEmbed(combat, combatants, combat.turn, combat.rounds, colors.combat_active);

    try {
        const msg = await fetchCombatMessage(interaction, combat);

        await msg.edit({
            embeds: [embed]
        });

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `Added **${name}** to combat`,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error(error);
        return interaction.reply({
            content: 'Couldn\'t update the combat message.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleCombatRemove(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const combat = await db('combat')
            .where({
                guild_id: interaction.guild.id,
                channel_id: interaction.channel.id,
                active: true,
            })
            .first();

        if (!combat) {
            return interaction.editReply('No active combat in this channel.');
        }

        const name = interaction.options.getString('name');

        const combatant = await db('combatant')
            .where({ combat_id: combat.id })
            .andWhere('name', 'like', name)
            .first();

        if (!combatant) {
            return interaction.editReply(`No combatant found with name: ${name}`);
        }

        await db('combatant')
            .where({ id: combatant.id })
            .del();

        const combatants = await db('combatant')
            .where({ combat_id: combat.id })
            .orderBy([
                { column: 'initiative', order: 'desc' },
                { column: 'id', order: 'asc' }
            ]);

        let currentTurn = combat.turn;

        if (combatants.length === 0) {
            currentTurn = 0;
        } else if (currentTurn >= combatants.length) {
            currentTurn = 0;

            await db('combat')
                .where({ id: combat.id })
                .update({ turn: 0 });
        }

        const embed = buildCombatEmbed(combat, combatants, currentTurn, combat.rounds, colors.combat_active);

        try {
            const msg = await fetchCombatMessage(interaction, combat);

            await msg.edit({
                embeds: [embed]
            });
        } catch (err) {
            console.error('Failed to update combat message:', err);
        }

        return interaction.editReply(
            `**${combatant.name}** has been removed.`
        );

    } catch (error) {
        console.error(error);

        if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({
                content: "Something went wrong.",
                flags: MessageFlags.Ephemeral
            });
        }

        return interaction.editReply("Something went wrong.");
    }
}

async function handleCombatEnd(interaction) {
    const combat = await db('combat')
        .where({
            guild_id: interaction.guild.id,
            channel_id: interaction.channel.id,
            active: true,
        }).first();

    if (!combat) {
        return interaction.reply({
            content: 'No active combat in this channel.',
            flags: MessageFlags.Ephemeral
        });
    }

    const combatants = await db('combatant')
        .where({ combat_id: combat.id })
        .orderBy([
            { column: 'initiative', order: 'desc' },
            { column: 'id', order: 'asc' }
        ]);

    const embed = buildCombatEmbed(combat, combatants, combat.turn, combat.rounds, colors.combat_inactive, 'Combat Ended :checkered_flag:')

    await db('combat')
        .where({ id: combat.id })
        .del();

    try {
        const msg = await fetchCombatMessage(interaction, combat);

        await msg.edit({
            embeds: [embed]
        });

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `Combat finished.`,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error(error);
        return interaction.reply({
            content: 'Couldn\'t update the combat message.',
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = {
    handleCombatBegin,
    handleCombatNext,
    handleCombatAdd,
    handleCombatRemove,
    handleCombatEnd,
}