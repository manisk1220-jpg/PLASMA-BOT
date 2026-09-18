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
  "100m": { name: "100M Money Card", price: 650000, type: "money", amount: 100000000 },
  "rod": { name: "Fishing Rod", price: 1000, type: "item", desc: "Bonus on hunt" }
};

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
          if (guild) {
            let member = await guild.members.fetch(userId).catch(()=>null);
            let roleId = entry.value.roleId || ROLES[roleKey];
            if (member && roleId) await member.roles.remove(roleId).catch(()=>{});
          }
        } catch {}
        await db.delete(entry.id);
      }
    }
  }, 60*1000);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot ||!msg.guild) return;
  let args = msg.content.trim().split(/ +/);
  let cmdRaw = args[0].toLowerCase();
  let cmd = cmdRaw.replace("pl!", "!"); // pl!buy ->!buy

  if (!msg.content.startsWith("!") &&!msg.content.toLowerCase().startsWith("pl!")) {
    await db.add(`xp_${msg.author.id}`, 5);
  }

  if (cmd === "!link") {
      const mcname = args[1];
      if (!mcname) return msg.reply('Usage: `pl!link <your_minecraft_name>` or `!link <name>`');
      linked[msg.author.id] = mcname;
      fs.writeFileSync('./linked.json', JSON.stringify(linked));
      return msg.reply(`✅ Linked! ${msg.author.tag} -> ${mcname}`);
  }

  if (cmd === "!server") {
      const sub = args[1]?.toLowerCase();
      if (sub === "ip") {
          const embed = new EmbedBuilder()
         .setTitle("🌐 PLASMA - Minecraft Server IP")
         .setDescription("**Java + Bedrock Supported**\n\n**IP:** `expressing-slide.tun.ply.gg`\n**Port:** `25565`\n\n**Full:** `expressing-slide.tun.ply.gg:25565`")
         .setColor("Green")
         .setFooter({ text: "Version: 1.20.1+ | Lifesteal, FFA, BoxPvP" });
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
               { name: "👥 Members", value: `**Total:** ${guild.memberCount}\n**Humans:** ${guild.members.cache.filter(m=>!m.user.bot).size}\n**Bots:** ${guild.members.cache.filter(m=>m.user.bot).size}`, inline: true },
               { name: "📅 Created", value: `<t:${Math.floor(guild.createdTimestamp/1000)}:R>`, inline: true },
               { name: "📁 Channels", value: `**Total:** ${guild.channels.cache.size}\n**Text:** ${guild.channels.cache.filter(c=>c.type===0).size}\n**Voice:** ${guild.channels.cache.filter(c=>c.type===2).size}`, inline: true },
               { name: "🎭 Roles", value: `${guild.roles.cache.size} roles`, inline: true },
               { name: "🚀 Boost", value: `Level ${guild.premiumTier} | ${guild.premiumSubscriptionCount} boosts`, inline: true },
               { name: "🌐 Minecraft IP", value: "`expressing-slide.tun.ply.gg:25565`", inline: false }
           )
        .setFooter({ text: `Server ID: ${guild.id}` })
        .setTimestamp();
          return msg.reply({ embeds: [embed] });
      }
  }

  if (cmd === "!pf" || cmd === "!profile") {
      const target = msg.mentions.users.first() || msg.author;
      const member = await msg.guild.members.fetch(target.id).catch(()=>null);
      const bal = await db.get(`coins_${target.id}`) || 0;
      const xp = await db.get(`xp_${target.id}`) || 0;
      const mcname = linked[target.id] || "Not Linked";
      const embed = new EmbedBuilder()
      .setTitle(`👤 ${target.username} - Profile`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 1024 }))
      .setColor("Gold")
      .addFields(
            { name: "🏷️ User", value: `${target.tag}\n<@${target.id}>`, inline: true },
            { name: "💰 Coins", value: `${bal.toLocaleString()}`, inline: true },
            { name: "⭐ XP", value: `${xp}`, inline: true },
            { name: "🎮 Minecraft", value: `${mcname}`, inline: true },
            { name: "📅 Joined Discord", value: `<t:${Math.floor(target.createdTimestamp/1000)}:R>`, inline: true },
            { name: "📥 Joined Server", value: member? `<t:${Math.floor(member.joinedTimestamp/1000)}:R>` : "Unknown", inline: true },
            { name: "🎭 Roles", value: member? member.roles.cache.filter(r=>r.id!==msg.guild.id).map(r=>`<@&${r.id}>`).join(", ").slice(0,1024) || "No roles" : "Unknown", inline: false }
        )
      .setFooter({ text: `ID: ${target.id}` })
      .setTimestamp();
      return msg.reply({ embeds: [embed] });
  }

  if (cmd === "!help") {
    const helpEmbed = new EmbedBuilder()
   .setTitle("📜 PLASMA BOT - HELP MENU")
   .setColor(0x00FFFF)
   .setThumbnail(client.user.displayAvatarURL())
   .setDescription("**All commands work with `!` and `pl!` prefix**")
   .addFields(
        { name: "💰 Economy", value: "`!bal`, `!daily`, `!pay @user 500`, `!shop` / `pl!shop`, `!buy <item>` / `pl!buy <item>`, `!inv`, `!rank`", inline: false },
        { name: "🔗 PL System", value: "`pl!link <mc_name>` - Link MC\n`pl!pf` / `pl!profile` - Your profile\n`pl!server ip` - `expressing-slide.tun.ply.gg:25565`\n`pl!server info` - Discord server info", inline: false },
        { name: "🎁 Redeem", value: "`!redeem CODE`\n`!redeem code create CODE amount [item]`", inline: false },
        { name: "⏳ Temp Rank", value: "`!temprank @user @Role 7d`", inline: false },
        { name: "🔨 Moderation", value: "`!ban @user`, `!kick @user`, `!mute @user 10m`, `!unmute`, `!clear 10`", inline: false },
        { name: "👤 Utility", value: "`!avatar @user`, `!userinfo`, `!serverinfo`, `!ping`, `!pf`", inline: false }
      )
   .setFooter({ text: `Requested by ${msg.author.tag}`, iconURL: msg.author.displayAvatarURL() })
   .setTimestamp();
    return msg.channel.send({ embeds: [helpEmbed] });
  }

  if (cmd === "!bal") {
    let target = msg.mentions.users.first() || msg.author;
    let bal = await db.get(`coins_${target.id}`) || 0;
    return msg.reply(`💰 **${target.username}** has **${bal}** coins`);
  }
  if (cmd === "!pay") {
    let target = msg.mentions.users.first();
    let amount = parseInt(args[2]);
    if (!target || isNaN(amount)) return msg.reply("Usage: `!pay @user 500`");
    let bal = await db.get(`coins_${msg.author.id}`) || 0;
    if (bal < amount) return msg.reply("Not enough coins!");
    await db.add(`coins_${msg.author.id}`, -amount);
    await db.add(`coins_${target.id}`, amount);
    return msg.reply(`✅ Sent **${amount}** coins to **${target.username}**!`);
  }
  if (cmd === "!daily") {
    let last = await db.get(`daily_${msg.author.id}`);
    if (last && Date.now() - last < 86400000) return msg.reply("Already claimed!");
    await db.add(`coins_${msg.author.id}`, 1000);
    await db.set(`daily_${msg.author.id}`, Date.now());
    return msg.reply("You received 1000 coins!");
  }
  if (cmd === "!shop") {
    let rankText = ""; let moneyText = "";
    for (let id in shopItems) {
        let item = shopItems[id];
        if (item.type === "temprole") rankText += `**${id}** - ${item.name} - ${item.price} coins\n`;
        else if (item.type === "money") moneyText += `**${id}** - ${item.name} - ${item.price} coins\n`;
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
    if (item.type === "temprole") {
        const mcname = linked[msg.author.id];
        if (!mcname) return msg.reply('Pehle link karo! Use `pl!link <your_minecraft_name>`');
    }
    await db.add(`coins_${msg.author.id}`, -item.price);
    if (item.type === "money") {
        await db.add(`coins_${msg.author.id}`, item.amount);
        return msg.reply(`✅ You redeemed **${item.name}**! Got **${item.amount.toLocaleString()}** coins!`);
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
    if (item.type === "item") {
        await db.push(`inv_${msg.author.id}`, itemId);
        return msg.reply(`✅ You bought **${item.name}**!`);
    }
  }
  if (cmd === "!rank" || cmd === "!lb") {
    let all = await db.all();
    let top = all.filter(e => e.id.startsWith("coins_")).sort((a,b)=>b.value-a.value).slice(0,10);
    let txt = "**🏆 TOP 10**\n";
    top.forEach((e,i)=> txt += `${i+1}. <@${e.id.split("_")[1]}> - ${e.value}\n`);
    return msg.channel.send(txt);
  }
  if (cmd === "!redeem" && args[1] === "code" && args[2] === "create") {
    if (!msg.member.permissions.has("Administrator")) return msg.reply("Admin only!");
    let code = args[3]; let amount = parseInt(args[4]) || 0; let itemId = args[5];
    await db.set(`redeem_${code}`, { amount, itemId });
    return msg.channel.send(`✅ Code Created: ${code} = ${amount} coins ${itemId||""}`);
  }
  if (cmd === "!redeem" && args[1]!== "code") {
    let code = args[1];
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
    if (!msg.member.permissions.has("BanMembers")) return msg.reply("No permission!");
    let target = msg.mentions.members.first();
    if (!target) return msg.reply("Mention user!");
    await target.ban({ reason: args.slice(2).join(" ") || "No reason" }).catch(()=>{});
    return msg.channel.send(`🔨 Banned ${target.user.tag}`);
  }
  if (cmd === "!kick") {
    if (!msg.member.permissions.has("KickMembers")) return msg.reply("No permission!");
    let target = msg.mentions.members.first();
    if (!target) return msg.reply("Mention user!");
    await target.kick(args.slice(2).join(" ") || "No reason").catch(()=>{});
    return msg.channel.send(`👢 Kicked ${target.user.tag}`);
  }
  if (cmd === "!mute") {
    if (!msg.member.permissions.has("ModerateMembers")) return msg.reply("No permission!");
    let target = msg.mentions.members.first();
    let dur = args[2] || "10m";
    if (!target) return msg.reply("Usage: `!mute @user 10m`");
    await target.timeout(ms(dur), "Muted").catch(()=>{});
    return msg.channel.send(`🔇 Muted ${target.user.tag} for ${dur}`);
  }
  if (cmd === "!unmute") {
    if (!msg.member.permissions.has("ModerateMembers")) return msg.reply("No permission!");
    let target = msg.mentions.members.first();
    if (!target) return msg.reply("Mention user!");
    await target.timeout(null).catch(()=>{});
    return msg.channel.send(`🔊 Unmuted ${target.user.tag}`);
  }
  if (cmd === "!clear") {
    if (!msg.member.permissions.has("ManageMessages")) return msg.reply("No permission!");
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
});

client.login(process.env.TOKEN)
