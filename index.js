const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionsBitField,
  ChannelType
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const http = require("http");

const PREFIX = "p.";
const PORT = Number(process.env.PORT) || 3000;
const TOKEN = process.env.DISCORD_TOKEN;
const ECONOMY_FILE = path.join(__dirname, "economy.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

let economy = {};
try {
  if (fs.existsSync(ECONOMY_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(ECONOMY_FILE, "utf8"));
    economy = parsed && typeof parsed === "object" ? parsed : {};
  }
} catch (err) {
  console.error("No se pudo leer economy.json:", err.message);
}

function newUser() {
  return { cash: 0, bank: 0, daily: 0, work: 0, crime: 0, hut: 0, rob: 0, inventory: {}, stats: { work: 0, crime: 0, rob: 0, gifts: 0 } };
}
function getUser(id) {
  const current = economy[id] && typeof economy[id] === "object" ? economy[id] : {};
  const d = newUser();
  economy[id] = {
    ...d,
    ...current,
    inventory: Array.isArray(current.inventory) ? {} : { ...d.inventory, ...(current.inventory || {}) },
    stats: { ...d.stats, ...(current.stats || {}) }
  };
  for (const key of ["cash", "bank", "daily", "work", "crime", "hut", "rob"]) {
    if (!Number.isFinite(economy[id][key])) economy[id][key] = 0;
  }
  return economy[id];
}
function saveEconomy() {
  try { fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2)); }
  catch (err) { console.error("No se pudo guardar economy.json:", err.message); }
}
function random(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function money(value) { return `${Math.max(0, Number(value) || 0).toLocaleString("es-ES")} 🪙`; }
function embed(title, description, color = 0x5865f2) { return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description); }
function success(text) { return embed("✅ ÉXITO", text, 0x57f287); }
function error(text) { return embed("❌ ERROR", text, 0xed4245); }
function isAdmin(message) { return Boolean(message.member?.permissions.has(PermissionsBitField.Flags.Administrator)); }
const cooldowns = new Map();
function cooldown(id, name, seconds) {
  const key = `${id}:${name}`;
  const now = Date.now();
  const end = cooldowns.get(key) || 0;
  if (end > now) return Math.ceil((end - now) / 1000);
  cooldowns.set(key, now + seconds * 1000);
  return 0;
}

function helpMenu() {
  const options = [
    ["Economía", "Dinero y economía", "economia", "💰"],
    ["Tienda", "Compra y vende objetos", "tienda", "🛒"],
    ["Perfil", "Tus estadísticas", "perfil", "👤"],
    ["Diversión", "Juegos y diversión", "diversion", "🎮"],
    ["Social", "Comandos sociales", "social", "👥"],
    ["Servidor", "Información del servidor", "servidor", "🏰"],
    ["Utilidades", "Herramientas", "utilidades", "⚙️"],
    ["Administración", "Comandos administrativos", "admin", "🛡️"]
  ];
  const menu = new StringSelectMenuBuilder().setCustomId("joshua_help").setPlaceholder("📚 Selecciona una categoría...").addOptions(
    options.map(([label, description, value, emoji]) => new StringSelectMenuOptionBuilder().setLabel(label).setDescription(description).setValue(value).setEmoji(emoji))
  );
  return new ActionRowBuilder().addComponents(menu);
}
function helpPage(category = "inicio") {
  const pages = {
    inicio: ["🤖 JOSHUA • AYUDA", "Selecciona una categoría en el menú para ver los comandos.\n\n💡 Prefijo: `p.`"],
    economia: ["💰 ECONOMÍA", "`p.balance` · `p.daily` · `p.work` · `p.crimen` · `p.rob @usuario`\n`p.dep all` · `p.with all` · `p.gift @usuario cantidad` · `p.pay @usuario cantidad`"],
    tienda: ["🛒 TIENDA", "`p.shop` · `p.buy objeto` · `p.inventory` · `p.sell objeto` · `p.mission`"],
    perfil: ["👤 PERFIL", "`p.profile` · `p.stats` · `p.rank` · `p.userinfo @usuario` · `p.serverinfo`"],
    diversion: ["🎮 DIVERSIÓN", "`p.coinflip` · `p.dado` · `p.8ball` · `p.rps opción` · `p.joke` · `p.trivia` · `p.choose opciones` · `p.random número`"],
    social: ["👥 SOCIAL", "`p.compliment @usuario` · `p.whois @usuario` · `p.online` · `p.highfive @usuario`"],
    servidor: ["🏰 SERVIDOR", "`p.channels` · `p.roles` · `p.emojis` · `p.boosts` · `p.created`"],
    utilidades: ["⚙️ UTILIDADES", "`p.ping` · `p.status` · `p.say texto`"],
    admin: ["🛡️ ADMINISTRACIÓN", "`p.mute` · `p.unmute` · `p.kick` · `p.ban` · `p.unban ID` · `p.purge cantidad` · `p.lock` · `p.unlock` · `p.slowmode segundos` · `p.nick` · `p.warn`"]
  };
  const [title, text] = pages[category] || pages.inicio;
  return embed(title, text, category === "admin" ? 0xe74c3c : 0x5865f2).setFooter({ text: "🤖 Joshua • Usa el menú para cambiar de categoría" });
}

