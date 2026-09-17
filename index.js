const fs = require('fs');
const express = require('express');
const app = express();
let pendingOrders = [];
let linked = {};
if (fs.existsSync('./linked.json')) {
    linked = JSON.parse(fs.readFileSync('./linked.json'));
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
app.listen(3000, () => console.log('API running'));

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
}

const shopItems = {
  "vip7d": { name: "VIP Rank [7 Days]", price: 5000, type: "temprole", role: "vip", duration: "7d", desc: "VIP for 7 days" },
  "vip30d": { name: "VIP Rank [30 Days]", price: 15000, type: "temprole", role: "vip", duration: "30d", desc: "VIP for 30 days" },
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
  let cmd = args[0].toLowerCase();

  if (!msg.content.startsWith("!")) await db.add(`xp_${msg.author.id}`, 5);

  if (cmd === "!help") {
    const helpEmbed = new EmbedBuilder()
    .setTitle("📜 PLASMA BOT - HELP MENU")
    .setColor(0x00FFFF)
    .setThumbnail(client.user.displayAvatarURL())
    .setDescription("Here are all available commands")
    .addFields(
        { name: "💰 Economy", value: "`!bal`, `!daily`, `!pay @user 500`, `!shop`, `!buy <item>`, `!inv`, `!rank`", inline: false },
        { name: "🎁 Redeem", value: "`!redeem CODE`\n`!redeem code create CODE amount [item]`", inline: false },
        { name: "⏳ Temp Rank", value: "`!temprank @user @Role 7d`", inline: false },
        { name: "🔨 Moderation", value: "`!ban @user`, `!kick @user`, `!mute @user 10m`, `!unmute`, `!clear 10`", inline: false },
        { name: "👤 Utility", value: "`!avatar @user`, `!userinfo`, `!serverinfo`, `!ping`", inline: false }
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
    await db.add(`coins_${msg.author.id}`, 500);
    await db.set(`daily_${msg.author.id}`, Date.now());
    return msg.reply("You received 500 coins!");
  }
  if (cmd === "!shop") {
    let txt = "**🏪 SHOP**\n";
    for (let id in shopItems) txt += `**${id}** - ${shopItems[id].name} - ${shopItems[id].price} coins\n`;
    return msg.channel.send(txt);
  }
      if (cmd === "!link") {
        const mcname = args[1];
        if (!mcname) return msg.reply('Usage:!link <your_minecraft_name>');
        linked[msg.author.id] = mcname;
        fs.writeFileSync('./linked.json', JSON.stringify(linked));
        return msg.reply(`Linked! ${msg.author.tag} -> ${mcname}`);
    }

    if (cmd === "!buy") {
        const mcname = linked[msg.author.id];
        if (!mcname) return msg.reply('Not linked! Use!link <your_minecraft_name> first.');
        const input = args[1]?.toLowerCase();
        if (!input) return msg.reply('Usage:!buy hero7d or!buy hero30d');
        let days = input.includes('30')? '30' : '7';
        let rank = 'hero';
        await fetch(`http://localhost:3000/api/buy?player=${mcname}&rank=${rank}&days=${days}&key=PLASMA123`);
        return msg.reply(`${mcname} will receive ${rank} ${days}d in 10 seconds.`);
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
    let amount = parseInt(args[1]) || 20;
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

client.login(process.env.TOKEN);
