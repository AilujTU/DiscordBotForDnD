const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {handleActivePlayerList} = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Gives information of the linked minecraft server.')
        .addSubcommand(sub => 
            sub.setName('players').setDescription('Returns a list of the active players.')
        ),
    async execute(interaction) {
        return handleActivePlayerList(interaction);
    }
}