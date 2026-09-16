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
const DATA_FILE = path.join(__dirname, "economy.json");
const PORT = Number(process.env.PORT) || 3000;
const TOKEN = process.env.DISCORD_TOKEN;

console.log("🤖✨ JOSHUA INICIANDO...");

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

let data = {
  users: {},
  guilds: {}
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

      if (raw && typeof raw === "object") {
        if (raw.users || raw.guilds) {
          data = {
            users: raw.users && typeof raw.users === "object" ? raw.users : {},
            guilds: raw.guilds && typeof raw.guilds === "object" ? raw.guilds : {}
          };
        } else {
          data.users = raw && typeof raw === "object" ? raw : {};
        }
      }
    }
  } catch (err) {
    console.log("⚠️ No se pudo leer economy.json. Creando datos nuevos.");
    console.error(err);
    data = { users: {}, guilds: {} };
  }
}

loadData();

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Error guardando datos:", err);
  }
}

function money(amount) {
  return `${Math.max(0, Number(amount) || 0).toLocaleString("es-ES")} 🪙`;
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function userMention(id) {
  return `<@${id}>`;
}

function remaining(seconds) {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (secs === 0) return `${minutes}m`;
  return `${minutes}m ${secs}s`;
}

function isAdmin(member) {
  return Boolean(member?.permissions?.has(PermissionsBitField.Flags.Administrator));
}

function cooldown(userId, name, seconds) {
  if (!global.cooldowns) global.cooldowns = new Map();

  const key = `${userId}:${name}`;
  const now = Date.now();

  if (global.cooldowns.has(key)) {
    const end = global.cooldowns.get(key);
    if (now < end) {
      return Math.ceil((end - now) / 1000);
    }
  }

  global.cooldowns.set(key, now + seconds * 1000);
  return 0;
}

function embed(title, description, color = 0x5865f2) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function success(text) {
  return embed("✅ ÉXITO", text, 0x57f287);
}

function errorEmbed(text) {
  return embed("❌ ERROR", text, 0xed4245);
}

function info(text) {
  return embed("💙 INFORMACIÓN", text, 0x5865f2);
}

function getUser(id) {
  if (!data.users[id]) {
    data.users[id] = {
      cash: 0,
      bank: 0,
      daily: 0,
      work: 0,
      crime: 0,
      hut: 0,
      rob: 0,
      inventory: [],
      messages: 0,
      commands: 0,
      stats: {
        work: 0,
        crime: 0,
        rob: 0,
        gifts: 0
      }
    };
  }

  const user = data.users[id];
  if (!Array.isArray(user.inventory)) user.inventory = [];
  if (!user.stats || typeof user.stats !== "object") user.stats = {};
  user.stats = {
    work: Number(user.stats.work) || 0,
    crime: Number(user.stats.crime) || 0,
    rob: Number(user.stats.rob) || 0,
    gifts: Number(user.stats.gifts) || 0
  };

  for (const key of ["cash", "bank", "daily", "work", "crime", "hut", "rob", "messages", "commands"]) {
    if (!Number.isFinite(Number(user[key]))) user[key] = 0;
  }

  return user;
}

function getGuild(id) {
  if (!data.guilds[id]) {
    data.guilds[id] = {
      autoreplies: [],
      autoreactions: [],
      welcome: { enabled: false, channel: null },
      goodbye: { enabled: false, channel: null }
    };
  }

  return data.guilds[id];
}

function helpHome() {
  return embed(
    "🤖✨ JOSHUA • CENTRO DE AYUDA",
    [
      "¡Bienvenido al centro de comandos de **Joshua**! 💙",
      "",
      "Selecciona una categoría en el menú de abajo para ver todos sus comandos.",
      "",
      "💰 **Economía** — dinero, banco y recompensas",
      "🛒 **Tienda** — compras e inventario",
      "👤 **Perfil** — información y estadísticas",
      "🎮 **Diversión** — juegos y entretenimiento",
      "👥 **Social** — comunidad y usuarios",
      "👋 **Comunidad** — bienvenida y despedidas",
      "🏰 **Servidor** — información del servidor",
      "🛡️ **Moderación** — herramientas administrativas",
      "⚙️ **Utilidades** — herramientas útiles",
      "🤖 **Automatización** — autorrespuestas y autoreacciones",
      "",
      "💡 Usa el menú para explorar Joshua."
    ].join("\n")
  );
}

function helpMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("joshua_help")
    .setPlaceholder("📚 Selecciona una categoría...")
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("Economía").setDescription("💰 Dinero, banco y recompensas").setEmoji("💰").setValue("economia"),
      new StringSelectMenuOptionBuilder().setLabel("Tienda").setDescription("🛒 Compra y administra objetos").setEmoji("🛒").setValue("tienda"),
      new StringSelectMenuOptionBuilder().setLabel("Perfil").setDescription("👤 Perfil y estadísticas").setEmoji("👤").setValue("perfil"),
      new StringSelectMenuOptionBuilder().setLabel("Diversión").setDescription("🎮 Juegos y entretenimiento").setEmoji("🎮").setValue("diversion"),
      new StringSelectMenuOptionBuilder().setLabel("Social").setDescription("👥 Comandos sociales").setEmoji("👥").setValue("social"),
      new StringSelectMenuOptionBuilder().setLabel("Comunidad").setDescription("👋 Bienvenida y despedidas").setEmoji("👋").setValue("comunidad"),
      new StringSelectMenuOptionBuilder().setLabel("Servidor").setDescription("🏰 Información del servidor").setEmoji("🏰").setValue("servidor"),
      new StringSelectMenuOptionBuilder().setLabel("Moderación").setDescription("🛡️ Herramientas de administración").setEmoji("🛡️").setValue("moderacion"),
      new StringSelectMenuOptionBuilder().setLabel("Utilidades").setDescription("⚙️ Herramientas útiles").setEmoji("⚙️").setValue("utilidades"),
      new StringSelectMenuOptionBuilder().setLabel("Automatización").setDescription("🤖 Respuestas y reacciones automáticas").setEmoji("🤖").setValue("automatizacion")
    );

  return new ActionRowBuilder().addComponents(menu);
}

