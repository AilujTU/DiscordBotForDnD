const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { handleSpeechTrackerBegin, handleSpeechTrackerStats, handleSpeechTrackerEnd } = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('observe')
        .setDescription('Tracks the participation in a given voice channel.')
        .addSubcommand(sub =>
            sub.setName('begin').setDescription('Begins the tracking of given voice channel.')
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
            sub.setName('stats').setDescription('Returns the statistics for the given channel.')
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
            sub.setName('end').setDescription('Change to an not presistent observation')
                .addChannelOption(option => 
                    option
                        .setName('channel')
                        .setDescription('The channel that shouldn\'t be presistently observered anylonger.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                )
        ),
    async execute(interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'begin':
                return handleSpeechTrackerBegin(interaction);
            case 'stats':
                return handleSpeechTrackerStats(interaction);
            case 'end':
                return handleSpeechTrackerEnd(interaction);
        }
    }
};