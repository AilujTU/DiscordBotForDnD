const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { handleSpeechTrackerBegin, handleSpeechTrackerStats } = require('../../utils');

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
                )
                .addBooleanOption(option =>
                    option
                        .setName('end')
                        .setDescription('End observation until added again.')
                )
        ),
    async execute(interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'begin':
                return handleSpeechTrackerBegin(interaction);
            case 'stats':
                return handleSpeechTrackerStats(interaction);
        }
    }
};