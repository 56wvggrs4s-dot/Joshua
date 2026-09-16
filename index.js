const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require("discord.js");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PREFIX = "p.";
const TOKEN = process.env.DISCORD_TOKEN;
const PORT = Number(process.env.PORT) || 3000;
const ECONOMY_FILE = path.join(__dirname, "economy.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent
  ]
});

let economy = {};
try {
  if (fs.existsSync(ECONOMY_FILE)) {
    const data = JSON.parse(fs.readFileSync(ECONOMY_FILE, "utf8"));
    economy = data && typeof data === "object" ? data : {};
  }
} catch (err) {
  console.error("No se pudo leer economy.json:", err.message);
  economy = {};
}

function newUser() {
  return {
    cash: 0, bank: 0, daily: 0, work: 0, crime: 0,
    hut: 0, rob: 0, risk: 0, inventory: {},
    stats: { work: 0, crime: 0, rob: 0, gifts: 0 }
  };
}

function getUser(id) {
  const current = economy[id] && typeof economy[id] === "object"
    ? economy[id]
    : newUser();
  const defaults = newUser();
  economy[id] = {
    ...defaults,
    ...current,
    inventory: {
      ...defaults.inventory,
      ...(current.inventory || {})
    },
    stats: {
      ...defaults.stats,
      ...(current.stats || {})
    }
  };
  for (const key of ["cash", "bank", "daily", "work", "crime", "hut", "rob", "risk"]) {
    if (!Number.isFinite(economy[id][key])) economy[id][key] = 0;
  }
  return economy[id];
}

function saveEconomy() {
  try {
    fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2));
  } catch (err) {
    console.error("No se pudo guardar economy.json:", err.message);
  }
}

