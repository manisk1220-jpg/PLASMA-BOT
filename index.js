const fs = require('fs');
const express = require('express');
const app = express();
app.use(express.json());

let pendingOrders = [];
let linked = {};
if (fs.existsSync('./linked.json')) {
  try { linked = JSON.parse(fs.readFileSync('./linked.json')); } catch(e){}
}

const MOD_CONFIG = {
  welcomeChannelId: "1530927090587799582",
  logChannelId: "1530927127724294266",
  whitelisted: ["YOUR_OWNER_ID"],
  antinuke: { enabled: true, banLimit: 3, kickLimit: 3, channelDeleteLimit: 2, roleDeleteLimit: 2, timeWindow: 10000 }
};
let antiNukeCache = { bans: new Map(), kicks: new Map(), channelDelete: new Map(), roleDelete: new Map() };

app.get('/api/buy', (req, res) => {
    if (req.query.key!== 'PLASMA123') return res.status(403).send('Invalid Key');
    pendingOrders.push({ player: req.query.player, rank: req.query.rank, days: req.query.days });
    res.send('Order Added');
});
app.get('/api/pending', (req, res) => {
    if (req.query.key!== 'PLASMA123') return res.status(403).send('Invalid Key');
    res.json(pendingOrders);
});
app.get('/api/pending-money', (req, res) => {
    if (req.query.key!== 'PLASMA123') return res.status(403).send('Invalid Key');
    let data = fs.existsSync('./pendingMoney.json')? JSON.parse(fs.readFileSync('./pendingMoney.json')) : [];
    res.json(data);
});
app.get('/api/claim-money', (req, res) => {
    if (req.query.key!== 'PLASMA123') return res.status(403).send('Invalid Key');
    let data = fs.existsSync('./pendingMoney.json')? JSON.parse(fs.readFileSync('./pendingMoney.json')) : [];
    data = data.filter(o => o.id!== req.query.id);
    fs.writeFileSync('./pendingMoney.json', JSON.stringify(data));
    res.send('Claimed');
});
app.get('/api/done', (req, res) => {
    if (req.query.key!== 'PLASMA123') return res.status(403).send('Invalid Key');
    pendingOrders = pendingOrders.filter(o => o.player!== req.query.player);
    res.send('Done');
});
app.get('/', (req, res) => { res.send('PLASMA BOT RUNNING ✅ - Money + Mod + AntiNuke + Redeem'); });
app.listen(3000, () => console.log('API running 3000'));

const { Client, GatewayIntentBits, EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const ms = (str) => {
  if(!str) return 0;
  const num = parseInt(str);
  if (str.endsWith('d')) return num*24*60*60*1000;
  if (str.endsWith('h')) return num*60*60*1000;
  if (str.endsWith('m')) return num*60*1000;
  if (str.endsWith('s')) return num*1000;
  return num*1000;
};

const client = new Client({
  intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildModeration ]
});

const ROLES = {
  vip: "1544255313891295262",
  hero: "154425499381583870",
  shadow: "1544255600693616751",
  plasma: "154425631133567774",
  plasmaplus: "1544256491236626512"
}

const shopItems = {
  "vip7d": { name: "VIP Rank [7 Days]", price: 20000, type: "temprole", role: "vip", duration: "7d" },
  "vip30d": { name: "VIP Rank [30 Days]", price: 30000, type: "temprole", role: "vip", duration: "30d" },
  "hero7d": { name: "Hero Rank [7 Days]", price: 10000, type: "temprole", role: "hero", duration: "7d" },
  "hero30d": { name: "Hero Rank [30 Days]", price: 20000, type: "temprole", role: "hero", duration: "30d" },
  "shadow7d": { name: "Shadow Rank [7 Days]", price: 40000, type: "temprole", role: "shadow", duration: "7d" },
  "shadow30d": { name: "Shadow Rank [30 Days]", price: 60000, type: "temprole", role: "shadow", duration: "30d" },
  "plasma7d": { name: "Plasma Rank [7 Days]", price: 70000, type: "temprole", role: "plasma", duration: "7d" },
  "plasma30d": { name: "Plasma Rank [30 Days]", price: 90000, type: "temprole", role: "plasma", duration: "30d" },
  "plasmaplus7d": { name: "Plasma+ Rank [7 Days]", price: 100000, type: "temprole", role: "plasmaplus", duration: "7d" },
  "plasmaplus30d": { name: "Plasma+ Rank [30 Days]", price: 120000, type: "temprole", role: "plasmaplus", duration: "30d" },
  "100k": { name: "100K Money Card", price: 500, type: "money", amount: 100000 },
  "500k": { name: "500K Money Card", price: 1000, type: "money", amount: 500000 },
  "1m": { name: "1M Money Card", price: 2000, type: "money", amount: 1000000 },
  "5m": { name: "5M Money Card", price: 5000, type: "money", amount: 5000000 },
  "10m": { name: "10M Money Card", price: 10000, type: "money", amount: 10000000 },
  "50m": { name: "50M Money Card", price: 20000, type: "money", amount: 50000000 },
  "100m": { name: "100M Money Card", price: 50000, type: "money", amount: 100000000 },
};

