const db = require('../db/knex');
const { EmbedBuilder, MessageFlags, ChannelFlags, ChannelType, Message } = require('discord.js');
const colors = require('./colors');
const { joinVoiceChannel, entersState, VoiceConnectionStatus, } = require('@discordjs/voice');

const activeTrackers = new Map();

async function handleSpeechTrackerTrack(interaction) {
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
                    keep: isKept
                });
        } else {
            await db('trackedChannel')
                .where({
                    id: hasChannelEntry.id
                })
                .update({
                    active: true,
                    keep: isKept
                });
        }
    }

    await startTracking(channel, isKept);

    return await interaction.reply({
        content:
            `Now observing ${channel.name}.\n` +
            `Presistent tracking: ${isKept ? 'enabled' : 'disabled'}`
        ,
        flags: MessageFlags.Ephemeral
    });
}

async function startTracking(channel) {

    if (activeTrackers.has(channel.id))
        return activeTrackers.get(channel.id);

    const connection = await addBotToChannel(channel);

    activeTrackers.set(channel.id, {
        connection,
        speakingUsers: new Map(),
        stats: new Map(),
        startedAt: Date.now()
    });

    const tracker = activeTrackers.get(channel.id);

    connection.receiver.speaking.on('start', async userId => {
        if (tracker.speakingUsers.has(userId))
            return;

        tracker.speakingUsers.set(userId, Date.now());
        console.log(`${userId} started speaking.`); // TODO: delete once working & tested
    });

    connection.receiver.speaking.on('end', async userId => {
        const started = tracker.speakingUsers.get(userId);

        if (!started)
            return;

        const duration = Date.now() - started;
        tracker.speakingUsers.delete(userId);

        const current = tracker.stats.get(userId) ?? 0;

        tracker.stats.set(userId, current + duration);
        console.log(`${userId} spoke for ${duration}ms.`); // TODO: delete once working & tested
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
        console.log(`Connected to ${channel.name}`); // TODO: delete once working & tested
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        console.log(`Disconnected from ${channel.name}`); // TODO: delete once working & tested
    });

    return connection;
}

function finalizeTracker(tracker) {
    for (const [userId, startedAt] of tracker.speakingUsers) {
        const duration = Date.now() - startedAt;
        const currentTalkTime = tracker.stats.get(userId) ?? 0;
        tracker.stats.set(userId, currentTalkTime + duration);
    }

    tracker.speakingUsers.clear();
}

function getStatsSnapshot(tracker) {
    const snapshot = new Map(tracker.stats);

    for (const [userId, startedAt] of tracker.speakingUsers) {
        const duration = Date.now() - startedAt;
        const currentTalkTime = tracker.stats.get(userId) ?? 0;
        snapshot.set(userId, currentTalkTime + duration);
    }

    return snapshot;
}

async function buildSpeechStatsEmbed(guild, channel, tracker, isEnded = false) {
    const totalSessionTime = Date.now() - tracker.startedAt;
    const totalSecs = Math.floor(totalSessionTime / 1000);
    const totalMins = Math.floor(totalSecs / 60);
    const totalRemainingSecs = totalSecs % 60;
    const totalSessionTimeMsg = `${totalMins}m ${totalRemainingSecs}s\n`;

    const stats = getStatsSnapshot(tracker);

    const sortedStats = [...stats.entries()]
        .sort((a, b) => b[1] - a[1]);

    const description = await Promise.all(
        sortedStats.map(async ([userId, talkTime], index) => {

            let memberName = `Unknown User (${userId})`;

            try {
                const member = await guild.members.fetch(userId);

                memberName = member.displayName;
            } catch (_) { }

            const secs = Math.floor(talkTime / 1000);
            const mins = Math.floor(secs / 60);
            const remainingSecs = secs % 60;
            const hrs = Math.floor(mins / 60);
            const remainingMins = hrs == 0 ? -1 : mins % 60;


            const totalTalkTime = [...stats.values()].reduce((a, b) => a + b, 0);
            const percentage = totalSessionTime > 0 ? ((talkTime / totalTalkTime) * 100).toFixed(1) : 0;

            if (remainingMins == -1) {
                return (
                    `**${index + 1}. ${memberName}**\n` +
                    `**Time Spoken:** ${mins}m ${remainingSecs}s\n` +
                    `**Participation:** ${percentage}%`
                );
            } else {
                return (
                    `**${index + 1}. ${memberName}**\n` +
                    `**Time Spoken:** ${hrs}h ${remainingMins}m ${remainingSecs}s\n` +
                    `**Participation:** ${percentage}%`
                );
            }

        })
    );

    const embed = new EmbedBuilder()
        .setTitle(`Speech Participation Statistics`)
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
        embed.setFooter({ text: 'Tracking finished' });
        embed.setColor(colors.combat_inactive);
    } else {
        embed.setFooter({ text: 'Tracking active' });
        embed.setColor(colors.combat_active);
    }

    return embed;
}

async function stopTracking(channelId) {
    const tracker = activeTrackers.get(channelId);
    if (!tracker)
        return;

    await updateStatsInStorage(channelId);

    tracker.connection.destroy();
    activeTrackers.delete(channelId);

    const isPresistentChannel = await db('trackedChannel')
        .select('keep')
        .where({
            channel_Id: channelId
        }).first();

    if (isPresistentChannel) {
        await db('trackedChannel')
            .where({
                channel_id: channelId
            })
            .update({
                active: false
            });
    }
}

