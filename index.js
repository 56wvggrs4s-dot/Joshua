const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const http = require("http");
const fs = require("fs");

const PREFIX = "p.";
const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 3000;
const ECONOMY_FILE = "./economy.json";
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

let economy = {};
if (fs.existsSync(ECONOMY_FILE)) {
  try { economy = JSON.parse(fs.readFileSync(ECONOMY_FILE, "utf8")); } catch { economy = {}; }
}
function saveEconomy() { fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2)); }
function getUser(id) {
  if (!economy[id]) economy[id] = { cash: 0, bank: 0, daily: 0, work: 0, crime: 0, hut: 0, rob: 0, risk: 0, stats: { work: 0, crime: 0, rob: 0, gifts: 0 } };
  const u = economy[id];
  u.cash ??= u.balance ?? 0; u.bank ??= 0; u.stats ??= { work: 0, crime: 0, rob: 0, gifts: 0 };
  u.daily ??= u.lastDaily ?? 0; u.work ??= u.lastWork ?? 0; u.crime ??= u.lastCrime ?? 0; u.hut ??= u.lastHut ?? 0; u.rob ??= u.lastRob ?? 0; u.risk ??= u.lastRisk ?? 0;
  return u;
}
function random(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function money(n) { return `${Number(n).toLocaleString("es-ES")} 🪙`; }
function cooldown(last, seconds) { const r = seconds * 1000 - (Date.now() - last); if (r <= 0) return null; const s = Math.ceil(r / 1000); return `⏳ Espera **${s >= 60 ? Math.ceil(s / 60) + " minuto(s)" : s + " segundo(s)"}**.`; }
function success(t) { return `╭━━━〔 ✅ ÉXITO 〕━━━╮\n┃ ${t}\n╰━━━━━━━━━━━━━━━━━━╯`; }
function error(t) { return `╭━━━〔 ❌ ERROR 〕━━━╮\n┃ ${t}\n╰━━━━━━━━━━━━━━━━━━╯`; }
function box(title, text) { return `╔══════════════════════════════╗\n║ ${title}\n╠══════════════════════════════╣\n${text}\n╚══════════════════════════════╝`; }
function isAdmin(m) { return m.member?.permissions.has(PermissionsBitField.Flags.Administrator); }

client.once("ready", () => {
  console.log(`🤖 Joshua conectado como ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: "p.help 📖", type: 0 }], status: "online" });
});

client.on("messageCreate", async message => {
  try {
    if (message.author.bot || !message.content.toLowerCase().startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();
    if (!command) return;
    const user = getUser(message.author.id);
    const reply = text => message.reply(text);

    if (command === "ping") return reply(box("🏓 PONG", `┃ ⚡ Latencia: **${client.ws.ping}ms**\n┃ 🤖 Joshua está funcionando.\n┃ 🌐 Estado: **ONLINE 🟢**`));
    if (command === "hola") return reply(box("👋 HOLA", `┃ ¡Hola, ${message.author}! 😎\n┃ ✨ ¡Qué bueno verte por aquí!\n┃ 🤖 Joshua te saluda.`));
    if (command === "info") return reply(box("🤖 JOSHUA", "┃ 🛠️ Versión: **1.0**\n┃ ⚡ Prefix: **p.**\n┃ 💰 Economía: **ACTIVA**\n┃ 🎮 Diversión: **ACTIVA**\n┃ 🛡️ Administración: **ACTIVA**\n┃ 🌐 Estado: **ONLINE 🟢**"));
    if (command === "help") return reply(`╔══════════════════════════════════╗\n║       🤖 JOSHUA — AYUDA 📖      ║\n╚══════════════════════════════════╝\n\n💰 ━━━ ECONOMÍA ━━━\n> 💵 \`p.balance\` · 🏦 \`p.bank\` · 🎁 \`p.daily\` · 💼 \`p.work\`\n> 🕵️ \`p.crimen\` · 🧠 \`p.hut\` · 🥷 \`p.rob @usuario\` · 🎲 \`p.risk\`\n> 🏦 \`p.dep all\` · 💵 \`p.with all\` · 🎁 \`p.gift @usuario cantidad\` · 💸 \`p.pay @usuario cantidad\`\n\n👤 ━━━ PERFIL ━━━\n> 👤 \`p.profile\` · 📊 \`p.stats\` · 🔎 \`p.userinfo @usuario\` · 🏰 \`p.serverinfo\` · 👑 \`p.rank\`\n\n🎮 ━━━ DIVERSIÓN ━━━\n> 🪙 \`p.coinflip\` · 🎲 \`p.dado\` · 🎱 \`p.8ball pregunta\` · 😎 \`p.emoji\`\n> 🎯 \`p.challenge\` · 📢 \`p.say texto\`\n\n⚙️ \`p.ping\` · \`p.hola\` · \`p.info\`\n\n🛡️ Usa **p.helpadmin** para comandos de administración.`);
    if (command === "helpadmin") {
      if (!isAdmin(message)) return reply(error("🚫 Necesitas permisos de Administrador."));
      return reply(`╔══════════════════════════════════╗\n║       🛡️ JOSHUA — ADMIN         ║\n╚══════════════════════════════════╝\n\n🔨 \`p.mute @usuario\` · \`p.unmute @usuario\` · \`p.kick @usuario\`\n🔨 \`p.ban @usuario\` · \`p.unban ID\` · \`p.permaban @usuario\`\n⚠️ \`p.warn @usuario\` · 🧹 \`p.purge cantidad\``);
    }

    if (command === "balance" || command === "bal") return reply(box("💰 TU ECONOMÍA", `┃ 💵 Efectivo: **${money(user.cash)}**\n┃ 🏦 Banco: **${money(user.bank)}**\n┃ 💎 TOTAL: **${money(user.cash + user.bank)}**`));
    if (command === "bank") return reply(box("🏦 BANCO", `┃ 🔐 Protegido: **${money(user.bank)}**\n┃ 💵 Efectivo: **${money(user.cash)}**\n┃ 💎 Total: **${money(user.cash + user.bank)}**`));

    if (command === "daily" || command === "work") {
      const key = command, cd = cooldown(user[key], command === "daily" ? 86400 : 30);
      if (cd) return reply(error(cd));
      const reward = command === "daily" ? 1000 : random(10, 150); user.cash += reward; user[key] = Date.now(); if (command === "work") user.stats.work++; saveEconomy();
      return reply(success(`${command === "daily" ? "🎁 Recompensa diaria" : "💼 Trabajaste y ganaste"}: **${money(reward)}**.`));
    }
    if (command === "crimen" || command === "risk") {
      const key = command === "crimen" ? "crime" : "risk", cd = cooldown(user[key], command === "crimen" ? 120 : 60);
      if (cd) return reply(error(cd)); user[key] = Date.now(); if (command === "crimen") user.stats.crime++;
      if (Math.random() < (command === "crimen" ? .2 : .3)) { const reward = random(command === "crimen" ? 300 : 100, command === "crimen" ? 500 : 300); user.cash += reward; saveEconomy(); return reply(success(`🎲 ¡Ganaste!\n┃ 💰 Recibiste **${money(reward)}**.`)); }
      const loss = Math.min(user.cash, random(command === "crimen" ? 200 : 100, command === "crimen" ? 600 : 400)); user.cash -= loss; saveEconomy(); return reply(error(`🚨 Salió mal.\n┃ 💸 Perdiste **${money(loss)}**.`));
    }
    if (command === "hut") {
      const cd = cooldown(user.hut, 180); if (cd) return reply(error(cd));
      const qs = [{ q: "¿Cuánto es 7 × 8?", a: "56" }, { q: "¿Cuál es el planeta rojo?", a: "marte" }, { q: "¿Cuántos días tiene una semana?", a: "7" }, { q: "¿Cuál es la capital de Francia?", a: "paris" }], q = qs[random(0, qs.length - 1)]; user.hut = Date.now();
      await reply(`╭━━━〔 🧠 PREGUNTA 〕━━━╮\n┃ ❓ ${q.q}\n┃ ⏳ Tienes **30 segundos**.\n╰━━━━━━━━━━━━━━━━━━━━╯`);
      try { const c = await message.channel.awaitMessages({ filter: m => m.author.id === message.author.id, max: 1, time: 30000 }); const a = c.first().content.toLowerCase().trim(); if (a === q.a) { const r = random(200, 500); user.cash += r; saveEconomy(); return reply(success(`🧠 ¡Correcto!\n┃ 💰 Ganaste **${money(r)}**.`)); } const l = Math.min(user.cash, random(300, 500)); user.cash -= l; saveEconomy(); return reply(error(`❌ Incorrecto.\n┃ 💸 Perdiste **${money(l)}**.`)); } catch { return reply(error("⏰ Se acabó el tiempo.")); }
    }
    if (command === "rob") {
      const cd = cooldown(user.rob, 300); if (cd) return reply(error(cd)); const target = message.mentions.users.first();
      if (!target) return reply(error("🥷 Menciona a alguien.")); if (target.id === message.author.id) return reply(error("😂 No puedes robarte a ti mismo.")); const victim = getUser(target.id); if (victim.cash <= 0) return reply(error("💸 Esa persona no tiene efectivo.")); user.rob = Date.now();
      if (Math.random() < .5) { const amount = Math.min(victim.cash, random(50, Math.max(50, victim.cash))); victim.cash -= amount; user.cash += amount; user.stats.rob++; saveEconomy(); return reply(success(`🥷 ¡Robo exitoso!\n┃ 💰 Conseguí **${money(amount)}**.`)); } saveEconomy(); return reply(error("🚨 ¡Te descubrieron! El robo falló."));
    }
    if (command === "dep" || command === "deposit" || command === "with" || command === "withdraw") {
      if (args[0]?.toLowerCase() !== "all") return reply(error(`Usa: \`p.${command === "dep" || command === "deposit" ? "dep" : "with"} all\``));
      if (command === "dep" || command === "deposit") { if (user.cash <= 0) return reply(error("💵 No tienes efectivo.")); const n = user.cash; user.bank += n; user.cash = 0; saveEconomy(); return reply(success(`🏦 Depositaste **${money(n)}**.`)); }
      if (user.bank <= 0) return reply(error("🏦 No tienes dinero en el banco.")); const n = user.bank; user.cash += n; user.bank = 0; saveEconomy(); return reply(success(`💵 Retiraste **${money(n)}**.`));
    }
    if (command === "gift" || command === "pay") {
      const target = message.mentions.users.first(), amount = parseInt(args.find(a => /^\d+$/.test(a))); if (!target || !amount || amount <= 0) return reply(error(`Usa: \`p.${command} @usuario cantidad\``)); if (target.id === message.author.id) return reply(error("😂 No puedes transferirte dinero.")); if (user.cash < amount) return reply(error("💸 No tienes suficiente efectivo.")); const receiver = getUser(target.id); user.cash -= amount; receiver.cash += amount; if (command === "gift") user.stats.gifts++; saveEconomy(); return reply(success(`${command === "gift" ? "🎁 Regalaste" : "💸 Enviaste"} **${money(amount)}** a **${target.username}**.`));
    }
    if (command === "coinflip") return reply(box("🪙 COINFLIP", `┃ 🎯 Resultado:\n┃ **${Math.random() < .5 ? "CARA 🪙" : "CRUZ 🪙"}**`));
    if (command === "dado") return reply(box("🎲 DADO", `┃ 🎯 Resultado: **${random(1, 6)}**`));
    if (command === "8ball") { if (!args.length) return reply(error("🎱 Hazme una pregunta.")); const a = ["🎯 Sí.", "🤔 Probablemente.", "✨ Definitivamente.", "😬 No estoy seguro.", "❌ No.", "🔮 Las estrellas dicen que sí.", "🌙 Pregunta más tarde."]; return reply(box("🎱 MAGIC 8BALL", `┃ ❓ ${args.join(" ")}\n┃ 🔮 **${a[random(0, a.length - 1)]}**`)); }
    if (command === "emoji") return reply(box("😎 EMOJI", `┃ Tu emoji es:\n┃ ${["😀", "😂", "😎", "🤯", "🔥", "💀", "👑", "🚀", "🎉", "🤖", "🤑", "🥶"][random(0, 11)]}`));
    if (command === "challenge") return reply(box("🎯 RETO", `┃ ${["🎯 Escribe un mensaje usando solo emojis.", "😂 Cuenta un chiste.", "🧠 Di una capital de un país.", "🎮 Di tu videojuego favorito.", "⚡ Escribe una palabra al revés."][random(0, 4)]}`));
    if (command === "say") { if (!args.length) return reply(error("📢 Escribe algo después de `p.say`.")); return reply(box("📢 JOSHUA DICE", `┃ ${args.join(" ")}`)); }

    if (command === "profile" || command === "stats") return reply(box(command === "profile" ? `👤 PERFIL DE ${message.author.username}` : "📊 TUS ESTADÍSTICAS", `┃ 💵 Efectivo: **${money(user.cash)}**\n┃ 🏦 Banco: **${money(user.bank)}**\n┃ 💎 Total: **${money(user.cash + user.bank)}**\n┃ 💼 Trabajos: **${user.stats.work}**\n┃ 🕵️ Misiones: **${user.stats.crime}**\n┃ 🥷 Robos: **${user.stats.rob}**\n┃ 🎁 Regalos: **${user.stats.gifts}**`));
    if (command === "rank") { const r = Object.entries(economy).map(([id, d]) => ({ id, total: (d.cash ?? d.balance ?? 0) + (d.bank ?? 0) })).sort((a, b) => b.total - a.total).slice(0, 10); return reply(box("👑 TOP 10 RICOS", r.map((x, i) => `┃ ${["🥇", "🥈", "🥉"][i] || "🏅"} <@${x.id}> — ${money(x.total)}`).join("\n") || "┃ 😢 Todavía no hay jugadores.")); }

    if (command === "serverinfo") { if (!message.guild) return reply(error("Este comando solo funciona en un servidor.")); const g = message.guild, humans = g.members.cache.filter(m => !m.user.bot).size, bots = g.members.cache.filter(m => m.user.bot).size; return reply(box("🏰 INFORMACIÓN DEL SERVIDOR", `┃ 🏠 Nombre: **${g.name}**\n┃ 🆔 ID: \`${g.id}\`\n┃ 👑 Dueño: <@${g.ownerId}>\n┃ 👥 Miembros: **${g.memberCount}**\n┃ 👤 Humanos: **${humans}**\n┃ 🤖 Bots: **${bots}**\n┃ 💬 Canales: **${g.channels.cache.size}**\n┃ 🎭 Roles: **${g.roles.cache.size}**\n┃ 📅 Creado: <t:${Math.floor(g.createdTimestamp / 1000)}:D>`)); }
    if (command === "userinfo" || command === "user") { if (!message.guild) return reply(error("Este comando solo funciona en un servidor.")); const m = message.mentions.members.first() || message.member, u = m.user, roles = m.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.name).slice(0, 10).join(", ") || "Ninguno"; return reply(box("👤 INFORMACIÓN DEL USUARIO", `┃ 👤 Usuario: **${u.username}**\n┃ 🆔 ID: \`${u.id}\`\n┃ 🤖 Bot: **${u.bot ? "Sí" : "No"}\`\n┃ 📅 Cuenta: <t:${Math.floor(u.createdTimestamp / 1000)}:D>\n┃ 📥 Entró: ${m.joinedTimestamp ? `<t:${Math.floor(m.joinedTimestamp / 1000)}:D>` : "Desconocido"}\n┃ 🎭 Roles: **${roles}**`)); }

    const adminCommands = ["mute", "unmute", "kick", "ban", "unban", "permaban", "warn", "purge"];
    if (adminCommands.includes(command)) {
      if (!isAdmin(message)) return reply(error("🚫 Necesitas permisos de Administrador."));
      if (command === "unban") { if (!args[0]) return reply(error("🔓 Usa: `p.unban ID`")); try { await message.guild.members.unban(args[0]); return reply(success(`🔓 Usuario \`${args[0]}\` desbaneado.`)); } catch { return reply(error("❌ No encontré ese usuario en los baneados.")); } }
      if (command === "purge") { const amount = parseInt(args[0]); if (!amount || amount < 1 || amount > 99) return reply(error("🧹 Usa una cantidad entre **1 y 99**.")); try { const deleted = await message.channel.bulkDelete(amount, true); const msg = await message.channel.send(success(`🧹 Eliminé **${deleted.size} mensajes**.`)); setTimeout(() => msg.delete().catch(() => {}), 4000); return; } catch { return reply(error("❌ No pude borrar los mensajes.")); } }
      const member = message.mentions.members.first(); if (!member) return reply(error("Menciona al usuario."));
      if (command === "warn") return reply(box("⚠️ ADVERTENCIA", `┃ 👤 Usuario: **${member.user.username}**\n┃ 👮 Moderador: **${message.author.username}**\n┃ ⚠️ El usuario recibió una advertencia.`));
      try {
        if (command === "mute") { if (!member.moderatable) return reply(error("❌ No puedo silenciar a ese usuario.")); await member.timeout(3600000, `Mute por ${message.author.tag}`); return reply(success(`🔇 **${member.user.username}** fue silenciado durante **1 hora**.`)); }
        if (command === "unmute") { await member.timeout(null); return reply(success(`🔊 Se quitó el silencio a **${member.user.username}**.`)); }
        if (command === "kick") { if (!member.kickable) return reply(error("❌ No puedo expulsar a ese usuario.")); await member.kick(`Kick por ${message.author.tag}`); return reply(success(`👢 **${member.user.username}** fue expulsado.`)); }
        if (command === "ban" || command === "permaban") { if (!member.bannable) return reply(error("❌ No puedo banear a ese usuario.")); await member.ban({ reason: `${command} por ${message.author.tag}` }); return reply(success(`🔨 **${member.user.username}** fue baneado.`)); }
      } catch { return reply(error("❌ No pude completar la acción.")); }
    }
    return reply(`╭━━━〔 ❓ ¿QUÉ? 〕━━━╮\n┃ ❌ No conozco \`${PREFIX}${command}\`.\n┃ 📖 Usa **p.help**\n╰━━━━━━━━━━━━━━━━━━╯`);
  } catch (e) { console.error("❌ Error:", e); message.reply(error("Ocurrió un error ejecutando ese comando.")).catch(() => {}); }
});

http.createServer((req, res) => { res.writeHead(200); res.end("🤖 Joshua está funcionando correctamente."); }).listen(PORT, () => console.log(`🌐 Puerto ${PORT} activo.`));
client.login(TOKEN);
