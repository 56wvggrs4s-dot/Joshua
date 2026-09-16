const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require("discord.js");

const OpenAI = require("openai");
const fs = require("fs");
const http = require("http");

const PREFIX = "p.";
const DATA_FILE = "./economy.json";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   DATOS
========================= */

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

let database;

try {
  database = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch {
  database = {};
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(database, null, 2));
}

function getUser(id) {
  if (!database[id]) {
    database[id] = {
      cash: 500,
      bank: 0,
      commands: 0,
      daily: 0,
      inventory: {},
      warnings: 0
    };

    save();
  }

  return database[id];
}

function money(number) {
  return Number(number || 0).toLocaleString("es-ES");
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* =========================
   EMBEDS
========================= */

function info(text) {
  return new EmbedBuilder()
    .setColor("Blue")
    .setDescription(text)
    .setTimestamp();
}

function ok(text) {
  return new EmbedBuilder()
    .setColor("Green")
    .setDescription(`✅ ${text}`)
    .setTimestamp();
}

function fail(text) {
  return new EmbedBuilder()
    .setColor("Red")
    .setDescription(`❌ ${text}`)
    .setTimestamp();
}

function help() {
  return new EmbedBuilder()
    .setColor("Purple")
    .setTitle("🤖 Joshua — Ayuda")
    .setDescription(
      [
        "Usa el prefijo `p.`",
        "",
        "🤖 **IA**",
        "`p.r <pregunta>` — Pregúntale a Joshua AI",
        "",
        "💰 **Economía**",
        "`p.balance` · `p.bank` · `p.daily`",
        "`p.work` · `p.crimen` · `p.dep`",
        "`p.with` · `p.pay` · `p.profile`",
        "",
        "🛒 **Tienda**",
        "`p.shop` · `p.buy` · `p.inv` · `p.sell`",
        "",
        "🎮 **Diversión**",
        "`p.coinflip` · `p.dado` · `p.random`",
        "`p.choose` · `p.8ball` · `p.joke` · `p.rps`",
        "",
        "👥 **Social**",
        "`p.highfive` · `p.compliment` · `p.say`",
        "`p.userinfo`",
        "",
        "🏠 **Servidor**",
        "`p.serverinfo` · `p.channels` · `p.roles`",
        "`p.emojis` · `p.boosts`",
        "",
        "🛡️ **Moderación**",
        "`p.ban` · `p.unban` · `p.kick` · `p.warn`",
        "`p.purge` · `p.lock` · `p.unlock`",
        "`p.slowmode` · `p.nick` · `p.mute` · `p.unmute`"
      ].join("\n")
    )
    .setFooter({ text: "Joshua 🤖" });
}

function helpMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_menu")
      .setPlaceholder("📚 Elige una categoría")
      .addOptions([
        {
          label: "🤖 IA",
          value: "ia"
        },
        {
          label: "💰 Economía",
          value: "economy"
        },
        {
          label: "🎮 Diversión",
          value: "fun"
        },
        {
          label: "👥 Social",
          value: "social"
        },
        {
          label: "🛡️ Moderación",
          value: "mod"
        }
      ])
  );
}

/* =========================
   EVENTO READY
========================= */

client.once("ready", () => {
  console.log(`🤖 Joshua conectado como ${client.user.tag}`);
  console.log(`🟢 Servidores: ${client.guilds.cache.size}`);

  client.user.setPresence({
    activities: [
      {
        name: "p.help | IA 🤖",
        type: 0
      }
    ],
    status: "online"
  });
});

