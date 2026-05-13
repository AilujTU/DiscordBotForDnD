const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {colors} = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder().setName('server').setDescription('Provides information about the server.'),
    async execute(interaction) {
        const { guild } = interaction;
        const embed = new EmbedBuilder()
            .setColor(colors.utility)
            .setTitle('Server Information')
            .addFields(
                {
                    name: 'Server Name',
                    value: guild.name,
                    inline: false,
                },
                {
                    name: 'Member Count',
                    value: `${guild.memberCount}`,
                    inline: false,
                },
                {
                    name: 'Server ID',
                    value: guild.id,
                    inline: false,
                },
                {
                    name: 'Owner',
                    value: `@${guild.ownerId}`,
                    inline: false,
                },
                {
                    name: 'Created',
                    value: `<t:${parseInt(guild.createdTimestamp / 1000)}:R>`,
                    inline: false,
                },
            )
            .setFooter({
                text: `Requested by ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();
        await interaction.reply({
            embeds: [embed],
        });
    },
};