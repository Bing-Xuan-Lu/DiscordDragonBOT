const { SlashCommandBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('hello')
		.setDescription('問候語'),
	async execute(interaction) {
		await interaction.reply('你好，憨兒!');
	},
};