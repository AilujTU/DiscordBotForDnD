const db = require('../db/knex');
const { EmbedBuilder, MessageFlags, flatten, ChannelFlags, ChannelType } = require('discord.js');
const colors = require('./colors');

async function handleSpeechTrackerBegin(interaction) {
    const channel = interaction.options.getChannel('channel');
    const isKept = interaction.options.getBoolean('keep') ?? false;

    // TODO: #0 check: is voice channel?

    // TODO: #1 add bot to voice channel

    // TODO: #2 add channel as being tracked in trackedChannel table

    // TODO: #3 add users in voice channel to trackedUser table

    // TODO: #4 track voice participation

    // TODO: #5 update uptime & voice participtation in table trackedChannel & trackedUser
}

function addBotToChannel(channel) {

}

function addChannelToTrackList(channel) {

}

function removeChannelFromTrackList(channel) {

}

function buildSpeechStatsEmbed(interaction) {

}

async function handleSpeechTrackerStats(interaction) {
    const channel = interaction.options.getChannel('channel');
    const isEnded = interaction.options.getBoolean('end') ?? false;

    // TODO: #0 check: is voice channel, bot added & in tracked channel?

    // TODO: #1 get uptime & user voice participation

    // TODO: #2 check: isEnded? then remove channel from tracked channels (cascade delete users aswell)

    // TODO: #3 check: msg_id != null? edit embed (changing color to inactive if isEnded), otherwise create stats embed

    // TODO: #4 send embed as response
}

module.exports = {
    handleSpeechTrackerBegin,
    handleSpeechTrackerStats,
};