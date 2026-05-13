const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {rollDice, createMessageForRolls, colors} = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('d100')
        .setDescription('Rolls a d100, optionally with a modifier.')
        .addNumberOption((option) => option.setName('mod').setDescription('The modifier to add to the result.'))
        .addStringOption((option) => option
            .setName('type')
            .setDescription('Normal, advantage or disadvantage.')
            .addChoices(
                { name: 'normal', value: 'normal' },
                { name: 'adv', value: 'advantage' },
                { name: 'dis', value: 'disadvantage' }
            )
        ),
    async execute(interaction) {

        const result = rollDice(100, {
            mod: interaction.options.getNumber('mod') ?? 0,
            type: interaction.options.getString('type') ?? 'normal',
        });

        const embed = new EmbedBuilder()
            .setColor(result.crit ? colors.crit : colors.roll)
            .setDescription(createMessageForRolls(result))
            .setFooter({
                text: `Rolled by ${interaction.member?.displayName || interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        if (result.crit)
            embed.setTitle('CRITICAL :boom:');

        await interaction.reply({
            embeds: [embed]
        });
    }
}