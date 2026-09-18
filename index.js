const fs = require('fs');
const express = require('express');
const app = express();
let pendingOrders = [];
let linked = {};
if (fs.existsSync('./linked.json')) {
    try { linked = JSON.parse(fs.readFileSync('./linked.json')); } catch(e){}
}
app.get('/api/buy', (req, res) => {
    if (req.query.key!== 'PLASMA123') return res.status(403).send('Invalid Key');
    pendingOrders.push({ player: req.query.player, rank: req.query.rank, days: req.query.days });
    res.send('Order Added');
});
app.get('/api/pending', (req, res) => {
    if (req.query.key!== 'PLASMA123') return res.status(403).send('Invalid Key');
    res.json(pendingOrders);
});
app.get('/api/done', (req, res) => {
    if (req.query.key!== 'PLASMA123') return res.status(403).send('Invalid Key');
    pendingOrders = pendingOrders.filter(o => o.player!== req.query.player);
    res.send('Done');
});
app.listen(3000, () => console.log('API running on 3000'));

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const ms = (str) => {
  const num = parseInt(str);
  if (str.endsWith('d')) return num*24*60*60*1000;
  if (str.endsWith('h')) return num*60*60*1000;
  if (str.endsWith('m')) return num*60*1000;
  return num*1000;
};

const client = new Client({
  intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers ]
});

const ROLES = {
  vip: "1544255313891295262",
  hero: "1544254993815838780",
  shadow: "1544255600693616751",
  plasma: "1544256311313567774",
  plasmaplus: "1544256491236626512"
}

const shopItems = {
  "vip7d": { name: "VIP Rank [7 Days]", price: 5000, type: "temprole", role: "vip", duration: "7d" },
  "vip30d": { name: "VIP Rank [30 Days]", price: 15000, type: "temprole", role: "vip", duration: "30d" },
  "hero7d": { name: "Hero Rank [7 Days]", price: 8000, type: "temprole", role: "hero", duration: "7d" },
  "hero30d": { name: "Hero Rank [30 Days]", price: 25000, type: "temprole", role: "hero", duration: "30d" },
  "shadow7d": { name: "Shadow Rank [7 Days]", price: 15000, type: "temprole", role: "shadow", duration: "7d" },
  "shadow30d": { name: "Shadow Rank [30 Days]", price: 55000, type: "temprole", role: "shadow", duration: "30d" },
  "plasma7d": { name: "Plasma Rank [7 Days]", price: 25000, type: "temprole", role: "plasma", duration: "7d" },
  "plasma30d": { name: "Plasma Rank [30 Days]", price: 90000, type: "temprole", role: "plasma", duration: "30d" },
  "plasmaplus7d": { name: "Plasma+ Rank [7 Days]", price: 40000, type: "temprole", role: "plasmaplus", duration: "7d" },
  "plasmaplus30d": { name: "Plasma+ Rank [30 Days]", price: 140000, type: "temprole", role: "plasmaplus", duration: "30d" },
  "100k": { name: "100K Money Card", price: 1000, type: "money", amount: 100000 },
  "500k": { name: "500K Money Card", price: 4500, type: "money", amount: 500000 },
  "1m": { name: "1M Money Card", price: 8500, type: "money", amount: 1000000 },
  "5m": { name: "5M Money Card", price: 40000, type: "money", amount: 5000000 },
  "10m": { name: "10M Money Card", price: 75000, type: "money", amount: 10000000 },
  "50m": { name: "50M Money Card", price: 350000, type: "money", amount: 50000000 },
  "100m": { name: "100M Money Card", price: 650000, type: "money", amount: 100000000 }
};

client.on("ready", () => { console.log(`PLASMA BOT ONLINE ${client.user.tag}`); });