/* =========================
   MENSAJES
========================= */

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const content = message.content.slice(PREFIX.length).trim();

  if (!content) return;

  const parts = content.split(/\s+/);
  const command = parts.shift().toLowerCase();
  const args = parts;

  const user = getUser(message.author.id);

  user.commands++;
  save();

  const reply = content => {
    if (typeof content === "string") {
      return message.reply({
        content,
        allowedMentions: {
          repliedUser: false
        }
      });
    }

    return message.reply({
      ...content,
      allowedMentions: {
        repliedUser: false
      }
    });
  };

  /* =========================
     🤖 IA
  ========================= */

  if (command === "r" || command === "chatgpt") {
    const pregunta = args.join(" ");

    if (!pregunta) {
      return reply(
        "🤖💭 Escribe una pregunta.\n\nEjemplo:\n`p.r ¿Qué es un agujero negro?`"
      );
    }

    try {
      await message.channel.sendTyping();

      const respuesta = await openai.responses.create({
        model: "gpt-5-mini",
        input: pregunta
      });

      const texto = respuesta.output_text || "No pude generar una respuesta.";

      if (texto.length <= 1900) {
        return reply(`🤖 **Joshua AI**\n\n${texto}`);
      }

      const partesRespuesta = texto.match(/[\s\S]{1,1900}/g);

      for (let i = 0; i < partesRespuesta.length; i++) {
        await message.channel.send(
          `🤖 **Joshua AI**\n\n${partesRespuesta[i]}`
        );
      }

      return;
    } catch (error) {
      console.error("❌ Error de OpenAI:", error);

      return reply(
        "❌ Joshua AI tuvo un problema al responder. Inténtalo otra vez."
      );
    }
  }

  /* =========================
     📚 HELP
  ========================= */

  if (command === "help" || command === "ayuda") {
    return reply({
      embeds: [help()],
      components: [helpMenu()]
    });
  }

  /* =========================
     🏓 PING
  ========================= */

  if (command === "ping") {
    return reply({
      embeds: [
        info(`🏓 Ping: **${client.ws.ping}ms**\n🟢 Joshua está conectado.`)
      ]
    });
  }

  /* =========================
     💰 ECONOMÍA
  ========================= */

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

  if (command === "daily") {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (user.daily && now - user.daily < cooldown) {
      const remaining = cooldown - (now - user.daily);
      const hours = Math.ceil(remaining / (60 * 60 * 1000));

      return reply(
        `⏳ Ya reclamaste tu recompensa diaria.\n` +
        `Vuelve en aproximadamente **${hours} hora(s)**.`
      );
    }

    const reward = random(500, 1500);

    user.cash += reward;
    user.daily = now;

    save();

    return reply({
      embeds: [
        ok(
          `🎁 Recibiste **${money(reward)} 🪙**.\n` +
          `💵 Ahora tienes **${money(user.cash)} 🪙**.`
        )
      ]
    });
  }

  if (command === "work") {
    const jobs = [
      "💻 Programaste un pequeño proyecto.",
      "🍕 Trabajaste repartiendo pizzas.",
      "🎮 Probaste videojuegos durante tu turno.",
      "📦 Organizaste unas cajas.",
      "🐶 Paseaste algunos perros."
    ];

    const reward = random(100, 500);
    const job = jobs[random(0, jobs.length - 1)];

    user.cash += reward;

    save();

    return reply({
      embeds: [
        ok(`${job}\n\n💰 Ganaste **${money(reward)} 🪙**.`)
      ]
    });
  }

  if (command === "crimen") {
    const outcomes = [
      ["😎 Salió perfecto.", 300],
      ["🚨 Casi te atrapan, pero escapaste.", 150],
      ["😂 El plan fue un desastre.", -100],
      ["🕶️ Joshua dice que nadie vio nada.", 250]
    ];

    const result = outcomes[random(0, outcomes.length - 1)];

    user.cash = Math.max(0, user.cash + result[1]);

    save();

    return reply({
      embeds: [
        info(
          `🎭 **Crimen ficticio**\n\n${result[0]}\n` +
          `${result[1] >= 0 ? "💰 Ganaste" : "💸 Perdiste"} **${money(
            Math.abs(result[1])
          )} 🪙**.`
        )
      ]
    });
  }

  if (command === "dep" || command === "deposit") {
    if (!args[0]) {
      return reply("🏦 Usa `p.dep <cantidad>` o `p.dep all`.");
    }

    let amount;

    if (args[0].toLowerCase() === "all") {
      amount = user.cash;
    } else {
      amount = Number(args[0]);
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return reply("❌ Cantidad inválida.");
    }

    if (amount > user.cash) {
      return reply("❌ No tienes suficiente dinero en efectivo.");
    }

    user.cash -= amount;
    user.bank += amount;

    save();

    return reply({
      embeds: [
        ok(`🏦 Depositaste **${money(amount)} 🪙**.`)
      ]
    });
  }

  if (command === "with" || command === "withdraw") {
    if (!args[0]) {
      return reply("🏦 Usa `p.with <cantidad>` o `p.with all`.");
    }

    let amount;

    if (args[0].toLowerCase() === "all") {
      amount = user.bank;
    } else {
      amount = Number(args[0]);
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return reply("❌ Cantidad inválida.");
    }

    if (amount > user.bank) {
      return reply("❌ No tienes suficiente dinero en el banco.");
    }

    user.bank -= amount;
    user.cash += amount;

    save();

    return reply({
      embeds: [
        ok(`💵 Retiraste **${money(amount)} 🪙**.`)
      ]
    });
  }

  if (command === "pay" || command === "gift") {
    const target = message.mentions.users.first();
    const amount = Number(args[1]);

    if (!target) {
      return reply("💸 Menciona a la persona que recibirá el dinero.");
    }

    if (target.bot) {
      return reply("🤖 No puedes enviar dinero a un bot.");
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return reply("💰 Escribe una cantidad válida.");
    }

    if (amount > user.cash) {
      return reply("❌ No tienes suficiente dinero.");
    }

    const receiver = getUser(target.id);

    user.cash -= amount;
    receiver.cash += amount;

    save();

    return reply({
      embeds: [
        ok(
          `💸 Enviaste **${money(amount)} 🪙** a ${target}.\n` +
          `💰 Tu efectivo: **${money(user.cash)} 🪙**`
        )
      ]
    });
  }

  if (command === "profile" || command === "perfil") {
    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Gold")
          .setTitle(`👤 Perfil de ${message.author.username}`)
          .setThumbnail(message.author.displayAvatarURL())
          .addFields(
            {
              name: "💵 Efectivo",
              value: `${money(user.cash)} 🪙`,
              inline: true
            },
            {
              name: "🏦 Banco",
              value: `${money(user.bank)} 🪙`,
              inline: true
            },
            {
              name: "📨 Comandos",
              value: `${money(user.commands)}`,
              inline: true
            }
          )
      ]
    });
  }

  if (command === "stats") {
    return reply({
      embeds: [
        info(
          `📊 **Estadísticas de Joshua**\n\n` +
          `👥 Servidores: **${client.guilds.cache.size}**\n` +
          `👤 Usuarios visibles: **${client.users.cache.size}**\n` +
          `🏓 Ping: **${client.ws.ping}ms**`
        )
      ]
    });
  }

  /* =========================
     🛒 TIENDA
  ========================= */

  if (command === "shop") {
    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Orange")
          .setTitle("🛒 Tienda de Joshua")
          .setDescription(
            "🎩 Sombrero — **500 🪙**\n" +
            "💎 Diamante — **1.000 🪙**\n" +
            "🎮 Consola — **2.500 🪙**\n" +
            "👑 Corona — **5.000 🪙**\n\n" +
            "Compra con `p.buy <objeto>`."
          )
      ]
    });
  }

  if (command === "buy") {
    const item = args[0]?.toLowerCase();

    const items = {
      sombrero: {
        name: "🎩 Sombrero",
        price: 500
      },
      diamante: {
        name: "💎 Diamante",
        price: 1000
      },
      consola: {
        name: "🎮 Consola",
        price: 2500
      },
      corona: {
        name: "👑 Corona",
        price: 5000
      }
    };

    if (!item || !items[item]) {
      return reply("❌ Ese objeto no existe. Usa `p.shop`.");
    }

    const product = items[item];

    if (user.cash < product.price) {
      return reply("❌ No tienes suficiente dinero.");
    }

    user.cash -= product.price;

    if (!user.inventory[item]) {
      user.inventory[item] = 0;
    }

    user.inventory[item]++;

    save();

    return reply({
      embeds: [
        ok(
          `🛒 Compraste **${product.name}** por **${money(
            product.price
          )} 🪙**.`
        )
      ]
    });
  }

  if (command === "inventory" || command === "inv") {
    const entries = Object.entries(user.inventory);

    if (!entries.length) {
      return reply("🎒 Tu inventario está vacío.");
    }

    const text = entries
      .map(([item, amount]) => `📦 **${item}** × ${amount}`)
      .join("\n");

    return reply({
      embeds: [
        info(`🎒 **Inventario**\n\n${text}`)
      ]
    });
  }

  if (command === "sell") {
    const item = args[0]?.toLowerCase();

    if (!item || !user.inventory[item] || user.inventory[item] <= 0) {
      return reply("❌ No tienes ese objeto.");
    }

    const prices = {
      sombrero: 250,
      diamante: 500,
      consola: 1250,
      corona: 2500
    };

    if (!prices[item]) {
      return reply("❌ Ese objeto no se puede vender.");
    }

    user.inventory[item]--;
    user.cash += prices[item];

    save();

    return reply({
      embeds: [
        ok(
          `💰 Vendiste **${item}** por **${money(
            prices[item]
          )} 🪙**.`
        )
      ]
    });
  }

  /* =========================
     🎮 DIVERSIÓN
  ========================= */

  if (command === "coinflip" || command === "moneda") {
    const result = Math.random() < 0.5 ? "🪙 Cara" : "🪙 Cruz";

    return reply({
      embeds: [
        info(`🪙 La moneda cayó en **${result}**.`)
      ]
    });
  }

  if (command === "dado" || command === "dice") {
    const result = random(1, 6);

    return reply({
      embeds: [
        info(`🎲 Sacaste un **${result}**.`)
      ]
    });
  }

  if (command === "random") {
    const max = Number(args[0]);

    if (!Number.isSafeInteger(max) || max < 1) {
      return reply("🎲 Usa `p.random <número>`.");
    }

    return reply({
      embeds: [
        info(`🎲 Número aleatorio: **${random(1, max)}**`)
      ]
    });
  }

  if (command === "choose" || command === "elegir") {
    if (args.length < 2) {
      return reply(
        "🤔 Dame varias opciones.\nEjemplo: `p.choose pizza hamburguesa`"
      );
    }

    const choice = args[random(0, args.length - 1)];

    return reply({
      embeds: [
        info(`🤔 Joshua eligió: **${choice}**`)
      ]
    });
  }

  if (command === "8ball") {
    const answers = [
      "🎱 Sí, definitivamente.",
      "🎱 Probablemente.",
      "🎱 No parece probable.",
      "🎱 Las señales no son claras.",
      "🎱 Pregunta de nuevo."
    ];

    return reply({
      embeds: [
        info(answers[random(0, answers.length - 1)])
      ]
    });
  }

  if (command === "joke" || command === "chiste") {
    const jokes = [
      "😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!",
      "🤣 ¿Qué le dijo un pez a otro? ¡Nada!",
      "😎 ¿Cuál es el colmo de un electricista? No encontrar su corriente."
    ];

    return reply({
      embeds: [
        info(jokes[random(0, jokes.length - 1)])
      ]
    });
  }

  if (command === "rps") {
    const choices = ["🪨 Piedra", "📄 Papel", "✂️ Tijera"];

    return reply({
      embeds: [
        info(
          `🎮 Joshua eligió **${
            choices[random(0, choices.length - 1)]
          }**.\n\nUsa \`p.rps\` para jugar.`
        )
      ]
    });
  }

  /* =========================
     👥 SOCIAL
  ========================= */

  if (command === "highfive") {
    const target = message.mentions.users.first();

    if (!target) {
      return reply("🙌 Menciona a alguien.");
    }

    return reply({
      embeds: [
        info(`🙌 ${message.author} chocó los cinco con ${target}.`)
      ]
    });
  }

  if (command === "compliment") {
    const target = message.mentions.users.first();

    if (!target) {
      return reply("✨ Menciona a alguien.");
    }

    return reply({
      embeds: [
        info(`✨ ${target}, ¡eres genial! 😎`)
      ]
    });
  }

  if (command === "say") {
    const text = args.join(" ");

    if (!text) {
      return reply("💬 Escribe algo para que Joshua lo diga.");
    }

    return reply(text);
  }

  if (command === "userinfo" || command === "user") {
    const target = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(target.id);

    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Blue")
          .setTitle(`👤 Información de ${target.username}`)
          .setThumbnail(target.displayAvatarURL())
          .addFields(
            {
              name: "🆔 ID",
              value: target.id
            },
            {
              name: "📅 Cuenta creada",
              value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`
            },
            {
              name: "👑 Apodo",
              value: member?.nickname || "Ninguno"
            }
          )
      ]
    });
  }

  /* =========================
     🏠 SERVIDOR
  ========================= */

  if (command === "serverinfo") {
    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Green")
          .setTitle(`🏠 ${message.guild.name}`)
          .setThumbnail(message.guild.iconURL())
          .addFields(
            {
              name: "👥 Miembros",
              value: `${message.guild.memberCount}`,
              inline: true
            },
            {
              name: "💬 Canales",
              value: `${message.guild.channels.cache.size}`,
              inline: true
            },
            {
              name: "🎭 Roles",
              value: `${message.guild.roles.cache.size}`,
              inline: true
            }
          )
      ]
    });
  }

  if (command === "channels") {
    const channels = message.guild.channels.cache;

    return reply({
      embeds: [
        info(
          `💬 Canales del servidor: **${channels.size}**`
        )
      ]
    });
  }

  if (command === "roles") {
    return reply({
      embeds: [
        info(
          `🎭 Este servidor tiene **${message.guild.roles.cache.size} roles**.`
        )
      ]
    });
  }

  if (command === "emojis") {
    return reply({
      embeds: [
        info(
          `😀 Emojis del servidor: **${message.guild.emojis.cache.size}**`
        )
      ]
    });
  }

  if (command === "boosts") {
    return reply({
      embeds: [
        info(
          `🚀 Boosts del servidor: **${message.guild.premiumSubscriptionCount || 0}**`
        )
      ]
    });
  }

  if (command === "created") {
    return reply({
      embeds: [
        info(
          `📅 Este servidor fue creado el <t:${Math.floor(
            message.guild.createdTimestamp / 1000
          )}:F>.`
        )
      ]
    });
  }

  /* =========================
     🛡️ MODERACIÓN
  ========================= */

  if (command === "ban") {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return reply("❌ No tienes permiso para banear.");
    }

    const target = message.mentions.members.first();

    if (!target) {
      return reply("🛡️ Menciona al usuario que quieres banear.");
    }

    if (!target.bannable) {
      return reply("❌ No puedo banear a ese usuario.");
    }

    await target.ban({
      reason: args.slice(1).join(" ") || "Sin razón especificada"
    });

    return reply({
      embeds: [
        ok(`🔨 **${target.user.tag}** fue baneado del servidor.`)
      ]
    });
  }

  if (command === "unban") {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return reply("❌ No tienes permiso para quitar baneos.");
    }

    const id = args[0];

    if (!id) {
      return reply("🆔 Usa `p.unban <ID>`.");
    }

    try {
      await message.guild.members.unban(id);

      return reply({
        embeds: [
          ok(`🔓 Usuario **${id}** desbaneado.`)
        ]
      });
    } catch {
      return reply("❌ No pude quitar el baneo.");
    }
  }

  if (command === "kick") {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return reply("❌ No tienes permiso para expulsar.");
    }

    const target = message.mentions.members.first();

    if (!target) {
      return reply("👢 Menciona al usuario que quieres expulsar.");
    }

    if (!target.kickable) {
      return reply("❌ No puedo expulsar a ese usuario.");
    }

    await target.kick(
      args.slice(1).join(" ") || "Sin razón especificada"
    );

    return reply({
      embeds: [
        ok(`👢 **${target.user.tag}** fue expulsado.`)
      ]
    });
  }

  if (command === "warn") {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return reply("❌ No tienes permiso para advertir.");
    }

    const target = message.mentions.users.first();

    if (!target) {
      return reply("⚠️ Menciona al usuario.");
    }

    const targetData = getUser(target.id);

    targetData.warnings++;

    save();

    return reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Orange")
          .setTitle("⚠️ Advertencia")
          .setDescription(
            `${target} recibió una advertencia.\n\n` +
            `📊 Advertencias: **${targetData.warnings}**`
          )
      ]
    });
  }

  if (command === "purge" || command === "clear") {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return reply("❌ No tienes permiso para borrar mensajes.");
    }

    const amount = Number(args[0]);

    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      return reply("🧹 Usa una cantidad entre **1 y 100**.");
    }

    const deleted = await message.channel.bulkDelete(amount, true);

    const confirmation = await message.channel.send(
      `🧹 Se eliminaron **${deleted.size} mensajes**.`
    );

    setTimeout(() => {
      confirmation.delete().catch(() => {});
    }, 3000);

    return;
  }

  if (command === "lock") {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return reply("❌ No tienes permiso para bloquear el canal.");
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: false
      }
    );

    return reply({
      embeds: [
        ok("🔒 Canal bloqueado.")
      ]
    });
  }

  if (command === "unlock") {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return reply("❌ No tienes permiso para desbloquear el canal.");
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: null
      }
    );

    return reply({
      embeds: [
        ok("🔓 Canal desbloqueado.")
      ]
    });
  }

  if (command === "slowmode") {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return reply("❌ No tienes permiso para cambiar el slowmode.");
    }

    const seconds = Number(args[0]);

    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) {
      return reply("⏱️ Usa un valor entre 0 y 21600 segundos.");
    }

    await message.channel.setRateLimitPerUser(seconds);

    return reply({
      embeds: [
        ok(`⏱️ Slowmode establecido en **${seconds} segundos**.`)
      ]
    });
  }

  if (command === "nick") {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return reply("❌ No tienes permiso para cambiar apodos.");
    }

    const target = message.mentions.members.first();

    if (!target) {
      return reply("👤 Menciona al usuario.");
    }

    const nickname = args.slice(1).join(" ");

    if (!nickname) {
      return reply("✏️ Escribe el nuevo apodo.");
    }

    try {
      await target.setNickname(nickname);

      return reply({
        embeds: [
          ok(`✏️ Apodo cambiado para **${target.user.tag}**.`)
        ]
      });
    } catch {
      return reply("❌ No pude cambiar el apodo.");
    }
  }

  if (command === "mute") {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return reply("❌ No tienes permiso para silenciar.");
    }

    const target = message.mentions.members.first();

    if (!target) {
      return reply("🔇 Menciona al usuario.");
    }

    try {
      await target.timeout(10 * 60 * 1000, "Mute mediante Joshua");

      return reply({
        embeds: [
          ok(`🔇 **${target.user.tag}** fue silenciado durante **10 minutos**.`)
        ]
      });
    } catch {
      return reply("❌ No pude silenciar a ese usuario.");
    }
  }

  if (command === "unmute") {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return reply("❌ No tienes permiso para quitar silencios.");
    }

    const target = message.mentions.members.first();

    if (!target) {
      return reply("🔊 Menciona al usuario.");
    }

    try {
      await target.timeout(null, "Mute retirado mediante Joshua");

      return reply({
        embeds: [
          ok(`🔊 **${target.user.tag}** ya no está silenciado.`)
        ]
      });
    } catch {
      return reply("❌ No pude quitar el silencio.");
    }
  }
});

/* =========================
   SELECT MENU
========================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId !== "help_menu") return;

  const category = interaction.values[0];

  const texts = {
    ia:
      "🤖 **IA**\n\n" +
      "`p.r <pregunta>` — Pregúntale a Joshua AI.\n" +
      "`p.chatgpt <pregunta>` — Mismo sistema.",

    economy:
      "💰 **Economía**\n\n" +
      "`p.balance`\n" +
      "`p.daily`\n" +
      "`p.work`\n" +
      "`p.crimen`\n" +
      "`p.dep`\n" +
      "`p.with`\n" +
      "`p.pay`\n" +
      "`p.profile`",

    fun:
      "🎮 **Diversión**\n\n" +
      "`p.coinflip`\n" +
      "`p.dado`\n" +
      "`p.random`\n" +
      "`p.choose`\n" +
      "`p.8ball`\n" +
      "`p.joke`\n" +
      "`p.rps`",

    social:
      "👥 **Social**\n\n" +
      "`p.highfive @usuario`\n" +
      "`p.compliment @usuario`\n" +
      "`p.say texto`\n" +
      "`p.userinfo @usuario`",

    mod:
      "🛡️ **Moderación**\n\n" +
      "`p.ban @usuario`\n" +
      "`p.unban ID`\n" +
      "`p.kick @usuario`\n" +
      "`p.warn @usuario`\n" +
      "`p.purge cantidad`\n" +
      "`p.lock`\n" +
      "`p.unlock`\n" +
      "`p.slowmode segundos`\n" +
      "`p.nick @usuario apodo`\n" +
      "`p.mute @usuario`\n" +
      "`p.unmute @usuario`"
  };

  await interaction.reply({
    embeds: [
      info(texts[category] || "❌ Categoría desconocida.")
    ],
    ephemeral: true
  });
});

/* =========================
   ERRORES
========================= */

process.on("unhandledRejection", error => {
  console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("❌ Uncaught Exception:", error);
});

/* =========================
   SERVIDOR PARA RENDER
========================= */

const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("Joshua está funcionando 🤖🟢");
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Servidor iniciado en el puerto ${PORT}`);
  });

/* =========================
   LOGIN
========================= */

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ Falta DISCORD_TOKEN en las variables de Render."
  );

  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "❌ Falta OPENAI_API_KEY en las variables de Render."
  );

  process.exit(1);
}

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log("🔐 Login de Discord correcto.");
  })
  .catch(error => {
    console.error("❌ No se pudo iniciar sesión en Discord.");
    console.error(error.message);
    process.exit(1);
  });
