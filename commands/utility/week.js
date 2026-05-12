const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {shuffle} = require('../../utils/random')
const colors = require('../../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('week')
        .setDescription('Randomized speaking order of all members of the server, optional: stipulate the last speaker.')
        .addUserOption((option) => option.setName('last').setDescription('Sets the last speaker.')),
    async execute(interaction) {
        await interaction.deferReply();
        
        const lastUser = interaction.options.getMember('last');
        const last = lastUser ? await interaction.guild.members.fetch(lastUser.id) : null;

        await interaction.guild.members.fetch();
        const members = interaction.guild.members.cache;

        const array = Array.from(members.values()).filter(member => !member.user.bot && (!last || member.id != last.id));
                
        const shuffled = shuffle(array);
        if (last)
            shuffled.push(last);

        const embeds = shuffled.map((member, index) => {
            return new EmbedBuilder()
                .setColor(colors.utility)
                .setDescription(`# ${index+1}. ${member.displayName ?? 'unknown'}`)
                .setThumbnail(member.user.displayAvatarURL({size:256}))
        });
        
        const CHUNK_SIZE = 5; // limited by discord to max 10

        for (let i = 0; i < embeds.length; i+=CHUNK_SIZE) {
            const chunk= embeds.slice(i,i+CHUNK_SIZE);

            if (i==0)
                await interaction.editReply({embeds:chunk});
            else
                await interaction.followUp({embeds:chunk});
        }
    },
};