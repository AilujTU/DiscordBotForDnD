const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {rollDice} = require('../../utils/random');
const colors = require('../../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('d4')
        .setDescription('Rolls a d4, optionally with a modifier.')
        .addNumberOption((option) => option.setName('mod').setDescription('The modifier to add to the result.')),
    async execute(interaction) {
        const roll = rollDice(4);
        const isCrit = (roll == 4);
        const mod = interaction.options.getNumber('mod') ?? 0;
        const result = roll+mod;
        const msg = mod == 0 ? `**You rolled:** \`${result}\`` : `**You rolled:** \`${roll}\` **+** \`${mod}\` **=** \`${result}\``;
        

        const embed = new EmbedBuilder()
            .setColor(isCrit? colors.crit : colors.roll)
            .setTitle(isCrit? 'CRITICAL :boom:' :'D4 Roll :game_die:')
            .setDescription(msg)
            .setFooter({
                text: `Rolled by ${interaction.member?.displayName || interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
}