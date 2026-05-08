const {SlashCommandBuilder} = require('discord.js');
const {randomInt} = require('../../utils/random');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('d4')
        .setDescription('Rolls a d4, optionally with a modifier.')
        .addNumberOption((option) => option.setName('mod').setDescription('The modifier to add to the result.')),
    async execute(interaction) {
        const nr = randomInt(1,4);
        const mod = interaction.options.getNumber('mod') ?? 0;
        const result = nr+mod;
        const msg = mod == 0 ? `You rolled: ${result}` : `You rolled: ${nr} + ${mod} = ${result}`;
        await interaction.reply(msg);
    }
}