client.once("ready", () => {
  console.log(`✅ Joshua conectado como ${client.user.tag}`);
  console.log(`🌐 Servidores: ${client.guilds.cache.size}`);
  client.user.setPresence({ activities: [{ name: "p.help 🤖", type: 0 }], status: "online" });
});
client.on("warn", console.warn);
client.on("error", console.error);
process.on("unhandledRejection", err => console.error("Unhandled Rejection:", err));
process.on("uncaughtException", err => console.error("Uncaught Exception:", err));

client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== "joshua_help") return;
  await interaction.update({ embeds: [helpPage(interaction.values[0])], components: [helpMenu()] });
});

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/).filter(Boolean);
  const command = (args.shift() || "").toLowerCase();
  if (!command) return;
  const user = getUser(message.author.id);
  const reply = content => message.reply(typeof content === "string" ? { content, allowedMentions: { repliedUser: false } } : { ...content, allowedMentions: { repliedUser: false } });

  try {
    if (command === "help") return message.reply({ embeds: [helpPage()], components: [helpMenu()] });
    if (command === "ping") return reply(`🏓 **${client.ws.ping}ms**`);
    if (command === "status") return reply(embed("🤖 STATUS", `🟢 Online\n📡 Ping: **${client.ws.ping}ms**\n🌐 Servidores: **${client.guilds.cache.size}**`));
    if (command === "hola") return reply("👋 ¡Hola! Soy Joshua 🤖");
    if (command === "balance" || command === "bal") return reply(embed("💰 BALANCE", `💵 Efectivo: **${money(user.cash)}**\n🏦 Banco: **${money(user.bank)}**\n💎 Total: **${money(user.cash + user.bank)}**`, 0xf1c40f));
    if (command === "bank") return reply(embed("🏦 BANCO", `💳 Banco: **${money(user.bank)}**\n💵 Efectivo: **${money(user.cash)}**`));

    if (command === "daily" || command === "work" || command === "crimen") {
      const times = { daily: 86400, work: 30, crimen: 120 };
      const left = cooldown(message.author.id, command, times[command]);
      if (left) return reply(error(`Espera **${left} segundos** para volver a usar este comando.`));
      if (command === "daily") { user.cash += 1000; user.daily++; saveEconomy(); return reply(success(`🎁 Recibiste **${money(1000)}**.`)); }
      if (command === "work") { const reward = random(10, 150); user.cash += reward; user.work++; saveEconomy(); return reply(success(`💼 Ganaste **${money(reward)}**.`)); }
      if (Math.random() < 0.2) { const reward = random(300, 500); user.cash += reward; user.crime++; saveEconomy(); return reply(success(`🔫 Crimen exitoso: ganaste **${money(reward)}**.`)); }
      const loss = Math.min(user.cash, random(200, 600)); user.cash -= loss; user.crime++; saveEconomy(); return reply(error(`🚨 Crimen fallido: perdiste **${money(loss)}**.`));
    }

    if (command === "dep" || command === "with") {
      if (args[0]?.toLowerCase() !== "all") return reply(error(`Usa \`p.${command} all\`.`));
      if (command === "dep") { if (!user.cash) return reply(error("No tienes efectivo.")); user.bank += user.cash; user.cash = 0; }
      else { if (!user.bank) return reply(error("No tienes dinero en el banco.")); user.cash += user.bank; user.bank = 0; }
      saveEconomy(); return reply(success("Operación bancaria completada."));
    }
    if (command === "gift" || command === "pay") {
      const target = message.mentions.users.first(); const amount = Number(args.find(a => /^\d+$/.test(a)));
      if (!target || !Number.isSafeInteger(amount) || amount <= 0) return reply(error(`Usa \`p.${command} @usuario cantidad\`.`));
      if (target.id === message.author.id || user.cash < amount) return reply(error("Destinatario inválido o efectivo insuficiente."));
      const targetUser = getUser(target.id); user.cash -= amount; targetUser.cash += amount; if (command === "gift") user.stats.gifts++; saveEconomy(); return reply(success(`Enviaste **${money(amount)}** a ${target}.`));
    }
    if (command === "profile" || command === "stats") return reply(embed(command === "profile" ? "👤 PERFIL" : "📊 ESTADÍSTICAS", `💰 Patrimonio: **${money(user.cash + user.bank)}**\n💼 Trabajos: **${user.stats.work}**\n🔫 Crímenes: **${user.stats.crime}**\n🥷 Robos: **${user.stats.rob}**\n🎁 Regalos: **${user.stats.gifts}**`));
    if (command === "rank") { const rank = Object.entries(economy).sort((a, b) => (b[1].cash + b[1].bank) - (a[1].cash + a[1].bank)); return reply(`🏆 Tu posición económica es **#${rank.findIndex(([id]) => id === message.author.id) + 1}**.`); }

    if (command === "shop") return reply("🛒 **TIENDA**\n💎 diamante: 500\n🍕 pizza: 100\n🧸 peluche: 250\n🚀 cohete: 1000\nUsa `p.buy objeto`.");
    const prices = { diamante: 500, pizza: 100, peluche: 250, cohete: 1000 };
    if (command === "buy" || command === "sell") { const item = args.join(" ").toLowerCase(); const price = command === "buy" ? prices[item] : { diamante: 250, pizza: 50, peluche: 125, cohete: 500 }[item]; if (!price) return reply(error("Objeto no válido.")); if (command === "buy") { if (user.cash < price) return reply(error("No tienes suficiente dinero.")); user.cash -= price; user.inventory[item] = (user.inventory[item] || 0) + 1; } else { if (!user.inventory[item]) return reply(error("No tienes ese objeto.")); user.inventory[item]--; user.cash += price; } saveEconomy(); return reply(success(`Operación completada con **${item}**.`)); }
    if (command === "inventory" || command === "inv") { const list = Object.entries(user.inventory).filter(([, n]) => n > 0).map(([i, n]) => `📦 ${i}: **${n}**`).join("\n"); return reply(list || "🎒 Tu inventario está vacío."); }

    if (command === "coinflip") return reply(`🪙 ${Math.random() < 0.5 ? "Cara" : "Cruz"}`);
    if (command === "dado") return reply(`🎲 Sacaste **${random(1, 6)}**.`);
    if (command === "random") { const max = Number(args[0]); return reply(`🔢 **${random(1, Number.isInteger(max) && max > 0 ? max : 100)}**`); }
    if (command === "8ball") return reply(["🟢 Sí, definitivamente.", "🟡 Puede ser.", "🔴 Probablemente no."][random(0, 2)]);
    if (command === "choose") return reply(args.length > 1 ? `🎯 Elegí: **${args[random(0, args.length - 1)]}**` : error("Indica al menos dos opciones."));
    if (command === "joke") return reply("😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!");
    if (command === "emoji") return reply(`😎 ${["😀", "😂", "😎", "🔥", "🤖"][random(0, 4)]}`);
    if (command === "challenge" || command === "risk") return reply(command === "risk" ? "🎲 ¡El riesgo ha sido calculado!" : "🎯 Usa tres comandos de Joshua.");
    if (command === "highfive" || command === "compliment") { const target = message.mentions.users.first(); if (!target) return reply(error("Menciona a un usuario.")); return reply(command === "highfive" ? `🙌 ${message.author} chocó los cinco con ${target}.` : `⭐ ${target}, ¡eres genial!`); }
    if (command === "whois" || command === "userinfo" || command === "user") { const target = message.mentions.users.first() || message.author; return reply(`👤 **${target.username}**\n🆔 \`${target.id}\`\n🤖 Bot: **${target.bot ? "Sí" : "No"}**`); }
    if (command === "online") return reply(`🟢 Online aproximadamente: **${message.guild.members.cache.filter(m => m.presence?.status && m.presence.status !== "offline").size}**`);
    if (command === "serverinfo") return reply(embed("🏰 SERVIDOR", `🏰 ${message.guild.name}\n👥 Miembros: **${message.guild.memberCount}**\n📺 Canales: **${message.guild.channels.cache.size}**\n🎭 Roles: **${message.guild.roles.cache.size}**`));
    if (command === "channels") return reply(message.guild.channels.cache.map(c => `${c.type === ChannelType.GuildCategory ? "📁" : "#️⃣"} ${c.name}`).slice(0, 50).join("\n"));
    if (command === "roles") return reply(message.guild.roles.cache.filter(r => r.id !== message.guild.id).map(r => `🏷️ ${r.name}`).slice(0, 50).join("\n") || "No hay roles.");
    if (command === "emojis") return reply(message.guild.emojis.cache.map(e => String(e)).join(" ") || "No hay emojis personalizados.");
    if (command === "boosts") return reply(`🚀 Boosts: **${message.guild.premiumSubscriptionCount || 0}**`);
    if (command === "created") return reply(`📅 Creado: <t:${Math.floor(message.guild.createdTimestamp / 1000)}:F>`);
    if (command === "say") { if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador.")); if (!args.length) return reply(error("Escribe un mensaje.")); await message.delete().catch(() => {}); return message.channel.send(args.join(" ")); }

    const adminCommands = ["lock", "unlock", "slowmode", "nick", "warn", "mute", "unmute", "kick", "ban", "unban", "permaban", "purge"];
    if (adminCommands.includes(command) && !isAdmin(message)) return reply(error("Necesitas permisos de administrador."));
    const target = message.mentions.members.first();
    if (["mute", "unmute", "kick", "ban", "permaban", "nick", "warn"].includes(command) && !target) return reply(error("Menciona a un usuario."));
    if (command === "mute") await target.timeout(3600000, "Mute realizado por Joshua");
    else if (command === "unmute") await target.timeout(null, "Mute eliminado por Joshua");
    else if (command === "kick") await target.kick("Expulsado por Joshua");
    else if (command === "ban" || command === "permaban") await target.ban({ reason: "Baneado por Joshua" });
    else if (command === "unban") await message.guild.members.unban(args[0]);
    else if (command === "warn") return reply(success(`⚠️ Advertencia registrada para **${target.user.username}**.`));
    else if (command === "purge") { const n = Number(args[0]); if (!Number.isInteger(n) || n < 1 || n > 99) return reply(error("Usa una cantidad entre 1 y 99.")); const deleted = await message.channel.bulkDelete(n, true); return reply(`🧹 Eliminados **${deleted.size}** mensajes.`); }
    else if (command === "lock" || command === "unlock") await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: command === "lock" ? false : null });
    else if (command === "slowmode") { const seconds = Number(args[0]); if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) return reply(error("Usa un valor entre 0 y 21600.")); await message.channel.setRateLimitPerUser(seconds); }
    else if (command === "nick") await target.setNickname(args.slice(1).join(" ").slice(0, 32));
    else if (command === "helpadmin") return reply(helpPage("admin"));
    else return reply(error(`No conozco **${PREFIX}${command}**. Usa **${PREFIX}help**.`));
    return reply(success(`Comando **${command}** ejecutado correctamente.`));
  } catch (err) {
    console.error(`Error en p.${command}:`, err);
    return reply(error("Ocurrió un error al ejecutar el comando. Revisa los permisos del bot."));
  }
});

http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }); res.end("🤖 Joshua está online."); }).listen(PORT, () => console.log(`🌐 Servidor HTTP activo en el puerto ${PORT}`));

if (!TOKEN) console.error("❌ Falta DISCORD_TOKEN en las variables de entorno.");
else client.login(TOKEN).catch(err => console.error("❌ No se pudo iniciar sesión:", err.message));