client.on("messageCreate", async (msg) => {
  if (msg.author.bot ||!msg.guild) return;
  let args = msg.content.trim().split(/ +/);
  let cmdRaw = args[0].toLowerCase();
  let cmd = cmdRaw.replace("pl!", "!");

  // pl!link
  if (cmd === "!link") {
      const mcname = args[1];
      if (!mcname) return msg.reply('Usage: `pl!link <your_minecraft_name>`');
      linked[msg.author.id] = mcname;
      fs.writeFileSync('./linked.json', JSON.stringify(linked));
      return msg.reply(`✅ Linked! ${msg.author.tag} -> ${mcname}`);
  }

  // pl!server ip / info
  if (cmd === "!server") {
      const sub = args[1]?.toLowerCase();
      if (sub === "ip") {
          const embed = new EmbedBuilder()
         .setTitle("🌐 PLASMA - Minecraft Server IP")
         .setDescription("**IP:** `expressing-slide.tun.ply.gg`\n**Port:** `25565`\n\n**Full:** `expressing-slide.tun.ply.gg:25565`")
         .setColor("Green");
          return msg.reply({ embeds: [embed] });
      }
      if (sub === "info") {
          const guild = msg.guild;
          const owner = await guild.fetchOwner();
          const embed = new EmbedBuilder()
        .setTitle(`📊 ${guild.name} - Server Info`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setColor("Blurple")
        .addFields(
               { name: "👑 Owner", value: `<@${owner.id}>`, inline: true },
               { name: "👥 Members", value: `Total: ${guild.memberCount}`, inline: true },
               { name: "📁 Channels", value: `Total: ${guild.channels.cache.size}`, inline: true },
               { name: "🎭 Roles", value: `${guild.roles.cache.size}`, inline: true },
               { name: "🌐 MC IP", value: "`expressing-slide.tun.ply.gg:25565`", inline: false }
           )
         .setTimestamp();
          return msg.reply({ embeds: [embed] });
      }
  }

  // pl!pf
  if (cmd === "!pf" || cmd === "!profile") {
      const target = msg.mentions.users.first() || msg.author;
      const bal = await db.get(`coins_${target.id}`) || 0;
      const mcname = linked[target.id] || "Not Linked";
      const embed = new EmbedBuilder()
      .setTitle(`${target.username} - Profile`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setColor("Gold")
      .addFields(
            { name: "Coins", value: `${bal}`, inline: true },
            { name: "Minecraft", value: `${mcname}`, inline: true }
        )
      return msg.reply({ embeds: [embed] });
  }

  if (cmd === "!help") {
    const embed = new EmbedBuilder()
  .setTitle("📜 PLASMA BOT - PL COMMANDS")
  .setDescription("`pl!link <name>`\n`pl!shop`\n`pl!buy <id>`\n`pl!pf`\n`pl!server ip`\n`pl!server info`")
  .setColor(0x00FFFF);
    return msg.channel.send({ embeds: [embed] });
  }

  if (cmd === "!shop") {
    let rankText = ""; let moneyText = "";
    for (let id in shopItems) {
        let item = shopItems[id];
        if (item.type === "temprole") rankText += `**${id}** - ${item.name} - ${item.price}\n`;
        else moneyText += `**${id}** - ${item.name} - ${item.price}\n`;
    }
    const embed = new EmbedBuilder().setTitle("🏪 PLASMA SHOP").setDescription(`**RANKS:**\n${rankText}\n**MONEY:**\n${moneyText}`).setColor("Gold");
    return msg.channel.send({ embeds: [embed] });
  }

  if (cmd === "!buy") {
    const itemId = args[1]?.toLowerCase();
    const item = shopItems[itemId];
    if (!item) return msg.reply('Item not found! Use pl!shop');
    let balance = await db.get(`coins_${msg.author.id}`) || 0;
    if (balance < item.price) return msg.reply(`Need ${item.price}, you have ${balance}`);
    if (item.type === "temprole" &&!linked[msg.author.id]) return msg.reply('Link first! `pl!link <name>`');
    await db.add(`coins_${msg.author.id}`, -item.price);
    if (item.type === "money") {
        await db.add(`coins_${msg.author.id}`, item.amount);
        return msg.reply(`✅ Redeemed ${item.name} +${item.amount}`);
    }
    if (item.type === "temprole") {
        const mcname = linked[msg.author.id];
        let roleId = ROLES[item.role];
        try { let m = await msg.guild.members.fetch(msg.author.id); await m.roles.add(roleId); } catch(e){}
        await fetch(`http://localhost:3000/api/buy?player=${mcname}&rank=${item.role}&days=${item.duration.replace('d','')}&key=PLASMA123`);
        return msg.reply(`✅ ${item.name} for ${mcname} in 10 sec`);
    }
  }
});

client.login(process.env.TOKEN);
