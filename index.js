const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");
const http = require("http");

const PREFIX = "p.";
const DATA_FILE = "./economy.json";

// =========================
// CLIENTE
// =========================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

// =========================
// ECONOMÍA
// =========================

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "{}");
}

let economy = {};

try {
  economy = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch {
  economy = {};
  fs.writeFileSync(DATA_FILE, "{}");
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(economy, null, 2));
}

function getUser(id) {
  if (!economy[id] || typeof economy[id] !== "object") {
    economy[id] = {
      cash: 1000,
      bank: 0,
      wins: 0,
      losses: 0,
      messages: 0,
      commands: 0,
      daily: 0,
      work: 0,
      crime: 0,
      inventory: {}
    };

    save();
  }

  const user = economy[id];

  user.cash = Number(user.cash) || 0;
  user.bank = Number(user.bank) || 0;
  user.wins = Number(user.wins) || 0;
  user.losses = Number(user.losses) || 0;
  user.messages = Number(user.messages) || 0;
  user.commands = Number(user.commands) || 0;
  user.daily = Number(user.daily) || 0;
  user.work = Number(user.work) || 0;
  user.crime = Number(user.crime) || 0;

  if (!user.inventory || typeof user.inventory !== "object") {
    user.inventory = {};
  }

  return user;
}

// =========================
// UTILIDADES
// =========================

function money(value) {
  return Number(value || 0).toLocaleString("es-ES");
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ok(text) {
  return new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("✅ Joshua")
    .setDescription(text)
    .setTimestamp();
}

function fail(text) {
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle("❌ Joshua")
    .setDescription(text)
    .setTimestamp();
}

function info(text) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🤖 Joshua")
    .setDescription(text)
    .setTimestamp();
}

function isAdmin(message) {
  return message.member &&
    message.member.permissions.has(PermissionFlagsBits.Administrator);
}

// =========================
// COOLDOWNS
// =========================

const cooldowns = new Map();

function cooldown(userId, command, seconds) {
  const key = `${userId}:${command}`;
  const now = Date.now();
  const last = cooldowns.get(key) || 0;
  const remaining = seconds * 1000 - (now - last);

  if (remaining > 0) {
    return remaining;
  }

  cooldowns.set(key, now);
  return 0;
}

