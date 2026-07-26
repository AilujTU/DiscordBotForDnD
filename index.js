const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('better-sqlite3');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags, Partials, AttachmentBuilder, Attachment } = require('discord.js');
const { token } = require('./config.json');
const db = require('./db/knex');
const { activeTrackers, finalizeTracker, stopTracking, buildSpeechTallyBoard, startTracking } = require('./utils');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
	partials: [Partials.Message, Partials.Channel,],
});

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.on('messageDelete', async message => {
	if (!message.guild)
		return;

	try {

		const combat = await db('combat')
			.where({
				msg_id: message.id
			})
			.first();

		if (!combat)
			return;

		await db('combat')
			.where({ id: combat.id })
			.delete();

		console.log(`Deleted combat ${combat.id} because message was deleted.`);
	} catch (err) {
		console.error(err);
	}

	try {
		if (message.partial) {
			await message.fetch();
		}

		const combat = await db('combat')
			.where({ msg_id: message.id })
			.first();

		if (!combat)
			return;

		await db('combat')
			.where({ id: combat.id })
			.delete();

		console.log(`Combat ${combat.id} deleted.`);
	} catch (err) {
		console.error(err);
	}
});

async function exportSeesionDataCsv(guild) {
	const rows = await db('sessionData as sd')
		.leftJoin('trackedMember as tm', 'sd.trackedMember_id', 'tm.id')
		.select('tm.member_id','sd.talkDuration', 'sd.totalDuration');
	
	const lines = ['member,talkDuration,totalDuration'];

	for (const row of rows) {
		let memberName = row. member_id || 'unknown';

		try {
			const member = await guild.members.fetch(row.member_id);
			memberName = member.displayName;
		} catch {}

		const escape = value => `${String(value ?? '').replace(/"/g,'""')}`;

		lines.push(`${escape(memberName)}, ${escape(row.talkDuration)},${escape(row.totalDuration)}`);

	}

	const filePath = path.join(__dirname, 'sessionData.csv');
	fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
	return filePath;
}

client.on('voiceStateUpdate', async (oldState, newState) => {
	const channel = oldState.channel;
	if (!channel)
		return;

	const channelIsEmpty = channel.members.filter(m => !m.user.bot).size === 0;

	const tracker = activeTrackers.get(channel.id);
	if (!tracker)
		return;


	if (channelIsEmpty) {
		console.log(`${channel.name} is empty.`); // TODO: delete once working & tested

		finalizeTracker(tracker);

		const {attachment} = await buildSpeechTallyBoard(channel.guild, channel, tracker);

		await stopTracking(channel);

		const csvPath = await exportSeesionDataCsv(channel.guild);

		await channel.send({
			files: [
				attachment,
				new AttachmentBuilder(csvPath, {name: 'sessionData.csv'})
			]
		});
	}
});

client.on('voiceStateUpdate', async (oldState, newState) => {
	if (!newState.channel)
		return;
	if (newState.member.user.bot)
		return;

	const channel = newState.channel;
	if (activeTrackers.has(channel.id))
		return;

	const isPresistentChannel = await db('trackedChannel')
		.where({
			channel_id: channel.id,
			keep: true
		}).first();

	if (!isPresistentChannel)
		return;
	if (isPresistentChannel.active == false) {
		await db('trackedChannel')
			.where({
				channel_id: channel.id,
				keep: true
			})
			.update({
				active: true
			});
	}

	await startTracking(channel);

	console.log(`Started observing ${channel.name} [PERSISTENT]`); // TODO: delete once working & tested
});

client.login(token);