const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { handleSpeechTrackerTrack, handleSpeechTrackerTally, handleSpeechTrackerBreak, handleMemberStats } = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('speech')
        .setDescription('Tracks the participation in a given voice channel.')
        .addSubcommand(sub =>
            sub.setName('track').setDescription('Begins the tracking of given voice channel.')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to be observed.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                )
                .addBooleanOption(option =>
                    option
                        .setName('keep')
                        .setDescription('This channel will always be observed.')
                )
        )
        .addSubcommand(sub =>
            sub.setName('tally').setDescription('Returns the current tally for the given channel.')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel of which the statistics should be shared.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                )
                .addBooleanOption(option =>
                    option
                        .setName('end')
                        .setDescription('End observation until added again.')
                )
        )
        .addSubcommand(sub => 
            sub.setName('break').setDescription('Change to a not persistent observation')
                .addChannelOption(option => 
                    option
                        .setName('channel')
                        .setDescription('The channel that shouldn\'t be persistently observered anylonger.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                )
        )
        .addSubcommand(sub => 
            sub.setName('stats').setDescription('Individual stats for the specified user.')
                .addUserOption(option => 
                    option
                        .setName('user')
                        .setDescription('The user you want stats for.')
                        .setRequired(true)
                )
                .addChannelOption(option => 
                    option
                        .setName('channel')
                        .setDescription('The specific channel for the speech participation stats.')
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                )
        ),
    async execute(interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'track':
                return handleSpeechTrackerTrack(interaction);
            case 'tally':
                return handleSpeechTrackerTally(interaction);
            case 'break':
                return handleSpeechTrackerBreak(interaction);
            case 'stats':
                return handleMemberStats(interaction);
        }
    }
};  