client.on("guildMemberAdd", async (member) => {
  try {
    let channel = member.guild.channels.cache.get(MOD_CONFIG.welcomeChannelId) || member.guild.channels.cache.find(c=>c.name.includes("welcome"));
    if(!channel) return;
    const embed = new EmbedBuilder().setTitle(`Welcome to ${member.guild.name} 🎉`).setDescription(`Hey ${member}!\nMC IP: \`expressing-slide.tun.ply.gg:25565\`\nLink: \`pl!link <name>\``).setColor("Green").setThumbnail(member.user.displayAvatarURL({dynamic:true})).setTimestamp();
    channel.send({ content: `${member}`, embeds: [embed] });
  } catch(e){}
});

async function handleAntiNuke(guild, executorId, type) {
  if(!MOD_CONFIG.antinuke.enabled) return;
  if(MOD_CONFIG.whitelisted.includes(executorId) || guild.ownerId===executorId) return;
  let map = antiNukeCache[type];
  let count = map.get(executorId) || { count: 0, time: Date.now() };
  if(Date.now() - count.time > MOD_CONFIG.antinuke.timeWindow) count = { count: 0, time: Date.now() };
  count.count++; map.set(executorId, count);
  if(count.count >= 3) { try { await guild.members.ban(executorId, { reason: `ANTI-NUKE: ${type}` }); } catch(e){} map.delete(executorId); }
}
client.on("guildBanAdd", async (ban) => { try { let logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }); let e = logs.entries.first(); if(e) handleAntiNuke(ban.guild, e.executor.id, 'bans'); } catch(e){} });
client.on("channelDelete", async (ch) => { try { let logs = await ch.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }); let e = logs.entries.first(); if(e) handleAntiNuke(ch.guild, e.executor.id, 'channelDelete'); } catch(e){} });
client.on("roleDelete", async (role) => { try { let logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 }); let e = logs.entries.first(); if(e) handleAntiNuke(role.guild, e.executor.id, 'roleDelete'); } catch(e){} });

