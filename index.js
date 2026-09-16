const { Client, GatewayIntentBits } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.content === "!bal") {
    let bal = await db.get(`coins_${msg.author.id}`) || 0;
    msg.channel.send(`💰 **${msg.author.username}** is your **${bal}** coins`);
  }

  if (msg.content === "!daily") {
    let lastDaily = await db.get(`daily_${msg.author.id}`);
    if (lastDaily && Date.now() - lastDaily < 86400000) return msg.reply("Daily ALREADY used!");
    await db.add(`coins_${msg.author.id}`, 500);
    await db.set(`daily_${msg.author.id}`, Date.now());
    msg.reply("500 coins claimed!");
  }

  if (msg.content === "!hunt") {
    let amount = Math.floor(Math.random() * 500) + 50;
    await db.add(`coins_${msg.author.id}`, amount);
    msg.channel.send(`🏹 Hunt! ${amount} coins mile!`);
  }

  if (msg.content.startsWith("!redeem code create")) {
    if (!msg.member.permissions.has("Administrator")) return msg.reply("only Admin!");
    let args = msg.content.split(" ");
    let code = args[3];
    let amount = parseInt(args[4]);
    await db.set(`redeem_${code}`, amount);
    msg.channel.send(`Code created: ${code} = ${amount} coins`);
  }

  if (msg.content.startsWith("!redeem ") &&!msg.content.includes("create")) {
    let code = msg.content.split(" ")[1];
    let amount = await db.get(`redeem_${code}`);
    if (!amount) return msg.reply("wrong code!");
    let used = await db.get(`used_${code}_${msg.author.id}`);
    if (used) return msg.reply("Already used!");
    await db.add(`coins_${msg.author.id}`, amount);
    await db.set(`used_${code}_${msg.author.id}`, true);
    msg.reply(`Redeemed! ${amount} coins claimed!`);
  }
});

client.login(process.env.TOKEN);