function helpCategory(category) {
  const pages = {
    economia: embed(
      "💰 ECONOMÍA",
      [
        "💵 **p.balance** — Mira tu dinero en efectivo y banco.",
        "💰 **p.bal** — Atajo de balance.",
        "🎁 **p.daily** — Reclama tu recompensa cada 24 horas.",
        "💼 **p.work** — Trabaja y gana entre 10 y 150 monedas.",
        "🎲 **p.crimen** — Arriesga dinero en un crimen ficticio.",
        "🧩 **p.hut** — Responde una pregunta para ganar o perder.",
        "🥷 **p.rob @usuario** — Intenta robar efectivo.",
        "🏦 **p.bank** — Consulta tu banco.",
        "📥 **p.dep cantidad** — Deposita dinero.",
        "📥 **p.dep all** — Deposita todo tu efectivo.",
        "📤 **p.with cantidad** — Retira dinero.",
        "📤 **p.with all** — Retira todo tu banco.",
        "💸 **p.pay @usuario cantidad** — Envía dinero.",
        "🎁 **p.gift @usuario cantidad** — Regala dinero.",
        "🪙 **p.coinflip** — Lanza una moneda.",
        "🎲 **p.risk** — Prueba tu suerte.",
        "🏆 **p.rank** — Mira el ranking económico.",
        "📊 **p.stats** — Mira tus estadísticas."
      ].join("\n")
    ),

    tienda: embed(
      "🛒 TIENDA",
      [
        "🛍️ **p.shop** — Mira todos los objetos disponibles.",
        "🛒 **p.buy objeto** — Compra un objeto.",
        "🎒 **p.inventory** — Mira tu inventario.",
        "💰 **p.sell objeto** — Vende un objeto.",
        "",
        "💡 Los objetos comprados se guardan automáticamente."
      ].join("\n")
    ),

    perfil: embed(
      "👤 PERFIL",
      [
        "👤 **p.profile** — Mira tu perfil de Joshua.",
        "📊 **p.stats** — Mira tus estadísticas.",
        "🏆 **p.rank** — Consulta tu posición económica.",
        "🪪 **p.userinfo @usuario** — Información de un usuario.",
        "🖼️ **p.avatar @usuario** — Mira el avatar.",
        "🎨 **p.banner @usuario** — Mira el banner."
      ].join("\n")
    ),

    diversion: embed(
      "🎮 DIVERSIÓN",
      [
        "✂️ **p.rps** — Juega piedra, papel o tijera.",
        "😂 **p.joke** — Joshua cuenta un chiste.",
        "🧠 **p.trivia** — Pregunta rápida de trivia.",
        "🤔 **p.choose opción1 | opción2** — Joshua elige.",
        "🎲 **p.random** — Número aleatorio.",
        "🪙 **p.coinflip** — Cara o cruz.",
        "🎲 **p.dado** — Lanza un dado.",
        "🔮 **p.8ball pregunta** — Pregunta a la bola mágica.",
        "🎉 **p.emoji** — Emoji aleatorio.",
        "💬 **p.say texto** — Joshua envía un mensaje.",
        "✋ **p.highfive @usuario** — Choca esos cinco.",
        "⭐ **p.pat @usuario** — Dale una felicitación amistosa."
      ].join("\n")
    ),

    social: embed(
      "👥 SOCIAL",
      [
        "💖 **p.compliment @usuario** — Envía un cumplido amistoso.",
        "👋 **p.highfive @usuario** — Choca esos cinco.",
        "⭐ **p.pat @usuario** — Felicitación amistosa.",
        "👀 **p.whois @usuario** — Mira quién es.",
        "🟢 **p.online** — Usuarios conectados.",
        "🖼️ **p.avatar @usuario** — Avatar del usuario.",
        "🎨 **p.banner @usuario** — Banner del usuario."
      ].join("\n")
    ),

    comunidad: embed(
      "👋 COMUNIDAD",
      [
        "👋 **p.welcome on #canal** — Activa bienvenida.",
        "👋 **p.welcome off** — Desactiva bienvenida.",
        "🚪 **p.goodbye on #canal** — Activa despedidas.",
        "🚪 **p.goodbye off** — Desactiva despedidas.",
        "📋 **p.welcome status** — Mira la configuración.",
        "",
        "🔐 Estos comandos requieren Administrador."
      ].join("\n")
    ),

    servidor: embed(
      "🏰 SERVIDOR",
      [
        "🏰 **p.serverinfo** — Información del servidor.",
        "📚 **p.channels** — Lista de canales.",
        "🎭 **p.roles** — Lista de roles.",
        "😀 **p.emojis** — Lista de emojis.",
        "🚀 **p.boosts** — Información de boosts.",
        "📅 **p.created** — Fecha de creación.",
        "🛡️ **p.roleinfo @rol** — Información de un rol."
      ].join("\n")
    ),

    moderacion: embed(
      "🛡️ MODERACIÓN",
      [
        "🔨 **p.ban @usuario** — Banea a un usuario.",
        "🔓 **p.unban ID** — Quita un baneo.",
        "👢 **p.kick @usuario** — Expulsa a un usuario.",
        "🔇 **p.mute @usuario minutos** — Silencia temporalmente.",
        "🔊 **p.unmute @usuario** — Quita el silencio.",
        "⚠️ **p.warn @usuario motivo** — Envía una advertencia.",
        "🧹 **p.purge cantidad** — Borra mensajes.",
        "🔒 **p.lock** — Bloquea el canal.",
        "🔓 **p.unlock** — Desbloquea el canal.",
        "🐌 **p.slowmode segundos** — Configura slowmode.",
        "📝 **p.nick @usuario nombre** — Cambia nickname.",
        "🛡️ **p.roleinfo @rol** — Información de rol.",
        "🚫 **p.permaban @usuario** — Baneo permanente del servidor.",
        "",
        "⚠️ Todos requieren permisos de Administrador."
      ].join("\n")
    ),

    utilidades: embed(
      "⚙️ UTILIDADES",
      [
        "🏓 **p.ping** — Comprueba la conexión de Joshua.",
        "❓ **p.8ball pregunta** — Respuesta aleatoria.",
        "🎲 **p.dado** — Lanza un dado.",
        "🎯 **p.random** — Número aleatorio.",
        "🪙 **p.coinflip** — Cara o cruz.",
        "🖥️ **p.serverinfo** — Información del servidor.",
        "👤 **p.userinfo @usuario** — Información de usuario.",
        "📚 **p.help** — Abre este menú."
      ].join("\n")
    ),

    automatizacion: embed(
      "🤖 AUTOMATIZACIÓN",
      [
        "💬 **p.autoreply add palabra | respuesta**",
        "Configura una respuesta automática.",
        "",
        "🗑️ **p.autoreply remove palabra**",
        "Elimina una respuesta automática.",
        "",
        "📋 **p.autoreply list**",
        "Muestra todas las autorrespuestas.",
        "",
        "😀 **p.autoreact add palabra emoji**",
        "Configura una reacción automática.",
        "",
        "🗑️ **p.autoreact remove palabra**",
        "Elimina una autoreacción.",
        "",
        "📋 **p.autoreact list**",
        "Muestra todas las autoreacciones.",
        "",
        "🔐 Requiere Administrador."
      ].join("\n")
    )
  };

  return pages[category] || helpHome();
}

client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "joshua_help") return;

  try {
    await interaction.update({
      embeds: [helpCategory(interaction.values[0])],
      components: [helpMenu()]
    });
  } catch (err) {
    console.error("❌ Error en menú help:", err);
  }
});

client.on("guildMemberAdd", async member => {
  const guildData = getGuild(member.guild.id);

  if (!guildData.welcome.enabled || !guildData.welcome.channel) return;

  const channel = member.guild.channels.cache.get(guildData.welcome.channel);
  if (!channel) return;

  const msg = embed(
    "👋✨ ¡NUEVO MIEMBRO!",
    [
      `🎉 ¡Bienvenido/a ${member}!`,
      "",
      `🏰 **Servidor:** ${member.guild.name}`,
      `👥 Ahora somos **${member.guild.memberCount}** miembros.`,
      "",
      "💙 ¡Esperamos que disfrutes de la comunidad!",
      "🤖 Soy Joshua y estoy aquí para ayudarte."
    ].join("\n"),
    0x57f287
  );

  channel.send({ embeds: [msg] }).catch(() => {});
});

client.on("guildMemberRemove", async member => {
  const guildData = getGuild(member.guild.id);

  if (!guildData.goodbye.enabled || !guildData.goodbye.channel) return;

  const channel = member.guild.channels.cache.get(guildData.goodbye.channel);
  if (!channel) return;

  const msg = embed(
    "🚪👋 UN MIEMBRO SE HA IDO",
    [
      `👤 **${member.user.tag}** ha salido del servidor.`,
      "",
      `🏰 **Servidor:** ${member.guild.name}`,
      `👥 Miembros actuales: **${member.guild.memberCount}**`,
      "",
      "💙 ¡Hasta pronto!"
    ].join("\n"),
    0xed4245
  );

  channel.send({ embeds: [msg] }).catch(() => {});
});

