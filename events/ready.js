const { Events } = require('discord.js');
const {restorePersistentTrackers, updateMinecraftPresence} = require('../utils');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		await restorePersistentTrackers(client);
		await updateMinecraftPresence(client);
		setInterval(() => updateMinecraftPresence(client), 60_000);
	},
};