const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const http = require("http");

const PREFIX = "p.";
const FILE = path.join(__dirname, "economy.json");
const PORT = Number(process.env.PORT) || 3000;
const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

let economy = {};
try {
  if (fs.existsSync(FILE)) {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    economy = raw?.users && typeof raw.users === "object" ? raw.users : raw;
    if (!economy || typeof economy !== "object" || Array.isArray(economy)) economy = {};
  }
} catch (err) { console.error("No se pudo leer economy.json:", err.message); }

function save() { try { fs.writeFileSync(FILE, JSON.stringify(economy, null, 2)); } catch (e) { console.error("Error guardando economía:", e.message); } }
function getUser(id) {
  const old = economy[id] && typeof economy[id] === "object" ? economy[id] : {};
  economy[id] = { cash: 0, bank: 0, inventory: [], messages: 0, commands: 0, wins: 0, losses: 0, daily: 0, work: 0, crime: 0, hut: 0, rob: 0, ...old };
  if (!Array.isArray(economy[id].inventory)) economy[id].inventory = Object.entries(economy[id].inventory || {}).flatMap(([k, v]) => Array(Number(v) || 0).fill(k));
  for (const k of ["cash", "bank", "messages", "commands", "wins", "losses", "daily", "work", "crime", "hut", "rob"]) if (!Number.isFinite(Number(economy[id][k]))) economy[id][k] = 0;
  return economy[id];
}
function money(n) { return Math.max(0, Number(n) || 0).toLocaleString("es-ES"); }
function random(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function box(title, text, color = 0x5865f2) { return new EmbedBuilder().setColor(color).setTitle(title).setDescription(text).setTimestamp().setFooter({ text: "Joshua 🤖" }); }
function ok(t) { return box("✅ JOSHUA", t, 0x57f287); }
function fail(t) { return box("❌ JOSHUA", t, 0xed4245); }
function info(t) { return box("🤖 JOSHUA", t); }
function admin(m) { return Boolean(m.member?.permissions?.has(PermissionsBitField.Flags.Administrator)); }
const cds = new Map();
function cooldown(id, name, seconds) { const k = `${id}:${name}`, now = Date.now(), end = cds.get(k) || 0; if (end > now) return Math.ceil((end - now) / 1000); cds.set(k, now + seconds * 1000); return 0; }
function left(s) { return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60 ? `${s % 60}s` : ""}`; }

const prices = { pizza: 100, burger: 150, laptop: 1500, diamond: 5000, crown: 10000 };
const questions = [
  { q: "¿Cuánto es 10 + 5?", a: ["15"] },
  { q: "¿Cuál es la capital de Francia?", a: ["paris", "parís"] },
  { q: "¿Cuántos días tiene una semana?", a: ["7", "siete"] },
  { q: "¿Cuál es el planeta rojo?", a: ["marte"] }
];

function helpMenu() {
  const cats = [["Economía", "Dinero y recompensas", "eco", "💰"], ["Tienda", "Objetos e inventario", "shop", "🛒"], ["Perfil", "Estadísticas", "profile", "👤"], ["Diversión", "Juegos", "fun", "🎮"], ["Servidor", "Información", "server", "🏰"], ["Administración", "Moderación", "admin", "🛡️"]];
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("joshua_help").setPlaceholder("📚 Selecciona una categoría...").addOptions(cats.map(([l, d, v, e]) => new StringSelectMenuOptionBuilder().setLabel(l).setDescription(d).setValue(v).setEmoji(e))));
}
function help(category = "home") {
  const pages = {
    home: ["🤖✨ JOSHUA — AYUDA", "Selecciona una categoría en el menú.\n\nPrefijo: `p.`"],
    eco: ["💰 ECONOMÍA", "`p.balance` `p.daily` `p.work` `p.crimen` `p.rob @usuario`\n`p.dep cantidad/all` `p.with cantidad/all`\n`p.pay @usuario cantidad` `p.gift @usuario cantidad` `p.rank`"],
    shop: ["🛒 TIENDA", "`p.shop` `p.buy objeto` `p.inventory` `p.sell objeto`"],
    profile: ["👤 PERFIL", "`p.profile` `p.stats` `p.userinfo @usuario` `p.avatar @usuario` `p.rank`"],
    fun: ["🎮 DIVERSIÓN", "`p.coinflip` `p.dado` `p.random mínimo máximo` `p.8ball pregunta`\n`p.rps piedra/papel/tijera` `p.joke` `p.choose a | b` `p.trivia`"],
    server: ["🏰 SERVIDOR", "`p.serverinfo` `p.channels` `p.roles` `p.emojis` `p.boosts` `p.created` `p.online`"],
    admin: ["🛡️ ADMINISTRACIÓN", "`p.ban` `p.unban ID` `p.kick` `p.mute` `p.unmute` `p.warn`\n`p.purge` `p.lock` `p.unlock` `p.slowmode` `p.nick` `p.roleinfo` `p.helpadmin`"]
  };
  const [title, text] = pages[category] || pages.home;
  return box(title, text, category === "admin" ? 0xed4245 : 0x5865f2);
}

client.once("ready", () => {
  console.log(`✅ Joshua conectado como ${client.user.tag}`);
  console.log(`🏰 Servidores: ${client.guilds.cache.size}`);
  client.user.setPresence({ activities: [{ name: "p.help 🤖", type: 0 }], status: "online" });
});
client.on("warn", console.warn);
client.on("error", console.error);
process.on("unhandledRejection", e => console.error("Unhandled Rejection:", e));
process.on("uncaughtException", e => console.error("Uncaught Exception:", e));

client.on("interactionCreate", async i => {
  if (i.isStringSelectMenu() && i.customId === "joshua_help") await i.update({ embeds: [help(i.values[0])], components: [helpMenu()] });
});

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;
  const user = getUser(message.author.id); user.messages++; save();
  if (!message.content.toLowerCase().startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/).filter(Boolean);
  const command = (args.shift() || "").toLowerCase(); if (!command) return;
  user.commands++; save();
  const reply = content => message.reply(typeof content === "string" ? { content, allowedMentions: { repliedUser: false } } : { ...content, allowedMentions: { repliedUser: false } });

  if (command === "help") return reply({ embeds: [help()], components: [helpMenu()] });
  if (command === "ping") return reply({ embeds: [info(`🏓 Ping: **${client.ws.ping}ms**\n🟢 Joshua está conectado.`)] });
  if (command === "balance" || command === "bal") return reply({ embeds: [info(`💵 Efectivo: **${money(user.cash)} 🪙**\n🏦 Banco: **${money(user.bank)} 🪙**\n💎 Total: **${money(user.cash + user.bank)} 🪙**`)] });
  if (command === "bank") return reply({ embeds: [info(`🏦 Banco: **${money(user.bank)} 🪙**\n💵 Efectivo: **${money(user.cash)} 🪙**\n\nUsa \\`p.dep all\\` o \\`p.with all\\`.`)] });

  if (["daily", "work", "crimen"].includes(command)) {
    const times = { daily: 86400, work: 30, crimen: 120 }, cd = cooldown(message.author.id, command, times[command]);
    if (cd) return reply({ embeds: [fail(`⏰ Espera **${left(cd)}** para volver a usarlo.`)] });
    if (command === "daily") { user.cash += 1000; user.wins++; user.daily++; save(); return reply({ embeds: [ok(`🎁 Recibiste **1.000 🪙**.`)] }); }
    if (command === "work") { const n = random(10, 150); user.cash += n; user.wins++; user.work++; save(); return reply({ embeds: [ok(`💼 Ganaste **${money(n)} 🪙**.`)] }); }
    if (Math.random() < .2) { const n = random(300, 500); user.cash += n; user.wins++; user.crime++; save(); return reply({ embeds: [ok(`🕵️ Crimen exitoso: ganaste **${money(n)} 🪙**.`)] }); }
    const n = Math.min(user.cash, random(200, 600)); user.cash -= n; user.losses++; user.crime++; save(); return reply({ embeds: [fail(`🚔 Crimen fallido: perdiste **${money(n)} 🪙**.`)] });
  }

  if (command === "dep" || command === "deposit" || command === "with" || command === "withdraw") {
    const withdraw = command === "with" || command === "withdraw", arg = (args[0] || "").toLowerCase(), amount = arg === "all" ? (withdraw ? user.bank : user.cash) : Number(arg), source = withdraw ? user.bank : user.cash;
    if (!Number.isSafeInteger(amount) || amount <= 0) return reply({ embeds: [fail(`Usa \\`p.${command} cantidad\\` o \\`all\\`.`)] });
    if (amount > source) return reply({ embeds: [fail("No tienes fondos suficientes.")] });
    if (withdraw) { user.bank -= amount; user.cash += amount; } else { user.cash -= amount; user.bank += amount; }
    save(); return reply({ embeds: [ok(`${withdraw ? "📤 Retiraste" : "📥 Depositaste"} **${money(amount)} 🪙**.`)] });
  }

  if (["pay", "gift"].includes(command)) {
    const target = message.mentions.users.first(), amount = Number(args.find(x => /^\d+$/.test(x)));
    if (!target || target.id === message.author.id || target.bot || !Number.isSafeInteger(amount) || amount <= 0) return reply({ embeds: [fail(`Uso: \\`p.${command} @usuario cantidad\\`.`)] });
    if (user.cash < amount) return reply({ embeds: [fail("No tienes suficiente efectivo.")] });
    user.cash -= amount; getUser(target.id).cash += amount; save(); return reply({ embeds: [ok(`💸 Enviaste **${money(amount)} 🪙** a ${target}.`)] });
  }

  if (command === "rob") {
    const target = message.mentions.users.first(), cd = cooldown(message.author.id, "rob", 300);
    if (cd) return reply({ embeds: [fail(`🥷 Espera **${left(cd)}**.`)] });
    if (!target || target.id === message.author.id || target.bot) return reply({ embeds: [fail("Menciona a un usuario válido que no sea un bot ni tú mismo.")] });
    const victim = getUser(target.id); if (victim.cash <= 0) return reply({ embeds: [fail("Ese usuario no tiene efectivo.")] });
    if (Math.random() < .45) { const n = Math.min(victim.cash, random(50, 250)); victim.cash -= n; user.cash += n; user.wins++; save(); return reply({ embeds: [ok(`🥷 Robaste **${money(n)} 🪙** a ${target}.`)] }); }
    const fine = Math.min(user.cash, random(50, 150)); user.cash -= fine; user.losses++; save(); return reply({ embeds: [fail(`🚔 Robo fallido. Perdiste **${money(fine)} 🪙**.`)] });
  }

  if (command === "rank") {
    const rows = Object.entries(economy).sort((a, b) => b[1].cash + b[1].bank - a[1].cash - a[1].bank).slice(0, 10);
    return reply({ embeds: [box("🏆 RANKING", rows.map(([id, u], i) => `**${i + 1}.** <@${id}> — **${money(u.cash + u.bank)} 🪙**`).join("\n") || "Sin datos.", 0xfee75c)] });
  }
  if (command === "stats" || command === "profile") return reply({ embeds: [info(`👤 **${message.author.username}**\n💰 Patrimonio: **${money(user.cash + user.bank)} 🪙**\n📨 Mensajes: **${user.messages}**\n⚙️ Comandos: **${user.commands}**\n🏆 Victorias: **${user.wins}**\n💀 Derrotas: **${user.losses}**`)] });

  if (command === "shop") return reply({ embeds: [box("🛒 TIENDA", Object.entries(prices).map(([id, p]) => `**${id}** — ${money(p)} 🪙`).join("\n"))] });
  if (command === "buy") { const id = args[0]?.toLowerCase(); if (!prices[id]) return reply({ embeds: [fail("Objeto inexistente. Usa `p.shop`.")] }); if (user.cash < prices[id]) return reply({ embeds: [fail("No tienes suficiente dinero.")] }); user.cash -= prices[id]; user.inventory.push(id); save(); return reply({ embeds: [ok(`Compraste **${id}** por **${money(prices[id])} 🪙**.`)] }); }
  if (command === "inventory" || command === "inv") { const c = {}; user.inventory.forEach(x => c[x] = (c[x] || 0) + 1); return reply({ embeds: [info(Object.keys(c).length ? Object.entries(c).map(([x, n]) => `🎒 **${x}** × ${n}`).join("\n") : "Tu inventario está vacío.")] }); }
  if (command === "sell") { const id = args[0]?.toLowerCase(), i = user.inventory.indexOf(id); if (i < 0 || !prices[id]) return reply({ embeds: [fail("No tienes ese objeto.")] }); user.inventory.splice(i, 1); user.cash += Math.floor(prices[id] / 2); save(); return reply({ embeds: [ok(`Vendiste **${id}** por **${money(Math.floor(prices[id] / 2))} 🪙**.`)] }); }

  if (command === "coinflip") return reply({ embeds: [info(`🪙 ${Math.random() < .5 ? "CARA" : "CRUZ"}`)] });
  if (command === "dado" || command === "dice") return reply({ embeds: [info(`🎲 Resultado: **${random(1, 6)}**`)] });
  if (command === "random") { const min = Number(args[0]) || 1, max = Number(args[1]) || 100; if (max < min) return reply({ embeds: [fail("El máximo debe ser mayor o igual al mínimo.")] }); return reply({ embeds: [info(`🎲 Resultado: **${random(min, max)}**`)] }); }
  if (command === "8ball") return reply({ embeds: [info(`🔮 ${["Sí, definitivamente.", "Puede ser.", "Probablemente no.", "Pregunta más tarde."][random(0, 3)]}`)] });
  if (command === "choose") { const a = args.join(" ").split("|").map(x => x.trim()).filter(Boolean); return reply({ embeds: [a.length > 1 ? ok(`🎯 Elegí: **${a[random(0, a.length - 1)]}**`) : fail("Usa `p.choose opción 1 | opción 2`.")] }); }
  if (command === "joke") return reply({ embeds: [info("😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!")] });
  if (command === "trivia") { const q = questions[random(0, questions.length - 1)]; return reply({ embeds: [info(`🧠 ${q.q}`)] }); }
  if (command === "rps") { const choices = ["🪨 Piedra", "📄 Papel", "✂️ Tijera"]; return reply({ embeds: [info(`🎮 Joshua eligió: **${choices[random(0, 2)]}**`)] }); }
  if (command === "emoji") return reply({ embeds: [info(["😀", "😂", "🔥", "🤖", "🚀", "🎉"][random(0, 5)])] });
  if (["highfive", "compliment"].includes(command)) { const t = message.mentions.users.first(); return reply({ embeds: [t ? ok(`${command === "highfive" ? "✋ Chocaste los cinco con" : "💖 ${t}, eres genial!"} ${command === "highfive" ? t : ""}`) : fail("Menciona a un usuario.")] }); }
  if (["userinfo", "user", "whois"].includes(command)) { const t = message.mentions.members.first() || message.member; return reply({ embeds: [info(`👤 ${t.user}\n🆔 \`${t.id}\`\n🎭 Roles: **${Math.max(0, t.roles.cache.size - 1)}**`)] }); }
  if (command === "avatar") { const t = message.mentions.users.first() || message.author; return reply({ embeds: [new EmbedBuilder().setTitle(`🖼️ Avatar de ${t.username}`).setImage(t.displayAvatarURL({ size: 1024 }))] }); }
  if (command === "online") return reply({ embeds: [info(`🟢 Usuarios online: **${message.guild.members.cache.filter(m => m.presence?.status && m.presence.status !== "offline").size}**`)] });
  if (command === "serverinfo") return reply({ embeds: [info(`🏰 **${message.guild.name}**\n👥 Miembros: **${message.guild.memberCount}**\n💬 Canales: **${message.guild.channels.cache.size}**\n🎭 Roles: **${message.guild.roles.cache.size}**\n🚀 Boosts: **${message.guild.premiumSubscriptionCount || 0}**`)] });
  if (command === "channels") return reply({ embeds: [info(`📚 Texto: **${message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size}**\n🔊 Voz: **${message.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size}**`)] });
  if (command === "roles") return reply({ embeds: [info(message.guild.roles.cache.filter(r => r.id !== message.guild.id).map(r => `🎭 ${r.name}`).slice(0, 50).join("\n") || "No hay roles.")] });
  if (command === "emojis") return reply({ embeds: [info(message.guild.emojis.cache.map(String).join(" ") || "No hay emojis personalizados.")] });
  if (command === "boosts") return reply({ embeds: [info(`🚀 Nivel: **${message.guild.premiumTier}**\n💎 Boosts: **${message.guild.premiumSubscriptionCount || 0}**`)] });
  if (command === "created") return reply({ embeds: [info(`<t:${Math.floor(message.guild.createdTimestamp / 1000)}:F>`)] });
  if (command === "say") { if (!args.length) return reply({ embeds: [fail("Escribe un mensaje.")] }); try { await message.delete(); } catch {} return message.channel.send(args.join(" ")); }

  const adminCommands = ["ban", "unban", "kick", "mute", "unmute", "warn", "purge", "lock", "unlock", "slowmode", "nick", "roleinfo"];
  if (adminCommands.includes(command) && !admin(message)) return reply({ embeds: [fail("🛡️ Este comando requiere Administrador.")] });
  if (command === "helpadmin") return reply({ embeds: [help("admin")] });
  const member = message.mentions.members.first();
  if (["ban", "kick", "mute", "unmute", "warn", "nick"].includes(command) && !member) return reply({ embeds: [fail("Menciona a un usuario.")] });
  try {
    if (command === "ban" || command === "kick") { if (!(command === "ban" ? member.bannable : member.kickable)) return reply({ embeds: [fail("No puedo moderar a ese usuario.")] }); await (command === "ban" ? member.ban({ reason: "Moderación mediante Joshua" }) : member.kick("Moderación mediante Joshua")); return reply({ embeds: [ok(`✅ ${command === "ban" ? "Usuario baneado" : "Usuario expulsado"}.`)] }); }
    if (command === "unban") { await message.guild.members.unban(args[0]); return reply({ embeds: [ok("Usuario desbaneado.")] }); }
    if (command === "mute") { if (!member.moderatable) return reply({ embeds: [fail("No puedo silenciar a ese usuario.")] }); await member.timeout(Math.min((Number(args[1]) || 10) * 60000, 2419200000), "Moderación mediante Joshua"); return reply({ embeds: [ok("Usuario silenciado.")] }); }
    if (command === "unmute") { await member.timeout(null, "Unmute mediante Joshua"); return reply({ embeds: [ok("Usuario desilenciado.")] }); }
    if (command === "warn") return reply({ embeds: [ok(`⚠️ Advertencia registrada para ${member.user.tag}.`)] });
    if (command === "purge") { const n = Number(args[0]); if (!Number.isInteger(n) || n < 1 || n > 99) return reply({ embeds: [fail("Usa una cantidad entre 1 y 99.")] }); const d = await message.channel.bulkDelete(n, true); return reply({ embeds: [ok(`🧹 Eliminados **${d.size}** mensajes.`)] }); }
    if (command === "lock" || command === "unlock") { await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: command === "lock" ? false : null }); return reply({ embeds: [ok(command === "lock" ? "Canal bloqueado." : "Canal desbloqueado.")] }); }
    if (command === "slowmode") { const n = Number(args[0]); if (!Number.isInteger(n) || n < 0 || n > 21600) return reply({ embeds: [fail("Usa un valor entre 0 y 21600.")] }); await message.channel.setRateLimitPerUser(n); return reply({ embeds: [ok(`Slowmode configurado en **${n}** segundos.`)] }); }
    if (command === "nick") { const nick = args.slice(1).join(" "); if (!nick) return reply({ embeds: [fail("Uso: `p.nick @usuario nombre`.")] }); await member.setNickname(nick.slice(0, 32)); return reply({ embeds: [ok("Apodo cambiado.")] }); }
    if (command === "roleinfo") { const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]); return reply({ embeds: [role ? info(`🎭 ${role.name}\n🆔 \`${role.id}\`\n👥 Miembros: **${role.members.size}**`) : fail("Menciona un rol o proporciona su ID.")] }); }
  } catch (err) { console.error(`Error en p.${command}:`, err); return reply({ embeds: [fail("No pude ejecutar el comando. Revisa mis permisos.")] }); }
  return reply({ embeds: [fail(`No conozco \`${PREFIX}${command}\`. Usa \`p.help\`.`)] });
});

const server = http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end("<h1>🤖 Joshua está funcionando</h1><p>🟢 Servidor web activo.</p>"); });
server.listen(PORT, "0.0.0.0", () => console.log(`🌐 Servidor web activo en el puerto ${PORT}`));
if (!TOKEN) { console.error("❌ Falta DISCORD_TOKEN."); process.exit(1); }
client.login(TOKEN).catch(err => console.error("❌ No se pudo iniciar sesión:", err.message));