async function handleSpeechTrackerTally(interaction) {
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

    const embed = await buildSpeechStatsEmbed(interaction.guild, channel, tracker, isEnded);

    if (isEnded) {
        finalizeTracker(tracker);
        await stopTracking(channel.id);
    }

    return await interaction.reply({
        embeds: [embed]
    });
}

async function handleSpeechTrackerBreak(interaction) {
    const channel = interaction.options.getChannel('channel');

    const isPresistentChannel = await db('trackedChannel')
        .where({
            channel_id: channel.id
        }).first();

    if (!isPresistentChannel) {
        return await interaction.reply({
            content: `The channel ${channel.name} is not persistently observed.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await db('trackedChannel')
        .where({
            channel_id: channel.id
        })
        .del();

    return await interaction.reply({
        content: `The channel ${channel.name} is not being persistently observed any longer.`
    })
}

async function restorePersistentTrackers(client) {
    const persistenChannels = await db('trackedChannel')
        .where({ keep: true })
        .select('channel_id');

    for (const { channel_id: channelId } of persistenChannels) {
        if (activeTrackers.has(channelId))
            continue;

        let channel;

        try {
            channel = await client.channels.fetch(channelId);
        } catch {
            continue;
        }

        if (!channel?.isVoiceBased)
            continue;

        const humanMembers = channel.members.filter(m => !m.user.bot);

        if (humanMembers.size === 0)
            continue;

        await startTracking(channel, true);
        await db('trackedChannel')
            .where({ channel_id: channelId })
            .update({ active: true });

        console.log(`Restored persistent tracking for ${channel.name}`);
    }

}

//FIXME: activeTrackers needs guildId too to be unique
async function updateStatsInStorage(channelId) {
    const tracker = activeTrackers.get(channelId);
    if (!tracker)
        return;

    const totalSessionTime = Date.now() - tracker.startedAt;
    const stats = [...getStatsSnapshot(tracker).entries()]
        .sort((a, b) => b[1] - a[1]);
    const totalTalkTime = [...stats.values()]
        .reduce((a, b) => a + b, 0);
    const month = new Date(tracker.startedAt).getMonth() + 1;

    // iterate over all members that have stats
    for (const [i, [memberId, duration]] of stats.entries()) {
        // update table trackedMember
        const percentage = totalSessionTime > 0 ? ((duration / totalTalkTime) * 100).toFixed(1) : 0;
        await updateTrackedMemberTable(channelId, memberId, percentage);

        const trackedMember = await db('trackedMember')
            .where({
                channel_id: channelId,
                member_id: memberId
            }).first();

        // update table speechPlacementStats
        await updateSpeechPlacementStats(trackedMember.id,i+1);

        // update table speechYearlyStats   
        await updateSpeechYearlyStats(trackedMember.id, month, percentage);
    }

}

async function updateTrackedMemberTable(guildId, memberId, percentage) {
    const userEntryExists = await db('trackedMember')
        .where({
            guild_id: channelId,
            member_id: memberId
        })
        .first();

    if (userEntryExists) {
        const allTime = (percentage + userEntryExists.all_time_percentage) / 2;

        await db('trackedMember')
            .where({ id: userEntryExists.id })
            .update({
                last_session_percentage: userEntryExists.this_session_percentage,
                this_session_percentage: percentage,
                all_time_percentage: allTime
            });
        
    } else {
        await db('trackedMember').insert({
            guild_id: guildId,
            member_id: memberId,
            last_session_percentage: null,
            this_session_percentage: percentage,
            all_time_percentage: percentage
        });
    }
}

async function updateSpeechPlacementStats(id, position) {
    const entryExists = await db('speechPlacementStat')
        .where({
            trackedMember_id:id,
            position: position
        }).first();

    if (entryExists) {
        await db('speechPlacementStat')
            .where({
                id: entryExists.id
            })
            .update({
                count: entryExists.count+1
            });
    } else {
        await db('speechPlacementStat').insert({
            trackedMember_id: id,
            position: position,
            count: 1
        });
    }
}

async function updateSpeechYearlyStats(id,month, percentage) {
    const entryExists = await db('speechYearlyStat')
        .where({
            trackedMember_id:id,
            month: month
        }).first();

    if (entryExists) {
        const averagePercentage = (percentage + entryExists.percentage) / 2;

        await db('speechYearlyStat')
            .where({
                trackedMember_id: id,
                month: month
            })
            .update({
                percentage: averagePercentage
            });
    } else {
        await db('speechYearlyStat').insert({
            trackedMember_id: id,
            month: month,
            percentage: percentage
        });
    }
}

async function handleMemberStats(interaction) {
    const member = interaction.options.getMember('user');
    const guild = interaction.guild;

    const statsOfMember = await db('trackedMember')
        .where({member_id})
}

module.exports = {
    handleSpeechTrackerTrack,
    handleSpeechTrackerTally,
    handleSpeechTrackerBreak,
    handleMemberStats,
    activeTrackers,
    finalizeTracker,
    buildSpeechStatsEmbed,
    stopTracking,
    startTracking,
    restorePersistentTrackers,
};