client.on("ready", () => {
  console.log(`PLASMA BOT ONLINE ${client.user.tag}`);
  setInterval(async () => {
    let all = await db.all();
    let temps = all.filter(e => e.id.startsWith("temp_"));
    for (let entry of temps) {
      if (Date.now() > entry.value.expiresAt) {
        try {
          let [_, guildId, userId, roleKey] = entry.id.split("_");
          let guild = client.guilds.cache.get(guildId);
          if (guild) { let member = await guild.members.fetch(userId).catch(()=>null); let roleId = entry.value.roleId || ROLES[roleKey]; if (member && roleId) await member.roles.remove(roleId).catch(()=>{}); }
        } catch {} await db.delete(entry.id);
      }
    }
    let tempBans = all.filter(e=>e.id.startsWith("tempban_"));
    for(let entry of tempBans) {
      if(Date.now() > entry.value.expiresAt) {
        try { let guild = client.guilds.cache.get(entry.value.guildId); if(guild) await guild.members.unban(entry.value.userId).catch(()=>{}); } catch {} await db.delete(entry.id);
      }
    }
  }, 60*1000);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot ||!msg.guild) return;
  let args = msg.content.trim().split(/ +/);
  let cmdRaw = args[0].toLowerCase();
  let cmd = cmdRaw.replace("pl!", "!");

  if (!msg.content.startsWith("!") &&!msg.content.toLowerCase().startsWith("pl!")) {
    await db.add(`xp_${msg.author.id}`, 5);
  }

  if (cmd === "!link") {
      const mcname = args[1];
      if (!mcname) return msg.reply('Usage: `pl!link <mc_name>`');
      linked[msg.author.id] = mcname;
      fs.writeFileSync('./linked.json', JSON.stringify(linked));
      return msg.reply(`✅ Linked! ${msg.author.tag} -> ${mcname}`);
  }

  if (cmd === "!server") {
      const sub = args[1]?.toLowerCase();
      if (sub === "ip") {
          const embed = new EmbedBuilder().setTitle("🌐 PLASMA - Minecraft Server IP").setDescription("**IP:** `expressing-slide.tun.ply.gg`\n**Port:** `25565`").setColor("Green");
          return msg.reply({ embeds: [embed] });
      }
      if (sub === "info") {
          const guild = msg.guild; const owner = await guild.fetchOwner();
          const embed = new EmbedBuilder().setTitle(`📊 ${guild.name} - Server Info`).setThumbnail(guild.iconURL({dynamic:true})).setColor("Blurple").addFields({ name: "👑 Owner", value: `<@${owner.id}>`, inline: true }, { name: "👥 Members", value: `${guild.memberCount}`, inline: true }, { name: "🌐 MC IP", value: "`expressing-slide.tun.ply.gg:25565`", inline: false }).setTimestamp();
          return msg.reply({ embeds: [embed] });
      }
  }

  if (cmd === "!pf" || cmd === "!profile") {
      const target = msg.mentions.users.first() || msg.author;
      const member = await msg.guild.members.fetch(target.id).catch(()=>null);
      const bal = await db.get(`coins_${target.id}`) || 0;
      const xp = await db.get(`xp_${target.id}`) || 0;
      const mcname = linked[target.id] || "Not Linked";
      const embed = new EmbedBuilder().setTitle(`👤 ${target.username} - Profile`).setThumbnail(target.displayAvatarURL({dynamic:true})).setColor("Gold").addFields({ name: "User", value: `${target.tag}`, inline: true }, { name: "Coins", value: `${bal.toLocaleString()}`, inline: true }, { name: "XP", value: `${xp}`, inline: true }, { name: "MC", value: `${mcname}`, inline: true }).setTimestamp();
      return msg.reply({ embeds: [embed] });
  }

  if (cmd === "!help") {
    const helpEmbed = new EmbedBuilder()
  .setTitle("📜 PLASMA BOT - HELP MENU")
  .setColor(0x00FFFF)
  .setThumbnail(client.user.displayAvatarURL())
  .setDescription("**All commands work with `!` and `pl!` prefix**")
  .addFields(
        { name: "💰 Economy", value: "`!bal`, `!daily`, `!pay @user 500`, `!shop` / `pl!shop`, `!buy <item>` / `pl!buy <item>`, `!rank`", inline: false },
        { name: "🔗 PL System", value: "`pl!link <mc_name>` - Link MC\n`pl!pf` / `pl!profile` - Your profile\n`pl!server ip` - `expressing-slide.tun.ply.gg:25565`\n`pl!server info` - Discord server info", inline: false },
        { name: "🎁 Redeem", value: "`!redeem CODE`\n`!redeem code create CODE amount [item]`", inline: false },
        { name: "🔨 Moderation", value: "`!ban @user`, `!tempban @user 1d`, `!kick @user`, `!mute @user 10m`, `!tempmute @user 1h`, `!unmute`, `!unban ID`, `!clear 10`", inline: false },
        { name: "🛡️ AntiNuke", value: "`!antinuke on/off` - Auto ban on nuke", inline: false },
        { name: "👤 Utility", value: "`!avatar @user`, `!ping`, `!pf`", inline: false }
      )
  .setFooter({ text: `Requested by ${msg.author.tag}`, iconURL: msg.author.displayAvatarURL() })
  .setTimestamp();
    return msg.channel.send({ embeds: [helpEmbed] });
  }

  if (cmd === "!bal") { let t = msg.mentions.users.first() || msg.author; let b = await db.get(`coins_${t.id}`) || 0; return msg.reply(`💰 **${t.username}** has **${b}** coins`); }
  if (cmd === "!daily") { let last = await db.get(`daily_${msg.author.id}`); if (last && Date.now() - last < 86400000) return msg.reply("Already claimed!"); await db.add(`coins_${msg.author.id}`, 1000); await db.set(`daily_${msg.author.id}`, Date.now()); return msg.reply("You received 1000 coins!"); }
  if (cmd === "!pay") { let target = msg.mentions.users.first(); let amount = parseInt(args[2]); if (!target || isNaN(amount)) return msg.reply("Usage: `!pay @user 500`"); let bal = await db.get(`coins_${msg.author.id}`) || 0; if (bal < amount) return msg.reply("Not enough coins!"); await db.add(`coins_${msg.author.id}`, -amount); await db.add(`coins_${target.id}`, amount); return msg.reply(`✅ Sent **${amount}** to **${target.username}**!`); }
  if (cmd === "!rank" || cmd === "!lb") { let all = await db.all(); let top = all.filter(e => e.id.startsWith("coins_")).sort((a,b)=>b.value-a.value).slice(0,10); let txt = "**🏆 TOP 10**\n"; top.forEach((e,i)=> txt += `${i+1}. <@${e.id.split("_")[1]}> - ${e.value}\n`); return msg.channel.send(txt); }

  if (cmd === "!shop") {
    let rankText = ""; let moneyText = "";
    for (let id in shopItems) {
        let item = shopItems[id];
        if (item.type === "temprole") rankText += `**${id}** - ${item.name} - ${item.price} coins\n`;
        else if (item.type === "money") moneyText += `**${id}** - ${item.name} - ${item.price} coins -> $${item.amount.toLocaleString()} In-Game\n`;
    }
    const embed = new EmbedBuilder().setTitle("🏪 PLASMA SHOP").setColor("Gold").setDescription(`Use \`pl!buy <id>\`\nLink first: \`pl!link <mc_name>\`\n\n**👑 RANKS:**\n${rankText}\n**💵 MONEY CARDS:**\n${moneyText}`);
    return msg.channel.send({ embeds: [embed] });
  }
  if (cmd === "!buy") {
    const itemId = args[1]?.toLowerCase();
    if (!itemId) return msg.reply('Usage: `pl!buy <id>`\nDo `pl!shop` to see items');
    const item = shopItems[itemId];
    if (!item) return msg.reply('Item not found! Do `pl!shop`');
    let balance = await db.get(`coins_${msg.author.id}`) || 0;
    if (balance < item.price) return msg.reply(`You need ${item.price} coins, you have ${balance}`);
    if (!linked[msg.author.id]) return msg.reply('Pehle link karo! Use `pl!link <your_minecraft_name>`');
    await db.add(`coins_${msg.author.id}`, -item.price);
    if (item.type === "money") {
        let id = Date.now().toString() + "_" + msg.author.id;
        let pendingMoney = fs.existsSync('./pendingMoney.json')? JSON.parse(fs.readFileSync('./pendingMoney.json')) : [];
        pendingMoney.push({ id, player: linked[msg.author.id], discordId: msg.author.id, amount: item.amount, card: itemId });
        fs.writeFileSync('./pendingMoney.json', JSON.stringify(pendingMoney));
        return msg.reply(`✅ You bought **${item.name}**! **$${item.amount.toLocaleString()}** will be given in-game to **${linked[msg.author.id]}** in 20 sec! Join: expressing-slide.tun.ply.gg:25565`);
    }
    if (item.type === "temprole") {
        const mcname = linked[msg.author.id];
        let roleId = ROLES[item.role];
        if (roleId) {
            try {
                let member = await msg.guild.members.fetch(msg.author.id);
                await member.roles.add(roleId).catch(()=>{});
                await db.set(`temp_${msg.guild.id}_${msg.author.id}_${item.role}`, { expiresAt: Date.now()+ms(item.duration), roleId: roleId });
            } catch(e){}
        }
        try {
            await fetch(`http://localhost:3000/api/buy?player=${mcname}&rank=${item.role}&days=${item.duration.replace('d','')}&key=PLASMA123`);
        } catch(e){}
        return msg.reply(`✅ **${item.name}** for **${mcname}**! Discord + MC rank in 10 sec.`);
    }
  }

  if (cmd === "!redeem" && args[1] === "code" && args[2] === "create") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return msg.reply("Admin only!");
    let code = args[3]; let amount = parseInt(args[4]) || 0; let itemId = args[5];
    await db.set(`redeem_${code}`, { amount, itemId });
    return msg.channel.send(`✅ Code Created: ${code} = ${amount} coins ${itemId||""}`);
  }
  if (cmd === "!redeem" && args[1]!== "code") {
    let code = args[1];
    if(!code) return msg.reply("Usage: `!redeem CODE`");
    let data = await db.get(`redeem_${code}`);
    if (!data) return msg.reply("Invalid code!");
    if (await db.get(`used_${code}_${msg.author.id}`)) return msg.reply("Already used!");
    if (data.amount) await db.add(`coins_${msg.author.id}`, data.amount);
    if (data.itemId && shopItems[data.itemId]?.type === "temprole") {
      let item = shopItems[data.itemId];
      await msg.member.roles.add(ROLES[item.role]).catch(()=>{});
      await db.set(`temp_${msg.guild.id}_${msg.author.id}_${item.role}`, { expiresAt: Date.now()+ms(item.duration), roleId: ROLES[item.role] });
    }
    await db.set(`used_${code}_${msg.author.id}`, true);
    return msg.reply(`🎉 Redeemed ${code}! +${data.amount} coins!`);
  }

  if (cmd === "!ban") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return msg.reply("No permission!");
    let target = msg.mentions.members.first();
    if (!target) return msg.reply("Mention user!");
    await target.ban({ reason: args.slice(2).join(" ") || "No reason" }).catch(()=>{});
    return msg.channel.send(`🔨 Banned ${target.user.tag}`);
  }
  if (cmd === "!tempban") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return msg.reply("No permission!");
    let target = msg.mentions.members.first(); let timeArg = args[2];
    if (!target ||!timeArg) return msg.reply("Usage: `pl!tempban @user 1d reason`");
    await target.ban({ reason: `TempBan ${timeArg} - ${args.slice(3).join(" ")}` }).catch(()=>{});
    await db.set(`tempban_${target.id}_${msg.guild.id}`, { userId: target.id, guildId: msg.guild.id, expiresAt: Date.now()+ms(timeArg) });
    return msg.channel.send(`⏳ TempBanned ${target.user.tag} for ${timeArg}`);
  }
  if (cmd === "!kick") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return msg.reply("No permission!");
    let target = msg.mentions.members.first();
    if (!target) return msg.reply("Mention user!");
    await target.kick(args.slice(2).join(" ") || "No reason").catch(()=>{});
    return msg.channel.send(`👢 Kicked ${target.user.tag}`);
  }
  if (cmd === "!mute") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return msg.reply("No permission!");
    let target = msg.mentions.members.first();
    let dur = args[2] || "10m";
    if (!target) return msg.reply("Usage: `!mute @user 10m`");
    await target.timeout(ms(dur), "Muted").catch(()=>{});
    return msg.channel.send(`🔇 Muted ${target.user.tag} for ${dur}`);
  }
  if (cmd === "!tempmute") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return msg.reply("No permission!");
    let target = msg.mentions.members.first(); let timeArg = args[2];
    if (!target ||!timeArg) return msg.reply("Usage: `pl!tempmute @user 1h reason`");
    await target.timeout(ms(timeArg)).catch(()=>{});
    return msg.channel.send(`⏳ Temp Muted ${target.user.tag} for ${timeArg}`);
  }
  if (cmd === "!unmute") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return msg.reply("No permission!");
    let target = msg.mentions.members.first();
    if (!target) return msg.reply("Mention user!");
    await target.timeout(null).catch(()=>{});
    return msg.channel.send(`🔊 Unmuted ${target.user.tag}`);
  }
  if (cmd === "!unban") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return msg.reply("No permission!");
    let userId = args[1]; if(!userId) return msg.reply("Usage: `pl!unban USER_ID`");
    await msg.guild.members.unban(userId).catch(()=> msg.reply("Invalid ID or not banned"));
    return msg.channel.send(`✅ Unbanned **${userId}**`);
  }
  if (cmd === "!clear") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return msg.reply("No permission!");
    let amount = parseInt(args[1]) || 100;
    await msg.channel.bulkDelete(amount+1).catch(()=>{});
    return msg.channel.send(`🧹 Deleted ${amount} messages`).then(m=>setTimeout(()=>m.delete().catch(()=>{}), 3000));
  }
  if (cmd === "!avatar" || cmd === "!av") {
    let target = msg.mentions.users.first() || msg.author;
    const embed = new EmbedBuilder().setTitle(`${target.username}'s Avatar`).setImage(target.displayAvatarURL({ size: 1024 })).setColor(0x00FFFF);
        return msg.channel.send({ embeds: [embed] });
  }
  if (cmd === "!ping") {
    return msg.reply(`🏓 Pong! ${client.ws.ping}ms`);
  }
  if (cmd === "!antinuke") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return msg.reply("Admin only!");
    let sub = args[1];
    if(sub==="on"){ MOD_CONFIG.antinuke.enabled=true; return msg.reply("✅ AntiNuke ON"); }
    if(sub==="off"){ MOD_CONFIG.antinuke.enabled=false; return msg.reply("❌ AntiNuke OFF"); }
    return msg.reply(`AntiNuke: ${MOD_CONFIG.antinuke.enabled?"ON":"OFF"}\nUse: \`pl!antinuke on/off\``);
  }
});

client.login(process.env.TOKEN)
