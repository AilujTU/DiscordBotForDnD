const { EmbedBuilder } = require('discord.js');
const { minecraftServerAdress } = require('../config.json');
const colors = require('./colors');

async function handleActivePlayerList(interaction) {
    await interaction.deferReply()
    const server = await checkMinecraftServerStatus(interaction.client);
    const status = server.online? '**Online** 🟢 ' : (server.error? '**Unavailable** ⚠️ ' : '**Offline** 🔴 ');

    let description = 'Something went wrong while looking up the active players.';
    if (server.online) {
        description = server.playersOnline > 0? server.players.map(player => `- ${player}`).join('\n') : '> No players active currently.';
    } else {
        description = server.error? '> The current server status couldn\'t be retrieved.' : '> The server is currently offline.';
    }
    

    const embed = new EmbedBuilder()
        .setTitle('🎮 Minecraft Server')
        .addFields({
            name: `${status} · Active Players 👥 · (${server.playersOnline}/${server.playersMax})`,
            value: description
        })
        .setColor(colors.mc_server)
        .setTimestamp();

    return await interaction.editReply({
        embeds: [embed]
        }   
    );
}

async function checkMinecraftServerStatus() {
    if (!minecraftServerAdress) {
        console.error('No minecraft server address defined')
        return null;
    }
    
    const response = await fetch('https://api.mcstatus.io/v2/status/java/'.concat(minecraftServerAdress));

    if (!response.ok) {
        console.error('Failed to check Minecraft server:', new Error(`HTTP ${response.status}`));

        return {
            online: false,
            error: true
        }
    } 

    const data = await response.json();

    if (!data.online) {
        return {
            online: false
        };
    }

    return {
        online: true,
        playersOnline: data.players.online,
        playersMax: data.players.max,
        players: data.players.list.map(player => player.name_clean),
        version: data.version.name_clean
    };    
}

let savedPresenceName = null;

async function updateMinecraftPresence(client) {
    const server = await checkMinecraftServerStatus();
    console.log(server); //TODO: Delete if working correctly

    let presenceName;
    if (!server.online) {
        const symbol = server.error? "⚠️" : "🔴";
        presenceName = `Minecraft Server ${symbol}`;
    } else {
        const symbol = server.playersOnline === 0? "⚪" : "🟢";
        presenceName = `Minecraft Server ${symbol} (${server.playersOnline}/${server.playersMax})`;
    }

    if (presenceName === savedPresenceName) {
        return;
    } else {
        client.user.setPresence({
            activities: [
                {
                    name: presenceName,
                    type: 0
                }
            ],
            status: server.online? "online" : "idle"
        });
        savedPresenceName = presenceName;
    }
}

module.exports = {
    handleActivePlayerList,
    updateMinecraftPresence
}