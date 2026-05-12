const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { randomInt, shuffle } = require('../../utils/random')
const colors = require('../../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('week')
        .setDescription('Randomized speaking order of all members of the server, optional: stipulate the last speaker.')
        .addUserOption((option) => option.setName('last').setDescription('Sets the last speaker.')),
    async execute(interaction) {
        await interaction.deferReply();

        const lastUser = interaction.options.getMember('last');
        const last = lastUser && !lastUser.user.bot ? await interaction.guild.members.fetch(lastUser.id) : null;

        await interaction.guild.members.fetch();
        const members = interaction.guild.members.cache;

        const array = Array.from(members.values()).filter(member => !member.user.bot && (!last || member.id != last.id));

        const shuffled = shuffle(array);
        if (last)
            shuffled.push(last);

        const msgsForFirst = ['First!', 'This means you\'re cool!', 'You gotta begin...', 'A big responsibility', 'No pressure, of course.'];
        const msgsForMiddle = ['Could be worse, could be better...', 'Well...', 'Kinda cool, if you think about it', 'Not first, not last, just kinda _there_', 'I guess?', 'Happens to the best of us.', 'That\'s okay.']
        const msgsForChoosenLast = ['_Predictable._', 'Someone wanted you to speak last...', 'No pressure though.'];
        const msgsForRandomLast = ['Last, but hopefully not least', 'Is this lucky or unlucky?', 'Hopefully you have tea...', 'Is anyone still paying attention?'];
        const msgsChoosenByInteracter = ['You\'re exactly where you want to be.', 'This is what you wanted?', 'Can\'t keep it up to chance, huh?', 'Gotta control the narrative, after all.'];

        const embeds = shuffled.map((member, index) => {
            let msgFooter = 'Interesting.';
            if (index == 0)
                msgFooter = msgsForFirst[randomInt(0, msgsForFirst.length - 1)];
            else if (index == shuffled.length - 1) {
                if (last) {
                    if (interaction.user.id == member.user.id)
                        msgFooter = msgsChoosenByInteracter[randomInt(0,msgsChoosenByInteracter.length-1)];
                    else
                        msgFooter = msgsForChoosenLast[randomInt(0, msgsForChoosenLast.length - 1)];
                } else
                    msgFooter = msgsForRandomLast[randomInt(0, msgsForRandomLast.length - 1)];
            } else
                msgFooter = msgsForMiddle[randomInt(0, msgsForMiddle.length - 1)];


            return new EmbedBuilder()
                .setColor(colors.utility)
                .setTitle(`${index + 1}. ${member.displayName ?? 'unknown'}`)
                .setDescription(`> ${msgFooter}`)
                .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        });

        const CHUNK_SIZE = 5; // limited by discord to max 10

        for (let i = 0; i < embeds.length; i += CHUNK_SIZE) {
            const chunk = embeds.slice(i, i + CHUNK_SIZE);

            if (i == 0)
                await interaction.editReply({ embeds: chunk });
            else
                await interaction.followUp({ embeds: chunk });
        }
    },
};