function left(ms) {
  const seconds = Math.ceil(ms / 1000);

  if (seconds >= 3600) {
    return `${Math.floor(seconds / 3600)}h`;
  }

  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m`;
  }

  return `${seconds}s`;
}

// =========================
// AYUDA
// =========================

function help(category = "main") {
  const categories = {
    main: {
      title: "📚 Centro de ayuda de Joshua",
      text:
        "Selecciona una categoría para ver los comandos.\n\n" +
        "💰 Economía\n" +
        "🛒 Tienda\n" +
        "👤 Perfil\n" +
        "🎮 Diversión\n" +
        "👥 Social\n" +
        "🏰 Servidor\n" +
        "⚙️ Utilidades\n" +
        "🛡️ Administración"
    },

    economy: {
      title: "💰 Economía",
      text:
        "**p.balance** — Ver tu dinero\n" +
        "**p.bank** — Ver banco y efectivo\n" +
        "**p.daily** — Recompensa diaria\n" +
        "**p.work** — Trabajar\n" +
        "**p.crimen** — Crimen ficticio del juego\n" +
        "**p.dep cantidad** — Depositar\n" +
        "**p.with cantidad** — Retirar\n" +
        "**p.pay @usuario cantidad** — Enviar dinero\n" +
        "**p.gift @usuario cantidad** — Regalar dinero"
    },

    shop: {
      title: "🛒 Tienda",
      text:
        "**p.shop** — Ver la tienda\n" +
        "**p.buy objeto cantidad** — Comprar\n" +
        "**p.inventory** — Ver inventario\n" +
        "**p.sell objeto cantidad** — Vender"
    },

    profile: {
      title: "👤 Perfil",
      text:
        "**p.profile** — Ver perfil\n" +
        "**p.stats** — Ver estadísticas\n" +
        "**p.userinfo @usuario** — Información de usuario"
    },

    fun: {
      title: "🎮 Diversión",
      text:
        "**p.coinflip** — Lanzar moneda\n" +
        "**p.dado** — Tirar dado\n" +
        "**p.random 1 100** — Número aleatorio\n" +
        "**p.choose uno dos** — Joshua elige\n" +
        "**p.8ball pregunta** — Bola mágica\n" +
        "**p.rps** — Piedra, papel o tijera\n" +
        "**p.joke** — Chiste"
    },

    social: {
      title: "👥 Social",
      text:
        "**p.highfive @usuario** — Chocar los cinco\n" +
        "**p.compliment @usuario** — Elogiar\n" +
        "**p.say texto** — Joshua dice algo\n" +
        "**p.whois @usuario** — Información"
    },

    server: {
      title: "🏰 Servidor",
      text:
        "**p.serverinfo** — Información del servidor\n" +
        "**p.channels** — Canales\n" +
        "**p.roles** — Roles\n" +
        "**p.emojis** �� Emojis\n" +
        "**p.boosts** — Boosts"
    },

    utility: {
      title: "⚙️ Utilidades",
      text:
        "**p.ping** — Ver ping\n" +
        "**p.created @usuario** — Fecha de creación\n" +
        "**p.help** — Menú de ayuda"
    },

    admin: {
      title: "🛡️ Administración",
      text:
        "**p.ban @usuario** — Banear\n" +
        "**p.unban ID** — Desbanear\n" +
        "**p.kick @usuario** — Expulsar\n" +
        "**p.mute @usuario** — Silenciar\n" +
        "**p.unmute @usuario** — Quitar silencio\n" +
        "**p.warn @usuario motivo** — Advertir\n" +
        "**p.purge cantidad** — Borrar mensajes\n" +
        "**p.lock** — Bloquear canal\n" +
        "**p.unlock** — Desbloquear canal\n" +
        "**p.slowmode segundos** — Slowmode\n" +
        "**p.nick @usuario nombre** — Cambiar apodo"
    }
  };

  const data = categories[category] || categories.main;

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(data.title)
    .setDescription(data.text)
    .setFooter({ text: "Joshua 🤖 • p.help" })
    .setTimestamp();
}

function helpMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("joshua_help")
      .setPlaceholder("📚 Selecciona una categoría")
      .addOptions([
        {
          label: "Economía",
          value: "economy",
          emoji: "💰"
        },
        {
          label: "Tienda",
          value: "shop",
          emoji: "🛒"
        },
        {
          label: "Perfil",
          value: "profile",
          emoji: "👤"
        },
        {
          label: "Diversión",
          value: "fun",
          emoji: "🎮"
        },
        {
          label: "Social",
          value: "social",
          emoji: "👥"
        },
        {
          label: "Servidor",
          value: "server",
          emoji: "🏰"
        },
        {
          label: "Utilidades",
          value: "utility",
          emoji: "⚙️"
        },
        {
          label: "Administración",
          value: "admin",
          emoji: "🛡️"
        }
      ])
  );
}

// =========================
// TIENDA
// =========================

const shopItems = {
  cookie: {
    name: "🍪 Galleta",
    price: 100
  },
  pizza: {
    name: "🍕 Pizza",
    price: 500
  },
  diamond: {
    name: "💎 Diamante",
    price: 2500
  },
  crown: {
    name: "👑 Corona",
    price: 5000
  }
};

// =========================
// MENSAJES
// =========================

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  const user = getUser(message.author.id);

  user.messages++;
  save();

  const content = message.content.toLowerCase();

  if (!content.startsWith(PREFIX)) {
    if (content.includes("hola joshua")) {
      return message.reply("👋 ¡Holaaa! Soy Joshua 🤖🔥");
    }

    if (content === "buenas") {
      return message.reply("😎 ¡Buenas! ¿Qué tal?");
    }

    if (content.includes("te quiero joshua")) {
      return message.react("❤️").catch(() => {});
    }

    if (
      content.includes("joshua god") ||
      content.includes("joshua goat")
    ) {
      return message.react("🔥").catch(() => {});
    }

    return;
  }

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const command = (args.shift() || "").toLowerCase();

  if (!command) return;

  user.commands++;
  save();

  const reply = payload => {
    if (typeof payload === "string") {
      return message.reply({
        content: payload,
        allowedMentions: {
          repliedUser: false
        }
      });
    }

    return message.reply({
      ...payload,
      allowedMentions: {
        repliedUser: false
      }
    });
  };

  // =========================
  // GENERALES
  // =========================

  if (command === "help") {
    return reply({
      embeds: [help()],
      components: [helpMenu()]
    });
  }

  if (command === "ping") {
    return reply({
      embeds: [
        info(
          `🏓 Ping: **${client.ws.ping}ms**\n🟢 Joshua está conectado.`
        )
      ]
    });
  }

  // =========================
  // ECONOMÍA
  // =========================

  if (command === "balance" || command === "bal") {
    return reply({
      embeds: [
        info(
          `💵 Efectivo: **${money(user.cash)} 🪙**\n` +
          `🏦 Banco: **${money(user.bank)} 🪙**\n` +
          `💎 Total: **${money(user.cash + user.bank)} 🪙**`
        )
      ]
    });
  }

  if (command === "bank") {
    return reply({
      embeds: [
        info(
          `🏦 Banco: **${money(user.bank)} 🪙**\n` +
          `💵 Efectivo: **${money(user.cash)} 🪙**\n\n` +
          "Usa `p.dep all` o `p.with all`."
        )
      ]
    });
  }

  if (
    command === "daily" ||
    command === "work" ||
    command === "crimen"
  ) {
    const times = {
      daily: 86400,
      work: 30,
      crimen: 120
    };

    const cd = cooldown(
      message.author.id,
      command,
      times[command]
    );

    if (cd) {
      return reply({
        embeds: [
          fail(
            `⏰ Espera **${left(cd)}** para volver a usarlo.`
          )
        ]
      });
    }

    if (command === "daily") {
      user.cash += 1000;
      user.wins++;
      user.daily++;
      save();

      return reply({
        embeds: [
          ok("🎁 Recibiste **1.000 🪙** por tu recompensa diaria.")
        ]
      });
    }

    if (command === "work") {
      const amount = random(10, 150);

      user.cash += amount;
      user.wins++;
      user.work++;
      save();

      return reply({
        embeds: [
          ok(
            `💼 Trabajaste y ganaste **${money(amount)} 🪙**.`
          )
        ]
      });
    }

    if (Math.random() < 0.2) {
      const amount = random(300, 500);

      user.cash += amount;
      user.wins++;
      user.crime++;
      save();

      return reply({
        embeds: [
          ok(
            `🕵️ Crimen ficticio exitoso: ganaste **${money(
              amount
            )} 🪙**.`
          )
        ]
      });
    }

    const amount = Math.min(
      user.cash,
      random(200, 600)
    );

    user.cash -= amount;
    user.losses++;
    user.crime++;
    save();

    return reply({
      embeds: [
        fail(
          `🚔 Crimen ficticio fallido: perdiste **${money(
            amount
          )} 🪙**.`
        )
      ]
    });
  }

  // =========================
  // BANCO
  // =========================

  if (
    command === "dep" ||
    command === "deposit" ||
    command === "with" ||
    command === "withdraw"
  ) {
    const withdraw =
      command === "with" ||
      command === "withdraw";

    const arg = (args[0] || "").toLowerCase();

    const amount =
      arg === "all"
        ? withdraw
          ? user.bank
          : user.cash
        : Number(arg);

    const source = withdraw
      ? user.bank
      : user.cash;

    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      return reply({
        embeds: [
          fail(
            `Usa \`p.${command} cantidad\` o \`p.${command} all\`.`
          )
        ]
      });
    }

    if (amount > source) {
      return reply({
        embeds: [
          fail("💸 No tienes fondos suficientes.")
        ]
      });
    }

    if (withdraw) {
      user.bank -= amount;
      user.cash += amount;
    } else {
      user.cash -= amount;
      user.bank += amount;
    }

    save();

    return reply({
      embeds: [
        ok(
          `${withdraw ? "📤 Retiraste" : "📥 Depositaste"} **${money(
            amount
          )} 🪙**.`
        )
      ]
    });
  }

  // =========================
  // PAY / GIFT
  // =========================

  if (command === "pay" || command === "gift") {
    const target = message.mentions.users.first();

    const amount = Number(
      args.find(x => /^\d+$/.test(x))
    );

    if (
      !target ||
      target.id === message.author.id ||
      target.bot ||
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      return reply({
        embeds: [
          fail(
            `Uso: \`p.${command} @usuario cantidad\``
          )
        ]
      });
    }

    if (user.cash < amount) {
      return reply({
        embeds: [
          fail("💸 No tienes suficiente efectivo.")
        ]
      });
    }

    const targetUser = getUser(target.id);

    user.cash -= amount;
    targetUser.cash += amount;

    save();

    return reply({
      embeds: [
        ok(
          `🎁 Enviaste **${money(amount)} 🪙** a ${target}.`
        )
      ]
    });
  }

  // =========================
  // PERFIL
  // =========================

  if (command === "profile") {
    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`👤 Perfil de ${message.author.username}`)
          .setThumbnail(message.author.displayAvatarURL())
          .setDescription(
            `💵 Efectivo: **${money(user.cash)} 🪙**\n` +
            `🏦 Banco: **${money(user.bank)} 🪙**\n` +
            `🏆 Victorias: **${user.wins}**\n` +
            `💔 Derrotas: **${user.losses}**\n` +
            `💬 Mensajes: **${user.messages}**\n` +
            `⚙️ Comandos: **${user.commands}**`
          )
          .setTimestamp()
      ]
    });
  }

  if (command === "stats") {
    return reply({
      embeds: [
        info(
          `📊 **Estadísticas**\n\n` +
          `🎁 Daily: **${user.daily}**\n` +
          `💼 Trabajo: **${user.work}**\n` +
          `🕵️ Crimen ficticio: **${user.crime}**\n` +
          `🏆 Victorias: **${user.wins}**\n` +
          `💔 Derrotas: **${user.losses}**`
        )
      ]
    });
  }

  // =========================
  // TIENDA
  // =========================

  if (command === "shop") {
    let text = "";

    for (const [id, item] of Object.entries(shopItems)) {
      text +=
        `**${id}** — ${item.name} — **${money(
          item.price
        )} 🪙**\n`;
    }

    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle("🛒 Tienda de Joshua")
          .setDescription(text)
          .setFooter({
            text: "Usa p.buy objeto cantidad"
          })
      ]
    });
  }

  if (command === "buy") {
    const itemId = (args[0] || "").toLowerCase();
    const quantity = Math.max(
      1,
      Number(args[1]) || 1
    );

    const item = shopItems[itemId];

    if (!item) {
      return reply({
        embeds: [
          fail(
            "❌ Ese objeto no existe. Usa `p.shop`."
          )
        ]
      });
    }

    const total = item.price * quantity;

    if (user.cash < total) {
      return reply({
        embeds: [
          fail("💸 No tienes suficiente dinero.")
        ]
      });
    }

    user.cash -= total;

    if (!user.inventory[itemId]) {
      user.inventory[itemId] = 0;
    }

    user.inventory[itemId] += quantity;

    save();

    return reply({
      embeds: [
        ok(
          `🛒 Compraste **${quantity}x ${item.name}** por **${money(
            total
          )} 🪙**.`
        )
      ]
    });
  }

  if (command === "inventory" || command === "inv") {
    const entries = Object.entries(user.inventory)
      .filter(([, amount]) => amount > 0);

    if (!entries.length) {
      return reply({
        embeds: [
          info("🎒 Tu inventario está vacío.")
        ]
      });
    }

    let text = "";

    for (const [id, amount] of entries) {
      text +=
        `${shopItems[id]?.name || id}: **${amount}**\n`;
    }

    return reply({
      embeds: [
        info(`🎒 **Tu inventario**\n\n${text}`)
      ]
    });
  }

  if (command === "sell") {
    const itemId = (args[0] || "").toLowerCase();
    const quantity = Math.max(
      1,
      Number(args[1]) || 1
    );

    const item = shopItems[itemId];

    if (!item) {
      return reply({
        embeds: [
          fail("❌ Ese objeto no existe.")
        ]
      });
    }

    if ((user.inventory[itemId] || 0) < quantity) {
      return reply({
        embeds: [
          fail("🎒 No tienes suficientes unidades.")
        ]
      });
    }

    const total = Math.floor(
      (item.price * quantity) / 2
    );

    user.inventory[itemId] -= quantity;
    user.cash += total;

    save();

    return reply({
      embeds: [
        ok(
          `💰 Vendiste **${quantity}x ${item.name}** y recibiste **${money(
            total
          )} 🪙**.`
        )
      ]
    });
  }

  // =========================
  // DIVERSIÓN
  // =========================

  if (command === "coinflip") {
    const result =
      Math.random() < 0.5
        ? "🪙 Cara"
        : "🪙 Cruz";

    return reply({
      embeds: [
        info(`🪙 Salió **${result}**.`)
      ]
    });
  }

  if (command === "dado") {
    return reply({
      embeds: [
        info(
          `🎲 Tiraste el dado y salió **${random(1, 6)}**.`
        )
      ]
    });
  }

  if (command === "random") {
    const min = Number(args[0]) || 1;
    const max = Number(args[1]) || 100;

    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min >= max
    ) {
      return reply({
        embeds: [
          fail("Usa `p.random 1 100`.")
        ]
      });
    }

    return reply({
      embeds: [
        info(
          `🎲 Número aleatorio:\n\n# ${random(min, max)}`
        )
      ]
    });
  }

  if (command === "choose") {
    if (args.length < 2) {
      return reply({
        embeds: [
          fail("Usa `p.choose opción1 opción2`.")
        ]
      });
    }

    const choice =
      args[Math.floor(Math.random() * args.length)];

    return reply({
      embeds: [
        info(`🤔 Joshua eligió: **${choice}**`)
      ]
    });
  }

  if (command === "8ball") {
    const answers = [
      "🟢 Sí.",
      "🔴 No.",
      "🤔 Tal vez.",
      "✨ Probablemente.",
      "😶 No estoy seguro.",
      "🔥 Definitivamente."
    ];

    return reply({
      embeds: [
        info(
          `🎱 ${answers[Math.floor(Math.random() * answers.length)]}`
        )
      ]
    });
  }

  if (command === "joke") {
    const jokes = [
      "😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!",
      "🤣 ¿Qué le dijo un cero a un ocho? Bonito cinturón.",
      "😎 ¿Por qué el libro fue al médico? Porque tenía muchas páginas en blanco."
    ];

    return reply({
      embeds: [
        info(
          jokes[Math.floor(Math.random() * jokes.length)]
        )
      ]
    });
  }

  if (command === "rps") {
    const choices = [
      "🪨 Piedra",
      "📄 Papel",
      "✂️ Tijera"
    ];

    return reply({
      embeds: [
        info(
          `🎮 Joshua eligió **${
            choices[Math.floor(Math.random() * choices.length)]
          }**.`
        )
      ]
    });
  }

  // =========================
  // SOCIAL
  // =========================

  if (command === "highfive") {
    const target =
      message.mentions.users.first();

    if (!target) {
      return reply({
        embeds: [
          fail("Menciona a alguien.")
        ]
      });
    }

    return reply({
      embeds: [
        ok(
          `🙌 ¡${message.author} chocó los cinco con ${target}!`
        )
      ]
    });
  }

  if (command === "compliment") {
    const target =
      message.mentions.users.first();

    if (!target) {
      return reply({
        embeds: [
          fail("Menciona a alguien.")
        ]
      });
    }

    const compliments = [
      "✨ ¡Tienes una energía increíble!",
      "🔥 ¡Eres una máquina!",
      "😎 ¡Qué grande eres!",
      "💎 ¡Eres genial!"
    ];

    return reply({
      embeds: [
        ok(
          `${target}, ${
            compliments[
              Math.floor(Math.random() * compliments.length)
            ]
          }`
        )
      ]
    });
  }

  if (command === "say") {
    if (!args.length) {
      return reply({
        embeds: [
          fail("Escribe algo para que Joshua lo diga.")
        ]
      });
    }

    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setDescription(args.join(" "))
          .setFooter({
            text: "Joshua 🤖"
          })
      ]
    });
  }

  if (command === "userinfo" || command === "user") {
    const target =
      message.mentions.users.first() ||
      message.author;

    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`👤 ${target.username}`)
          .setThumbnail(target.displayAvatarURL())
          .setDescription(
            `🆔 ID: **${target.id}**\n` +
            `🤖 Bot: **${target.bot ? "Sí" : "No"}**\n` +
            `📅 Cuenta creada: <t:${Math.floor(
              target.createdTimestamp / 1000
            )}:F>`
          )
          .setTimestamp()
      ]
    });
  }

  if (command === "whois") {
    const target =
      message.mentions.users.first() ||
      message.author;

    return reply({
      embeds: [
        info(
          `👤 Usuario: **${target.username}**\n` +
          `🆔 ID: **${target.id}**`
        )
      ]
    });
  }

  // =========================
  // SERVIDOR
  // =========================

  if (command === "serverinfo") {
    const guild = message.guild;

    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🏰 ${guild.name}`)
          .setThumbnail(guild.iconURL())
          .setDescription(
            `👥 Miembros: **${guild.memberCount}**\n` +
            `💬 Canales: **${guild.channels.cache.size}**\n` +
            `🎭 Roles: **${guild.roles.cache.size}**\n` +
            `😀 Emojis: **${guild.emojis.cache.size}**\n` +
            `🚀 Boosts: **${guild.premiumSubscriptionCount || 0}**`
          )
          .setTimestamp()
      ]
    });
  }

  if (command === "channels") {
    const channels =
      message.guild.channels.cache
        .map(channel => `• ${channel}`)
        .slice(0, 30)
        .join("\n");

    return reply({
      embeds: [
        info(
          `💬 **Canales**\n\n${channels || "Ninguno"}`
        )
      ]
    });
  }

  if (command === "roles") {
    const roles =
      message.guild.roles.cache
        .filter(role => role.id !== message.guild.id)
        .map(role => `• ${role}`)
        .slice(0, 30)
        .join("\n");

    return reply({
      embeds: [
        info(
          `🎭 **Roles**\n\n${roles || "Ninguno"}`
        )
      ]
    });
  }

  if (command === "emojis") {
    const emojis =
      message.guild.emojis.cache
        .map(emoji => `${emoji}`)
        .slice(0, 50)
        .join(" ");

    return reply({
      embeds: [
        info(
          `😀 **Emojis**\n\n${emojis || "Ninguno"}`
        )
      ]
    });
  }

  if (command === "boosts") {
    return reply({
      embeds: [
        info(
          `🚀 Este servidor tiene **${
            message.guild.premiumSubscriptionCount || 0
          } boosts**.`
        )
      ]
    });
  }

  if (command === "created") {
    const target =
      message.mentions.users.first() ||
      message.author;

    return reply({
      embeds: [
        info(
          `📅 La cuenta de **${target.username}** fue creada el:\n` +
          `<t:${Math.floor(
            target.createdTimestamp / 1000
          )}:F>`
        )
      ]
    });
  }

  // =========================
  // ADMIN
  // =========================

  const adminCommands = [
    "ban",
    "unban",
    "kick",
    "mute",
    "unmute",
    "warn",
    "purge",
    "lock",
    "unlock",
    "slowmode",
    "nick"
  ];

  if (adminCommands.includes(command)) {
    if (!isAdmin(message)) {
      return reply({
        embeds: [
          fail(
            "🛡️ Necesitas permisos de administrador."
          )
        ]
      });
    }
  }

  if (command === "ban") {
    const target =
      message.mentions.members.first();

    if (!target) {
      return reply({
        embeds: [
          fail("Uso: `p.ban @usuario`.")
        ]
      });
    }

    if (!target.bannable) {
      return reply({
        embeds: [
          fail("❌ No puedo banear a ese usuario.")
        ]
      });
    }

    await target.ban({
      reason: `Ban ejecutado por ${message.author.tag}`
    });

    return reply({
      embeds: [
        ok(
          `🔨 **Usuario baneado**\n\n` +
          `👤 Usuario: **${target.user.tag}**\n` +
          `👮 Moderador: **${message.author.tag}**`
        )
      ]
    });
  }

  if (command === "unban") {
    const id = args[0];

    if (!id) {
      return reply({
        embeds: [
          fail("Uso: `p.unban ID`.")
        ]
      });
    }

    try {
      await message.guild.members.unban(id);

      return reply({
        embeds: [
          ok(
            `🔓 Usuario con ID **${id}** fue desbaneado.`
          )
        ]
      });
    } catch {
      return reply({
        embeds: [
          fail(
            "❌ No encontré un usuario baneado con ese ID."
          )
        ]
      });
    }
  }

  if (command === "kick") {
    const target =
      message.mentions.members.first();

    if (!target) {
      return reply({
        embeds: [
          fail("Uso: `p.kick @usuario`.")
        ]
      });
    }

    if (!target.kickable) {
      return reply({
        embeds: [
          fail("❌ No puedo expulsar a ese usuario.")
        ]
      });
    }

    await target.kick(
      `Kick ejecutado por ${message.author.tag}`
    );

    return reply({
      embeds: [
        ok(
          `👢 **${target.user.tag}** fue expulsado.`
        )
      ]
    });
  }

  if (command === "warn") {
    const target =
      message.mentions.users.first();

    if (!target) {
      return reply({
        embeds: [
          fail("Uso: `p.warn @usuario motivo`.")
        ]
      });
    }

    const reason =
      args.slice(1).join(" ") ||
      "Sin motivo especificado";

    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle("⚠️ Advertencia")
          .setDescription(
            `👤 Usuario: **${target.tag}**\n` +
            `👮 Moderador: **${message.author.tag}**\n` +
            `📝 Motivo: **${reason}**`
          )
          .setTimestamp()
      ]
    });
  }

  if (command === "purge") {
    const amount = Number(args[0]);

    if (
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > 100
    ) {
      return reply({
        embeds: [
          fail(
            "Usa una cantidad entre **1 y 100**."
          )
        ]
      });
    }

    const deleted =
      await message.channel.bulkDelete(
        amount,
        true
      );

    const msg =
      await message.channel.send({
        embeds: [
          ok(
            `🧹 Se eliminaron **${deleted.size} mensajes**.`
          )
        ]
      });

    setTimeout(
      () => msg.delete().catch(() => {}),
      5000
    );

    return;
  }

  if (command === "lock") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: false
      }
    );

    return reply({
      embeds: [
        ok("🔒 Canal bloqueado correctamente.")
      ]
    });
  }

  if (command === "unlock") {
    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: null
      }
    );

    return reply({
      embeds: [
        ok("🔓 Canal desbloqueado correctamente.")
      ]
    });
  }

  if (command === "slowmode") {
    const seconds = Number(args[0]);

    if (
      !Number.isInteger(seconds) ||
      seconds < 0 ||
      seconds > 21600
    ) {
      return reply({
        embeds: [
          fail(
            "Usa un número entre **0 y 21600 segundos**."
          )
        ]
      });
    }

    await message.channel.setRateLimitPerUser(
      seconds
    );

    return reply({
      embeds: [
        ok(
          `🐌 Slowmode establecido en **${seconds} segundos**.`
        )
      ]
    });
  }

  if (command === "nick") {
    const target =
      message.mentions.members.first();

    const nickname =
      args
        .filter(arg => !arg.startsWith("<@"))
        .join(" ");

    if (!target || !nickname) {
      return reply({
        embeds: [
          fail(
            "Uso: `p.nick @usuario nuevo-nombre`."
          )
        ]
      });
    }

    if (!target.manageable) {
      return reply({
        embeds: [
          fail(
            "❌ No puedo cambiar el apodo de ese usuario."
          )
        ]
      });
    }

    await target.setNickname(nickname);

    return reply({
      embeds: [
        ok(
          `✏️ Nuevo apodo de **${target.user.tag}**: **${nickname}**`
        )
      ]
    });
  }

  if (command === "mute") {
    const target =
      message.mentions.members.first();

    if (!target) {
      return reply({
        embeds: [
          fail("Uso: `p.mute @usuario`.")
        ]
      });
    }

    let mutedRole =
      message.guild.roles.cache.find(
        role => role.name === "Muted"
      );

    if (!mutedRole) {
      mutedRole =
        await message.guild.roles.create({
          name: "Muted",
          reason: "Rol creado por Joshua"
        });
    }

    await target.roles.add(mutedRole);

    return reply({
      embeds: [
        ok(
          `🔇 **${target.user.tag}** recibió el rol **Muted**.`
        )
      ]
    });
  }

  if (command === "unmute") {
    const target =
      message.mentions.members.first();

    if (!target) {
      return reply({
        embeds: [
          fail("Uso: `p.unmute @usuario`.")
        ]
      });
    }

    const mutedRole =
      message.guild.roles.cache.find(
        role => role.name === "Muted"
      );

    if (!mutedRole) {
      return reply({
        embeds: [
          fail("❌ No existe el rol Muted.")
        ]
      });
    }

    await target.roles.remove(mutedRole);

    return reply({
      embeds: [
        ok(
          `🔊 Se quitó el rol **Muted** a **${target.user.tag}**.`
        )
      ]
    });
  }

  // =========================
  // DESCONOCIDO
  // =========================

  return reply({
    embeds: [
      fail(
        `❓ No conozco el comando \`${PREFIX}${command}\`.\n` +
        "Usa **p.help** para ver los comandos."
      )
    ]
  });
});

// =========================
// MENÚ DE AYUDA
// =========================

client.on("interactionCreate", async interaction => {
  if (
    !interaction.isStringSelectMenu() ||
    interaction.customId !== "joshua_help"
  ) {
    return;
  }

  await interaction.update({
    embeds: [
      help(interaction.values[0])
    ],
    components: [
      helpMenu()
    ]
  });
});

// =========================
// EVENTOS
// =========================

client.once("ready", () => {
  console.log(
    `🤖 Joshua está conectado como ${client.user.tag}`
  );
});

client.on("error", error => {
  console.error("❌ Error de Discord:", error);
});

process.on("unhandledRejection", error => {
  console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("❌ Uncaught Exception:", error);
});

// =========================
// SERVIDOR PARA RENDER
// =========================

const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("Joshua está funcionando 🤖🟢");
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(
      `🌐 Servidor iniciado en el puerto ${PORT}`
    );
  });

// =========================
// LOGIN
// =========================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ Falta DISCORD_TOKEN en las variables de Render."
  );

  process.exit(1);
}

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log("🔐 Login de Discord correcto.");
  })
  .catch(error => {
    console.error(
      "❌ No se pudo iniciar sesión en Discord."
    );

    console.error(error.message);

    process.exit(1);
  });
