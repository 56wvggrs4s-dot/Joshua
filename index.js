const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
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
    cash: 0,
    bank: 0,
    daily: 0,
    work: 0,
    crime: 0,
    hut: 0,
    rob: 0,
    risk: 0,
    inventory: {},
    stats: {
      work: 0,
      crime: 0,
      rob: 0,
      gifts: 0
    }
  };
}

function getUser(id) {
  const current = economy[id] && typeof economy[id] === "object" ? economy[id] : newUser();
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

function getCooldown(last, seconds) {
  const elapsed = Date.now() - Number(last || 0);
  const remaining = Number(seconds) * 1000 - elapsed;

  if (remaining <= 0) return null;

  const totalSeconds = Math.ceil(remaining / 1000);

  if (totalSeconds >= 60) {
    const minutes = Math.ceil(totalSeconds / 60);
    return `⏳ Espera **${minutes} minuto(s)**.`;
  }

  return `⏳ Espera **${totalSeconds} segundo(s)**.`;
}

function success(text) {
  return `╭━━━〔 ✅ ÉXITO 〕━━━╮\n┃ ${text}\n╰━━━━━━━━━━━━━━━━━━╯`;
}

function error(text) {
  return `╭━━━〔 ❌ ERROR 〕━━━╮\n┃ ${text}\n╰━━━━━━━━━━━━━━━━━━╯`;
}

function box(title, text) {
  return `╔══════════════════════════════╗\n║ ${title}\n╠══════════════════════════════╣\n${text}\n╚══════════════════════════════╝`;
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

function helpMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("joshua_help")
    .setPlaceholder("📖 Selecciona una categoría...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Economía")
        .setDescription("💰 Comandos de dinero y economía")
        .setValue("economia")
        .setEmoji("💰"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Tienda")
        .setDescription("🛒 Comprar y vender objetos")
        .setValue("tienda")
        .setEmoji("🛒"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Perfil")
        .setDescription("👤 Información y estadísticas")
        .setValue("perfil")
        .setEmoji("👤"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Diversión")
        .setDescription("🎮 Juegos y comandos divertidos")
        .setValue("diversion")
        .setEmoji("🎮"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Social")
        .setDescription("👥 Comandos sociales")
        .setValue("social")
        .setEmoji("👥"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Servidor")
        .setDescription("🏰 Información del servidor")
        .setValue("servidor")
        .setEmoji("🏰"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Utilidades")
        .setDescription("⚙️ Comandos útiles")
        .setValue("utilidades")
        .setEmoji("⚙️"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Administración")
        .setDescription("🛡️ Comandos para administradores")
        .setValue("admin")
        .setEmoji("🛡️")
    );

  return new ActionRowBuilder().addComponents(menu);
}

function helpHome() {
  return `╔══════════════════════════════════╗
║       🤖 JOSHUA — AYUDA 📖      ║
╚══════════════════════════════════╝

👋 ¡Hola! Soy **Joshua**.

Selecciona una categoría en el menú
de abajo para ver todos sus comandos.

📂 **Categorías disponibles:**

💰 Economía
🛒 Tienda
👤 Perfil
🎮 Diversión
👥 Social
🏰 Servidor
⚙️ Utilidades
🛡️ Administración

━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 **Joshua Bot**
`;
}

console.log("🤖 JOSHUA INICIANDO...");

client.once("ready", () => {
  console.log("🟢 Conectado a Discord");
  console.log(`🤖 Usuario: ${client.user.tag}`);
  console.log(`🌐 Servidores: ${client.guilds.cache.size}`);

  client.user.setPresence({
    activities: [{ name: "p.help 📖", type: 0 }],
    status: "online"
  });
});

client.on("shardReconnecting", (shardId) => {
  console.log(`🔄 Intentando reconectar... | Shard: ${shardId}`);
});

client.on("shardResume", (shardId, replayedEvents) => {
  console.log(`🟢 Conexión restaurada | Shard: ${shardId} | Eventos: ${replayedEvents}`);
});

client.on("shardDisconnect", (event, shardId) => {
  console.log(`🔌 Conexión perdida | Shard: ${shardId}`);
  console.log(`📡 Código: ${event.code}`);
});

client.on("shardError", (error, shardId) => {
  console.error(`❌ ERROR DE CONEXIÓN | Shard: ${shardId}`);
  console.error(error);
});

client.on("warn", (info) => {
  console.warn(`⚠️ DISCORD.JS: ${info}`);
});

client.on("error", (error) => {
  console.error("❌ ERROR:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ ERROR NO CONTROLADO:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ ERROR CRÍTICO:", error);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  if (!content.toLowerCase().startsWith(PREFIX)) return;

  const tokens = content.slice(PREFIX.length).trim().split(/\s+/).filter(Boolean);
  const command = (tokens.shift() || "").toLowerCase();
  if (!command) return;

  const args = tokens;
  const user = getUser(message.author.id);
  const reply = (text) => message.reply({ content: text, allowedMentions: { repliedUser: false } });

  try {
    if (command === "help") {
      return message.reply({
        content: helpHome(),
        components: [helpMenu()],
        allowedMentions: { repliedUser: false }
      });
    }

    if (command === "ping") {
      return reply(box("🏓 PONG", `┃ ⚡ Latencia: **${client.ws.ping}ms**\n┃ 🤖 Joshua está funcionando.\n┃ 🌐 Estado: **ONLINE 🟢**`));
    }

    if (command === "status") {
      const uptime = Math.floor(client.uptime / 1000);
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;

      return reply(box("📡 🤖 ESTADO DE JOSHUA", `┃ 🟢 Estado: **ONLINE**\n┃ 🏓 Ping: **${client.ws.ping}ms**\n┃ ⏱️ Uptime: **${hours}h ${minutes}m ${seconds}s**\n┃ 🌐 Servidores: **${client.guilds.cache.size}**`));
    }

    if (command === "hola") {
      return reply(`👋 ¡Hola, **${message.author.username}**! 🤖`);
    }

    if (command === "info") {
      return reply(box("🤖 INFORMACIÓN DE JOSHUA", `┃ 🤖 Nombre: **Joshua**\n┃ ⚙️ Prefix: **${PREFIX}**\n┃ 💻 Discord.js: **v14**\n┃ 🌐 Servidores: **${client.guilds.cache.size}**`));
    }

    if (command === "balance" || command === "bal") {
      return reply(box("💰 TU DINERO", `┃ 💵 Efectivo: **${money(user.cash)}**\n┃ 🏦 Banco: **${money(user.bank)}**\n┃ 💎 Total: **${money(user.cash + user.bank)}**`));
    }

    if (command === "bank") {
      return reply(`🏦 Tienes **${money(user.bank)}** guardados en el banco.`);
    }

    if (command === "daily") {
      const cd = getCooldown(user.daily, 86400);
      if (cd) return reply(error(cd));

      const reward = 1000;
      user.cash += reward;
      user.daily = Date.now();
      saveEconomy();

      return reply(success(`🎁 Recompensa diaria:\n┃ 💰 Has recibido **${money(reward)}**`));
    }

    if (command === "work") {
      const cd = getCooldown(user.work, 30);
      if (cd) return reply(error(cd));

      const reward = random(10, 150);
      user.cash += reward;
      user.work = Date.now();
      user.stats.work++;
      saveEconomy();

      return reply(success(`💼 Has trabajado y ganaste **${money(reward)}**.`));
    }

    if (command === "crimen" || command === "crime") {
      const cd = getCooldown(user.crime, 120);
      if (cd) return reply(error(cd));

      user.crime = Date.now();

      if (Math.random() < 0.2) {
        const reward = random(300, 500);
        user.cash += reward;
        user.stats.crime++;
        saveEconomy();

        return reply(success(`🕵️ ¡La misión salió bien!\n┃ 💰 Ganaste **${money(reward)}**`));
      }

      const loss = random(200, 600);
      user.cash = Math.max(0, user.cash - loss);
      user.stats.crime++;
      saveEconomy();

      return reply(error(`🚨 La misión salió mal.\n┃ 💸 Perdiste **${money(loss)}**`));
    }

    if (command === "hut") {
      const cd = getCooldown(user.hut, 180);
      if (cd) return reply(error(cd));

      const questions = [
        { q: "¿Cuánto es 5 + 5?", answers: ["10", "diez"], reward: random(200, 500) },
        { q: "¿Cuántos días tiene una semana?", answers: ["7", "siete"], reward: random(200, 500) },
        { q: "¿Cuál es la capital de España?", answers: ["madrid"], reward: random(200, 500) }
      ];

      const question = questions[random(0, questions.length - 1)];
      user.hut = Date.now();
      saveEconomy();

      const sent = await message.reply(`🧠 **Pregunta:**\n\n❓ ${question.q}\n\nEscribe tu respuesta.`);

      try {
        const collected = await message.channel.awaitMessages({
          filter: (m) => m.author.id === message.author.id,
          max: 1,
          time: 15000,
          errors: ["time"]
        });

        const answer = collected.first().content.toLowerCase().trim();

        if (question.answers.includes(answer)) {
          user.cash += question.reward;
          saveEconomy();

          return sent.edit(success(`🧠 ¡Respuesta correcta!\n┃ 💰 Ganaste **${money(question.reward)}**`));
        }

        const loss = random(300, 500);
        user.cash = Math.max(0, user.cash - loss);
        saveEconomy();

        return sent.edit(error(`❌ Respuesta incorrecta.\n┃ 💸 Perdiste **${money(loss)}**`));
      } catch {
        return sent.edit(error("⏰ Se acabó el tiempo."));
      }
    }

    if (command === "rob") {
      const cd = getCooldown(user.rob, 300);
      if (cd) return reply(error(cd));

      const target = message.mentions.users.first();
      if (!target) return reply(error("Menciona a alguien para robarle."));
      if (target.id === message.author.id) return reply(error("No puedes robarte a ti mismo."));

      const targetUser = getUser(target.id);
      if (targetUser.cash <= 0) return reply(error("Ese usuario no tiene dinero en efectivo."));

      user.rob = Date.now();
      const stolen = Math.min(targetUser.cash, random(50, Math.max(50, targetUser.cash)));

      targetUser.cash -= stolen;
      user.cash += stolen;
      user.stats.rob++;
      saveEconomy();

      return reply(success(`🥷 ¡Robo exitoso!\n┃ 💰 Robaste **${money(stolen)}**\n┃ 👤 Víctima: **${target.username}**`));
    }

    if (command === "dep") {
      if (args[0]?.toLowerCase() !== "all") return reply(error("Usa `p.dep all`."));
      if (user.cash <= 0) return reply(error("No tienes dinero en efectivo."));

      const amount = user.cash;
      user.bank += amount;
      user.cash = 0;
      saveEconomy();

      return reply(success(`🏦 Depositaste todo.\n┃ 💰 Cantidad: **${money(amount)}**`));
    }

    if (command === "with") {
      if (args[0]?.toLowerCase() !== "all") return reply(error("Usa `p.with all`."));
      if (user.bank <= 0) return reply(error("No tienes dinero en el banco."));

      const amount = user.bank;
      user.cash += amount;
      user.bank = 0;
      saveEconomy();

      return reply(success(`💵 Retiraste todo.\n┃ 💰 Cantidad: **${money(amount)}**`));
    }

    if (command === "gift") {
      const target = message.mentions.users.first();
      const amount = parseInt(args.find((a) => /^\d+$/.test(a)));

      if (!target || !amount || amount <= 0) return reply(error("Usa `p.gift @usuario cantidad`."));
      if (target.id === message.author.id) return reply(error("No puedes regalarte dinero a ti mismo."));
      if (user.cash < amount) return reply(error("No tienes suficiente dinero."));

      const targetUser = getUser(target.id);
      user.cash -= amount;
      targetUser.cash += amount;
      user.stats.gifts++;
      saveEconomy();

      return reply(success(`🎁 Regalo enviado.\n┃ 👤 Usuario: **${target.username}**\n┃ 💰 Cantidad: **${money(amount)}**`));
    }

    if (command === "pay") {
      const target = message.mentions.users.first();
      const amount = parseInt(args.find((a) => /^\d+$/.test(a)));

      if (!target || !amount || amount <= 0) return reply(error("Usa `p.pay @usuario cantidad`."));
      if (target.id === message.author.id) return reply(error("No puedes pagarte a ti mismo."));
      if (user.cash < amount) return reply(error("No tienes suficiente dinero."));

      const targetUser = getUser(target.id);
      user.cash -= amount;
      targetUser.cash += amount;
      saveEconomy();

      return reply(success(`💸 Pago realizado.\n┃ 👤 Usuario: **${target.username}**\n┃ 💰 Cantidad: **${money(amount)}**`));
    }

    if (command === "coinflip") {
      const result = Math.random() < 0.5 ? "🪙 Cara" : "🪙 Cruz";
      return reply(`🪙 **Moneda lanzada:** ${result}`);
    }

    if (command === "dado") {
      const result = random(1, 6);
      return reply(`🎲 Has sacado **${result}**.`);
    }

    if (command === "8ball") {
      if (!args.length) return reply(error("Haz una pregunta."));

      const answers = [
        "🟢 Sí, definitivamente.",
        "🟢 Parece que sí.",
        "🟡 Puede ser.",
        "🟡 No estoy seguro.",
        "🔴 Probablemente no.",
        "🔴 No."
      ];

      return reply(`🎱 **8Ball:** ${answers[random(0, answers.length - 1)]}`);
    }

    if (command === "emoji") {
      const emojis = ["😀", "😂", "😎", "🤖", "🔥", "💀", "👀", "🎉", "🚀", "😈"];
      return reply(`😎 Tu emoji es: **${emojis[random(0, emojis.length - 1)]}**`);
    }

    if (command === "challenge") {
      const challenges = [
        "🎯 Escribe un mensaje usando solo emojis.",
        "🎯 Di hola a alguien del servidor.",
        "🎯 Usa 3 comandos diferentes de Joshua.",
        "🎯 Manda un GIF divertido."
      ];

      return reply(challenges[random(0, challenges.length - 1)]);
    }

    if (command === "risk") {
      const result = Math.random() < 0.5 ? "🍀 ¡Tuviste suerte!" : "💥 ¡No tuviste suerte!";
      return reply(`🎲 **RISK**\n\n${result}`);
    }

    if (command === "profile") {
      return reply(box("👤 TU PERFIL", `┃ 👤 Usuario: **${message.author.username}**\n┃ 💰 Dinero: **${money(user.cash + user.bank)}**\n┃ 💼 Trabajos: **${user.stats.work}**\n┃ 🕵️ Crímenes: **${user.stats.crime}**\n┃ 🥷 Robos: **${user.stats.rob}**\n┃ 🎁 Regalos: **${user.stats.gifts}**`));
    }

    if (command === "stats") {
      return reply(box("📊 ESTADÍSTICAS", `┃ 💼 Trabajos: **${user.stats.work}**\n┃ 🕵️ Crímenes: **${user.stats.crime}**\n┃ 🥷 Robos: **${user.stats.rob}**\n┃ 🎁 Regalos: **${user.stats.gifts}**`));
    }

    if (command === "userinfo" || command === "user") {
      const target = message.mentions.users.first() || message.author;
      return reply(box("🔎 INFORMACIÓN DE USUARIO", `┃ 👤 Usuario: **${target.username}**\n┃ 🆔 ID: \`${target.id}\`\n┃ 🤖 Bot: **${target.bot ? "Sí" : "No"}**\n┃ 📅 Cuenta creada: <t:${Math.floor(target.createdTimestamp / 1000)}:D>`));
    }

    if (command === "serverinfo") {
      if (!message.guild) return;
      return reply(box("🏰 INFORMACIÓN DEL SERVIDOR", `┃ 🏰 Nombre: **${message.guild.name}**\n┃ 👥 Miembros: **${message.guild.memberCount}**\n┃ 📚 Canales: **${message.guild.channels.cache.size}**\n┃ 🏷️ Roles: **${message.guild.roles.cache.size}**\n┃ 😎 Emojis: **${message.guild.emojis.cache.size}**\n┃ 🚀 Boosts: **${message.guild.premiumSubscriptionCount || 0}**`));
    }

    if (command === "rank") {
      const ranking = Object.entries(economy)
        .map(([id, data]) => ({ id, total: (data.cash || 0) + (data.bank || 0) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      let text = "";
      ranking.forEach((item, index) => {
        const member = message.guild?.members.cache.get(item.id);
        const name = member?.user.username || `Usuario ${item.id}`;
        text += `┃ **${index + 1}.** ${name} — ${money(item.total)}\n`;
      });

      return reply(box("👑 TOP ECONOMÍA", text || "┃ No hay datos todavía."));
    }

    if (command === "shop") {
      return reply(`╔══════════════════════════════════╗
║          🛒 TIENDA JOSHUA        ║
╚═════════════��════════════════════╝

🧃 **Bebida** — 100 🪙
📦 **Caja** — 250 🪙
💎 **Diamante** — 500 🪙
👑 **Corona** — 1.000 🪙

Usa:
\`p.buy bebida\`
\`p.buy caja\`
\`p.buy diamante\`
\`p.buy corona\``);
    }

    if (command === "buy") {
      const items = { bebida: 100, caja: 250, diamante: 500, corona: 1000 };
      const item = args[0]?.toLowerCase();

      if (!item || !items[item]) return reply(error("Objeto no válido. Usa `p.shop`."));
      if (user.cash < items[item]) return reply(error("No tienes suficiente dinero."));

      user.cash -= items[item];
      if (!user.inventory[item]) user.inventory[item] = 0;
      user.inventory[item]++;
      saveEconomy();

      return reply(success(`🛍️ Compraste **${item}**.\n┃ 💰 Precio: **${money(items[item])}**`));
    }

    if (command === "inventory" || command === "inv") {
      const entries = Object.entries(user.inventory).filter(([, amount]) => amount > 0);
      if (!entries.length) return reply(`🎒 **Tu inventario está vacío.**`);

      let text = "";
      entries.forEach(([item, amount]) => {
        text += `┃ 📦 ${item}: **${amount}**\n`;
      });

      return reply(box("🎒 TU INVENTARIO", text));
    }

    if (command === "sell") {
      const prices = { bebida: 50, caja: 125, diamante: 250, corona: 500 };
      const item = args[0]?.toLowerCase();

      if (!item || !prices[item]) return reply(error("Objeto no válido."));
      if (!user.inventory[item]) return reply(error("No tienes ese objeto."));

      user.inventory[item]--;
      user.cash += prices[item];
      saveEconomy();

      return reply(success(`💰 Vendiste **${item}** por **${money(prices[item])}**.`));
    }

    if (command === "mission" || command === "missions") {
      const missions = [
        { text: "🎮 Usa un comando de Joshua.", reward: 250 },
        { text: "💬 Escribe 5 mensajes.", reward: 300 },
        { text: "👥 Habla con otro miembro.", reward: 200 },
        { text: "🎯 Usa 3 comandos de Joshua.", reward: 350 }
      ];

      const mission = missions[random(0, missions.length - 1)];
      user.cash += mission.reward;
      saveEconomy();

      return reply(success(`🎯 Misión completada:\n┃ ${mission.text}\n┃\n┃ 💰 Recompensa: **${money(mission.reward)}**`));
    }

    if (command === "rps") {
      const choices = ["piedra", "papel", "tijera"];
      const choice = args[0]?.toLowerCase();

      if (!choices.includes(choice)) return reply(error("Usa `p.rps piedra`, `p.rps papel` o `p.rps tijera`."));

      const bot = choices[random(0, 2)];
      let result;

      if (choice === bot) {
        result = "🤝 ¡Empate!";
      } else if (
        (choice === "piedra" && bot === "tijera") ||
        (choice === "papel" && bot === "piedra") ||
        (choice === "tijera" && bot === "papel")
      ) {
        result = "🎉 ¡Ganaste!";
      } else {
        result = "😅 ¡Perdiste!";
      }

      return reply(`🪨 **PIEDRA, PAPEL O TIJERA**\n\n👤 Tú: **${choice}**\n🤖 Joshua: **${bot}**\n\n${result}`);
    }

    if (command === "joke") {
      const jokes = [
        "😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!",
        "🤣 ¿Qué le dijo un pez a otro? ¡Nada!",
        "😆 ¿Por qué el libro fue al médico? Porque tenía muchas páginas en blanco.",
        "😂 ¿Qué hace una computadora cuando tiene frío? ¡Cierra Windows!"
      ];

      return reply(jokes[random(0, jokes.length - 1)]);
    }

    if (command === "trivia") {
      const questions = [
        { q: "🌍 ¿Cuál es el planeta más grande del sistema solar?", a: "jupiter" },
        { q: "🐘 ¿Cuál es el animal terrestre más grande?", a: "elefante" },
        { q: "🌊 ¿Cuál es el océano más grande?", a: "pacifico" }
      ];

      const question = questions[random(0, questions.length - 1)];
      const sent = await message.reply(`🧠 **TRIVIA**\n\n${question.q}\n\nTienes **15 segundos** para responder.`);

      try {
        const collected = await message.channel.awaitMessages({
          filter: (m) => m.author.id === message.author.id,
          max: 1,
          time: 15000,
          errors: ["time"]
        });

        const answer = collected.first().content.toLowerCase().trim();
        if (answer === question.a) return sent.edit(`🎉 **¡Correcto!** 🧠`);
        return sent.edit(`❌ Incorrecto.\n✅ La respuesta era **${question.a}**.`);
      } catch {
        return sent.edit(`⏰ Se acabó el tiempo.`);
      }
    }

    if (command === "choose") {
      if (args.length < 2) return reply(error("Pon al menos dos opciones. Ejemplo: `p.choose pizza hamburguesa`."));
      const choice = args[random(0, args.length - 1)];
      return reply(`🎯 **Joshua ha elegido:** **${choice}**`);
    }

    if (command === "random") {
      const max = parseInt(args[0]);
      if (!max || max < 1) return reply(error("Usa `p.random número`."));
      return reply(`🔢 Número aleatorio entre 1 y ${max}: **${random(1, max)}**`);
    }

    if (command === "highfive") {
      const target = message.mentions.users.first();
      if (!target) return reply(error("Menciona a alguien."));
      return reply(`🙌 **${message.author.username}** chocó los cinco con **${target.username}**! ✋`);
    }

    if (command === "compliment") {
      const target = message.mentions.users.first();
      if (!target) return reply(error("Menciona a alguien."));

      const compliments = [
        "✨ ¡Eres genial!",
        "🔥 ¡Tienes una energía increíble!",
        "😎 ¡Eres una persona muy cool!",
        "🌟 ¡Haces que el servidor sea más divertido!"
      ];

      return reply(`⭐ **${target.username}**, ${compliments[random(0, compliments.length - 1)]}`);
    }

    if (command === "whois") {
      const target = message.mentions.users.first();
      if (!target) return reply(error("Menciona a alguien."));
      return reply(`👀 **WHOIS**\n\n👤 Usuario: **${target.username}**\n🆔 ID: \`${target.id}\`\n🤖 Bot: **${target.bot ? "Sí" : "No"}**`);
    }

    if (command === "online") {
      if (!message.guild) return;

      const online = message.guild.members.cache.filter((member) => member.presence && member.presence.status !== "offline").size;
      return reply(`🟢 Hay aproximadamente **${online}** miembros conectados.`);
    }

    if (command === "channels") {
      if (!message.guild) return;

      const channels = message.guild.channels.cache
        .map((channel) => (channel.type === ChannelType.GuildCategory ? `📁 ${channel.name}` : `#️⃣ ${channel.name}`))
        .slice(0, 50)
        .join("\n");

      return reply(box("📚 CANALES", channels || "┃ No hay canales."));
    }

    if (command === "roles") {
      if (!message.guild) return;

      const roles = message.guild.roles.cache
        .filter((role) => role.id !== message.guild.id)
        .map((role) => `🏷️ ${role.name}`)
        .slice(0, 50)
        .join("\n");

      return reply(box("🏷️ ROLES", roles || "┃ No hay roles."));
    }

    if (command === "emojis") {
      if (!message.guild) return;

      const emojis = message.guild.emojis.cache
        .map((emoji) => `${emoji} \`${emoji.name}\``)
        .slice(0, 50)
        .join("\n");

      return reply(box("😎 EMOJIS", emojis || "┃ No hay emojis personalizados."));
    }

    if (command === "boosts") {
      if (!message.guild) return;
      return reply(`🚀 **${message.guild.name}** tiene **${message.guild.premiumSubscriptionCount || 0} boosts**.`);
    }

    if (command === "created") {
      if (!message.guild) return;
      return reply(`📅 Este servidor fue creado el <t:${Math.floor(message.guild.createdTimestamp / 1000)}:F>.`);
    }

    if (command === "say") {
      if (!args.length) return reply(error("Escribe algo para que Joshua diga."));
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      await message.delete().catch(() => {});
      return message.channel.send(args.join(" "));
    }

    if (command === "lock") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));
      if (!message.channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.ManageChannels)) {
        return reply(error("No tengo permiso para administrar este canal."));
      }

      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false
      });

      return reply(success("🔒 Canal bloqueado."));
    }

    if (command === "unlock") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: null
      });

      return reply(success("🔓 Canal desbloqueado."));
    }

    if (command === "slowmode") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      const seconds = parseInt(args[0], 10);
      if (Number.isNaN(seconds) || seconds < 0 || seconds > 21600) {
        return reply(error("Usa un valor entre 0 y 21600 segundos."));
      }

      if (!message.channel.setRateLimitPerUser) return reply(error("Este canal no permite slowmode."));

      await message.channel.setRateLimitPerUser(seconds);
      return reply(success(`🐌 Slowmode establecido en **${seconds} segundos**.`));
    }

    if (command === "nick") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      const target = message.mentions.members.first();
      if (!target) return reply(error("Menciona a un usuario."));

      const newNick = args.filter((arg) => !arg.includes(target.id)).join(" ");
      if (!newNick) return reply(error("Escribe el nuevo apodo."));

      try {
        await target.setNickname(newNick.slice(0, 32));
        return reply(success(`✏️ Nuevo apodo de **${target.user.username}**: **${newNick.slice(0, 32)}**`));
      } catch {
        return reply(error("No pude cambiar el apodo. Revisa los permisos y la jerarquía de roles."));
      }
    }

    if (command === "roleinfo") {
      if (!message.guild) return;

      const role = message.mentions.roles.first() || message.guild.roles.cache.find((r) => r.name.toLowerCase() === args.join(" ").toLowerCase());
      if (!role) return reply(error("Menciona un rol o escribe su nombre."));

      return reply(box("🏷️ INFORMACIÓN DEL ROL", `┃ 🏷️ Nombre: **${role.name}**\n┃ 🆔 ID: \`${role.id}\`\n┃ 👥 Miembros: **${role.members.size}**\n┃ 📅 Creado: <t:${Math.floor(role.createdTimestamp / 1000)}:D>`));
    }

    if (command === "warn") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      const target = message.mentions.members.first();
      if (!target) return reply(error("Menciona a un usuario."));

      const reason = args.filter((arg) => !arg.includes(target.id)).join(" ") || "Sin razón especificada";
      return reply(success(`⚠️ **${target.user.username}** ha recibido una advertencia.\n┃ 📝 Razón: **${reason}**`));
    }

    if (command === "mute") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      const target = message.mentions.members.first();
      if (!target) return reply(error("Menciona a un usuario."));

      try {
        await target.timeout(60 * 60 * 1000, "Mute realizado por Joshua");
        return reply(success(`🔇 **${target.user.username}** ha sido silenciado durante **1 hora**.`));
      } catch {
        return reply(error("No pude silenciar a ese usuario."));
      }
    }

    if (command === "unmute") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      const target = message.mentions.members.first();
      if (!target) return reply(error("Menciona a un usuario."));

      try {
        await target.timeout(null, "Mute eliminado por Joshua");
        return reply(success(`🔊 **${target.user.username}** ya puede hablar nuevamente.`));
      } catch {
        return reply(error("No pude quitar el mute."));
      }
    }

    if (command === "kick") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      const target = message.mentions.members.first();
      if (!target) return reply(error("Menciona a un usuario."));
      if (!target.kickable) return reply(error("No puedo expulsar a ese usuario."));

      try {
        await target.kick("Expulsado por Joshua");
        return reply(success(`👢 **${target.user.username}** fue expulsado.`));
      } catch {
        return reply(error("No pude expulsar a ese usuario."));
      }
    }

    if (command === "ban") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      const target = message.mentions.members.first();
      if (!target) return reply(error("Menciona a un usuario."));
      if (!target.bannable) return reply(error("No puedo banear a ese usuario."));

      try {
        await target.ban({ reason: "Baneado por Joshua" });
        return reply(success(`🔨 **${target.user.username}** fue baneado.`));
      } catch {
        return reply(error("No pude banear a ese usuario."));
      }
    }

    if (command === "unban") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      const id = args[0];
      if (!id) return reply(error("Usa `p.unban ID`."));

      try {
        await message.guild.members.unban(id, "Unban realizado por Joshua");
        return reply(success(`🔓 Usuario \`${id}\` desbaneado.`));
      } catch {
        return reply(error("No encontré un ban con esa ID."));
      }
    }

    if (command === "permaban") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      const target = message.mentions.members.first();
      if (!target) return reply(error("Menciona a un usuario."));
      if (!target.bannable) return reply(error("No puedo banear a ese usuario."));

      try {
        await target.ban({ reason: "Permaban realizado por Joshua" });
        return reply(success(`☠️ **${target.user.username}** ha sido baneado permanentemente.`));
      } catch {
        return reply(error("No pude realizar el permaban."));
      }
    }

    if (command === "purge") {
      if (!isAdmin(message)) return reply(error("Necesitas permisos de administrador."));

      const amount = parseInt(args[0], 10);
      if (Number.isNaN(amount) || amount < 1 || amount > 99) {
        return reply(error("El número debe estar entre 1 y 99."));
      }

      try {
        const deleted = await message.channel.bulkDelete(amount, true);
        const msg = await message.channel.send(success(`🧹 Eliminados **${deleted.size} mensajes**.`));
        setTimeout(() => msg.delete().catch(() => {}), 3000);
        return;
      } catch {
        return reply(error("No pude eliminar los mensajes."));
      }
    }

    if (command === "helpadmin") {
      if (!isAdmin(message)) return reply(error("Este menú es solo para administradores."));

      return reply(`╔══════════════════════════════════╗
║     🛡️ JOSHUA — ADMINISTRACIÓN   ║
╚══════════════════════════════════╝

🔇 \`p.mute @usuario\`
🔊 \`p.unmute @usuario\`
👢 \`p.kick @usuario\`
🔨 \`p.ban @usuario\`
🔓 \`p.unban ID\`
☠️ \`p.permaban @usuario\`
⚠️ \`p.warn @usuario\`
🧹 \`p.purge cantidad\`
🔒 \`p.lock\`
🔓 \`p.unlock\`
🐌 \`p.slowmode segundos\`
✏️ \`p.nick @usuario nombre\`
🏷️ \`p.roleinfo @rol\`

━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ Todos estos comandos requieren
permisos de administrador.`);
    }

    return reply(error(`No conozco **${PREFIX}${command}**. Usa **${PREFIX}help**.`));
  } catch (err) {
    console.error(`Error en p.${command}:`, err);
    return reply(error("Ocurrió un error al ejecutar el comando."));
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "joshua_help") return;

  const category = interaction.values[0];

  const pages = {
    economia: `💰 **ECONOMÍA**

> 💵 \`p.balance\` — Ver tu dinero
> 🏦 \`p.bank\` — Ver tu banco
> 🎁 \`p.daily\` — Recompensa diaria
> 💼 \`p.work\` — Trabajar
> 🕵️ \`p.crimen\` — Misión de riesgo
> 🧠 \`p.hut\` — Pregunta por dinero
> 🥷 \`p.rob @usuario\` — Robo virtual
> 🏦 \`p.dep all\` — Depositar todo
> 💵 \`p.with all\` — Retirar todo
> 🎁 \`p.gift @usuario cantidad\` — Regalar
> 💸 \`p.pay @usuario cantidad\` — Pagar`,

    tienda: `🛒 **TIENDA**

> 🛒 \`p.shop\` — Ver la tienda
> 🛍️ \`p.buy objeto\` — Comprar
> 🎒 \`p.inventory\` — Ver inventario
> 💰 \`p.sell objeto\` — Vender
> 🎯 \`p.mission\` — Misión`,

    perfil: `👤 **PERFIL**

> 👤 \`p.profile\` — Tu perfil
> 📊 \`p.stats\` — Tus estadísticas
> 🔎 \`p.userinfo @usuario\` — Información
> 🏰 \`p.serverinfo\` — Información del servidor
> 👑 \`p.rank\` — Ranking`,

    diversion: `🎮 **DIVERSIÓN**

> 🪙 \`p.coinflip\` — Lanzar moneda
> 🎲 \`p.dado\` — Lanzar dado
> 🎲 \`p.risk\` — Juego de riesgo
> 🎱 \`p.8ball pregunta\` — Bola mágica
> 😎 \`p.emoji\` — Emoji aleatorio
> 🎯 \`p.challenge\` — Reto
> 🪨 \`p.rps opción\` — Piedra, papel o tijera
> 😂 \`p.joke\` — Chiste
> 🧠 \`p.trivia\` — Trivia
> 🎯 \`p.choose opciones\` — Elegir
> 🔢 \`p.random número\` — Número aleatorio
> 🙌 \`p.highfive @usuario\` — Chocar los cinco`,

    social: `👥 **SOCIAL**

> ⭐ \`p.compliment @usuario\` — Felicitar
> 👀 \`p.whois @usuario\` — Ver información
> 🟢 \`p.online\` — Miembros conectados
> 🙌 \`p.highfive @usuario\` — Chocar los cinco`,

    servidor: `🏰 **SERVIDOR**

> 🏰 \`p.serverinfo\` — Información del servidor
> 📚 \`p.channels\` — Ver canales
> 🏷️ \`p.roles\` — Ver roles
> 😎 \`p.emojis\` — Ver emojis
> 🚀 \`p.boosts\` — Ver boosts
> 📅 \`p.created\` — Fecha de creación`,

    utilidades: `⚙️ **UTILIDADES**

> 🏓 \`p.ping\` — Ver latencia
> 📡 \`p.status\` — Estado de Joshua
> 👋 \`p.hola\` — Saludar
> 🤖 \`p.info\` — Información de Joshua
> 📢 \`p.say texto\` — Joshua habla`,

    admin: `🛡️ **ADMINISTRACIÓN**

> 🔇 \`p.mute @usuario\` — Silenciar
> 🔊 \`p.unmute @usuario\` — Quitar silencio
> 👢 \`p.kick @usuario\` — Expulsar
> 🔨 \`p.ban @usuario\` — Banear
> 🔓 \`p.unban ID\` — Desbanear
> ☠️ \`p.permaban @usuario\` — Ban permanente
> ⚠️ \`p.warn @usuario\` — Advertencia
> 🧹 \`p.purge cantidad\` — Borrar mensajes
> 🔒 \`p.lock\` — Bloquear canal
> 🔓 \`p.unlock\` — Desbloquear canal
> 🐌 \`p.slowmode segundos\` — Slowmode
> ✏️ \`p.nick @usuario nombre\` — Cambiar apodo
> 🏷️ \`p.roleinfo @rol\` — Información de rol

⚠️ Requieren permisos de administrador.`
  };

  const selectedPage = pages[category] || "❌ Categoría no encontrada.";

  await interaction.update({
    content: `╔══════════════════════════════════╗
║       🤖 JOSHUA — AYUDA 📖      ║
╚══════════════════════════════════╝

${selectedPage}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📂 Selecciona otra categoría abajo:`,
    components: [helpMenu()]
  });
});

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("🤖 Joshua está funcionando correctamente.");
}).listen(PORT, () => {
  console.log(`🌐 Servidor HTTP activo en el puerto ${PORT}`);
});

if (!TOKEN) {
  console.error("❌ ERROR: No existe DISCORD_TOKEN en las variables de entorno.");
} else {
  client.login(TOKEN).catch((err) => console.error("❌ No se pudo iniciar sesión:", err.message));
}
