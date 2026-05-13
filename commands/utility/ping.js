const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {colors} = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Replies with pong'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Pong! 🏓')
            .setDescription('Muffelfuff is hard at work.')
            .addFields(
                {
                    name: "Latency",
                    value: `${interaction.client.ws.ping}ms`,
                    inline: true,
                },
                {
                    name: "Status",
                    value: "Online",
                    inline: true,
                }
            )
            .setColor(colors.utility)
            .setThumbnail(
                interaction.client.user.displayAvatarURL()
            )
            .setFooter({
                text: 'Muffelfuff',
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
        });
    },
};