const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {handleCombatBegin, handleCombatNext, handleCombatAdd, handleCombatEnd, rollDice, createMessageForRolls, colors} = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('combat')
        .setDescription('Keeps track of combat turn order.')
        .addSubcommand(sub => 
            sub.setName('begin').setDescription('Begins combat tracking.')
        )
        .addSubcommand(sub => 
            sub.setName('next').setDescription('Advances to the next turn.')
        )
        .addSubcommand(sub => 
            sub.setName('add').setDescription('Adds someone to combat.')
            .addStringOption( option => 
                option
                    .setName('name')
                    .setDescription('Combatant name')
                    .setRequired(true)
            )
            .addIntegerOption( option => 
                option
                    .setName('initiative')
                    .setDescription('Initiative Roll')
                    .setRequired(true)
            )
            .addBooleanOption( option => 
                option
                    .setName('is_player')
                    .setDescription('Is this a player?')
            )
        )
        .addSubcommand(sub => 
            sub.setName('remove').setDescription('Removes a combatant')
                .addStringOption(option => 
                    option
                        .setName('name')
                        .setDescription('Name of the combatant.')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub => 
            sub.setName('end').setDescription('Ends combat.')
        ),
    async execute(interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'begin': 
                return handleCombatBegin(interaction);
            case 'next': 
                return handleCombatNext(interaction);
            case 'add':
                return handleCombatAdd(interaction);
            case 'end':
                return handleCombatEnd(interaction);
        }
    }
}