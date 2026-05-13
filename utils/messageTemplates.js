function createMessageForRolls(result, roller ='You') {

    if (result.advantage || result.disadvantage) {
        const rollWithType = result.advantage? 'with advantage' : 'with disadvantage';

        if (result.mod != 0) {
            return `
                **${roller} rolled ${rollWithType}:** \n
                :game_die: \`${result.chosen}\` **+** \`${result.mod}\` **=** \`${result.total}\` \n
                > **All rolls:** \`${result.first}\`**,** \`${result.second}\`
            `;
        }

        return `
            :game_die: **${roller} rolled ${rollWithType}:** \`${result.total}\` \n
            > **All rolls:** \`${result.first}\`**,** \`${result.second}\`
        `;
    }

    if (result.mod != 0) {
        return `
            **${roller} rolled:** \n
            :game_die: \`${result.chosen}\` **+** \`${result.mod}\` **=** \`${result.total}\`
        `;
    }

    return `
        :game_die: **${roller} rolled:** \`${result.total}\`
    `;
}


module.exports ={
    createMessageForRolls
}