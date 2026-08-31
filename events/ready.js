const { Events } = require('discord.js');
const {restorePersistentTrackers} = require('../utils');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		await restorePersistentTrackers(client);
	},
};