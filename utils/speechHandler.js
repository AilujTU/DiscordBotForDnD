const db = require('../db/knex');
const { EmbedBuilder, MessageFlags, ChannelFlags, ChannelType, Message } = require('discord.js');
const colors = require('./colors');
const { joinVoiceChannel, entersState, VoiceConnectionStatus, } = require('@discordjs/voice');

const activeTrackers = new Map();

async function handleSpeechTrackerBegin(interaction) {
    const channel = interaction.options.getChannel('channel');
    const isKept = interaction.options.getBoolean('keep') ?? false;

    if (!(channel.isVoiceBased())) {
        return await interaction.reply({
            content: `The channel ${channel.name} is not a voice channel, please select one and try again.`,
            flags: MessageFlags.Ephemeral
        });
    }

    if (activeTrackers.has(channel.id)) {
        return await interaction.reply({
            content: `The channel ${channel.name} is already being observed.`,
            flags: MessageFlags.Ephemeral
        });
    }

    const connection = addBotToChannel(channel);

    activeTrackers.set(channel.id, {
        connection,
        speakingUsers: new Map(),
        stats: new Map(),
        startedAt: Date.now(),
    });


    const tracker = activeTrackers.get(channel.id);

    connection.receiver.speaking.on('start', async userId => {
        if (tracker.speakingUsers.has(userId))
            return;

        tracker.speakingUsers.set(userId, Date.now());
        console.log(`${userId} started speaking.`);
    });

    connection.receiver.speaking.on('end', async userId => {
        const started = tracker.speakingUsers.get(userId);

        if (!started)
            return;

        const duration = Date.now() - started;
        tracker.speakingUsers.delete(userId);

        const current = tracker.stats.get(userId) ?? 0;

        tracker.stats.set(userId, current + duration);
        console.log(`${userId} spoke for ${duration}ms.`);
    });

    if (isKept) {
        const hasChannelEntry = await db('trackedChannel')
            .where({
                channel_id: channel.id,
            }).first();

        if (!hasChannelEntry) {
            await db('trackedChannel')
                .insert({
                    channel_id: channel.id,
                    active: true,
                    keep: true,
                    msg_id: null,
                });
        } else {
            await db('trackedChannel')
                .where({
                    id: hasChannelEntry.id
                })
                .update({
                    active: true,
                    keep: true
                });
        }
    }

    return await interaction.reply({
        content: `
            Now observing ${channel.name}.\n
            Presistent tracking: ${isKept ? 'enabled' : 'disabled'}
        `,
        flags: MessageFlags.Ephemeral
    });
}

function addBotToChannel(channel) {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`Connected to ${channel.name}`);
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        console.log(`Disconnected to ${channel.name}`);
    });

    return connection;
}

async function handleSpeechTrackerStats(interaction) {
    const channel = interaction.options.getChannel('channel');
    const isEnded = interaction.options.getBoolean('end') ?? false;

    if (!channel.isVoiceBased()) {
        return await interaction.reply({
            content: `The channel ${channel.name} is not a voice channel.`,
            flags: MessageFlags.Ephemeral
        });
    }

    const tracker = activeTrackers.get(channel.id);

    if (!tracker) {
        return await interaction.reply({
            content: `The channel ${channel.name} is currently not being observed.`,
            flags: MessageFlags.Ephemeral
        });
    }

    for (const [userId, startedAt] of tracker.speakingUsers) {
        const duration = Date.now() - startedAt;
        const currentTalkTime = tracker.stats.get(userId) ?? 0;
        tracker.stats.set(userId, currentTalkTime + duration);
    }

    tracker.speakingUsers.clear();

    const totalSessionTime = Date.now() - tracker.startedAt;
    const totalSecs = Math.floor(totalSessionTime/1000);
    const totalMins = Math.floor(totalSecs/60);
    const totalRemainingSecs = totalSecs % 60;
    const totalSessionTimeMsg = `${totalMins}m ${totalRemainingSecs}s\n`;

    const sortedStats = [...tracker.stats.entries()]
        .sort((a, b) => b[1] - a[1]);

    const description = await Promise.all(
        sortedStats.map(async ([userId, talkTime], index) => {

            let memberName = `Unknown User (${userId})`;

            try {
                const member = await interaction.guild.members.fetch(userId);

                memberName = member.displayName;
            } catch (_) { }

            const secs = Math.floor(talkTime / 1000);
            const mins = Math.floor(secs / 60);
            const remainingSecs = secs % 60;

            const percentage = totalSessionTime > 0 ? ((talkTime / totalSessionTime) * 100).toFixed(1) : 0;

            return (
                `**${index + 1}. ${memberName}**\n` +
                `**Time Spoken:** ${mins}m ${remainingSecs}s\n` +
                `**Participation:** ${percentage}%`
            );
        })
    );

    const embed = new EmbedBuilder()
        .setTitle(`Speech Statistics`)
        .setDescription(description.length > 0 ? description.join('\n\n') : 'No speaking activity recorded.'
        )
        .addFields({
            name: 'Channel',
            value: `${channel.name}`,
            inline: true,
        })
        .addFields({
            name: 'Session Length',
            value: totalSessionTimeMsg,
            inline: true,
        })
        .setTimestamp();

    if (isEnded) {
        try {
            tracker.connection.destroy();
        } catch (_) { }

        activeTrackers.delete(channel.id);

        await db('trackedChannel')
            .where({
                channel_id: channel.id
            })
            .update({
                active: false
            });

        embed.setFooter({
            text: 'Tracking ended',
        });
        embed.setColor(colors.combat_inactive);
    } else {
        embed.setFooter({
            text: 'Tracking active',
        });
        embed.setColor(colors.combat_active);
    }

    return await interaction.reply({
        embeds: [embed]
    });
}

module.exports = {
    handleSpeechTrackerBegin,
    handleSpeechTrackerStats,
};