const {
  Client,
  IntentsBitField,
  Collection,
  Events,
  REST,
  Routes,
  GatewayIntentBits,
  ActivityType,
  PresenceUpdateStatus,
  Partials,
} = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const https = require("https");

const { TOKEN, CLIENT_ID, GUILD_ID, GEMINI_API_KEY } = require("dotenv").config().parsed;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// 每個 channel 各自維護對話歷史，超過 20 則自動截斷
const channelChats = new Map();

function fetchImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
      res.on("error", reject);
    }).on("error", reject);
  });
}
const fs = require("node:fs");
const path = require("node:path");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.DirectMessageTyping,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.on("ready", (c) => {
  console.log(`✅ ${c.user.tag} is online.`);
  c.user.setStatus(PresenceUpdateStatus.Idle);
  //c.user.setActivity("",{ type:ActivityType.Competing});
  //c.user.setActivity("??", { type: ActivityType.Playing }); //將機器人的行為設置為正在玩
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === "你好") {
    message.reply("你好，憨兒");
    return;
  }

  // DM 直接對話，伺服器頻道需要 @mention
  const isDM = message.guild === null;
  if (!isDM && !message.mentions.has(client.user)) return;

  const userText = message.content.replace(`<@${client.user.id}>`, "").trim();
  if (!userText) return;

  await message.channel.sendTyping();

  // 取得或建立該 channel 的對話歷史
  if (!channelChats.has(message.channelId)) {
    channelChats.set(message.channelId, []);
  }
  const history = channelChats.get(message.channelId);

  // 檢查是否有圖片附件
  const imageAttachments = message.attachments.filter((a) =>
    a.contentType && a.contentType.startsWith("image/")
  );

  try {
    let reply;

    if (imageAttachments.size > 0) {
      // 有圖片：多模態模式，帶入文字歷史作為背景但圖片不存歷史
      const imageParts = await Promise.all(
        imageAttachments.map(async (att) => ({
          inlineData: {
            data: await fetchImageAsBase64(att.url),
            mimeType: att.contentType.split(";")[0],
          },
        }))
      );

      // 組合 prompt：文字歷史摘要 + 當前問題 + 圖片
      const historyContext = history.length > 0
        ? "（以下是之前的對話背景）\n" +
          history.map((h) => `${h.role === "user" ? "使用者" : "你"}: ${h.parts[0].text}`).join("\n") +
          "\n（背景結束）\n\n"
        : "";

      const prompt = historyContext + (userText || "請描述這張圖片");
      const result = await geminiModel.generateContent([prompt, ...imageParts]);
      reply = result.response.text();

      // 圖片對話只把文字部分加入歷史
      history.push({ role: "user", parts: [{ text: userText || "[傳送了圖片]" }] });
      history.push({ role: "model", parts: [{ text: reply }] });
    } else {
      // 純文字：完整上下文對話
      history.push({ role: "user", parts: [{ text: userText }] });

      const chat = geminiModel.startChat({ history: history.slice(0, -1) });
      const result = await chat.sendMessage(userText);
      reply = result.response.text();

      history.push({ role: "model", parts: [{ text: reply }] });
    }

    // 超過 20 則截掉最舊的（保留偶數筆維持 user/model 交替）
    while (history.length > 20) history.splice(0, 2);

    // Discord 單則訊息上限 2000 字
    if (reply.length > 2000) {
      await message.reply(reply.slice(0, 1997) + "...");
    } else {
      await message.reply(reply);
    }
  } catch (err) {
    console.error("Gemini error:", err);
    await message.reply("AI 暫時無法回應，請稍後再試。");
  }
});

client.commands = new Collection();
client.cooldowns = new Collection();

//循環commands指令資料夾
const commands = [];
// Grab all the command files from the commands directory you created earlier
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  // Grab all the command files from the commands directory you created earlier
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

//部署指令
// Construct and prepare an instance of the REST module
const rest = new REST().setToken(TOKEN);

// and deploy your commands!
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();

//自訂指令
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (command === undefined) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  //指令冷卻時間(目前3秒)
  const { cooldowns } = client;

  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const defaultCooldownDuration = 3;
  const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

    if (now < expirationTime) {
      const expiredTimestamp = Math.round(expirationTime / 1000);
      return interaction.reply({
        content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
        ephemeral: true,
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

//console.log(process.env.TOKEN);

client.login(TOKEN);
