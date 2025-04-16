const { SlashCommandBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('加入遊戲'),
		// .addUserOption(option =>
        //     option.setName('target')
        //         .setDescription('目標使用者')
        //         .setRequired(false))
	async execute(interaction) {
		// 使用 interaction.user 獲取發送指令的使用者
		const user = interaction.user;

		await interaction.reply(`你好，<@${user.id}> 憨兒，加入遊戲目前開發中^^`);
	},
};