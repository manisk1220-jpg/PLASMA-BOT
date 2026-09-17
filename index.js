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
  vip: "VIP_ROLE_ID_HERE",
  pro: "PRO_ROLE_ID_HERE"
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

  // ========= HELP COMMAND =========
  if (cmd === "!help") {
    const helpEmbed = new EmbedBuilder()
     .setTitle("📜 PLASMA BOT - HELP MENU")
     .setColor(0x00FFFF)
     .setThumbnail(client.user.displayAvatarURL())
     .setDescription("Here are all available commands")
     .addFields(
        { name: "💰 Economy Commands", value: "`!bal`, `!daily`, `!pay @user 500`, `!shop`, `!buy <item>`, `!inv`, `!rank`, `!leaderboard`, `!hunt`", inline: false },
        { name: "🎁 Redeem System", value: "`!redeem CODE` - Redeem a code\n`!redeem code create CODE amount [item]` - Admin only\nEx: `!redeem code create DIWALI 5000 vip7d`", inline: false },
        { name: "⏳ Temp Rank System", value: "`!temprank @user @Role 7d` - Give temp role\n`!temprank @user @Role 30d`\n`!buy vip7d` / `!buy vip30d` - Buy from shop", inline: false },
        { name: "🔨 Moderation Commands", value: "`!ban @user [reason]`\n`!kick @user [reason]`\n`!mute @user 10m` / `!unmute @user`\n`!clear 10` - Delete messages", inline: false },
        { name: "👤 Utility & Info", value: "`!avatar @user` - Show avatar\n`!userinfo @user` / `!whois @user`\n`!serverinfo`\n`!ping` - Bot latency", inline: false },
        { name: "🚀 Future Coming Soon", value: "`!level`, `!profile`, `!slots`, `!coinflip`, `!rob`\nMore games & shop items!", inline: false }
      )
     .setFooter({ text: `Requested by ${msg.author.tag}`, iconURL: msg.author.displayAvatarURL() })
     .setTimestamp();
    return msg.channel.send({ embeds: [helpEmbed] });
  }

  // ECONOMY
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
    if (bal < amount) return
