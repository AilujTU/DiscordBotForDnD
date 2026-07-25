const db = require('../db/knex');
const { MessageFlags, AttachmentBuilder } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const { buildMemberStatsCard, buildSpeechTallyCardForMember, buildSpeechTallyBoardCard, formatDuration } = require('./cardBuilder');

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
        startedAt: Date.now(),
        lastSessionPosition: new Map(),
        lastSessionPercentage: new Map(),
        lastTallyPosition: new Map(),
        lastTallyPercentage: new Map(),
    });

    const tracker = activeTrackers.get(channel.id);

    const rows = await db('trackedMember')
        .where({
            channel_id: channel.id,
            guild_id: channel.guild.id
        })
        .select('member_id', 'this_session_position', 'this_session_percentage');

    for (const row of rows) {
        tracker.lastSessionPosition.set(
            row.member_id,
            Number(row.this_session_position ?? 0)
        );

        tracker.lastSessionPercentage.set(
            row.member_id,
            Number(row.this_session_percentage ?? 0)
        );
    }

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

async function buildSpeechTallyBoard(guild, channel, tracker, isEnded = false) {
    const totalSessionTime = Date.now() - tracker.startedAt;

    const stats = getStatsSnapshot(tracker);

    const sortedStats = [...stats.entries()]
        .sort((a, b) => b[1] - a[1]);

    const tallyCards = [];

    for (const [index, [userId, talkTime]] of sortedStats.entries()) {
        let member;

        try {
            member = await guild.members.fetch(userId);
        } catch {
            continue;
        }

        const totalTalkTime = [...stats.values()].reduce((a, b) => a + b, 0);
        const percentage = totalSessionTime > 0 ? Number(((talkTime / totalTalkTime) * 100).toFixed(1)) : 0;

        const currentPosition = index + 1;

        const previousPosition = tracker.lastTallyPosition.get(userId)
            ?? tracker.lastSessionPosition.get(userId)
            ?? currentPosition;

        const previousPercentage = tracker.lastTallyPercentage.get(userId)
            ?? tracker.lastSessionPercentage.get(userId)
            ?? percentage;

        let positionDelta = 0;
        let percentageDelta = 0;

        if (tracker.lastTallyPosition.has(userId) || tracker.lastTallyPercentage.has(userId)) {
            positionDelta = previousPosition - currentPosition;
            percentageDelta = percentage - previousPercentage;
        }

        const card = await buildSpeechTallyCardForMember({
            avatar: member.displayAvatarURL({ extension: "png" }),
            username: member.displayName,
            position: currentPosition,
            positionDelta: positionDelta,
            percentage: percentage,
            percentageDelta: percentageDelta,
            timeSpoken: talkTime
        });

        tallyCards.push(card);

        tracker.lastTallyPosition.set(userId, currentPosition);
        tracker.lastTallyPercentage.set(userId, percentage);
    }

    const board = await buildSpeechTallyBoardCard({
        title: 'Speech Participation Statistics',
        channelName: channel.name,
        sessionLength: formatDuration(totalSessionTime),
        cards: tallyCards,
    });

    return {
        attachment: new AttachmentBuilder(board, { name: 'speech-tally-board.png' })
    };
}