function random(min, max) {
  min = Math.ceil(Number(min));
  max = Math.floor(Number(max));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function money(amount) {
  return `${Math.max(0, Number(amount) || 0).toLocaleString("es-ES")} 🪙`;
}

function cooldown(last, seconds) {
  const remaining = Number(seconds) * 1000 - (Date.now() - Number(last || 0));
  if (remaining <= 0) return null;
  const total = Math.ceil(remaining / 1000);
  return total >= 60
    ? `⏳ Espera **${Math.ceil(total / 60)} minuto(s)**.`
    : `⏳ Espera **${total} segundo(s)**.`;
}

function success(text) {
  return `╭━━━〔 ✅ ÉXITO 〕━━━╮\n┃ ${text}\n╰━━━━━━━━━━━━━━━━━━╯`;
}
function error(text) {
  return `╭━━━〔 ❌ ERROR 〕━━━╮\n┃ ${text}\n╰━━━━━━━━━━━━━━━━━━╯`;
}
function box(title, text) {
  return `╔══════════════════════════════╗\n║ ${title}\n╠═════════════════════════[...]
}
function isAdmin(message) {
  return Boolean(message.member?.permissions.has(PermissionsBitField.Flags.Administrator));
}
function mentionedMember(message) {
  return message.mentions.members.first() || null;
}
function mentionedUser(message) {
  return message.mentions.users.first() || null;
}
function canModerate(message, member) {
  if (!member) return false;
  if (member.id === message.guild.ownerId) return false;
  return member.id !== message.member.id && member.manageable;
}
function parseAmount(value) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

const helpCategories = {
  economy: {
    emoji: "💰",
    name: "Economía",
    description: "Comandos de dinero, trabajo, robos y banco.",
    commands: [
      "`p.balance` — Ver tu dinero.",
      "`p.bank` — Ver tu banco.",
      "`p.daily` — Recompensa diaria.",
      "`p.work` — Trabajar y ganar cash.",
      "`p.crimen` — Misión de riesgo.",
      "`p.hut` — Pregunta por dinero.",
      "`p.rob @usuario` — Robar a otro usuario.",
      "`p.dep all` — Depositar todo al banco.",
      "`p.with all` — Retirar todo del banco.",
      "`p.gift @usuario cantidad` — Regalar dinero.",
      "`p.pay @usuario cantidad` — Enviar dinero."
    ]
  },
  shop: {
    emoji: "🛒",
    name: "Tienda",
    description: "Compra, vende y gestiona tu inventario.",
    commands: [
      "`p.shop` — Ver tienda.",
      "`p.buy objeto` — Comprar un objeto.",
      "`p.sell objeto` — Vender un objeto.",
      "`p.inventory` — Ver inventario.",
      "`p.mission` — Completar misión.",
      "`p.profile` — Ver perfil principal."
    ]
  },
  profile: {
    emoji: "👤",
    name: "Perfil",
    description: "Tu información personal y estadísticas.",
    commands: [
      "`p.profile` — Ver tu perfil.",
      "`p.stats` — Ver tus estadísticas.",
      "`p.userinfo @usuario` — Información de usuario.",
      "`p.rank` — Top de usuarios ricos."
    ]
  },
  fun: {
    emoji: "🎮",
    name: "Diversión",
    description: "Minijuegos, random y entretenimiento.",
    commands: [
      "`p.coinflip` — Lanzar moneda.",
      "`p.dado` — Lanzar dado.",
      "`p.risk` — Juego de riesgo.",
      "`p.8ball pregunta` — Bola mágica.",
      "`p.emoji` — Emoji aleatorio.",
      "`p.challenge` — Reto aleatorio.",
      "`p.rps opción` — Piedra, papel o tijera.",
      "`p.joke` — Chiste.",
      "`p.trivia` — Trivia.",
      "`p.choose opción1 opción2` — Elegir al azar.",
      "`p.random número` — Número aleatorio.",
      "`p.highfive @usuario` — Dar un high-five.",
      "`p.compliment @usuario` — Dar un cumplido."
    ]
  },
  social: {
    emoji: "👥",
    name: "Social",
    description: "Info social, perfiles y estado del servidor.",
    commands: [
      "`p.whois @usuario` — Información del usuario.",
      "`p.online` — Ver miembros online.",
      "`p.compliment @usuario` — Felicitar a alguien.",
      "`p.highfive @usuario` — Saludar con high-five."
    ]
  },
  server: {
    emoji: "🏰",
    name: "Servidor",
    description: "Información del servidor y sus canales.",
    commands: [
      "`p.serverinfo` — Información del servidor.",
      "`p.channels` — Ver canales.",
      "`p.roles` — Ver roles.",
      "`p.emojis` — Ver emojis del servidor.",
      "`p.boosts` — Ver boosts.",
      "`p.created` — Fecha de creación."
    ]
  },
  utilities: {
    emoji: "⚙️",
    name: "Utilidades",
    description: "Comandos rápidos y útiles del bot.",
    commands: [
      "`p.ping` — Ver latencia del bot.",
      "`p.status` — Estado del bot.",
      "`p.hola` — Saludar.",
      "`p.info` — Información del bot.",
      "`p.say texto` — Haz que Joshua hable."
    ]
  },
  admin: {
    emoji: "🛡️",
    name: "Administración",
    description: "Comandos de moderación para administradores.",
    commands: [
      "`p.helpadmin` — Ver ayuda de administración.",
      "`p.mute @usuario` — Silenciar.",
      "`p.unmute @usuario` — Quitar mute.",
      "`p.kick @usuario` — Expulsar.",
      "`p.ban @usuario` — Banear.",
      "`p.unban ID` — Desbanear por ID.",
      "`p.warn @usuario` — Advertir.",
      "`p.purge cantidad` — Borrar mensajes.",
      "`p.lock` — Bloquear canal.",
      "`p.unlock` — Desbloquear canal.",
      "`p.slowmode segundos` — Slowmode.",
      "`p.nick @usuario nombre` — Cambiar apodo.",
      "`p.roleinfo nombre` — Ver información del rol."
    ]
  }
};

function buildHelpMenu(currentCategory = "home") {
  const options = [
    { label: "🏠 Inicio", value: "home", description: "Volver al menú principal." },
    ...Object.entries(helpCategories).map(([key, category]) => ({
      label: `${category.emoji} ${category.name}`,
      value: key,
      description: category.description
    }))
  ];

  const menu = new StringSelectMenuBuilder()
    .setCustomId("help_menu")
    .setPlaceholder(currentCategory === "home" ? "Selecciona una categoría" : `Categoría actual: ${helpCategories[currentCategory].name}`)
    .addOptions(options.map(option => ({
      label: option.label,
      value: option.value,
      description: option.description,
      emoji: option.label.startsWith("🏠") ? "🏠" : undefined
    })));

  return new ActionRowBuilder().addComponents(menu);
}

function getHelpEmbed(categoryKey = "home") {
  if (categoryKey === "home") {
    const categoriesList = Object.entries(helpCategories)
      .map(([key, category]) => `${category.emoji} **${category.name}** - ${category.description}`)
      .join("\n");

    return new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🤖 Joshua - Ayuda")
      .setDescription("Selecciona una categoría del menú para ver sus comandos.")
      .addFields({ name: "Categorías disponibles", value: categoriesList })
      .setFooter({ text: `Prefix: ${PREFIX}` });
  }

  const category = helpCategories[categoryKey];
  return new EmbedBuilder()
    .setColor(0x00AE86)
    .setTitle(`${category.emoji} ${category.name}`)
    .setDescription(category.description)
    .addFields({
      name: "Comandos",
      value: category.commands.join("\n")
    })
    .setFooter({ text: `Menú de ayuda • ${PREFIX}help` });
}

console.log("🤖 JOSHUA INICIANDO...");
client.once("ready", () => {
  console.log(`🟢 Conectado como ${client.user.tag}`);
  console.log(`🌐 Servidores: ${client.guilds.cache.size}`);
  client.user.setPresence({
    activities: [{ name: "p.help 📖", type: 0 }],
    status: "online"
  });
});
client.on("shardReconnecting", id => console.log(`🔄 Reconectando shard ${id}...`));
client.on("shardResume", (id, events) => console.log(`🟢 Shard ${id} restaurado (${events} eventos)`));
client.on("shardDisconnect", (event, id) => console.warn(`🔌 Shard ${id} desconectado (${event.code})`));
client.on("shardError", (err, id) => console.error(`❌ Error del shard ${id}:`, err));
client.on("warn", info => console.warn("⚠️ Discord.js:", info));
client.on("error", err => console.error("❌ Discord.js:", err));
process.on("unhandledRejection", err => console.error("❌ Promesa no controlada:", err));
process.on("uncaughtException", err => console.error("❌ Excepción no controlada:", err));

client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "help_menu") return;

  const categoryKey = interaction.values[0] || "home";
  const embed = getHelpEmbed(categoryKey);
  const row = buildHelpMenu(categoryKey);

  await interaction.update({
    embeds: [embed],
    components: [row],
    allowedMentions: { repliedUser: false }
  });
});

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;
  const content = message.content.trim();
  if (!content.toLowerCase().startsWith(PREFIX)) return;

  const tokens = content.slice(PREFIX.length).trim().split(/\s+/).filter(Boolean);
  const command = (tokens.shift() || "").toLowerCase();
  if (!command) return;
  const args = tokens;
  const user = getUser(message.author.id);
  const reply = text => message.reply({ content: text, allowedMentions: { repliedUser: false } });

  try {
    if (command === "ping") return reply(box("🏓 PONG", `┃ ⚡ Latencia: **${client.ws.ping}ms**\n┃ 🤖 Joshua está funcionando.\n┃ 🌐 Estado: **ONLINE 🟢**`));

    if (command === "status") {
      const seconds = Math.floor(client.uptime / 1000);
      return reply(box("📡 ESTADO DE JOSHUA", `┃ 🤖 Estado: **ONLINE 🟢**\n┃ ⚡ Ping: **${client.ws.ping}ms**\n┃ ⏱️ Activo: **${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m**\n┃ 🌐 Servidores: **${client.guilds.cache.size}**`));
    }
    if (command === "hola") return reply(box("👋 HOLA", `┃ ¡Hola, ${message.author}! 😎\n┃ 🤖 Joshua te saluda.`));
    if (command === "info") return reply(box("🤖 JOSHUA", `┃ 🛠️ Versión: **2.0**\n┃ ⚡ Prefijo: **${PREFIX}**\n┃ 💰 Economía: **ACTIVA**\n┃ 🛡️ Administración: **ACTIVA**`));

    if (command === "help") {
      return message.reply({
        embeds: [getHelpEmbed("home")],
        components: [buildHelpMenu("home")],
        allowedMentions: { repliedUser: false }
      });
    }
    if (command === "helpadmin") {
      if (!isAdmin(message)) return reply(error("🚫 Necesitas permisos de Administrador."));
      return reply(`╔════════════════════════════════════╗
║      🛡️ JOSHUA — ADMIN 🔐
╠════════════════════════════════════╣
║ 🔇 p.mute · p.unmute · p.kick
║ 🔨 p.ban · p.unban ID · p.permaban
║ ⚠️ p.warn · 🧹 p.purge cantidad
║ 🔒 p.lock · p.unlock
║ 🐌 p.slowmode segundos
║ ✏️ p.nick @usuario nombre
║ 🏷️ p.roleinfo nombre
╚════════════════════════════════════╝`);
    }

    if (command === "balance" || command === "bal" || command === "bank") {
      return reply(box(command === "bank" ? "🏦 BANCO" : "💰 TU ECONOMÍA", `┃ 💵 Efectivo: **${money(user.cash)}**\n┃ 🏦 Banco: **${money(user.bank)}**\n┃ 💎 Total: **${money(user.cash + user.bank)}**`));
    }
    if (command === "daily") {
      const cd = cooldown(user.daily, 86400);
      if (cd) return reply(error(cd));
      user.cash += 1000; user.daily = Date.now(); saveEconomy();
      return reply(success(`🎁 Recompensa diaria: **${money(1000)}**`));
    }
    if (command === "work") {
      const cd = cooldown(user.work, 30);
      if (cd) return reply(error(cd));
      const reward = random(10, 150); user.cash += reward; user.work = Date.now(); user.stats.work++; saveEconomy();
      return reply(success(`💼 Trabajaste y ganaste **${money(reward)}**.`));
    }
    if (command === "crimen") {
      const cd = cooldown(user.crime, 120);
      if (cd) return reply(error(cd));
      user.crime = Date.now(); user.stats.crime++;
      if (Math.random() < 0.2) { const reward = random(300, 500); user.cash += reward; saveEconomy(); return reply(success(`🕵️ ¡La misión salió bien!\n┃ 💰 Ganaste **${money(reward)}**.`)); }
      const loss = Math.min(user.cash, random(200, 600)); user.cash -= loss; saveEconomy();
      return reply(error(`🚨 La misión salió mal.\n┃ 💸 Perdiste **${money(loss)}**.`));
    }
    if (command === "hut" || command === "trivia") {
      const isHut = command === "hut";
      const cd = isHut ? cooldown(user.hut, 180) : null;
      if (cd) return reply(error(cd));
      const questions = isHut ? [
        ["¿Cuánto es 7 × 8?", "56"], ["¿Cuál es el planeta rojo?", "marte"],
        ["¿Cuántos días tiene una semana?", "7"], ["¿Cuál es la capital de Francia?", "paris"]
      ] : [
        ["¿Cuál es el planeta más grande?", "jupiter"], ["¿Cuál es el océano más grande?", "pacifico"],
        ["¿Cuál es la capital de Francia?", "paris"], ["¿Cuál es el animal terrestre más grande?", "elefante"]
      ];
      const question = questions[random(0, questions.length - 1)];
      if (isHut) user.hut = Date.now();
      await reply(`╭━━━〔 🧠 PREGUNTA 〕━━━╮\n┃ ❓ ${question[0]}\n┃ ⏳ Tienes **${isHut ? 30 : 20} segundos**.\n╰━━━━━━━━━���━━━━━━━━━╯`);
      const collected = await message.channel.awaitMessages({ filter: m => m.author.id === message.author.id && !m.author.bot, max: 1, time: isHut ? 30000 : 20000 });
      const answer = collected.first();
      if (!answer) return reply(error("⏰ Se acabó el tiempo."));
      if (answer.content.toLowerCase().trim() === question[1]) {
        if (isHut) { const reward = random(200, 500); user.cash += reward; saveEconomy(); return reply(success(`🧠 ¡Correcto!\n┃ 💰 Ganaste **${money(reward)}**.`)); }
        return reply(success("🧠 ¡Correcto! 🎉"));
      }
      if (isHut) { const loss = Math.min(user.cash, random(300, 500)); user.cash -= loss; saveEconomy(); return reply(error(`❌ Respuesta incorrecta.\n┃ 💸 Perdiste **${money(loss)}**.`)); }
      return reply(error(`❌ Incorrecto. La respuesta era **${question[1]}**.`));
    }
    if (command === "rob") {
      const cd = cooldown(user.rob, 300); if (cd) return reply(error(cd));
      const target = mentionedUser(message);
      if (!target) return reply(error("🥷 Menciona a alguien."));
      if (target.id === message.author.id) return reply(error("😂 No puedes robarte a ti mismo."));
      const victim = getUser(target.id);
      if (victim.cash <= 0) return reply(error("💸 Esa persona no tiene efectivo."));
      user.rob = Date.now();
      if (Math.random() < 0.5) { const amount = Math.min(victim.cash, random(50, Math.max(50, victim.cash))); victim.cash -= amount; user.cash += amount; user.stats.rob++; saveEconomy(); return reply(success(`🥷 Robo exitoso!\n┃ 💰 Robaste **${money(amount)}**.`)); }
      saveEconomy(); return reply(error("🚨 ¡Te descubrieron! El robo falló."));
    }
    if (command === "dep" || command === "deposit" || command === "with" || command === "withdraw") {
      if (args[0]?.toLowerCase() !== "all") return reply(error(`Usa: **p.${command === "with" || command === "withdraw" ? "with" : "dep"} all**`));
      if (command === "dep" || command === "deposit") { if (user.cash <= 0) return reply(error("💵 No tienes efectivo.")); const amount = user.cash; user.bank += amount; user.cash = 0; saveEconomy(); return reply(success(`💵 Depositaste **${money(amount)}**.`)); }
      if (user.bank <= 0) return reply(error("🏦 No tienes dinero en el banco.")); const amount = user.bank; user.cash += amount; user.bank = 0; saveEconomy(); return reply(success(`💵 Retiraste **${money(amount)}**.`));
    }
    if (command === "gift" || command === "pay") {
      const target = mentionedUser(message); const amount = parseAmount(args[1]);
      if (!target || !amount) return reply(error(`Usa: **p.${command} @usuario cantidad**`));
      if (target.id === message.author.id) return reply(error("😂 No puedes enviarte dinero a ti mismo."));
      if (user.cash < amount) return reply(error("💸 No tienes suficiente efectivo."));
      const receiver = getUser(target.id); user.cash -= amount; receiver.cash += amount;
      if (command === "gift") user.stats.gifts++; saveEconomy();
      return reply(success(`${command === "gift" ? "🎁 Regalaste" : "💸 Enviaste"} **${money(amount)}** a **${target.username}**.`));
    }

    const items = { snack: 100, headphones: 500, controller: 1000, diamond: 2500, crown: 5000 };
    if (command === "shop") return reply(box("🛒 TIENDA", Object.entries(items).map(([item, price]) => `┃ 🛍️ ${item} — **${money(price)}**`).join("\n")));
    if (command === "buy") {
      const item = args[0]?.toLowerCase(); if (!item || !items[item]) return reply(error("🛒 Ese objeto no existe. Usa p.shop."));
      if (user.cash < items[item]) return reply(error(`💸 Necesitas **${money(items[item])}**.`));
      user.cash -= items[item]; user.inventory[item] = (user.inventory[item] || 0) + 1; saveEconomy(); return reply(success(`🛍️ Compraste **${item}** por **${money(items[item])}**.`));
    }
    if (command === "inventory") {
      const entries = Object.entries(user.inventory); return reply(box("🎒 INVENTARIO", entries.length ? entries.map(([item, count]) => `┃ 📦 **${item}** × ${count}`).join("\n") : "┃ 😢 Tu inventario está vacío."));
    }
    if (command === "sell") {
      const item = args[0]?.toLowerCase(); if (!item || !items[item]) return reply(error("💵 Ese objeto no se puede vender."));
      if (!user.inventory[item]) return reply(error("🎒 No tienes ese objeto."));
      user.inventory[item]--; if (user.inventory[item] <= 0) delete user.inventory[item]; const reward = Math.floor(items[item] / 2); user.cash += reward; saveEconomy(); return reply(success(`💵 Vendiste **${item}** por **${money(reward)}**.`));
    }
    if (command === "mission") { const reward = random(200, 350); user.cash += reward; saveEconomy(); return reply(success(`🎯 Misión completada.\n┃ 💰 Recompensa: **${money(reward)}**`)); }
    if (command === "profile" || command === "stats") return reply(box(command === "profile" ? `👤 PERFIL DE ${message.author.username}` : "📊 TUS ESTADÍSTICAS", `┃ 💵 Efectivo: **${money(user.cash)}**\n┃ 🏦 Banco: **${money(user.bank)}**\n┃ 💎 Total: **${money(user.cash + user.bank)}**\n┃ 💼 Trabajos: **${user.stats.work}**\n┃ 🕵️ Crímenes: **${user.stats.crime}**\n┃ 🥷 Robos: **${user.stats.rob}**\n┃ 🎁 Regalos: **${user.stats.gifts}**`));
    if (command === "rank") {
      const ranking = Object.entries(economy).map(([id, data]) => ({ id, total: (data.cash || 0) + (data.bank || 0) })).sort((a, b) => b.total - a.total).slice(0, 10);
      const lines = []; for (const [index, entry] of ranking.entries()) { const member = await message.guild.members.fetch(entry.id).catch(() => null); lines.push(`┃ ${["🥇", "🥈", "🥉"][index] || "🏅"} **${member ? member.user.username : "Usuario"}** — ${money(entry.total)}`); }
      return reply(box("👑 TOP 10 RICOS", lines.join("\n") || "┃ 😢 Todavía no hay jugadores."));
    }

    if (command === "coinflip") return reply(box("🪙 MONEDA", `┃ Resultado: **${Math.random() < 0.5 ? "CARA" : "CRUZ"} 🪙**`));
    if (command === "risk") { const cd = cooldown(user.risk, 30); if (cd) return reply(error(cd)); user.risk = Date.now(); const won = Math.random() < 0.5; saveEconomy(); return reply(won ? success("🎉 Superaste el reto de riesgo.") : error("❌ El reto no salió bien.")); }
    if (command === "dado") return reply(box("🎲 DADO", `┃ Resultado: **${random(1, 6)}**`));
    if (command === "8ball") { if (!args.length) return reply(error("🎱 Haz una pregunta. Ejemplo: p.8ball ¿ganaré?")); const answers = ["Sí.", "No.", "Probablemente.", "Definitivamente.", "No estoy seguro.", "Pregunta más tarde."]; return reply(box("🎱 8BALL", `┃ ${answers[random(0, answers.length - 1)]}`)); }
    if (command === "emoji") { const emojis = ["😂", "🤣", "😎", "🔥", "💀", "👑", "🚀", "💎", "🤖", "🎮", "⚡", "🤑"]; return reply(`🎰 Emoji aleatorio: **${emojis[random(0, emojis.length - 1)]}**`); }
    if (command === "challenge") { const challenges = ["🎮 Juega una partida.", "😂 Envía un meme.", "🧠 Resuelve un acertijo.", "👋 Saluda a alguien.", "🔥 Escribe un mensaje usando solo emojis."]; return reply(box("🎯 RETO", `┃ ${challenges[random(0, challenges.length - 1)]}`)); }
    if (command === "rps") { const choices = ["piedra", "papel", "tijera"]; const choice = args[0]?.toLowerCase(); if (!choices.includes(choice)) return reply(error("Usa: p.rps piedra | papel | tijera")); const bot = choices[random(0, 2)]; const win = (choice === "piedra" && bot === "tijera") || (choice === "papel" && bot === "piedra") || (choice === "tijera" && bot === "papel"); return reply(box("🎲 PIEDRA, PAPEL, TIJERA", `┃ Tú: **${choice}**\n┃ Joshua: **${bot}**\n┃ ${win ? "¡Ganaste!" : choice === bot ? "Empate." : "Perdiste."}`)); }
    if (command === "joke") return reply(box("😂 CHISTE", "┃ ¿Qué le dijo un techo a otro? Techo de menos."));
    if (command === "choose") { if (args.length < 2) return reply(error("Usa: p.choose opción1 opción2")); return reply(box("🎯 ELECCIÓN", `┃ Joshua eligió: **${args[random(0, args.length - 1)]}**`)); }
    if (command === "random") { const max = Math.max(1, Math.min(parseInt(args[0], 10) || 100, 1000000)); return reply(`🔢 Número aleatorio entre **1-${max}**: **${random(1, max)}**`); }
    if (command === "highfive" || command === "compliment") { const target = mentionedUser(message); if (!target) return reply(error("Menciona a alguien.")); return reply(command === "highfive" ? `🙌 **${message.author.username}** le dio un high-five a **${target.username}**!` : `⭐ **${message.author.username}** le dio un cumplido a **${target.username}**.`); }
    if (command === "say") { if (!args.length) return reply(error("Escribe algo después de p.say.")); if (!isAdmin(message)) return reply(error("🚫 Necesitas permisos de Administrador.")); await message.delete().catch(() => {}); return message.channel.send(args.join(" ")); }

    if (command === "whois") {
      const target = mentionedUser(message) || message.author; const member = await message.guild.members.fetch(target.id).catch(() => null);
      return reply(box("👀 WHOIS", `┃ 👤 Usuario: **${target.username}**\n┃ 🆔 ID: **${target.id}**\n┃ 📅 Cuenta: <t:${Math.floor(target.createdTimestamp / 1000)}:D>\n┃ 🏰 Entrada: ${member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "No disponible"}`));
    }
    if (command === "online") return reply(box("🟢 MIEMBROS ONLINE", `┃ 👥 Online detectados: **${message.guild.members.cache.filter(m => m.presence?.status && m.presence.status !== "offline").size}**`));
    if (command === "serverinfo") { const guild = message.guild; return reply(box("🏰 INFORMACIÓN DEL SERVIDOR", `┃ 🏰 Nombre: **${guild.name}**\n┃ 👑 Dueño: <@${guild.ownerId}>\n┃ 👥 Miembros: **${guild.memberCount}**\n┃ 📚 Canales: **${guild.channels.cache.size}**\n┃ 🚀 Boosts: **${guild.premiumSubscriptionCount || 0}**\n┃ 📅 Creado: <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`)); }
    if (command === "channels") { const channels = message.guild.channels.cache; return reply(box("📚 CANALES", `┃ 💬 Texto: **${channels.filter(c => c.type === ChannelType.GuildText).size}**\n┃ 🔊 Voz: **${channels.filter(c => c.type === ChannelType.GuildVoice).size}**\n┃ 🧩 Total: **${channels.size}**`)); }
    if (command === "roles") { const roles = message.guild.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position).first(30); return reply(box("🏷️ ROLES", roles.map(r => `┃ ${r.name}`).join("\n") || "┃ Sin roles.")); }
    if (command === "emojis") return reply(box("😎 EMOJIS", message.guild.emojis.cache.map(e => e.toString()).join(" ") || "┃ Este servidor no tiene emojis personalizados."));
    if (command === "boosts") return reply(box("🚀 BOOSTS", `┃ 🚀 Nivel: **${message.guild.premiumTier}**\n┃ 💎 Boosts: **${message.guild.premiumSubscriptionCount || 0}**`));
    if (command === "created") return reply(box("📅 SERVIDOR", `┃ Creado: <t:${Math.floor(message.guild.createdTimestamp / 1000)}:F>`));
    if (command === "userinfo" || command === "user") { const member = mentionedMember(message) || message.member; const roles = member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.name).slice(0, 10).join(", ") || "Ninguno"; return reply(box("ℹ️ USERINFO", `┃ 👤 Usuario: **${member.user.username}**\n┃ 🆔 ID: **${member.id}**\n┃ 🏷️ Roles: **${roles}**`)); }

    const adminCommands = ["mute", "unmute", "kick", "ban", "unban", "permaban", "warn", "purge", "lock", "unlock", "slowmode", "nick", "roleinfo"];
    if (adminCommands.includes(command)) {
      if (!isAdmin(message)) return reply(error("🚫 Necesitas permisos de Administrador."));
      if (command === "unban") { const id = args[0]; if (!/^\d{17,20}$/.test(id || "")) return reply(error("Usa: p.unban ID válido.")); await message.guild.members.unban(id).then(() => reply(success(`🆓 Usuario **${id}** fue desbaneado.`))).catch(() => reply(error("❌ No encontré ese usuario en la lista de baneados."))); return; }
      if (command === "purge") { const amount = parseInt(args[0], 10); if (!Number.isInteger(amount) || amount < 1 || amount > 99) return reply(error("🧹 Usa una cantidad entre 1 y 99.")); const deleted = await message.channel.bulkDelete(amount, true).catch(() => null); if (!deleted) return reply(error("❌ No pude borrar los mensajes.")); return reply(success(`🧹 Eliminé **${deleted.size}** mensajes.`)); }
      if (command === "lock" || command === "unlock") { await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: command === "lock" ? false : null }).then(() => reply(success(command === "lock" ? "🔒 Este canal ha sido bloqueado." : "🔓 Este canal ha sido desbloqueado."))).catch(() => reply(error("❌ No pude cambiar los permisos del canal."))); return; }
      if (command === "slowmode") { const seconds = parseInt(args[0], 10); if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600 || typeof message.channel.setRateLimitPerUser !== "function") return reply(error("⏳ Usa entre 0 y 21600 segundos.")); await message.channel.setRateLimitPerUser(seconds).then(() => reply(success(`🐌 Slowmode establecido en **${seconds}** segundos.`))).catch(() => reply(error("❌ No pude configurar el slowmode."))); return; }
      if (command === "roleinfo") { const name = args.join(" ").toLowerCase(); const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === name); if (!role) return reply(error("❌ No encontré ese rol.")); return reply(box("ℹ️ ROLEINFO", `┃ Nombre: **${role.name}**\n┃ ID: **${role.id}**\n┃ Miembros: **${role.members.size}**\n┃ Posición: **${role.position}**`)); }
      const member = mentionedMember(message); if (!member) return reply(error("Menciona a un usuario."));
      if (command === "warn") return reply(`⚠️ **${member.user.username}** ha recibido una advertencia de **${message.author.username}**.`);
      if (!canModerate(message, member)) return reply(error("❌ No puedo moderar a ese usuario por su jerarquía o permisos."));
      if (command === "nick") { const nick = args.slice(1).join(" ").trim(); if (!nick) return reply(error("✏️ Escribe el nuevo apodo.")); await member.setNickname(nick).then(() => reply(success(`✏️ **${member.user.username}** ahora se llama **${nick}**.`))).catch(() => reply(error("❌ No pude cambiar el apodo."))); return; }
      if (command === "mute" || command === "unmute") { await member.timeout(command === "mute" ? 3600000 : null, `${command} por ${message.author.tag}`).then(() => reply(success(command === "mute" ? `🔇 **${member.user.username}** fue silenciado.` : `🔊 **${member.user.username}** fue desmuteado.`))).catch(() => reply(error("❌ No pude aplicar el timeout."))); return; }
      if (command === "kick") { await member.kick(`Kick por ${message.author.tag}`).then(() => reply(success(`👢 **${member.user.username}** fue expulsado.`))).catch(() => reply(error("❌ No pude expulsar al usuario."))); return; }
      await member.ban({ reason: `${command} por ${message.author.tag}` }).then(() => reply(success(`🔨 **${member.user.username}** fue baneado.`))).catch(() => reply(error("❌ No pude banear al usuario."))); return;
    }

    return reply(error(`No conozco **${PREFIX}${command}**. Usa **${PREFIX}help**.`));
  } catch (err) {
    console.error(`Error en p.${command}:`, err);
    return reply(error("Ocurrió un error al ejecutar el comando."));
  }
});

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("🤖 Joshua está funcionando correctamente.");
}).listen(PORT, () => console.log(`🌐 Servidor HTTP activo en el puerto ${PORT}`));

if (!TOKEN) {
  console.error("❌ ERROR: No existe DISCORD_TOKEN en las variables de entorno.");
} else {
  client.login(TOKEN).catch(err => console.error("❌ No se pudo iniciar sesión:", err.message));
}
