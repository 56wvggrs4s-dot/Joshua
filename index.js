const { Client, GatewayIntentBits, Events, PermissionsBitField, EmbedBuilder } = require("discord.js");
const http = require("http");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = "p.";
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const ECONOMY_FILE = "./economy.json";
let economy = {};
if (fs.existsSync(ECONOMY_FILE)) { try { economy = JSON.parse(fs.readFileSync(ECONOMY_FILE, "utf8")); } catch { economy = {}; } }
function saveEconomy() { fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2)); }
function getUser(id) { if (!economy[id]) economy[id] = { balance: 0, bank: 0, lastDaily: 0, lastWork: 0, lastRisk: 0, lastCrime: 0, lastHut: 0, lastRob: 0 }; return economy[id]; }
function random(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function coins(n) { return Number(n).toLocaleString(); }
function cooldownMessage(ms) { const s = Math.ceil(ms / 1000); if (s >= 60) { const m = Math.floor(s / 60), r = s % 60; return r ? `${m}m ${r}s` : `${m}m`; } return `${s}s`; }
function admin(message) { return message.member?.permissions.has(PermissionsBitField.Flags.Administrator); }
function targetUser(message) { return message.mentions.users.first(); }
function targetMember(message) { return message.mentions.members.first(); }

client.once(Events.ClientReady, bot => console.log(`🤖 ${bot.user.tag} está conectado!`));

client.on(Events.MessageCreate, async message => {
  try {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();
    if (!command) return;
    const user = getUser(message.author.id);
    const reply = text => message.reply(text);

    if (command === "ping") return reply("🏓 ¡Pong! Joshua está funcionando.");
    if (command === "hola") return reply(`👋 ¡Hola, ${message.author}!`);
    if (command === "info") return reply("🤖 **Joshua Bot**\n\n⚙️ Bot de Discord\n🔧 Prefijo: `p.`\n💰 Sistema de economía activo\n🛡️ Sistema de moderación activo");
    if (command === "help") return reply("📚 **COMANDOS DE JOSHUA**\n\n🤖 **Generales**\n`p.ping` `p.hola` `p.info` `p.help` `p.serverinfo` `p.userinfo @usuario`\n\n💰 **Economía**\n`p.balance` `p.daily` `p.work` `p.risk` `p.crimen` `p.hut` `p.rob @usuario` `p.coinflip` `p.gift @usuario cantidad` `p.pay @usuario cantidad` `p.profile` `p.rank` `p.bank` `p.stats`\n\n🏦 **Banco**\n`p.dep all` `p.with all`\n\n🛡️ Usa `p.helpadmin` para administración.");

    if (command === "serverinfo") {
      if (!message.guild) return reply("❌ Este comando solo funciona dentro de un servidor.");
      const g = message.guild, owner = await g.fetchOwner();
      const roles = g.roles.cache.filter(r => r.id !== g.id).map(r => `<@&${r.id}>`).join(", ") || "Ninguno";
      const embed = new EmbedBuilder().setTitle(`🏠 Información de ${g.name}`).setThumbnail(g.iconURL({ dynamic: true })).addFields(
        { name: "📛 Nombre", value: g.name, inline: true }, { name: "🆔 ID", value: g.id, inline: true }, { name: "👑 Dueño", value: owner.user.tag, inline: true },
        { name: "👥 Miembros", value: `${g.memberCount}`, inline: true }, { name: "🤖 Bots", value: `${g.members.cache.filter(m => m.user.bot).size}`, inline: true },
        { name: "👤 Humanos", value: `${g.members.cache.filter(m => !m.user.bot).size}`, inline: true }, { name: "📅 Creado", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:F>` },
        { name: "📁 Canales", value: `${g.channels.cache.size}`, inline: true }, { name: "💬 Texto", value: `${g.channels.cache.filter(c => c.isTextBased()).size}`, inline: true },
        { name: "🔊 Voz", value: `${g.channels.cache.filter(c => c.isVoiceBased()).size}`, inline: true }, { name: `🎭 Roles (${g.roles.cache.size - 1})`, value: roles.length > 1024 ? roles.slice(0, 1020) + "..." : roles }
      ).setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (command === "userinfo" || command === "user") {
      if (!message.guild) return reply("❌ Este comando solo funciona dentro de un servidor.");
      const m = targetMember(message) || message.member, u = getUser(m.user.id);
      const roles = m.roles.cache.filter(r => r.id !== message.guild.id).map(r => `<@&${r.id}>`).join(", ") || "Ninguno";
      const embed = new EmbedBuilder().setTitle(`👤 ${m.user.username}`).setThumbnail(m.user.displayAvatarURL({ dynamic: true })).addFields(
        { name: "📛 Usuario", value: m.user.tag, inline: true }, { name: "🆔 ID", value: m.user.id, inline: true }, { name: "🤖 Bot", value: m.user.bot ? "Sí" : "No", inline: true },
        { name: "📅 Cuenta creada", value: `<t:${Math.floor(m.user.createdTimestamp / 1000)}:F>` }, { name: "📥 Entró al servidor", value: m.joinedTimestamp ? `<t:${Math.floor(m.joinedTimestamp / 1000)}:F>` : "Desconocido" },
        { name: "🎭 Roles", value: roles.length > 1024 ? roles.slice(0, 1020) + "..." : roles }, { name: "💰 Dinero", value: coins(u.balance), inline: true }, { name: "🏦 Banco", value: coins(u.bank), inline: true }, { name: "💎 Total", value: coins(u.balance + u.bank), inline: true }
      ).setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (command === "balance" || command === "bal" || command === "profile" || command === "stats") return reply(`💰 **${message.author.username}**\n\n💵 Dinero: **${coins(user.balance)}**\n🏦 Banco: **${coins(user.bank)}**\n💎 Total: **${coins(user.balance + user.bank)}**`);
    if (command === "bank") return reply(`🏦 **Tu banco**\n\n💰 Tienes **${coins(user.bank)} monedas** guardadas.`);

    if (command === "daily" || command === "work") {
      const now = Date.now(), key = command === "daily" ? "lastDaily" : "lastWork", cd = command === "daily" ? 86400000 : 30000, remaining = cd - (now - user[key]);
      if (remaining > 0) return reply(`⏰ Espera **${cooldownMessage(remaining)}** para volver a intentarlo.`);
      const reward = command === "daily" ? 1000 : random(10, 150); user.balance += reward; user[key] = now; saveEconomy();
      return reply(`${command === "daily" ? "🎁 **RECOMPENSA DIARIA**" : "💼 **¡Trabajaste!**"}\n\n💰 Ganaste **${coins(reward)} monedas**.`);
    }

    if (command === "risk" || command === "crimen") {
      const crime = command === "crimen", now = Date.now(), key = crime ? "lastCrime" : "lastRisk", cd = crime ? 120000 : 60000, remaining = cd - (now - user[key]);
      if (remaining > 0) return reply(`⏰ Espera **${cooldownMessage(remaining)}**.`);
      user[key] = now;
      if (Math.random() < (crime ? .20 : .30)) { const reward = crime ? random(300, 500) : random(100, 300); user.balance += reward; saveEconomy(); return reply(`🎲 **¡Ganaste!**\n\n💰 Recibiste **${coins(reward)} monedas**.`); }
      const loss = Math.min(crime ? random(200, 600) : random(100, 400), user.balance); user.balance -= loss; saveEconomy(); return reply(`🚔 **¡Fallaste!**\n\n💸 Perdiste **${coins(loss)} monedas**.`);
    }

    if (command === "hut") {
      const now = Date.now(), remaining = 180000 - (now - user.lastHut); if (remaining > 0) return reply(`⏰ Espera **${cooldownMessage(remaining)}**.`); user.lastHut = now;
      const questions = [{ question: "🌍 ¿Cuál es la capital de Francia?", answer: "paris" }, { question: "➕ ¿Cuánto es 7 + 8?", answer: "15" }, { question: "🪐 ¿Cuál es el planeta más cercano al Sol?", answer: "mercurio" }, { question: "🌊 ¿Cuántos océanos hay aproximadamente en la Tierra?", answer: "5" }, { question: "🐝 ¿Qué animal produce miel?", answer: "abeja" }];
      const selected = questions[random(0, questions.length - 1)]; await reply(`🧠 **PREGUNTA POR DINERO**\n\n${selected.question}\n\n⏳ Tienes **30 segundos** para responder.`);
      try { const collected = await message.channel.awaitMessages({ filter: m => m.author.id === message.author.id, max: 1, time: 30000, errors: ["time"] }); const answer = collected.first().content.trim().toLowerCase();
        if (answer === selected.answer) { const reward = random(200, 500); user.balance += reward; saveEconomy(); return message.channel.send(`✅ **¡Correcto!**\n💰 Ganaste **${coins(reward)} monedas**.`); }
        const loss = Math.min(random(300, 500), user.balance); user.balance -= loss; saveEconomy(); return message.channel.send(`❌ **Incorrecto.**\n💸 Perdiste **${coins(loss)} monedas**.`);
      } catch { return message.channel.send("⏰ Se acabó el tiempo."); }
    }

    if (command === "rob") {
      const now = Date.now(), remaining = 300000 - (now - user.lastRob); if (remaining > 0) return reply(`⏰ Espera **${cooldownMessage(remaining)}**.`);
      const target = targetUser(message); if (!target) return reply("🥷 Usa `p.rob @usuario`."); if (target.id === message.author.id) return reply("😂 No puedes robarte a ti mismo."); if (target.bot) return reply("🤖 No puedes robarle a un bot.");
      const victim = getUser(target.id); if (victim.balance <= 0) return reply(`💸 ${target.username} no tiene dinero en efectivo.`); user.lastRob = now;
      if (Math.random() < .5) { const stolen = Math.min(random(50, 300), victim.balance); victim.balance -= stolen; user.balance += stolen; saveEconomy(); return reply(`🥷 **¡Robo exitoso!**\n\n💰 Conseguí **${coins(stolen)} monedas** de ${target}.`); }
      const fine = Math.min(random(50, 200), user.balance); user.balance -= fine; saveEconomy(); return reply(`🚔 **¡Te atraparon!**\n\n💸 Perdiste **${coins(fine)} monedas**.`);
    }

    if (command === "coinflip") return reply(`🪙 Lanzando la moneda...\n\n➡️ Resultado: ${Math.random() < .5 ? "🪙 **CARA**" : "🪙 **CRUZ**"}`);
    if (command === "gift" || command === "pay") {
      const target = targetUser(message), amount = Number(args.find(a => /^\d+$/.test(a))); if (!target || !amount) return reply(`🎁 Usa: \`p.${command} @usuario cantidad\``); if (target.id === message.author.id) return reply("😂 No puedes transferirte monedas a ti mismo."); if (target.bot && command === "gift") return reply("🤖 No puedes regalar monedas a un bot."); if (amount <= 0 || user.balance < amount) return reply("💸 Cantidad inválida o no tienes suficientes monedas."); const recipient = getUser(target.id); user.balance -= amount; recipient.balance += amount; saveEconomy(); return reply(`💸 Transferiste **${coins(amount)} monedas** a ${target}.`);
    }
    if (command === "rank") { const ranking = Object.entries(economy).sort((a, b) => b[1].balance + b[1].bank - a[1].balance - a[1].bank).slice(0, 10); let text = "🏆 **TOP 10 MÁS RICOS**\n\n"; for (let i = 0; i < ranking.length; i++) { const [id, data] = ranking[i]; let name = "Usuario"; try { name = (await message.guild.members.fetch(id)).user.username; } catch {} text += `**${i + 1}.** ${name} — 💰 ${coins(data.balance + data.bank)}\n`; } return reply(text); }
    if (command === "dep" || command === "deposit") { if (args[0]?.toLowerCase() !== "all") return reply("🏦 Usa `p.dep all`."); if (user.balance <= 0) return reply("💸 No tienes dinero para depositar."); user.bank += user.balance; const amount = user.balance; user.balance = 0; saveEconomy(); return reply(`🏦 Depositaste **${coins(amount)} monedas**.`); }
    if (command === "with" || command === "withdraw") { if (args[0]?.toLowerCase() !== "all") return reply("💳 Usa `p.with all`."); if (user.bank <= 0) return reply("🏦 No tienes dinero en el banco."); const amount = user.bank; user.balance += amount; user.bank = 0; saveEconomy(); return reply(`💳 Retiraste **${coins(amount)} monedas**.`); }

    if (command === "helpadmin") { if (!admin(message)) return reply("❌ Este comando es exclusivo para administradores."); return reply("🛡️ **COMANDOS DE ADMINISTRACIÓN**\n\n`p.mute @usuario` `p.unmute @usuario` `p.kick @usuario` `p.ban @usuario` `p.unban ID` `p.permaban @usuario` `p.warn @usuario` `p.purge cantidad`"); }
    if (["mute", "unmute", "kick", "ban", "permaban", "warn"].includes(command)) {
      if (!admin(message)) return reply("❌ Necesitas permisos de administrador."); const member = targetMember(message), target = targetUser(message); if ((command !== "unban") && !member && command !== "warn") return reply(`❌ Usa \`p.${command} @usuario\`.`);
      if (command === "warn") return reply(`⚠️ **Advertencia registrada** para ${target || "el usuario"}.\n📝 Moderador: ${message.author}`);
      if (command === "mute") { if (!member.moderatable) return reply("❌ No puedo aplicar timeout a ese usuario."); await member.timeout(3600000, `Mute por ${message.author.tag}`); return reply(`🔇 ${member} ha sido muteado durante **1 hora**.`); }
      if (command === "unmute") { if (!member.moderatable) return reply("❌ No puedo modificar a ese usuario."); await member.timeout(null); return reply(`🔊 ${member} ha sido desmuteado.`); }
      if (command === "kick") { if (!member.kickable) return reply("❌ No puedo expulsar a ese usuario."); await member.kick(`Kick por ${message.author.tag}`); return reply(`👢 **${member.user.tag}** fue expulsado.`); }
      if (!member.bannable) return reply("❌ No puedo banear a ese usuario."); await member.ban({ reason: `${command === "permaban" ? "Permaban" : "Ban"} por ${message.author.tag}` }); return reply(`🔨 **${member.user.tag}** fue baneado.`);
    }
    if (command === "unban") { if (!admin(message)) return reply("❌ Necesitas permisos de administrador."); if (!args[0]) return reply("♻️ Usa `p.unban ID`."); try { await message.guild.members.unban(args[0], `Unban por ${message.author.tag}`); return reply(`♻️ Usuario **${args[0]}** desbaneado.`); } catch { return reply("❌ No encontré ese usuario entre los baneados o el ID no es válido."); } }
    if (command === "purge") { if (!admin(message)) return reply("❌ Necesitas permisos de administrador."); const amount = Number(args[0]); if (!Number.isInteger(amount) || amount < 1 || amount > 99) return reply("🧹 Usa una cantidad entre **1 y 99**."); const deleted = await message.channel.bulkDelete(amount, true), confirmation = await message.channel.send(`🧹 Eliminé **${deleted.size} mensajes**.`); setTimeout(() => confirmation.delete().catch(() => {}), 3000); }
  } catch (error) { console.error("❌ Error:", error); message.reply("❌ Ocurrió un error ejecutando ese comando.").catch(() => {}); }
});

http.createServer((req, res) => { res.writeHead(200); res.end("Joshua está funcionando 🤖"); }).listen(PORT, () => console.log(`🌐 Servidor escuchando en el puerto ${PORT}`));
client.login(TOKEN);
