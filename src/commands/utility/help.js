const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("幫助"),
  async execute(interaction) {
    //TODO:命令ID暫時寫死，目前未做指令權限設計
    const exampleEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
	  .setTitle("射龍門小遊戲，指令清單")
      .setThumbnail("https://i.imgur.com/LfFY2ry.gif")
      .addFields(
        { name: "指令清單", value: "</help:1133329819254399066> `help`", inline: true },
        { name: "參加", value: "</join:1133342184461045841> `join`", inline: true },
        { name: "設定底台金額", value: "/setamount `setamount`", inline: true },
      );
    await interaction.reply({ embeds: [exampleEmbed] });
  },
};
