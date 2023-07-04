const { Client, Intents, IntentsBitField } = require('discord.js');
const client = new Client({ intents: [    
    IntentsBitField.Flags.Guilds
    ,IntentsBitField.Flags.GuildMessages
    ,IntentsBitField.Flags.MessageContent
] });

const env = require('dotenv').config();

client.on('ready', (c) => {
    console.log(`✅ ${c.user.tag} is online.`);
  });
  
client.on('messageCreate', (message) => {
    if (message.author.bot) {
      return;
    }
  
    if (message.content === 'hello') {
      message.reply('hello');
    }
  });

//console.log(process.env.TOKEN);

client.login(env.parsed.TOKEN);