async function stopTracking(channel) {
    const channelId = channel.id;
    const tracker = activeTrackers.get(channelId);
    if (!tracker)
        return;

    await updateStatsInStorage(channel);

    tracker.connection.destroy();
    activeTrackers.delete(channelId);

    const isPresistentChannel = await db('trackedChannel')
        .select('keep')
        .where({
            channel_id: channelId
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

    const tracker = activeTrackers.get(channel.id);

    if (!tracker) {
        return await interaction.reply({
            content: `The channel ${channel.name} is currently not being observed.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.deferReply({ content: 'Searching for the truth...' });
    const { attachment } = await buildSpeechTallyBoard(interaction.guild, channel, tracker, isEnded);

    if (isEnded) {
        finalizeTracker(tracker);
        await stopTracking(channel);
    }

    return await interaction.editReply({
        files: [attachment]
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

async function updateStatsInStorage(channel) {
    const channelId = channel.id;
    const guildId = channel.guild.id;
    const tracker = activeTrackers.get(channelId);
    if (!tracker)
        return;

    const totalSessionTime = Date.now() - tracker.startedAt;
    const stats = getStatsSnapshot(tracker);
    const sortedStats = [...stats.entries()]
        .sort((a, b) => b[1] - a[1]);
    console.log(`sortedStats: ${sortedStats}`);
    const totalTalkTime = [...stats.values()]
        .reduce((a, b) => a + b, 0);
    console.log(`total talk time: ${totalTalkTime}`);
    const month = new Date(tracker.startedAt).getMonth() + 1;
    console.log(`Month: ${month}`);
    console.log('reached updateStatsInStorage, right before loop');

    // iterate over all members that have stats
    for (const [i, [memberId, talkTime]] of sortedStats.entries()) {
        // update table trackedMember
        console.log(`Talk time: ${talkTime}`);
        const percentage = totalSessionTime > 0 ? Number(((talkTime / totalTalkTime) * 100).toFixed(1)) : 0;


        console.log(`Percentage of member with id: ${memberId} is ${percentage}%`);
        await updateTrackedMemberTable(guildId, channelId, memberId, percentage, talkTime, i + 1);

        const trackedMember = await db('trackedMember')
            .where({
                member_id: memberId,
                channel_id: channelId,
                guild_id: guildId
            }).first();

        // update table speechPlacementStats
        await updateSpeechPlacementStats(trackedMember.id, i + 1);

        // update table speechYearlyStats   
        await updateSpeechYearlyStats(trackedMember.id, month, percentage, trackedMember.session_count - 1);

        // update session data
        await updateSessionData(trackedMember.id, talkTime, totalSessionTime);
    }

}

async function updateTrackedMemberTable(guildId, channelId, memberId, percentage, duration, position) {
    const userEntryExists = await db('trackedMember')
        .where({
            member_id: memberId,
            channel_id: channelId,
            guild_id: guildId,
        })
        .first();

    if (userEntryExists) {
        const allTimePercent = (Number(userEntryExists.all_time_percentage ?? 0) * Number(userEntryExists.session_count ?? 0) + percentage) / (Number(userEntryExists.session_count ?? 0) + 1);

        await db('trackedMember')
            .where({ id: userEntryExists.id })
            .update({
                session_count: userEntryExists.session_count + 1,
                last_session_position: userEntryExists.this_session_position,
                this_session_position: position,
                last_session_percentage: userEntryExists.this_session_percentage,
                this_session_percentage: percentage,
                all_time_percentage: allTimePercent,
                all_time_duration: userEntryExists.all_time_duration + duration
            });

    } else {
        await db('trackedMember').insert({
            member_id: memberId,
            channel_id: channelId,
            guild_id: guildId,
            session_count: 1,
            last_session_position: position,
            this_session_position: position,
            last_session_percentage: percentage,
            this_session_percentage: percentage,
            all_time_percentage: percentage,
            all_time_duration: duration
        });
    }
}

async function updateSpeechPlacementStats(id, position) {
    const entryExists = await db('speechPlacementStat')
        .where({
            trackedMember_id: id,
            position: position
        }).first();

    if (entryExists) {
        await db('speechPlacementStat')
            .where({
                id: entryExists.id
            })
            .update({
                count: entryExists.count + 1
            });
    } else {
        await db('speechPlacementStat').insert({
            trackedMember_id: id,
            position: position,
            count: 1
        });
    }
}

async function updateSpeechYearlyStats(id, month, percentage, session_count) {
    const entryExists = await db('speechYearlyStat')
        .where({
            trackedMember_id: id,
            month: month
        }).first();

    if (entryExists) {
        const averagePercentage = (entryExists.percentage * session_count + percentage) / (session_count + 1);

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

async function updateSessionData(id, duration, total) {
    await db('sessionData').insert({
        trackedMember_id: id,
        talkDuration: duration,
        totalDuration: total
    });
}

async function handleMemberStats(interaction) {
    const member = interaction.options.getMember('user');
    const channel = interaction.options.getChannel('channel');
    const guild = interaction.guild;

    let trackedMemberExists;

    trackedMemberExists = await db('trackedMember')
        .where({
            member_id: member.id,
            channel_id: channel.id,
            guild_id: guild.id
        }).first();

    if (!trackedMemberExists) {
        return await interaction.reply({
            content: `The member ${member.name} has no previously observed speaking participation in channel ${channel.name}.`,
            flags: MessageFlags.Ephemeral
        });
    }
    await interaction.deferReply({ content: 'Searching for the truth...' });
    const attachment = await buildMemberStatsCard(await computeStatisticsForChannel(member, trackedMemberExists.id));

    return await interaction.editReply({ files: [attachment] });
}

async function computeStatisticsForChannel(member, id) {

    const entryOfMember = await db('trackedMember')
        .where({ id: id }).first();

    if (!entryOfMember)
        return;

    const sessionCount = entryOfMember.session_count;
    const lastPosition = entryOfMember.last_session_position;
    const currentPosition = entryOfMember.this_session_position;
    const positionDelta = currentPosition - lastPosition;
    const lastSession = entryOfMember.last_session_percentage;
    const currentSession = entryOfMember.this_session_percentage;
    const sessionDelta = currentSession - lastSession;
    const allTime = entryOfMember.all_time_percentage;
    const totalDuration = entryOfMember.all_time_duration;

    //calculate avg pos
    const rowsInPlacement = await db('speechPlacementStat')
        .where({ trackedMember_id: id })
        .select('position', 'count');

    let totalWeightedPos = 0;
    let totalCount = 0;
    for (const row of rowsInPlacement) {
        totalWeightedPos += Number(row.position) * Number(row.count);
        totalCount += Number(row.count);
    }

    const averagePosition = totalCount > 0 ? totalWeightedPos / totalCount : 0;

    // format placement statistics
    let placements = [];
    for (let i = 0; i < rowsInPlacement.length; i++) {
        placements[i] = { position: rowsInPlacement[i].position, count: rowsInPlacement[i].count }
    }

    // format yearly statistics
    const rowsInYearly = await db('speechYearlyStat')
        .where({ trackedMember_id: id })
        .select('month', 'percentage')
        .orderBy('month', 'asc');
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthly = Array.from({ length: 12 }, (_, index) => ({
        month: m[index],
        percentage: 0
    }));

    for (const row of rowsInYearly) {
        const mIndex = Number(row.month) - 1;
        if (Number.isInteger(mIndex) && mIndex >= 0 && mIndex < monthly.length) {
            monthly[mIndex] = { month: m[mIndex], percentage: row.percentage };
        }
    }

    const avg = monthly.reduce((s, m) => s + m.percentage, 0) / monthly.length;
    const variance = monthly.reduce((s, m) => s + Math.pow(m.percentage - avg, 2), 0) / monthly.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - stdDev * 2);

    // format session data
    const rowsInSessionData = await db('sessionData')
        .where({ trackedMember_id: id })
        .select('id', 'talkDuration', 'totalDuration')
        .orderBy('id', 'asc');

    let sessionData = [];

    for (let i = 0; i < rowsInSessionData.length; i++) {
        sessionData[i] = { talkDuration: rowsInSessionData[i].talkDuration, totalDuration: rowsInSessionData[i].totalDuration };
    }

    return {
        username: member.displayName,
        avatar: member.displayAvatarURL({ extension: 'jpg' }),
        currentPosition,
        positionDelta,
        currentSession,
        sessionDelta,
        allTime,
        totalDuration,
        averagePosition,
        placements,
        monthly,
        consistency,
        sessionData
    };
}

module.exports = {
    handleSpeechTrackerTrack,
    handleSpeechTrackerTally,
    handleSpeechTrackerBreak,
    handleMemberStats,
    activeTrackers,
    finalizeTracker,
    buildSpeechTallyBoard,
    stopTracking,
    startTracking,
    restorePersistentTrackers,
};