const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {colors} = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder().setName('user').setDescription('Provides information about the user.'),
    async execute(interaction) {
        const member = interaction.member;
        const user = interaction.user;

        const embed = new EmbedBuilder()
            .setColor(colors.utility)
            .setTitle('User Information')
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                {
                    name: 'User name',
                    value: user.tag,
                    inline: true,
                },
                {
                    name: 'User ID',
                    value: user.id,
                    inline: true,
                },
                {
                    name: 'Account Created',
                    value: `<t:${parseInt(user.createdTimestamp / 1000)}:R>`,
                    inline: true,
                },
                {
                    name: 'Joined Server',
                    value: `<t:${parseInt(member.joinedTimestamp / 1000)}:R>`,
                    inline: true,
                },
            )
            .setFooter({
                text: `Requested by ${user.username}`,
                iconURL: user.displayAvatarURL(),
            })
            .setTimestamp();
        
        await interaction.reply({
            embeds: [embed],
        });
    },
};