client.once("ready", () => {
  console.log(`✅ Joshua conectado como ${client.user.tag}`);
  console.log(`🏰 Servidores: ${client.guilds.cache.size}`);

  client.user.setPresence({
    activities: [{ name: "p.help 🤖", type: 0 }],
    status: "online"
  });
});

client.on("shardReconnecting", shardId => {
  console.log(`🔄 Discord: reconectando Shard ${shardId}...`);
});

client.on("shardResume", (shardId, replayedEvents) => {
  console.log(`✅ Discord: Shard ${shardId} reconectado. Eventos: ${replayedEvents}`);
});

client.on("shardDisconnect", (event, shardId) => {
  console.log(`⚠️ Discord: Shard ${shardId} desconectado.`, event?.code || "");
});

client.on("shardError", (error, shardId) => {
  console.error(`🚨 Discord Shard ${shardId}:`, error);
});

client.on("warn", warning => {
  console.warn("⚠️ Discord:", warning);
});

client.on("error", error => {
  console.error("🚨 Cliente Discord:", error);
});

process.on("unhandledRejection", error => {
  console.error("🚨 Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("🚨 Uncaught Exception:", error);
});

setInterval(() => {
  if (!client.ws) return;
  console.log(`💓 Joshua | WS: ${client.ws.status} | Ping: ${client.ws.ping}ms`);
}, 60000);

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const user = getUser(message.author.id);
  user.messages += 1;
  saveData();

  const guildData = getGuild(message.guild.id);

  for (const item of guildData.autoreplies) {
    if (message.content.toLowerCase().includes(item.trigger.toLowerCase())) {
      message.channel.send(item.response).catch(() => {});
      break;
    }
  }

  for (const item of guildData.autoreactions) {
    if (message.content.toLowerCase().includes(item.trigger.toLowerCase())) {
      message.react(item.emoji).catch(() => {});
      break;
    }
  }

  if (!message.content.toLowerCase().startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/).filter(Boolean);
  const command = (args.shift() || "").toLowerCase();

  if (!command) return;

  user.commands += 1;
  saveData();

  const reply = content =>
    message.reply(
      typeof content === "string"
        ? { content, allowedMentions: { repliedUser: false } }
        : { ...content, allowedMentions: { repliedUser: false } }
    );

  if (command === "help") {
    return message.reply({ embeds: [helpHome()], components: [helpMenu()] });
  }

  if (command === "ping") {
    return reply({ embeds: [embed("🏓 PONG!", `💓 Latencia de Joshua: **${client.ws.ping}ms**\n🌐 Conexión: **ACTIVA** 🟢`, 0x57f287)] });
  }

  if (command === "status") {
    return reply(embed("🤖 STATUS", `🟢 Online\n📡 Ping: **${client.ws.ping}ms**\n🌐 Servidores: **${client.guilds.cache.size}**`));
  }

  if (command === "hola") {
    return reply("👋 ¡Hola! Soy Joshua 🤖");
  }

  if (command === "balance" || command === "bal") {
    return reply({
      embeds: [
        embed(
          "💰 TU BALANCE",
          [
            `💵 **Efectivo:** ${money(user.cash)}`,
            `🏦 **Banco:** ${money(user.bank)}`,
            "",
            `💎 **Total:** ${money(user.cash + user.bank)}`
          ].join("\n"),
          0xfee75c
        )
      ]
    });
  }

  if (command === "bank") {
    return reply({
      embeds: [
        embed(
          "🏦 BANCO",
          [
            `💵 Efectivo: **${money(user.cash)}**`,
            `🏦 Banco: **${money(user.bank)}**`,
            "",
            "📥 `p.dep all` para depositar todo.",
            "📤 `p.with all` para retirar todo."
          ].join("\n")
        )
      ]
    });
  }

  if (command === "daily") {
    const cd = cooldown(message.author.id, "daily", 86400);
    if (cd) {
      return reply({ embeds: [errorEmbed(`Ya reclamaste tu recompensa diaria. ⏳\nVuelve en **${remaining(cd)}**.`)] });
    }

    user.cash += 1000;
    saveData();
    return reply({ embeds: [success(`🎁 ¡RECOMPENSA DIARIA!\n\nHas recibido **1.000 monedas**. 🪙\n\n💵 Ahora tienes **${money(user.cash)}** en efectivo.`)] });
  }

  if (command === "work") {
    const cd = cooldown(message.author.id, "work", 30);
    if (cd) {
      return reply({ embeds: [errorEmbed(`Estás descansando 😴.\nPodrás trabajar otra vez en **${remaining(cd)}**.`)] });
    }

    const reward = random(10, 150);
    user.cash += reward;
    user.work += 1;
    saveData();

    return reply({
      embeds: [
        embed(
          "💼✨ TRABAJO COMPLETADO",
          [
            `👤 **Trabajador:** ${message.author}`,
            "",
            `💵 Ganaste **${money(reward)} monedas**.`,
            `💰 Efectivo actual: **${money(user.cash)}** 🪙`,
            "",
            "🔥 ¡Buen trabajo!"
          ].join("\n"),
          0x57f287
        )
      ]
    });
  }

  if (command === "crimen") {
    const cd = cooldown(message.author.id, "crime", 120);
    if (cd) {
      return reply({ embeds: [errorEmbed(`La policía está vigilando 👮.\nInténtalo de nuevo en **${remaining(cd)}**.`)] });
    }

    user.crime += 1;

    if (Math.random() < 0.2) {
      const reward = random(300, 500);
      user.cash += reward;
      saveData();

      return reply({
        embeds: [
          embed(
            "🎉💰 ¡CRIMEN EXITOSO!",
            [
              "😎 Lograste escapar con el botín.",
              "",
              `💵 Ganaste **${money(reward)} monedas**.`,
              `💰 Efectivo: **${money(user.cash)}**`,
              "",
              "⚠️ Recuerda: esto es solamente economía ficticia del bot."
            ].join("\n"),
            0x57f287
          )
        ]
      });
    }

    const loss = Math.min(user.cash, random(200, 600));
    user.cash -= loss;
    saveData();

    return reply({ embeds: [errorEmbed(`🚔 ¡TE ATRAPARON!\n\nPerdiste **${money(loss)} monedas**.\n💵 Efectivo restante: **${money(user.cash)}**`)] });
  }

  if (command === "hut") {
    const cd = cooldown(message.author.id, "hut", 180);
    if (cd) {
      return reply({ embeds: [errorEmbed(`⏳ Ya tienes un reto activo. Espera **${remaining(cd)}**.`)] });
    }

    const questions = [
      { q: "¿Cuánto es 7 + 5?", answers: ["12"] },
      { q: "¿Cuál es el planeta conocido como planeta rojo?", answers: ["marte"] },
      { q: "¿Cuántos días tiene una semana?", answers: ["7", "siete"] }
    ];

    const question = pick(questions);
    const sent = await message.reply({
      embeds: [
        embed(
          "🧩🏠 RETO HUT",
          [
            "¡Tienes 20 segundos para responder! ⏱️",
            "",
            `❓ **${question.q}**`,
            "",
            "✍️ Escribe tu respuesta en el chat."
          ].join("\n")
        )
      ]
    });

    const collector = message.channel.createMessageCollector({
      filter: m => m.author.id === message.author.id,
      time: 20000,
      max: 1
    });

    collector.on("collect", m => {
      const answer = m.content.toLowerCase().trim();

      if (question.answers.includes(answer)) {
        const reward = random(200, 500);
        user.cash += reward;
        user.hut += 1;
        saveData();
        message.channel.send({ embeds: [success(`🧠🎉 ¡RESPUESTA CORRECTA!\n\nGanaste **${money(reward)} monedas**. 🪙`)] }).catch(() => {});
      } else {
        const loss = Math.min(user.cash, random(300, 500));
        user.cash -= loss;
        saveData();
        message.channel.send({ embeds: [errorEmbed(`❌ Respuesta incorrecta.\n\nPerdiste **${money(loss)} monedas**.`)] }).catch(() => {});
      }
    });

    collector.on("end", collected => {
      if (collected.size === 0) {
        message.channel.send({ embeds: [errorEmbed("⏰ Se acabó el tiempo. No recibiste ninguna recompensa.")] }).catch(() => {});
      }
    });

    return;
  }

  if (command === "rob") {
    const target = message.mentions.users.first();
    if (!target) return reply({ embeds: [errorEmbed("Debes mencionar a alguien.\nEjemplo: `p.rob @usuario`")] });
    if (target.id === message.author.id) return reply({ embeds: [errorEmbed("No puedes robarte a ti mismo 😂.")] });
    if (target.bot) return reply({ embeds: [errorEmbed("No puedes robar a un bot 🤖.")] });

    const cd = cooldown(message.author.id, "rob", 300);
    if (cd) {
      return reply({ embeds: [errorEmbed(`Debes esperar **${remaining(cd)}** para volver a intentarlo.`)] });
    }

    const victim = getUser(target.id);
    if (victim.cash <= 0) {
      return reply({ embeds: [errorEmbed("Ese usuario no tiene dinero en efectivo para robar.")] });
    }

    user.rob += 1;

    if (Math.random() < 0.5) {
      const stolen = Math.min(victim.cash, random(50, Math.max(50, Math.floor(victim.cash))));
      victim.cash -= stolen;
      user.cash += stolen;
      saveData();

      return reply({
        embeds: [
          embed(
            "🥷💰 ¡ROBO EXITOSO!",
            [
              `👤 Objetivo: ${target}`,
              "",
              `💵 Robaste **${money(stolen)} monedas**.`,
              "🏦 El dinero del banco está protegido.",
              "",
              "⚠️ Esto solo afecta a la economía ficticia del bot."
            ].join("\n"),
            0x57f287
          )
        ]
      });
    }

    return reply({ embeds: [errorEmbed(`🚨 ¡TE DESCUBRIERON!\n\nNo pudiste robar a ${target}.`)] });
  }

  if (command === "bank") {
    return reply({
      embeds: [
        embed(
          "🏦 BANCO",
          [
            `💵 Efectivo: **${money(user.cash)}**`,
            `🏦 Banco: **${money(user.bank)}**`,
            "",
            "📥 `p.dep all` para depositar todo.",
            "📤 `p.with all` para retirar todo."
          ].join("\n")
        )
      ]
    });
  }

  if (command === "dep" || command === "deposit") {
    const amountArg = args[0];

    if (amountArg === "all") {
      if (user.cash <= 0) {
        return reply({ embeds: [errorEmbed("No tienes efectivo para depositar.")] });
      }

      const amount = user.cash;
      user.bank += amount;
      user.cash = 0;
      saveData();

      return reply({ embeds: [success(`🏦💰 Depositaste **${money(amount)} monedas**.\n\nTu dinero ahora está protegido en el banco. 🔐`)] });
    }

    const amount = Number(amountArg);
    if (!Number.isInteger(amount) || amount <= 0) {
      return reply({ embeds: [errorEmbed("Usa una cantidad válida. Ejemplo: `p.dep 500`")] });
    }
    if (amount > user.cash) {
      return reply({ embeds: [errorEmbed("No tienes suficiente efectivo.")] });
    }

    user.cash -= amount;
    user.bank += amount;
    saveData();

    return reply({ embeds: [success(`🏦 Depositaste **${money(amount)} monedas**.\n💵 Efectivo: **${money(user.cash)}**\n🏦 Banco: **${money(user.bank)}**`)] });
  }

  if (command === "with" || command === "withdraw") {
    const amountArg = args[0];

    if (amountArg === "all") {
      if (user.bank <= 0) {
        return reply({ embeds: [errorEmbed("No tienes dinero en el banco.")] });
      }

      const amount = user.bank;
      user.cash += amount;
      user.bank = 0;
      saveData();

      return reply({ embeds: [success(`🏦➡️💵 Retiraste **${money(amount)} monedas**.\n\n💵 Ahora tienes **${money(user.cash)}** en efectivo.`)] });
    }

    const amount = Number(amountArg);
    if (!Number.isInteger(amount) || amount <= 0) {
      return reply({ embeds: [errorEmbed("Usa una cantidad válida. Ejemplo: `p.with 500`")] });
    }
    if (amount > user.bank) {
      return reply({ embeds: [errorEmbed("No tienes suficiente dinero en el banco.")] });
    }

    user.bank -= amount;
    user.cash += amount;
    saveData();

    return reply({ embeds: [success(`📤 Retiraste **${money(amount)} monedas**.\n💵 Efectivo: **${money(user.cash)}**\n🏦 Banco: **${money(user.bank)}**`)] });
  }

  if (command === "pay") {
    const target = message.mentions.users.first();
    const amount = Number(args[1]);

    if (!target || !Number.isInteger(amount) || amount <= 0) {
      return reply({ embeds: [errorEmbed("Uso: `p.pay @usuario cantidad`")] });
    }

    if (target.id === message.author.id) {
      return reply({ embeds: [errorEmbed("No puedes enviarte dinero a ti mismo.")] });
    }

    if (amount > user.cash) {
      return reply({ embeds: [errorEmbed("No tienes suficiente efectivo.")] });
    }

    const receiver = getUser(target.id);
    user.cash -= amount;
    receiver.cash += amount;
    saveData();

    return reply({ embeds: [success(`💸 **TRANSFERENCIA COMPLETADA**\n\n👤 Destinatario: ${target}\n💰 Cantidad: **${money(amount)} monedas**\n\n✅ Transferencia realizada correctamente.`)] });
  }

  if (command === "gift") {
    const target = message.mentions.users.first();
    const amount = Number(args[1]);

    if (!target || !Number.isInteger(amount) || amount <= 0) {
      return reply({ embeds: [errorEmbed("Uso: `p.gift @usuario cantidad`")] });
    }

    if (amount > user.cash) {
      return reply({ embeds: [errorEmbed("No tienes suficiente dinero.")] });
    }

    const receiver = getUser(target.id);
    user.cash -= amount;
    receiver.cash += amount;
    user.stats.gifts += 1;
    saveData();

    return reply({
      embeds: [
        embed(
          "🎁💰 REGALO ENVIADO",
          [
            `🎁 ${message.author} le regaló **${money(amount)} monedas** a ${target}.`,
            "",
            "✨ ¡Qué generoso!",
            "💙 Joshua agradece el buen ambiente."
          ].join("\n"),
          0xfee75c
        )
      ]
    });
  }

  if (command === "rank") {
    const ranking = Object.entries(data.users)
      .sort((a, b) => (b[1].cash + b[1].bank) - (a[1].cash + a[1].bank))
      .slice(0, 10);

    const lines = ranking.map(([id, u], index) => `**${index + 1}.** ${userMention(id)} — 💰 **${money(u.cash + u.bank)}**`);

    return reply({
      embeds: [
        embed(
          "🏆💰 RANKING ECONÓMICO",
          lines.length ? lines.join("\n") : "Todavía no hay datos suficientes.",
          0xfee75c
        )
      ]
    });
  }

  if (command === "stats") {
    return reply({
      embeds: [
        embed(
          "📊 TUS ESTADÍSTICAS",
          [
            `💬 Mensajes: **${money(user.messages)}**`,
            `🤖 Comandos usados: **${money(user.commands)}**`,
            "",
            `💵 Efectivo: **${money(user.cash)}**`,
            `🏦 Banco: **${money(user.bank)}**`,
            `💰 Patrimonio: **${money(user.cash + user.bank)}**`,
            `🎁 Regalos: **${user.stats.gifts || 0}**`
          ].join("\n")
        )
      ]
    });
  }

  if (command === "profile") {
    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("👤✨ PERFIL DE USUARIO")
          .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
          .setDescription(
            [
              `👤 **Usuario:** ${message.author}`,
              `🪪 **Tag:** ${message.author.tag}`,
              "",
              `💵 **Efectivo:** ${money(user.cash)}`,
              `🏦 **Banco:** ${money(user.bank)}`,
              `💎 **Total:** ${money(user.cash + user.bank)}`,
              "",
              `💬 **Mensajes:** ${money(user.messages)}`,
              `🤖 **Comandos:** ${money(user.commands)}`
            ].join("\n")
          )
          .setTimestamp()
          .setFooter({ text: "Joshua 🤖 • Perfil" })
      ]
    });
  }

  if (command === "shop") {
    return reply({
      embeds: [
        embed(
          "🛒✨ TIENDA DE JOSHUA",
          [
            "🎒 **pizza** — 250 🪙",
            "🎮 **game** — 500 🪙",
            "💎 **gem** — 1.000 🪙",
            "👑 **crown** — 2.500 🪙",
            "",
            "🛍️ Compra con:",
            "`p.buy pizza`",
            "`p.buy game`",
            "`p.buy gem`",
            "`p.buy crown`"
          ].join("\n"),
          0xfee75c
        )
      ]
    });
  }

  if (command === "buy") {
    const item = (args[0] || "").toLowerCase();
    const shop = { pizza: 250, game: 500, gem: 1000, crown: 2500 };

    if (!shop[item]) {
      return reply({ embeds: [errorEmbed("Ese objeto no existe. Usa `p.shop` para ver la tienda.")] });
    }

    if (user.cash < shop[item]) {
      return reply({ embeds: [errorEmbed("No tienes suficiente dinero.")] });
    }

    user.cash -= shop[item];
    user.inventory.push(item);
    saveData();

    return reply({ embeds: [success(`🛒✨ Compraste **${item}** por **${money(shop[item])} monedas**.\n\n🎒 Se añadió a tu inventario.`)] });
  }

  if (command === "inventory" || command === "inv") {
    if (!user.inventory.length) {
      return reply({ embeds: [info("🎒 Tu inventario está vacío.\n\nVisita `p.shop` para comprar objetos.")] });
    }

    const counts = {};
    for (const item of user.inventory) {
      counts[item] = (counts[item] || 0) + 1;
    }

    const lines = Object.entries(counts).map(([item, count]) => `🎁 **${item}** × ${count}`);
    return reply({ embeds: [embed("🎒 TU INVENTARIO", lines.join("\n"))] });
  }

  if (command === "sell") {
    const item = (args[0] || "").toLowerCase();
    const prices = { pizza: 125, game: 250, gem: 500, crown: 1250 };
    const index = user.inventory.indexOf(item);

    if (index === -1) {
      return reply({ embeds: [errorEmbed("No tienes ese objeto en tu inventario.")] });
    }

    user.inventory.splice(index, 1);
    user.cash += prices[item] || 50;
    saveData();

    return reply({ embeds: [success(`💰 Vendiste **${item}** y recibiste **${money(prices[item] || 50)} monedas**.`)] });
  }

  if (command === "coinflip") {
    const result = Math.random() < 0.5 ? "CARA 🪙" : "CRUZ 🪙";
    return reply({ embeds: [embed("🪙 LANZAMIENTO DE MONEDA", `La moneda cayó en:\n\n# ${result}`, 0xfee75c)] });
  }

  if (command === "dado" || command === "dice") {
    const result = random(1, 6);
    return reply({ embeds: [embed("🎲 DADO", `🎲 El dado cayó en **${result}**.`, 0x5865f2)] });
  }

  if (command === "random") {
    const min = Number(args[0]) || 1;
    const max = Number(args[1]) || 100;

    if (max < min) {
      return reply({ embeds: [errorEmbed("El máximo debe ser mayor que el mínimo.")] });
    }

    const result = random(min, max);
    return reply({ embeds: [embed("🎯 NÚMERO ALEATORIO", `🎲 Resultado: **${result}**`)] });
  }

  if (command === "8ball") {
    const question = args.join(" ");
    if (!question) {
      return reply({ embeds: [errorEmbed("Escribe una pregunta. Ejemplo: `p.8ball ¿ganaré?`")] });
    }

    const answers = [
      "✨ Sí, definitivamente.",
      "🤔 Probablemente.",
      "🌟 Todo apunta a que sí.",
      "😐 No estoy seguro.",
      "❌ Probablemente no.",
      "🌧️ Las probabilidades no son buenas.",
      "🎲 El destino no lo sabe todavía."
    ];

    return reply({ embeds: [embed("🔮 BOLA MÁGICA", [`❓ **${question}**", "", `🔮 **${pick(answers)}**`].join("\n"))] });
  }

  if (command === "rps") {
    const userChoice = (args[0] || "").toLowerCase();
    const choices = { piedra: "🪨", papel: "📄", tijera: "✂️" };
    const botChoice = pick(Object.keys(choices));

    if (!choices[userChoice]) {
      return reply({ embeds: [info("Usa: `p.rps piedra` | `p.rps papel` | `p.rps tijera`")] });
    }

    let resultText = "Empate 🤝";
    if (
      (userChoice === "piedra" && botChoice === "tijera") ||
      (userChoice === "papel" && botChoice === "piedra") ||
      (userChoice === "tijera" && botChoice === "papel")
    ) {
      resultText = "¡Ganaste! 🏆";
    } else if (
      (botChoice === "piedra" && userChoice === "tijera") ||
      (botChoice === "papel" && userChoice === "piedra") ||
      (botChoice === "tijera" && userChoice === "papel")
    ) {
      resultText = "¡Perdiste! 😅";
    }

    return reply({
      embeds: [
        embed(
          "🎮 PIEDRA, PAPEL O TIJERA",
          [
            `🤖 Joshua eligió: **${choices[botChoice]} ${botChoice}**`,
            `👤 Tú elegiste: **${choices[userChoice]} ${userChoice}**`,
            "",
            `🏁 Resultado: **${resultText}**`
          ].join("\n")
        )
      ]
    });
  }

  if (command === "joke") {
    const jokes = [
      "😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!",
      "🤣 ¿Por qué el libro fue al médico? Porque tenía muchas páginas enfermas.",
      "😎 ¿Qué le dijo un servidor a otro? ¡Tenemos buena conexión!",
      "😂 ¿Qué hace un pez? ¡Nada!"
    ];

    return reply({ embeds: [embed("😂 CHISTE DE JOSHUA", pick(jokes))] });
  }

  if (command === "trivia") {
    const questions = [
      "🌍 ¿Cuál es el planeta más grande del sistema solar?",
      "🦁 ¿Cuál es conocido como el rey de la selva?",
      "🌊 ¿Cuál es el océano más grande?"
    ];

    return reply({
      embeds: [
        embed(
          "🧠 TRIVIA",
          [
            pick(questions),
            "",
            "💡 Responde en el chat y puedes convertirlo en un sistema de puntos más adelante."
          ].join("\n")
        )
      ]
    });
  }

  if (command === "choose") {
    const text = args.join(" ");
    const options = text.split("|").map(x => x.trim()).filter(Boolean);

    if (options.length < 2) {
      return reply({ embeds: [errorEmbed("Usa `p.choose opción 1 | opción 2`")] });
    }

    return reply({ embeds: [embed("🤔 JOSHUA ELIGE", `🎯 Mi elección es:\n\n# ${pick(options)}`)] });
  }

  if (command === "emoji") {
    const emojis = ["😀", "😂", "😎", "🔥", "💙", "🤖", "🎉", "🚀", "⭐", "👑"];
    return reply({ embeds: [embed("🎉 EMOJI ALEATORIO", `Joshua eligió: **${pick(emojis)}**`)] });
  }

  if (command === "say") {
    const text = args.join(" ");
    if (!text) return reply({ embeds: [errorEmbed("Escribe algo después de `p.say`.")] });

    try { await message.delete(); } catch {}
    return message.channel.send(text);
  }

  if (command === "highfive") {
    const target = message.mentions.users.first();
    return reply({ embeds: [embed("✋ HIGH FIVE", target ? `✋ ${message.author} le choca los cinco a ${target}! 🎉` : `✋ ${message.author} recibe un HIGH FIVE de Joshua! 🎉`)] });
  }

  if (command === "pat") {
    const target = message.mentions.users.first();
    return reply({ embeds: [embed("⭐ BUEN TRABAJO", target ? `⭐ ${message.author} felicita a ${target}!` : `⭐ ${message.author} recibe una felicitación de Joshua!`)] });
  }

  if (command === "compliment") {
    const target = message.mentions.users.first();
    if (!target) return reply({ embeds: [errorEmbed("Menciona a alguien.")] });

    const compliments = [
      "✨ ¡Tienes una energía increíble!",
      "🔥 ¡Tu presencia mejora el servidor!",
      "⭐ ¡Eres una persona genial!",
      "💙 ¡Joshua aprueba tu buena vibra!"
    ];

    return reply({ embeds: [embed("💖 CUMPLIDO", `${target}, ${pick(compliments)}`)] });
  }

  if (command === "whois" || command === "userinfo" || command === "user") {
    const target = message.mentions.members.first() || message.member;
    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("👤 INFORMACIÓN DEL USUARIO")
          .setThumbnail(target.user.displayAvatarURL({ size: 256 }))
          .setDescription(
            [
              `👤 **Usuario:** ${target.user}`,
              `🪪 **Tag:** ${target.user.tag}`,
              `🆔 **ID:** \`${target.id}\``,
              "",
              `📅 **Cuenta creada:** <t:${Math.floor(target.user.createdTimestamp / 1000)}:F>`,
              `📥 **Entró al servidor:** ${target.joinedTimestamp ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:F>` : "Desconocido"}`,
              "",
              `🎭 **Roles:** ${target.roles.cache.size - 1}`
            ].join("\n")
          )
          .setTimestamp()
      ]
    });
  }

  if (command === "avatar") {
    const target = message.mentions.users.first() || message.author;
    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🖼️ AVATAR DE ${target.username}`)
          .setImage(target.displayAvatarURL({ size: 1024 }))
          .setFooter({ text: "Joshua 🤖" })
      ]
    });
  }

  if (command === "banner") {
    const target = message.mentions.users.first() || message.author;
    const fetched = await client.users.fetch(target.id, { force: true });

    if (!fetched.banner) {
      return reply({ embeds: [info("Ese usuario no tiene banner.")] });
    }

    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🎨 BANNER DE ${fetched.username}`)
          .setImage(fetched.bannerURL({ size: 1024, extension: "png" }))
      ]
    });
  }

  if (command === "online") {
    const online = message.guild.members.cache.filter(member => member.presence && member.presence.status !== "offline").size;
    return reply({ embeds: [embed("🟢 USUARIOS ONLINE", `Actualmente hay aproximadamente **${online} usuarios** con presencia visible.`)] });
  }

  if (command === "serverinfo") {
    const guild = message.guild;

    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🏰 ${guild.name}`)
          .setThumbnail(guild.iconURL({ size: 256 }))
          .setDescription(
            [
              `👑 **Dueño:** <@${guild.ownerId}>`,
              `👥 **Miembros:** ${guild.memberCount}`,
              `💬 **Canales:** ${guild.channels.cache.size}`,
              `🎭 **Roles:** ${guild.roles.cache.size}`,
              `😀 **Emojis:** ${guild.emojis.cache.size}`,
              `🚀 **Boosts:** ${guild.premiumSubscriptionCount || 0}`,
              "",
              `📅 **Creado:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
            ].join("\n")
          )
      ]
    });
  }

  if (command === "channels") {
    const channels = message.guild.channels.cache
      .filter(c => c.type !== ChannelType.GuildCategory)
      .map(c => `📌 ${c}`)
      .slice(0, 50);

    return reply({ embeds: [embed("📚 CANALES", channels.length ? channels.join("\n") : "No hay canales disponibles.")] });
  }

  if (command === "roles") {
    const roles = message.guild.roles.cache
      .filter(r => r.id !== message.guild.id)
      .map(r => `🎭 ${r}`)
      .slice(0, 50);

    return reply({ embeds: [embed("🎭 ROLES DEL SERVIDOR", roles.length ? roles.join("\n") : "No hay roles.")] });
  }

  if (command === "emojis") {
    const emojis = message.guild.emojis.cache.map(e => `${e} `);
    return reply({ embeds: [embed("😀 EMOJIS", emojis.length ? emojis.join(" ") : "No hay emojis personalizados.")] });
  }

  if (command === "boosts") {
    return reply({ embeds: [embed("🚀 BOOSTS", [`🚀 Nivel: **${message.guild.premiumTier}**`, `💎 Boosts: **${message.guild.premiumSubscriptionCount || 0}**`].join("\n"))] });
  }

  if (command === "created") {
    return reply({ embeds: [embed("📅 SERVIDOR CREADO", `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:F>`)] });
  }

  const adminCommands = [
    "ban",
    "unban",
    "kick",
    "mute",
    "unmute",
    "warn",
    "purge",
    "clear",
    "lock",
    "unlock",
    "slowmode",
    "nick",
    "roleinfo",
    "permaban",
    "autoreply",
    "autoreact",
    "welcome",
    "goodbye",
    "say"
  ];

  if (adminCommands.includes(command) && !isAdmin(message.member)) {
    return reply({ embeds: [errorEmbed("🛡️ Este comando requiere permisos de **Administrador**.")] });
  }

  if (command === "ban") {
    const target = message.mentions.members.first();
    if (!target) return reply({ embeds: [errorEmbed("Menciona al usuario que quieres banear.")] });
    if (!target.bannable) return reply({ embeds: [errorEmbed("No puedo banear a ese usuario. Revisa la jerarquía de roles y mis permisos.")] });

    const reason = args.slice(1).join(" ") || "Sin motivo especificado";

    try {
      await target.ban({ reason });
      return reply({ embeds: [embed("🔨🚫 USUARIO BANEADO", [`👤 **Usuario:** ${target.user.tag}`, `🛡️ **Moderador:** ${message.author.tag}`, `📝 **Motivo:** ${reason}`, "", "✅ El usuario fue baneado correctamente."].join("\n"), 0xed4245)] });
    } catch {
      return reply({ embeds: [errorEmbed("No pude banear a ese usuario.")] });
    }
  }

  if (command === "unban") {
    const id = args[0];
    if (!id) return reply({ embeds: [errorEmbed("Uso: `p.unban ID`")] });

    try {
      await message.guild.members.unban(id);
      return reply({ embeds: [success(`🔓 **USUARIO DESBANEADO**\n\n🆔 ID: \`${id}\`\n\n✅ El usuario fue desbaneado correctamente.`)] });
    } catch {
      return reply({ embeds: [errorEmbed("No pude quitar ese baneo.")] });
    }
  }

  if (command === "kick") {
    const target = message.mentions.members.first();
    if (!target) return reply({ embeds: [errorEmbed("Menciona al usuario que quieres expulsar.")] });
    if (!target.kickable) return reply({ embeds: [errorEmbed("No puedo expulsar a ese usuario.")] });

    const reason = args.slice(1).join(" ") || "Sin motivo especificado";
    try {
      await target.kick(reason);
      return reply({ embeds: [embed("👢 USUARIO EXPULSADO", [`👤 **Usuario:** ${target.user.tag}`, `🛡️ **Moderador:** ${message.author.tag}`, `📝 **Motivo:** ${reason}`, "", "✅ El usuario fue expulsado correctamente."].join("\n"), 0xed4245)] });
    } catch {
      return reply({ embeds: [errorEmbed("No pude expulsar a ese usuario.")] });
    }
  }

  if (command === "mute") {
    const target = message.mentions.members.first();
    const minutes = Number(args[1]) || 10;

    if (!target) return reply({ embeds: [errorEmbed("Menciona al usuario que quieres silenciar.")] });
    if (!target.moderatable) return reply({ embeds: [errorEmbed("No puedo silenciar a ese usuario.")] });

    try {
      await target.timeout(Math.min(minutes * 60 * 1000, 28 * 24 * 60 * 60 * 1000), "Moderación mediante Joshua");
      return reply({ embeds: [embed("🔇 USUARIO SILENCIADO", [`👤 **Usuario:** ${target.user.tag}`, `⏱️ **Duración:** ${minutes} minutos`, `🛡️ **Moderador:** ${message.author.tag}`, "", "✅ El usuario fue silenciado correctamente."].join("\n"), 0xed4245)] });
    } catch {
      return reply({ embeds: [errorEmbed("No pude silenciar a ese usuario.")] });
    }
  }

  if (command === "unmute") {
    const target = message.mentions.members.first();
    if (!target) return reply({ embeds: [errorEmbed("Menciona al usuario.")] });

    try {
      await target.timeout(null, "Unmute mediante Joshua");
      return reply({ embeds: [success(`🔊 **USUARIO DESILENCIADO**\n\n👤 ${target.user.tag}\n\n✅ El usuario puede volver a hablar.`)] });
    } catch {
      return reply({ embeds: [errorEmbed("No pude quitar el silencio.")] });
    }
  }

  if (command === "warn") {
    const target = message.mentions.members.first();
    if (!target) return reply({ embeds: [errorEmbed("Menciona al usuario.")] });

    const reason = args.slice(1).join(" ") || "Sin motivo especificado";
    return reply({ embeds: [embed("⚠️ ADVERTENCIA", [`👤 **Usuario:** ${target.user.tag}`, `🛡️ **Moderador:** ${message.author.tag}`, `📝 **Motivo:** ${reason}`, "", "⚠️ El usuario ha recibido una advertencia."].join("\n"), 0xfee75c)] });
  }

  if (command === "purge" || command === "clear") {
    const amount = Number(args[0]);
    if (!Number.isInteger(amount) || amount < 1 || amount > 99) {
      return reply({ embeds: [errorEmbed("Debes indicar una cantidad entre 1 y 99.")] });
    }

    try {
      const deleted = await message.channel.bulkDelete(amount, true);
      const response = await message.channel.send({ embeds: [success(`🧹 **LIMPIEZA COMPLETADA**\n\nSe eliminaron **${deleted.size} mensajes** correctamente.`)] });
      setTimeout(() => response.delete().catch(() => {}), 5000);
    } catch {
      return message.channel.send({ embeds: [errorEmbed("No pude borrar los mensajes. Revisa mis permisos.")] });
    }

    return;
  }

  if (command === "lock") {
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      return reply({ embeds: [embed("🔒 CANAL BLOQUEADO", ["🔒 Este canal ha sido bloqueado.", "", `🛡️ **Moderador:** ${message.author.tag}`, "🚫 Los miembros no podrán enviar mensajes."].join("\n"), 0xed4245)] });
    } catch {
      return reply({ embeds: [errorEmbed("No pude bloquear este canal.")] });
    }
  }

  if (command === "unlock") {
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
      return reply({ embeds: [success(`🔓 **CANAL DESBLOQUEADO**\n\n🛡️ Moderador: ${message.author.tag}\n\nLos miembros pueden volver a escribir.`)] });
    } catch {
      return reply({ embeds: [errorEmbed("No pude desbloquear este canal.")] });
    }
  }

  if (command === "slowmode") {
    const seconds = Number(args[0]);
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) {
      return reply({ embeds: [errorEmbed("Usa un valor entre 0 y 21600 segundos.")] });
    }

    if (!message.channel.isTextBased()) return;

    try {
      await message.channel.setRateLimitPerUser(seconds);
      return reply({ embeds: [success(`🐌 **SLOWMODE ACTUALIZADO**\n\n⏱️ Tiempo: **${seconds} segundos**`)] });
    } catch {
      return reply({ embeds: [errorEmbed("No pude configurar el slowmode.")] });
    }
  }

  if (command === "nick") {
    const target = message.mentions.members.first();
    const newNick = args.slice(1).join(" ");

    if (!target || !newNick) {
      return reply({ embeds: [errorEmbed("Uso: `p.nick @usuario Nuevo Nombre`")] });
    }

    try {
      await target.setNickname(newNick);
      return reply({ embeds: [success(`📝 **NICKNAME CAMBIADO**\n\n👤 Usuario: ${target.user.tag}\n✨ Nuevo nombre: **${newNick}**`)] });
    } catch {
      return reply({ embeds: [errorEmbed("No pude cambiar el nickname.")] });
    }
  }

  if (command === "roleinfo") {
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    if (!role) return reply({ embeds: [errorEmbed("Menciona un rol o proporciona su ID.")] });

    return reply({ embeds: [embed("🛡️ INFORMACIÓN DEL ROL", [`🎭 **Rol:** ${role}`, `🆔 **ID:** \`${role.id}\``, `👥 **Miembros:** ${role.members.size}`, `📅 **Creado:** <t:${Math.floor(role.createdTimestamp / 1000)}:F>`, `🔝 **Posición:** ${role.position}`].join("\n"))] });
  }

  if (command === "permaban") {
    const target = message.mentions.members.first();
    if (!target) return reply({ embeds: [errorEmbed("Menciona al usuario.")] });
    if (!target.bannable) return reply({ embeds: [errorEmbed("No puedo banear a ese usuario.")] });

    try {
      await target.ban({ reason: `Permaban ejecutado por ${message.author.tag}` });
      return reply({ embeds: [embed("🚫🔨 PERMABAN EJECUTADO", [`👤 **Usuario:** ${target.user.tag}`, `🛡️ **Moderador:** ${message.author.tag}`, "", "🔒 El usuario ha sido expulsado y baneado del servidor.", "✅ Operación completada."].join("\n"), 0xed4245)] });
    } catch {
      return reply({ embeds: [errorEmbed("No pude ejecutar el permaban.")] });
    }
  }

  if (command === "autoreply") {
    const action = (args.shift() || "").toLowerCase();

    if (action === "add") {
      const text = args.join(" ");
      const parts = text.split("|");

      if (parts.length < 2) {
        return reply({ embeds: [errorEmbed("Uso: `p.autoreply add palabra | respuesta`")] });
      }

      const trigger = parts.shift().trim();
      const response = parts.join("|").trim();

      if (!trigger || !response) {
        return reply({ embeds: [errorEmbed("Falta la palabra o la respuesta.")] });
      }

      guildData.autoreplies = guildData.autoreplies.filter(item => item.trigger.toLowerCase() !== trigger.toLowerCase());
      guildData.autoreplies.push({ trigger, response });
      saveData();

      return reply({ embeds: [success(`🤖💬 **AUTORRESPUESTA AÑADIDA**\n\n🔎 Palabra: **${trigger}**\n💬 Respuesta: **${response}**`)] });
    }

    if (action === "remove") {
      const trigger = args.join(" ").trim();
      const before = guildData.autoreplies.length;
      guildData.autoreplies = guildData.autoreplies.filter(item => item.trigger.toLowerCase() !== trigger.toLowerCase());
      saveData();

      return reply({ embeds: [before !== guildData.autoreplies.length ? success(`🗑️ Autorrespuesta **${trigger}** eliminada correctamente.`) : errorEmbed("No encontré esa autorrespuesta.")] });
    }

    if (action === "list") {
      if (!guildData.autoreplies.length) {
        return reply({ embeds: [info("📋 No hay autorrespuestas configuradas.")] });
      }

      const lines = guildData.autoreplies.map(item => `💬 **${item.trigger}** → ${item.response}`);
      return reply({ embeds: [embed("📋 AUTORRESPUESTAS", lines.join("\n"))] });
    }

    return reply({ embeds: [info(["🤖 **AUTOREPLY**", "", "`p.autoreply add hola | ¡Hola! 👋`", "`p.autoreply remove hola`", "`p.autoreply list`"].join("\n"))] });
  }

  if (command === "autoreact") {
    const action = (args.shift() || "").toLowerCase();

    if (action === "add") {
      const trigger = args.shift();
      const emoji = args.shift();

      if (!trigger || !emoji) {
        return reply({ embeds: [errorEmbed("Uso: `p.autoreact add palabra emoji`")] });
      }

      guildData.autoreactions = guildData.autoreactions.filter(item => item.trigger.toLowerCase() !== trigger.toLowerCase());
      guildData.autoreactions.push({ trigger, emoji });
      saveData();

      return reply({ embeds: [success(`😀 **AUTOREACCIÓN AÑADIDA**\n\n🔎 Palabra: **${trigger}**\n😀 Emoji: ${emoji}`)] });
    }

    if (action === "remove") {
      const trigger = args.join(" ").trim();
      const before = guildData.autoreactions.length;
      guildData.autoreactions = guildData.autoreactions.filter(item => item.trigger.toLowerCase() !== trigger.toLowerCase());
      saveData();

      return reply({ embeds: [before !== guildData.autoreactions.length ? success(`🗑️ Autoreacción **${trigger}** eliminada correctamente.`) : errorEmbed("No encontré esa autoreacción.")] });
    }

    if (action === "list") {
      if (!guildData.autoreactions.length) {
        return reply({ embeds: [info("📋 No hay autoreacciones configuradas.")] });
      }

      const lines = guildData.autoreactions.map(item => `😀 **${item.trigger}** → ${item.emoji}`);
      return reply({ embeds: [embed("📋 AUTOREACCIONES", lines.join("\n"))] });
    }

    return reply({ embeds: [info(["😀 **AUTOREACT**", "", "`p.autoreact add hola 👋`", "`p.autoreact remove hola`", "`p.autoreact list`"].join("\n"))] });
  }

  if (command === "welcome") {
    const action = (args[0] || "").toLowerCase();

    if (action === "on") {
      const channel = message.mentions.channels.first();
      if (!channel) return reply({ embeds: [errorEmbed("Menciona el canal. Ejemplo: `p.welcome on #bienvenidas`")] });

      guildData.welcome.enabled = true;
      guildData.welcome.channel = channel.id;
      saveData();

      return reply({ embeds: [success(`👋 **BIENVENIDAS ACTIVADAS**\n\n📍 Canal: ${channel}\n\nLos nuevos miembros recibirán un mensaje automático.`)] });
    }

    if (action === "off") {
      guildData.welcome.enabled = false;
      saveData();
      return reply({ embeds: [success("👋 Mensajes de bienvenida desactivados.")] });
    }

    if (action === "status") {
      return reply({ embeds: [info(["👋 **CONFIGURACIÓN DE BIENVENIDA**", "", `Estado: **${guildData.welcome.enabled ? "ACTIVADO 🟢" : "DESACTIVADO 🔴"}**`, `Canal: ${guildData.welcome.channel ? `<#${guildData.welcome.channel}>` : "No configurado"}`].join("\n"))] });
    }

    return reply({ embeds: [info(["`p.welcome on #canal`", "`p.welcome off`", "`p.welcome status`"].join("\n"))] });
  }

  if (command === "goodbye") {
    const action = (args[0] || "").toLowerCase();

    if (action === "on") {
      const channel = message.mentions.channels.first();
      if (!channel) return reply({ embeds: [errorEmbed("Menciona el canal. Ejemplo: `p.goodbye on #despedidas`")] });

      guildData.goodbye.enabled = true;
      guildData.goodbye.channel = channel.id;
      saveData();

      return reply({ embeds: [success(`🚪 **DESPEDIDAS ACTIVADAS**\n\n📍 Canal: ${channel}`)] });
    }

    if (action === "off") {
      guildData.goodbye.enabled = false;
      saveData();
      return reply({ embeds: [success("🚪 Mensajes de despedida desactivados.")] });
    }

    return reply({ embeds: [info("`p.goodbye on #canal`\n`p.goodbye off`")] });
  }

  return reply({ embeds: [errorEmbed(`No conozco el comando \`${PREFIX}${command}\`.\n\n📚 Usa **p.help** para ver todos los comandos disponibles.`)] });
});

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("🤖 Joshua está funcionando correctamente.");
});

server.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP activo en el puerto ${PORT}`);
});

if (!TOKEN) {
  console.error("❌ FALTA DISCORD_TOKEN EN RENDER.");
  process.exit(1);
}

client.login(TOKEN)
  .then(() => {
    console.log("🔐 Login de Discord iniciado correctamente.");
  })
  .catch(error => {
    console.error("🚨 No se pudo iniciar sesión en Discord:", error);
  });
