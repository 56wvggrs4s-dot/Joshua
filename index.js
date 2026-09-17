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

// ======================================================
// 🤖 JOSHUA BOT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

// ======================================================
// 💾 BASE DE DATOS
// ======================================================

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "{}");
}

let economy = {};

try {
  economy = JSON.parse(
    fs.readFileSync(DATA_FILE, "utf8")
  );
} catch {
  economy = {};
  fs.writeFileSync(DATA_FILE, "{}");
}

if (
  !economy ||
  typeof economy !== "object" ||
  Array.isArray(economy)
) {
  economy = {};
}

function save() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(economy, null, 2)
    );
  } catch (error) {
    console.error("❌ Error guardando datos:", error);
  }
}

// ======================================================
// 👤 USUARIO
// ======================================================

function getUser(id) {
  if (
    !economy[id] ||
    typeof economy[id] !== "object" ||
    Array.isArray(economy[id])
  ) {
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
      robWins: 0,
      robLosses: 0,
      inventory: {}
    };
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
  user.robWins = Number(user.robWins) || 0;
  user.robLosses = Number(user.robLosses) || 0;

  if (
    !user.inventory ||
    typeof user.inventory !== "object" ||
    Array.isArray(user.inventory)
  ) {
    user.inventory = {};
  }

  return user;
}

// ======================================================
// 🏰 CONFIGURACIÓN DEL SERVIDOR
// ======================================================

function getGuildConfig(guildId) {
  if (
    !economy[guildId] ||
    typeof economy[guildId] !== "object" ||
    Array.isArray(economy[guildId])
  ) {
    economy[guildId] = {
      welcomeChannel: null,
      autoRoles: [],
      autoReplies: {},
      autoReactions: {},
      rankActive: false
    };
  }

  const config = economy[guildId];

  if (!("welcomeChannel" in config)) {
    config.welcomeChannel = null;
  }

  if (
    !config.autoRoles ||
    !Array.isArray(config.autoRoles)
  ) {
    if (config.autoRole) {
      config.autoRoles = [config.autoRole];
    } else {
      config.autoRoles = [];
    }
  }

  if (
    !config.autoReplies ||
    typeof config.autoReplies !== "object"
  ) {
    config.autoReplies = {};
  }

  if (
    !config.autoReactions ||
    typeof config.autoReactions !== "object"
  ) {
    config.autoReactions = {};
  }

  if (
    typeof config.rankActive !== "boolean"
  ) {
    config.rankActive = false;
  }

  return config;
}

// ======================================================
// 💰 UTILIDADES
// ======================================================

function money(value) {
  return Number(value || 0).toLocaleString("es-ES");
}

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function ok(text) {
  return new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("╭━━━〔 ✅ JOSHUA 〕━━━╮")
    .setDescription(text)
    .setFooter({
      text: "Joshua 🤖 • Acción completada"
    })
    .setTimestamp();
}

function fail(text) {
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle("╭━━━〔 ❌ JOSHUA 〕━━━╮")
    .setDescription(text)
    .setFooter({
      text: "Joshua 🤖 • Ha ocurrido un problema"
    })
    .setTimestamp();
}

function info(text) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("╭━━━〔 🤖 JOSHUA 〕━━━╮")
    .setDescription(text)
    .setFooter({
      text: "Joshua ��� • Sistema oficial"
    })
    .setTimestamp();
}

function isAdmin(message) {
  return Boolean(
    message.member?.permissions?.has(
      PermissionFlagsBits.Administrator
    )
  );
}

// ======================================================
// ⏰ COOLDOWNS
// ======================================================

const cooldowns = new Map();

function cooldown(userId, command, seconds) {
  const key = `${userId}:${command}`;
  const now = Date.now();
  const last = cooldowns.get(key) || 0;

  const remaining =
    seconds * 1000 - (now - last);

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

// ======================================================
// 📊 RANK
// ======================================================

function rankData(userId) {
  const user = getUser(userId);

  const total =
    user.cash + user.bank;

  const xp =
    Math.floor(
      (user.messages * 2) +
      (user.commands * 3) +
      (total / 20)
    );

  const level =
    Math.floor(xp / 100) + 1;

  return {
    total,
    xp,
    level
  };
}

function guildLeaderboard(guild) {
  return [...guild.members.cache.values()]
    .filter(member => !member.user.bot)
    .map(member => ({
      member,
      ...rankData(member.id)
    }))
    .sort((a, b) => {
      if (b.level !== a.level) {
        return b.level - a.level;
      }

      return b.xp - a.xp;
    });
}

// ======================================================
// 📚 AYUDA
// ======================================================

function help(category = "main") {
  const categories = {

    main: {
      title: "╭━━━〔 📚 CENTRO DE AYUDA 〕━━━╮",
      text:
        "╭───────────────╮\n" +
        "     🤖 **JOSHUA**\n" +
        "╰───────────────╯\n\n" +

        "💰 **Economía**\n" +
        "🛒 **Tienda**\n" +
        "👤 **Perfil**\n" +
        "🎮 **Diversión**\n" +
        "👥 **Social**\n" +
        "🏰 **Servidor**\n" +
        "⚙️ **Utilidades**\n" +
        "🛡️ **Administración**\n" +
        "🤖 **Automatización**\n" +
        "🏆 **Rank**\n\n" +

        "━━━━━━━━━━━━━━━━━━━━\n" +
        "📌 Selecciona una categoría abajo."
    },

    economy: {
      title: "╭━━━〔 💰 ECONOMÍA 〕━━━╮",
      text:
        "**p.balance** — Ver tu dinero\n" +
        "**p.bank** — Ver banco y efectivo\n" +
        "**p.daily** — Recompensa diaria\n" +
        "**p.work** — Trabajar\n" +
        "**p.crimen** — Crimen ficticio\n" +
        "**p.robar @usuario** — Robo virtual\n" +
        "**p.dep cantidad** — Depositar\n" +
        "**p.with cantidad** — Retirar\n" +
        "**p.pay @usuario cantidad** — Enviar dinero\n" +
        "**p.gift @usuario cantidad** — Regalar dinero\n" +
        "**p.leaderboard** — Ranking de dinero\n" +
        "**p.top** — Top de dinero\n" +
        "**p.bonus** — Bonus periódico"
    },

    shop: {
      title: "╭━━━〔 🛒 TIENDA 〕━━━╮",
      text:
        "**p.shop** — Ver tienda\n" +
        "**p.buy objeto cantidad** — Comprar\n" +
        "**p.inventory** — Ver inventario\n" +
        "**p.inv** — Ver inventario\n" +
        "**p.sell objeto cantidad** — Vender"
    },

    profile: {
      title: "╭━━━〔 👤 PERFIL 〕━━━╮",
      text:
        "**p.profile** — Ver perfil\n" +
        "**p.stats** — Estadísticas\n" +
        "**p.userinfo @usuario** — Información\n" +
        "**p.whois @usuario** — Información\n" +
        "**p.avatar @usuario** — Ver avatar\n" +
        "**p.rank** — Ver tu rango"
    },

    fun: {
      title: "╭━━━〔 🎮 DIVERSIÓN 〕━━━╮",
      text:
        "**p.coinflip** — Lanzar moneda\n" +
        "**p.dado** — Tirar dado\n" +
        "**p.random 1 100** — Número aleatorio\n" +
        "**p.choose uno dos** — Joshua elige\n" +
        "**p.8ball pregunta** — Bola mágica\n" +
        "**p.rps piedra** — Piedra, papel o tijera\n" +
        "**p.reverse texto** — Texto al revés\n" +
        "**p.joke** — Chiste\n" +
        "**p.rate texto** — Valoración divertida\n" +
        "**p.ship @usuario @usuario** — Compatibilidad ficticia"
    },

    social: {
      title: "��━━━〔 👥 SOCIAL 〕━━━╮",
      text:
        "**p.highfive @usuario** — Chocar los cinco\n" +
        "**p.compliment @usuario** — Elogiar\n" +
        "**p.userinfo @usuario** — Información\n" +
        "**p.whois @usuario** — Información\n" +
        "**p.avatar @usuario** — Ver avatar\n" +
        "**p.membercount** — Ver miembros"
    },

    server: {
      title: "╭━━━〔 🏰 SERVIDOR 〕━━━╮",
      text:
        "**p.serverinfo** — Información\n" +
        "**p.servericon** — Icono del servidor\n" +
        "**p.channels** — Canales\n" +
        "**p.roles** — Roles\n" +
        "**p.emojis** — Emojis\n" +
        "**p.boosts** — Boosts\n" +
        "**p.membercount** — Miembros\n" +
        "**p.created** — Fecha de creación"
    },

    utility: {
      title: "╭━━━〔 ⚙️ UTILIDADES 〕━━━╮",
      text:
        "**p.ping** — Ver ping\n" +
        "**p.help** — Menú de ayuda\n" +
        "**p.created @usuario** — Fecha de creación\n" +
        "**p.uptime** — Tiempo activo\n" +
        "**p.botinfo** — Información de Joshua\n" +
        "**p.emoji** — Información de emoji"
    },

    admin: {
      title: "╭━━━〔 🛡️ ADMINISTRACIÓN 〕━━━╮",
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
        "**p.nick @usuario nombre** — Cambiar apodo\n" +
        "**p.addrole @usuario @rol** — Añadir rol\n" +
        "**p.removerole @usuario @rol** — Quitar rol\n" +
        "**p.say texto** — Hablar como Joshua"
    },

    automation: {
      title: "╭━━━〔 🤖 AUTOMATIZACIÓN 〕━━━╮",
      text:
        "⚠️ **Solo administradores**\n\n" +

        "👋 **Bienvenidas**\n" +
        "**p.bienvenidas #canal**\n" +
        "**p.bienvenidas off**\n\n" +

        "🎭 **Autorroles**\n" +
        "**p.autorroles add @rol**\n" +
        "**p.autorroles remove @rol**\n" +
        "**p.autorroles lista**\n" +
        "**p.autorroles off**\n\n" +

        "💬 **Autorespuestas**\n" +
        "**p.autorespuestas agregar hola | respuesta**\n" +
        "**p.autorespuestas quitar hola**\n" +
        "**p.autorespuestas lista**\n\n" +

        "⭐ **Autoreacciones**\n" +
        "**p.autoreacciones agregar hola | 👋**\n" +
        "**p.autoreacciones quitar hola**\n" +
        "**p.autoreacciones lista**"
    },

    rank: {
      title: "╭━━━〔 🏆 RANK 〕━━━╮",
      text:
        "⚠️ **Un administrador debe activar el sistema.**\n\n" +
        "**p.rank active** — Activar Rank\n" +
        "**p.rank off** — Desactivar Rank\n" +
        "**p.rank** — Ver tu Rank\n" +
        "**p.rank @usuario** — Ver Rank\n" +
        "**p.rank top** — Ver Top Rank"
    }
  };

  const data =
    categories[category] ||
    categories.main;

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(data.title)
    .setDescription(data.text)
    .setFooter({
      text: "Joshua 🤖 • p.help"
    })
    .setTimestamp();
}

function helpMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("joshua_help")
        .setPlaceholder(
          "📚 Selecciona una categoría"
        )
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
          },
          {
            label: "Automatización",
            value: "automation",
            emoji: "🤖"
          },
          {
            label: "Rank",
            value: "rank",
            emoji: "🏆"
          }
        ])
    );
}

// ======================================================
// 🛒 TIENDA
// ======================================================

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
  },

  gaming: {
    name: "🎮 Consola Gaming",
    price: 7500
  },

  trophy: {
    name: "🏆 Trofeo",
    price: 10000
  }
};

// ======================================================
// 👋 BIENVENIDAS
// ======================================================

client.on(
  "guildMemberAdd",
  async member => {
    try {
      const config =
        getGuildConfig(
          member.guild.id
        );

      // 🎭 AUTORROLES
      for (
        const roleId of config.autoRoles
      ) {
        const role =
          member.guild.roles.cache.get(
            roleId
          );

        if (
          role &&
          !role.managed &&
          role.editable
        ) {
          await member.roles
            .add(
              role,
              "Autorol de Joshua"
            )
            .catch(() => {});
        }
      }

      // 👋 BIENVENIDA
      if (config.welcomeChannel) {
        const channel =
          member.guild.channels.cache.get(
            config.welcomeChannel
          );

        if (
          channel &&
          channel.isTextBased()
        ) {
          const welcomeEmbed =
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(
                "╭━━━〔 👋 ¡BIENVENIDO/A! 〕━━━╮"
              )
              .setDescription(
                `🎉 ¡Qué alegría tenerte aquí, ${member}!\n\n` +
                `👤 **Usuario:** ${member.user.username}\n` +
                `🏰 **Servidor:** ${member.guild.name}\n\n` +
                "━━━━━━━━━━━━━━━━━━━━\n" +
                "📚 Lee las reglas del servidor.\n" +
                "💬 ¡Pásalo genial con la comunidad!\n" +
                "🤖 Si necesitas algo, puedes usar **p.help**.\n\n" +
                "✨ ¡Disfruta tu estancia!"
              )
              .setThumbnail(
                member.user.displayAvatarURL({
                  size: 256
                })
              )
              .setFooter({
                text:
                  `${member.guild.name} • Joshua 🤖`
              })
              .setTimestamp();

          await channel.send({
            content:
              `👋 ¡Bienvenido/a ${member}! 🎉`,
            embeds: [welcomeEmbed]
          });
        }
      }

      save();
    } catch (error) {
      console.error(
        "❌ Error en bienvenida/autorol:",
        error
      );
    }
  }
);

// ======================================================
// 💬 MENSAJES
// ======================================================

client.on(
  "messageCreate",
  async message => {
    try {
      if (
        message.author.bot ||
        !message.guild
      ) {
        return;
      }

      const user =
        getUser(
          message.author.id
        );

      user.messages++;
      save();

      const rawContent =
        message.content.trim();

      const content =
        rawContent.toLowerCase();

      const config =
        getGuildConfig(
          message.guild.id
        );

      // ==================================================
      // 🤖 AUTORESPUESTAS
      // ==================================================

      if (
        !content.startsWith(PREFIX)
      ) {
        for (
          const [trigger, response]
          of Object.entries(
            config.autoReplies
          )
        ) {
          if (
            content ===
            trigger.toLowerCase()
          ) {
            await message.reply({
              content: response,
              allowedMentions: {
                repliedUser: false
              }
            });

            break;
          }
        }

        // ==================================================
        // ⭐ AUTOREACCIONES
        // ==================================================

        for (
          const [trigger, emoji]
          of Object.entries(
            config.autoReactions
          )
        ) {
          if (
            content ===
            trigger.toLowerCase()
          ) {
            await message
              .react(emoji)
              .catch(() => {});

            break;
          }
        }

        // ==================================================
        // 💬 RESPUESTAS NORMALES
        // ==================================================

        if (
          content.includes(
            "hola joshua"
          )
        ) {
          return message.reply(
            "👋 ¡Holaaa! Soy Joshua 🤖🔥"
          );
        }

        if (
          content === "buenas"
        ) {
          return message.reply(
            "😎 ¡Buenas! ¿Qué tal?"
          );
        }

        if (
          content.includes(
            "te quiero joshua"
          )
        ) {
          return message.react(
            "❤️"
          ).catch(() => {});
        }

        if (
          content.includes(
            "joshua god"
          ) ||
          content.includes(
            "joshua goat"
          )
        ) {
          return message.react(
            "🔥"
          ).catch(() => {});
        }

        return;
      }

      // ==================================================
      // 🧩 PARSEAR COMANDO
      // ==================================================

      const args =
        rawContent
          .slice(PREFIX.length)
          .trim()
          .split(/\s+/)
          .filter(Boolean);

      const command =
        (
          args.shift() ||
          ""
        ).toLowerCase();

      if (!command) {
        return;
      }

      user.commands++;
      save();

      const reply = payload => {
        if (
          typeof payload === "string"
        ) {
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

      // ==================================================
      // 📚 HELP
      // ==================================================

      if (
        command === "help" ||
        command === "ayuda"
      ) {
        return reply({
          embeds: [
            help()
          ],
          components: [
            helpMenu()
          ]
        });
      }

      // ==================================================
      // 🏓 PING
      // ==================================================

      if (
        command === "ping"
      ) {
        return reply({
          embeds: [
            info(
              `🏓 **Ping:** ${client.ws.ping}ms\n\n` +
              "🟢 Joshua está conectado.\n" +
              "⚡ Sistema funcionando correctamente."
            )
          ]
        });
      }

      // ==================================================
      // 💰 ECONOMÍA
      // ==================================================

      if (
        command === "balance" ||
        command === "bal"
      ) {
        return reply({
          embeds: [
            info(
              `💵 **Efectivo:** ${money(user.cash)} 🪙\n` +
              `🏦 **Banco:** ${money(user.bank)} 🪙\n` +
              `💎 **Total:** ${money(
                user.cash +
                user.bank
              )} 🪙`
            )
          ]
        });
      }

      if (
        command === "bank"
      ) {
        return reply({
          embeds: [
            info(
              `🏦 **Banco:** ${money(user.bank)} 🪙\n` +
              `💵 **Efectivo:** ${money(user.cash)} 🪙\n\n` +
              "📌 Usa **p.dep all** o **p.with all**."
            )
          ]
        });
      }

      // ==================================================
      // 🎁 DAILY / WORK / CRIMEN
      // ==================================================

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

        const cd =
          cooldown(
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

        if (
          command === "daily"
        ) {
          user.cash += 1000;
          user.wins++;
          user.daily++;

          save();

          return reply({
            embeds: [
              ok(
                "🎁 Recibiste **1.000 🪙** por tu recompensa diaria."
              )
            ]
          });
        }

        if (
          command === "work"
        ) {
          const amount =
            random(10, 150);

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

        if (
          Math.random() < 0.2
        ) {
          const amount =
            random(300, 500);

          user.cash += amount;
          user.wins++;
          user.crime++;

          save();

          return reply({
            embeds: [
              ok(
                `🕵️ Crimen ficticio exitoso.\n\n` +
                `💰 Ganaste **${money(amount)} 🪙**.`
              )
            ]
          });
        }

        const amount =
          Math.min(
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
              `🚔 Crimen ficticio fallido.\n\n` +
              `��� Perdiste **${money(amount)} 🪙**.`
            )
          ]
        });
      }

      // ==================================================
      // 🕵️ ROBO VIRTUAL
      // ==================================================

      if (
        command === "robar" ||
        command === "rob"
      ) {
        const target =
          message.mentions.users.first();

        if (
          !target ||
          target.bot ||
          target.id ===
            message.author.id
        ) {
          return reply({
            embeds: [
              fail(
                "🕵️ Menciona a otro usuario válido."
              )
            ]
          });
        }

        const cd =
          cooldown(
            message.author.id,
            "robar",
            120
          );

        if (cd) {
          return reply({
            embeds: [
              fail(
                `⏰ Espera **${left(cd)}** para volver a intentarlo.`
              )
            ]
          });
        }

        const victim =
          getUser(target.id);

        if (
          victim.cash < 100
        ) {
          return reply({
            embeds: [
              fail(
                "💸 Ese usuario no tiene suficiente efectivo virtual."
              )
            ]
          });
        }

        if (
          Math.random() < 0.5
        ) {
          const amount =
            random(
              50,
              Math.min(
                victim.cash,
                500
              )
            );

          victim.cash -= amount;
          user.cash += amount;

          user.robWins++;

          save();

          return reply({
            embeds: [
              ok(
                `🕵️ **¡Robo virtual exitoso!**\n\n` +
                `💰 Conseguíste **${money(amount)} 🪙** de ${target}.`
              )
            ]
          });
        }

        user.robLosses++;

        const fine =
          Math.min(
            user.cash,
            random(25, 150)
          );

        user.cash -= fine;

        save();

        return reply({
          embeds: [
            fail(
              `🚨 **¡Te atraparon!**\n\n` +
              `💸 Perdiste **${money(fine)} 🪙**.`
            )
          ]
        });
      }

      // ==================================================
      // 🎁 BONUS
      // ======================================================

      if (
        command === "bonus"
      ) {
        const cd =
          cooldown(
            message.author.id,
            "bonus",
            43200
          );

        if (cd) {
          return reply({
            embeds: [
              fail(
                `⏰ Ya reclamaste tu bonus. Espera **${left(cd)}**.`
              )
            ]
          });
        }

        const amount =
          random(100, 500);

        user.cash += amount;

        save();

        return reply({
          embeds: [
            ok(
              `🎁 **BONUS ESPECIAL**\n\n` +
              `💰 Recibiste **${money(amount)} 🪙**.`
            )
          ]
        });
      }

      // ==================================================
      // 🏦 BANCO
      // ==================================================

      if (
        command === "dep" ||
        command === "deposit" ||
        command === "with" ||
        command === "withdraw"
      ) {
        const withdraw =
          command === "with" ||
          command === "withdraw";

        const arg =
          (
            args[0] ||
            ""
          ).toLowerCase();

        const amount =
          arg === "all"
            ? withdraw
              ? user.bank
              : user.cash
            : Number(arg);

        const source =
          withdraw
            ? user.bank
            : user.cash;

        if (
          !Number.isSafeInteger(
            amount
          ) ||
          amount <= 0
        ) {
          return reply({
            embeds: [
              fail(
                `Usa **p.${command} cantidad** o **p.${command} all**.`
              )
            ]
          });
        }

        if (
          amount > source
        ) {
          return reply({
            embeds: [
              fail(
                "💸 No tienes fondos suficientes."
              )
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
              `${withdraw ? "📤 Retiraste" : "📥 Depositaste"} **${money(amount)} 🪙**.`
            )
          ]
        });
      }

      // ==================================================
      // 🎁 PAY / GIFT
      // ==================================================

      if (
        command === "pay" ||
        command === "gift" ||
        command === "give"
      ) {
        const target =
          message.mentions.users.first();

        const amount =
          Number(
            args.find(
              x =>
                /^\d+$/.test(x)
            )
          );

        if (
          !target ||
          target.id ===
            message.author.id ||
          target.bot ||
          !Number.isSafeInteger(
            amount
          ) ||
          amount <= 0
        ) {
          return reply({
            embeds: [
              fail(
                `Uso: **p.${command} @usuario cantidad**`
              )
            ]
          });
        }

        if (
          user.cash < amount
        ) {
          return reply({
            embeds: [
              fail(
                "💸 No tienes suficiente efectivo."
              )
            ]
          });
        }

        const targetUser =
          getUser(target.id);

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

      // ==================================================
      // 🏆 LEADERBOARD
      // ==================================================

      if (
        command === "leaderboard" ||
        command === "top"
      ) {
        const members =
          await message.guild.members
            .fetch()
            .catch(
              () =>
                message.guild.members.cache
            );

        const list =
          [...members.values()]
            .filter(
              member =>
                !member.user.bot
            )
            .map(
              member => ({
                member,
                total:
                  getUser(
                    member.id
                  ).cash +
                  getUser(
                    member.id
                  ).bank
              })
            )
            .sort(
              (a, b) =>
                b.total - a.total
            )
            .slice(0, 10);

        const text =
          list
            .map(
              (item, index) =>
                `**${index + 1}.** ${item.member.user.username} • **${money(item.total)} 🪙**`
            )
            .join("\n") ||
          "No hay usuarios todavía.";

        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xF1C40F)
              .setTitle(
                "╭━━━〔 🏆 LEADERBOARD 〕━━━╮"
              )
              .setDescription(
                `💰 **TOP DE DINERO**\n\n${text}`
              )
              .setTimestamp()
          ]
        });
      }

      // ==================================================
      // 👤 PERFIL
      // ======================================================
      if (
        command === "profile"
      ) {
        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(
                "╭━━━〔 👤 PERFIL 〕━━━╮"
              )
              .setThumbnail(
                message.author.displayAvatarURL()
              )
              .setDescription(
                `👤 **Usuario:** ${message.author.username}\n\n` +
                `💵 **Efectivo:** ${money(user.cash)} 🪙\n` +
                `🏦 **Banco:** ${money(user.bank)} 🪙\n` +
                `���� **Total:** ${money(user.cash + user.bank)} 🪙\n` +
                `🏆 **Victorias:** ${user.wins}\n` +
                `💔 **Derrotas:** ${user.losses}\n` +
                `💬 **Mensajes:** ${user.messages}\n` +
                `⚙️ **Comandos:** ${user.commands}\n` +
                `🕵️ **Robos exitosos:** ${user.robWins}\n` +
                `🚨 **Robos fallidos:** ${user.robLosses}`
              )
              .setFooter({
                text: "Joshua 🤖 • Perfil"
              })
              .setTimestamp()
          ]
        });
      }

      // ==================================================
      // 📊 STATS
      // ======================================================

      if (
        command === "stats"
      ) {
        return reply({
          embeds: [
            info(
              `📊 **ESTADÍSTICAS**\n\n` +
              `🎁 Daily: **${user.daily}**\n` +
              `💼 Trabajo: **${user.work}**\n` +
              `🕵️ Crimen ficticio: **${user.crime}**\n` +
              `🏆 Victorias: **${user.wins}**\n` +
              `💔 Derrotas: **${user.losses}**\n` +
              `🕵️ Robos exitosos: **${user.robWins}**\n` +
              `🚨 Robos fallidos: **${user.robLosses}**\n` +
              `💬 Mensajes: **${user.messages}**\n` +
              `⚙️ Comandos: **${user.commands}**`
            )
          ]
        });
      }

      // ==================================================
      // 🛒 TIENDA
      // ======================================================

      if (
        command === "shop" ||
        command === "tienda"
      ) {
        let text = "";

        for (
          const [id, item]
          of Object.entries(
            shopItems
          )
        ) {
          text +=
            `🛍️ **${id}**\n` +
            `   ${item.name} • **${money(item.price)} 🪙**\n\n`;
        }

        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setTitle(
                "╭━━━〔 🛒 TIENDA DE JOSHUA 〕━━━╮"
              )
              .setDescription(text)
              .setFooter({
                text:
                  "Joshua 🤖 • Usa p.buy objeto cantidad"
              })
          ]
        });
      }

      if (
        command === "buy" ||
        command === "comprar"
      ) {
        const itemId =
          (
            args[0] ||
            ""
          ).toLowerCase();

        const quantity =
          Math.max(
            1,
            Number(args[1]) || 1
          );

        const item =
          shopItems[itemId];

        if (!item) {
          return reply({
            embeds: [
              fail(
                "❌ Ese objeto no existe. Usa **p.shop**."
              )
            ]
          });
        }

        if (
          !Number.isSafeInteger(
            quantity
          ) ||
          quantity <= 0 ||
          quantity > 100
        ) {
          return reply({
            embeds: [
              fail(
                "❌ La cantidad debe estar entre 1 y 100."
              )
            ]
          });
        }

        const total =
          item.price *
          quantity;

        if (
          user.cash < total
        ) {
          return reply({
            embeds: [
              fail(
                "💸 No tienes suficiente dinero."
              )
            ]
          });
        }

        user.cash -= total;

        if (
          !user.inventory[itemId]
        ) {
          user.inventory[itemId] = 0;
        }

        user.inventory[itemId] +=
          quantity;

        save();

        return reply({
          embeds: [
            ok(
              `🛒 Compraste **${quantity}x ${item.name}**\n\n` +
              `💰 Precio: **${money(total)} 🪙**`
            )
          ]
        });
      }

      if (
        command === "inventory" ||
        command === "inv"
      ) {
        const entries =
          Object.entries(
            user.inventory
          ).filter(
            ([, amount]) =>
              amount > 0
          );

        if (!entries.length) {
          return reply({
            embeds: [
              info(
                "🎒 Tu inventario está vacío."
              )
            ]
          });
        }

        let text = "";

        for (
          const [id, amount]
          of entries
        ) {
          text +=
            `${shopItems[id]?.name || id}: **${amount}**\n`;
        }

        return reply({
          embeds: [
            info(
              `🎒 **TU INVENTARIO**\n\n${text}`
            )
          ]
        });
      }

      if (
        command === "sell" ||
        command === "vender"
      ) {
        const itemId =
          (
            args[0] ||
            ""
          ).toLowerCase();

        const quantity =
          Math.max(
            1,
            Number(args[1]) || 1
          );

        const item =
          shopItems[itemId];

        if (!item) {
          return reply({
            embeds: [
              fail(
                "❌ Ese objeto no existe."
              )
            ]
          });
        }

        if (
          (user.inventory[itemId] || 0) <
          quantity
        ) {
          return reply({
            embeds: [
              fail(
                "🎒 No tienes suficientes unidades."
              )
            ]
          });
        }

        const total =
          Math.floor(
            (item.price *
              quantity) /
              2
          );

        user.inventory[itemId] -=
          quantity;

        user.cash += total;

        save();

        return reply({
          embeds: [
            ok(
              `💰 Vendiste **${quantity}x ${item.name}**\n\n` +
              `🪙 Recibiste **${money(total)} 🪙**.`
            )
          ]
        });
      }

      // ==================================================
      // 🎮 DIVERSIÓN
      // ==================================================

      if (
        command === "coinflip" ||
        command === "flip"
      ) {
        const result =
          Math.random() < 0.5
            ? "🪙 Cara"
            : "🪙 Cruz";

        return reply({
          embeds: [
            info(
              `🪙 Salió **${result}**.`
            )
          ]
        });
      }

      if (
        command === "dado" ||
        command === "dice"
      ) {
        return reply({
          embeds: [
            info(
              `🎲 Tiraste el dado y salió **${random(1, 6)}**.`
            )
          ]
        });
      }

      if (
        command === "random"
      ) {
        const min =
          Number(args[0]) || 1;

        const max =
          Number(args[1]) || 100;

        if (
          !Number.isFinite(min) ||
          !Number.isFinite(max) ||
          min >= max
        ) {
          return reply({
            embeds: [
              fail(
                "Usa **p.random 1 100**."
              )
            ]
          });
        }

        return reply({
          embeds: [
            info(
              `🎲 **Número aleatorio:**\n\n# ${random(min, max)}`
            )
          ]
        });
      }

      if (
        command === "choose"
      ) {
        if (
          args.length < 2
        ) {
          return reply({
            embeds: [
              fail(
                "Usa **p.choose opción1 opción2**."
              )
            ]
          });
        }

        const choice =
          args[
            Math.floor(
              Math.random() *
                args.length
            )
          ];

        return reply({
          embeds: [
            info(
              `🤔 Joshua eligió: **${choice}**`
            )
          ]
        });
      }

      if (
        command === "8ball"
      ) {
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
              `🎱 ${
                answers[
                  Math.floor(
                    Math.random() *
                      answers.length
                  )
                ]
              }`
            )
          ]
        });
      }

      if (
        command === "joke"
      ) {
        const jokes = [
          "😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!",
          "🤣 ¿Qué le dijo un cero a un ocho? Bonito cinturón.",
          "😎 ¿Por qué el libro fue al médico? Porque tenía muchas páginas en blanco.",
          "😂 ¿Qué hace un pez? ¡Nada!"
        ];

        return reply({
          embeds: [
            info(
              jokes[
                Math.floor(
                  Math.random() *
                    jokes.length
                )
              ]
            )
          ]
        });
      }

      if (
        command === "rps"
      ) {
        const choices = [
          "piedra",
          "papel",
          "tijera"
        ];

        const player =
          (
            args[0] ||
            ""
          ).toLowerCase();

        if (
          !choices.includes(
            player
          )
        ) {
          return reply({
            embeds: [
              fail(
                "Usa **p.rps piedra**, **p.rps papel** o **p.rps tijera**."
              )
            ]
          });
        }

        const bot =
          choices[
            random(
              0,
              choices.length - 1
            )
          ];

        let result;

        if (
          player === bot
        ) {
          result =
            "🤝 ¡Empate!";
        } else if (
          (
            player === "piedra" &&
            bot === "tijera"
          ) ||
          (
            player === "papel" &&
            bot === "piedra"
          ) ||
          (
            player === "tijera" &&
            bot === "papel"
          )
        ) {
          result =
            "🎉 ¡Ganaste!";
        } else {
          result =
            "😅 ¡Perdiste!";
        }

        return reply({
          embeds: [
            info(
              `🎮 **Tú:** ${player}\n` +
              `🤖 **Joshua:** ${bot}\n\n` +
              result
            )
          ]
        });
      }

      if (
        command === "reverse"
      ) {
        if (!args.length) {
          return reply({
            embeds: [
              fail(
                "Usa **p.reverse texto**."
              )
            ]
          });
        }

        return reply({
          embeds: [
            info(
              `🔄 ${args.join(" ").split("").reverse().join("")}`
            )
          ]
        });
      }

      if (
        command === "rate"
      ) {
        if (!args.length) {
          return reply({
            embeds: [
              fail(
                "Usa **p.rate algo**."
              )
            ]
          });
        }

        const percentage =
          random(0, 100);

        return reply({
          embeds: [
            info(
              `📊 Joshua le da a **${args.join(" ")}** un **${percentage}%**.`
            )
          ]
        });
      }

      if (
        command === "ship"
      ) {
        const users =
          message.mentions.users;

        if (
          users.size < 2
        ) {
          return reply({
            embeds: [
              fail(
                "Menciona a dos usuarios."
              )
            ]
          });
        }

        const selected =
          [...users.values()]
            .slice(0, 2);

        const percentage =
          random(0, 100);

        return reply({
          embeds: [
            info(
              `💞 ${selected[0]} + ${selected[1]}\n\n` +
              `❤️ Compatibilidad ficticia: **${percentage}%**`
            )
          ]
        });
      }

      // ==================================================
      // 👥 SOCIAL
      // ==================================================

      if (
        command === "highfive"
      ) {
        const target =
          message.mentions.users.first();

        if (!target) {
          return reply({
            embeds: [
              fail(
                "Menciona a alguien."
              )
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

      if (
        command === "compliment"
      ) {
        const target =
          message.mentions.users.first();

        if (!target) {
          return reply({
            embeds: [
              fail(
                "Menciona a alguien."
              )
            ]
          });
        }

        const compliments = [
          "✨ ¡Tienes una energía increíble!",
          "🔥 ¡Eres una máquina!",
          "😎 ¡Qué grande eres!",
          "💎 ¡Eres genial!",
          "🚀 ¡Vas con todo!"
        ];

        return reply({
          embeds: [
            ok(
              `${target}, ${
                compliments[
                  random(
                    0,
                    compliments.length - 1
                  )
                ]
              }`
            )
          ]
        });
      }

      // ==================================================
      // 🗣️ SAY — SOLO ADMIN
      // ==================================================

      if (
        command === "say"
      ) {
        if (!isAdmin(message)) {
          return reply({
            embeds: [
              fail(
                "🛡️ **Acceso denegado.**\n\n" +
                "El comando **p.say** es exclusivamente para administradores."
              )
            ]
          });
        }

        if (!args.length) {
          return reply({
            embeds: [
              fail(
                "📝 Escribe algo para que Joshua lo diga."
              )
            ]
          });
        }

        const text =
          args.join(" ");

        await message.delete()
          .catch(() => {});

        return message.channel.send({
          content: text,
          allowedMentions: {
            parse: []
          }
        });
      }

      // ==================================================
      // 👤 USERINFO
      // ==================================================

      if (
        command === "userinfo" ||
        command === "user"
      ) {
        const target =
          message.mentions.users.first() ||
          message.author;

        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(
                `╭━━━〔 👤 ${target.username} 〕━━━╮`
              )
              .setThumbnail(
                target.displayAvatarURL()
              )
              .setDescription(
                `🆔 **ID:** ${target.id}\n` +
                `🤖 **Bot:** ${target.bot ? "Sí" : "No"}\n` +
                `📅 **Cuenta creada:** <t:${Math.floor(target.createdTimestamp / 1000)}:F>`
              )
              .setTimestamp()
          ]
        });
      }

      // ==================================================
      // 🖼️ AVATAR
      // ==================================================

      if (
        command === "avatar"
      ) {
        const target =
          message.mentions.users.first() ||
          message.author;

        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(
                `╭━━━〔 🖼️ AVATAR 〕━━━╮`
              )
              .setDescription(
                `👤 **${target.username}**`
              )
              .setImage(
                target.displayAvatarURL({
                  size: 1024
                })
              )
              .setTimestamp()
          ]
        });
      }

      if (
        command === "whois"
      ) {
        const target =
          message.mentions.users.first() ||
          message.author;

        return reply({
          embeds: [
            info(
              `👤 **Usuario:** ${target.username}\n` +
              `🆔 **ID:** ${target.id}\n` +
              `🤖 **Bot:** ${target.bot ? "Sí" : "No"}`
            )
          ]
        });
      }

      // ==================================================
      // 🏰 SERVIDOR
      // ==================================================

      if (
        command === "serverinfo"
      ) {
        const guild =
          message.guild;

        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(
                `╭━━━〔 🏰 ${guild.name} 〕━━━╮`
              )
              .setThumbnail(
                guild.iconURL()
              )
              .setDescription(
                `👥 **Miembros:** ${guild.memberCount}\n` +
                `💬 **Canales:** ${guild.channels.cache.size}\n` +
                `🎭 **Roles:** ${guild.roles.cache.size}\n` +
                `😀 **Emojis:** ${guild.emojis.cache.size}\n` +
                `🚀 **Boosts:** ${guild.premiumSubscriptionCount || 0}\n` +
                `🆔 **ID:** ${guild.id}`
              )
              .setTimestamp()
          ]
        });
      }

      if (
        command === "servericon"
      ) {
        const icon =
          message.guild.iconURL({
            size: 1024
          });

        if (!icon) {
          return reply({
            embeds: [
              fail(
                "❌ Este servidor no tiene icono."
              )
            ]
          });
        }

        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(
                "╭━━━〔 🖼️ ICONO DEL SERVIDOR 〕━━━╮"
              )
              .setImage(icon)
          ]
        });
      }

      if (
        command === "channels"
      ) {
        const channels =
          message.guild.channels.cache
            .map(
              channel =>
                `• ${channel}`
            )
            .slice(0, 50)
            .join("\n");

        return reply({
          embeds: [
            info(
              `💬 **CANALES**\n\n${channels || "Ninguno"}`
            )
          ]
        });
      }

      if (
        command === "roles"
      ) {
        const roles =
          message.guild.roles.cache
            .filter(
              role =>
                role.id !==
                message.guild.id
            )
            .map(
              role =>
                `• ${role}`
            )
            .slice(0, 50)
            .join("\n");

        return reply({
          embeds: [
            info(
              `🎭 **ROLES**\n\n${roles || "Ninguno"}`
            )
          ]
        });
      }

      if (
        command === "emojis"
      ) {
        const emojis =
          message.guild.emojis.cache
            .map(
              emoji =>
                `${emoji}`
            )
            .slice(0, 50)
            .join(" ");

        return reply({
          embeds: [
            info(
              `😀 **EMOJIS**\n\n${emojis || "Ninguno"}`
            )
          ]
        });
      }

      if (
        command === "boosts"
      ) {
        return reply({
          embeds: [
            info(
              `🚀 Este servidor tiene **${message.guild.premiumSubscriptionCount || 0} boosts**.`
            )
          ]
        });
      }

      if (
        command === "membercount"
      ) {
        return reply({
          embeds: [
            info(
              `👥 Este servidor tiene **${message.guild.memberCount} miembros**.`
            )
          ]
        });
      }

      if (
        command === "created"
      ) {
        const target =
          message.mentions.users.first() ||
          message.author;

        return reply({
          embeds: [
            info(
              `📅 La cuenta de **${target.username}** fue creada el:\n\n` +
              `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`
            )
          ]
        });
      }

      // ==================================================
      // ⚙️ UTILIDADES
      // ==================================================

      if (
        command === "uptime"
      ) {
        const seconds =
          Math.floor(
            process.uptime()
          );

        const hours =
          Math.floor(
            seconds / 3600
          );

        const minutes =
          Math.floor(
            (seconds % 3600) / 60
          );

        const secs =
          seconds % 60;

        return reply({
          embeds: [
            info(
              `⏱️ **Tiempo activo:** ${hours}h ${minutes}m ${secs}s`
            )
          ]
        });
      }

      if (
        command === "botinfo"
      ) {
        return reply({
          embeds: [
            info(
              `🤖 **JOSHUA**\n\n` +
              `📚 Prefijo: **p.**\n` +
              `⚡ Ping: **${client.ws.ping}ms**\n` +
              `🏰 Servidores: **${client.guilds.cache.size}**\n` +
              `👥 Usuarios: **${client.users.cache.size}**\n` +
              `⏱️ Activo: **${Math.floor(process.uptime())} segundos**`
            )
          ]
        });
      }

      // ==================================================
      // 🏆 RANK
      // ==================================================

      if (
        command === "rank"
      ) {
        const sub =
          (
            args[0] ||
            ""
          ).toLowerCase();

        if (
          sub === "active" ||
          sub === "on"
        ) {
          if (!isAdmin(message)) {
            return reply({
              embeds: [
                fail(
                  "🛡️ Solo un administrador puede activar el Rank."
                )
              ]
            });
          }

          config.rankActive =
            true;

          save();

          return reply({
            embeds: [
              ok(
                "🏆 **Sistema de Rank activado.**\n\n" +
                "👥 Ahora los miembros pueden usar **p.rank** y **p.rank top**."
              )
            ]
          });
        }

        if (
          sub === "off" ||
          sub === "disable"
        ) {
          if (!isAdmin(message)) {
            return reply({
              embeds: [
                fail(
                  "🛡️ Solo un administrador puede desactivar el Rank."
                )
              ]
            });
          }

          config.rankActive =
            false;

          save();

          return reply({
            embeds: [
              ok(
                "🏆 **Sistema de Rank desactivado.**"
              )
            ]
          });
        }

        if (
          sub === "status"
        ) {
          if (!isAdmin(message)) {
            return reply({
              embeds: [
                fail(
                  "🛡️ Solo administradores pueden ver el estado."
                )
              ]
            });
          }

          return reply({
            embeds: [
              info(
                `🏆 **Estado del Rank:** ${config.rankActive ? "🟢 Activo" : "🔴 Inactivo"}`
              )
            ]
          });
        }

        if (
          !config.rankActive &&
          !isAdmin(message)
        ) {
          return reply({
            embeds: [
              fail(
                "🏆 El sistema de Rank todavía no está activado."
              )
            ]
          });
        }

        if (
          sub === "top"
        ) {
          const list =
            guildLeaderboard(
              message.guild
            )
              .slice(0, 10);

          const text =
            list
              .map(
                (item, index) =>
                  `**${index + 1}.** ${item.member.user.username} • Nivel **${item.level}** • **${item.xp} XP**`
              )
              .join("\n") ||
            "No hay datos.";

          return reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(
                  "╭━━━〔 🏆 TOP RANK 〕━━━╮"
                )
                .setDescription(
                  text
                )
                .setTimestamp()
            ]
          });
        }

        const target =
          message.mentions.users.first() ||
          message.author;

        const data =
          rankData(
            target.id
          );

        const leaderboard =
          guildLeaderboard(
            message.guild
          );

        const position =
          leaderboard.findIndex(
            item =>
              item.member.id ===
              target.id
          ) + 1;

        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xF1C40F)
              .setTitle(
                `╭━━━〔 🏆 RANK DE ${target.username} 〕━━━╮`
              )
              .setThumbnail(
                target.displayAvatarURL()
              )
              .setDescription(
                `⭐ **Nivel:** ${data.level}\n` +
                `✨ **XP:** ${data.xp}\n` +
                `💰 **Dinero:** ${money(data.total)} 🪙\n` +
                `📊 **Posición:** #${position || "?"}`
              )
              .setTimestamp()
          ]
        });
      }

      // ==================================================
      // 🤖 AUTOMATIZACIÓN — SOLO ADMIN
      // ==================================================

      const automationCommands = [
        "bienvenidas",
        "autorroles",
        "autorespuestas",
        "autoreacciones"
      ];

      if (
        automationCommands.includes(
          command
        )
      ) {
        if (!isAdmin(message)) {
          return reply({
            embeds: [
              fail(
                "🛡️ **Acceso denegado.**\n\n" +
                "Este comando es exclusivamente para administradores."
              )
            ]
          });
        }
      }

      // ==================================================
      // 👋 BIENVENIDAS
      // ==================================================

      if (
        command === "bienvenidas"
      ) {
        const option =
          (
            args[0] ||
            ""
          ).toLowerCase();

        if (
          option === "off"
        ) {
          config.welcomeChannel =
            null;

          save();

          return reply({
            embeds: [
              ok(
                "👋 **Sistema de bienvenidas desactivado.**"
              )
            ]
          });
        }

        const channel =
          message.mentions.channels.first();

        if (!channel) {
          return reply({
            embeds: [
              fail(
                "Uso:\n\n" +
                "**p.bienvenidas #canal**\n" +
                "**p.bienvenidas off**"
              )
            ]
          });
        }

        config.welcomeChannel =
          channel.id;

        save();

        return reply({
          embeds: [
            ok(
              `👋 **Bienvenidas configuradas.**\n\n` +
              `📢 Canal: ${channel}\n\n` +
              "✨ Joshua enviará automáticamente una bienvenida cuando entre un nuevo miembro."
            )
          ]
        });
      }

      // ==================================================
      // 🎭 AUTOROLES
      // ==================================================

      if (
        command === "autorroles"
      ) {
        const action =
          (
            args[0] ||
            ""
          ).toLowerCase();

        if (
          action === "off"
        ) {
          config.autoRoles = [];

          save();

          return reply({
            embeds: [
              ok(
                "🎭 **Sistema de autoroles desactivado.**"
              )
            ]
          });
        }

        if (
          action === "lista" ||
          action === "list"
        ) {
          const roles =
            config.autoRoles
              .map(
                id =>
                  message.guild.roles.cache.get(id)
              )
              .filter(Boolean);

          return reply({
            embeds: [
              info(
                `🎭 **AUTORROLES CONFIGURADOS**\n\n` +
                (
                  roles.length
                    ? roles
                        .map(
                          role =>
                            `• ${role}`
                        )
                        .join("\n")
                    : "Ninguno"
                )
              )
            ]
          });
        }

        const role =
          message.mentions.roles.first();

        if (
          action === "add" ||
          action === "agregar"
        ) {
          if (!role) {
            return reply({
              embeds: [
                fail(
                  "Uso: **p.autorroles add @rol**"
                )
              ]
            });
          }

          if (
            role.id ===
            message.guild.id
          ) {
            return reply({
              embeds: [
                fail(
                  "❌ No puedes utilizar @everyone como autorol."
                )
              ]
            });
          }

          if (
            role.managed ||
            !role.editable
          ) {
            return reply({
              embeds: [
                fail(
                  "❌ Joshua no puede asignar ese rol."
                )
              ]
            });
          }

          if (
            role.position >=
            message.guild.members.me.roles.highest.position
          ) {
            return reply({
              embeds: [
                fail(
                  "❌ Ese rol está por encima del rol de Joshua."
                )
              ]
            });
          }

          if (
            !config.autoRoles.includes(
              role.id
            )
          ) {
            config.autoRoles.push(
              role.id
            );
          }

          save();

          return reply({
            embeds: [
              ok(
                `🎭 **Autorol añadido.**\n\n` +
                `👤 Los nuevos miembros recibirán: ${role}`
              )
            ]
          });
        }

        if (
          action === "remove" ||
          action === "quitar"
        ) {
          if (!role) {
            return reply({
              embeds: [
                fail(
                  "Uso: **p.autorroles remove @rol**"
                )
              ]
            });
          }

          config.autoRoles =
            config.autoRoles.filter(
              id =>
                id !== role.id
            );

          save();

          return reply({
            embeds: [
              ok(
                `🗑️ **Autorol eliminado:** ${role}`
              )
            ]
          });
        }

        if (role) {
          if (
            role.managed ||
            !role.editable
          ) {
            return reply({
              embeds: [
                fail(
                  "❌ Joshua no puede asignar ese rol."
                )
              ]
            });
          }

          if (
            role.position >=
            message.guild.members.me.roles.highest.position
          ) {
            return reply({
              embeds: [
                fail(
                  "❌ Ese rol está por encima del rol de Joshua."
                )
              ]
            });
          }

          if (
            !config.autoRoles.includes(
              role.id
            )
          ) {
            config.autoRoles.push(
              role.id
            );
          }

          save();

          return reply({
            embeds: [
              ok(
                `🎭 **Autorol configurado:** ${role}`
              )
            ]
          });
        }

        return reply({
          embeds: [
            fail(
              "Uso:\n\n" +
              "**p.autorroles add @rol**\n" +
              "**p.autorroles remove @rol**\n" +
              "**p.autorroles lista**\n" +
              "**p.autorroles off**"
            )
          ]
        });
      }

      // ==================================================
      // 💬 AUTORESPUESTAS
      // ==================================================

      if (
        command === "autorespuestas"
      ) {
        const action =
          (
            args.shift() ||
            ""
          ).toLowerCase();

        if (
          action === "lista"
        ) {
          const entries =
            Object.entries(
              config.autoReplies
            );

          if (
            !entries.length
          ) {
            return reply({
              embeds: [
                info(
                  "💬 No hay autorespuestas configuradas."
                )
              ]
            });
          }

          let text = "";

          for (
            const [
              trigger,
              response
            ] of entries
          ) {
            text +=
              `🔹 **${trigger}** → ${response}\n`;
          }

          return reply({
            embeds: [
              info(
                `💬 **AUTORESPUESTAS CONFIGURADAS**\n\n${text}`
              )
            ]
          });
        }

        if (
          action === "quitar"
        ) {
          const trigger =
            args.join(" ")
              .trim()
              .toLowerCase();

          if (!trigger) {
            return reply({
              embeds: [
                fail(
                  "Uso: **p.autorespuestas quitar hola**"
                )
              ]
            });
          }

          if (
            !config.autoReplies[
              trigger
            ]
          ) {
            return reply({
              embeds: [
                fail(
                  "❌ No existe una autorespuesta con ese nombre."
                )
              ]
            });
          }

          delete config.autoReplies[
            trigger
          ];

          save();

          return reply({
            embeds: [
              ok(
                `🗑️ Autorespuesta **${trigger}** eliminada.`
              )
            ]
          });
        }

        if (
          action === "agregar"
        ) {
          const full =
            args.join(" ");

          const separator =
            full.indexOf("|");

          if (
            separator === -1
          ) {
            return reply({
              embeds: [
                fail(
                  "Uso:\n\n" +
                  "**p.autorespuestas agregar hola | 👋 ¡Hola!**"
                )
              ]
            });
          }

          const trigger =
            full
              .slice(
                0,
                separator
              )
              .trim()
              .toLowerCase();

          const response =
            full
              .slice(
                separator + 1
              )
              .trim();

          if (
            !trigger ||
            !response
          ) {
            return reply({
              embeds: [
                fail(
                  "Debes colocar el disparador y la respuesta."
                )
              ]
            });
          }

          config.autoReplies[
            trigger
          ] = response;

          save();

          return reply({
            embeds: [
              ok(
                `💬 **Autorespuesta agregada.**\n\n` +
                `🔹 Disparador: **${trigger}**\n` +
                `📝 Respuesta: ${response}`
              )
            ]
          });
        }

        return reply({
          embeds: [
            fail(
              "Uso:\n\n" +
              "**p.autorespuestas agregar hola | respuesta**\n" +
              "**p.autorespuestas quitar hola**\n" +
              "**p.autorespuestas lista**"
            )
          ]
        });
      }

      // ==================================================
      // ⭐ AUTOREACCIONES
      // ==================================================

      if (
        command === "autoreacciones"
      ) {
        const action =
          (
            args.shift() ||
            ""
          ).toLowerCase();

        if (
          action === "lista"
        ) {
          const entries =
            Object.entries(
              config.autoReactions
            );

          if (
            !entries.length
          ) {
            return reply({
              embeds: [
                info(
                  "⭐ No hay autoreacciones configuradas."
                )
              ]
            });
          }

          let text = "";

          for (
            const [
              trigger,
              emoji
            ] of entries
          ) {
            text +=
              `🔹 **${trigger}** → ${emoji}\n`;
          }

          return reply({
            embeds: [
              info(
                `⭐ **AUTOREACCIONES CONFIGURADAS**\n\n${text}`
              )
            ]
          });
        }

        if (
          action === "quitar"
        ) {
          const trigger =
            args.join(" ")
              .trim()
              .toLowerCase();

          if (!trigger) {
            return reply({
              embeds: [
                fail(
                  "Uso: **p.autoreacciones quitar hola**"
                )
              ]
            });
          }

          if (
            !config.autoReactions[
              trigger
            ]
          ) {
            return reply({
              embeds: [
                fail(
                  "❌ No existe una autoreacción con ese nombre."
                )
              ]
            });
          }

          delete config.autoReactions[
            trigger
          ];

          save();

          return reply({
            embeds: [
              ok(
                `🗑️ Autoreacción **${trigger}** eliminada.`
              )
            ]
          });
        }

        if (
          action === "agregar"
        ) {
          const full =
            args.join(" ");

          const separator =
            full.indexOf("|");

          if (
            separator === -1
          ) {
            return reply({
              embeds: [
                fail(
                  "Uso:\n\n" +
                  "**p.autoreacciones agregar hola | 👋**"
                )
              ]
            });
          }

          const trigger =
            full
              .slice(
                0,
                separator
              )
              .trim()
              .toLowerCase();

          const emoji =
            full
              .slice(
                separator + 1
              )
              .trim();

          if (
            !trigger ||
            !emoji
          ) {
            return reply({
              embeds: [
                fail(
                  "Debes colocar el disparador y el emoji."
                )
              ]
            });
          }

          config.autoReactions[
            trigger
          ] = emoji;

          save();

          return reply({
            embeds: [
              ok(
                `⭐ **Autoreacción agregada.**\n\n` +
                `🔹 Disparador: **${trigger}**\n` +
                `⭐ Reacción: ${emoji}`
              )
            ]
          });
        }

        return reply({
          embeds: [
            fail(
              "Uso:\n\n" +
              "**p.autoreacciones agregar hola | 👋**\n" +
              "**p.autoreacciones quitar hola**\n" +
              "**p.autoreacciones lista**"
            )
          ]
        });
      }

      // ==================================================
      // 🛡️ ADMINISTRACIÓN
      // ==================================================

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
        "nick",
        "addrole",
        "removerole"
      ];

      if (
        adminCommands.includes(
          command
        )
      ) {
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

      // ==================================================
      // 🔨 BAN
      // ==================================================

      if (
        command === "ban"
      ) {
        const target =
          message.mentions.members.first();

        if (!target) {
          return reply({
            embeds: [
              fail(
                "Uso: **p.ban @usuario**."
              )
            ]
          });
        }

        if (
          !target.bannable
        ) {
          return reply({
            embeds: [
              fail(
                "❌ No puedo banear a ese usuario."
              )
            ]
          });
        }

        await target.ban({
          reason:
            `Ban ejecutado por ${message.author.tag}`
        });

        return reply({
          embeds: [
            ok(
              `🔨 **USUARIO BANEADO**\n\n` +
              `👤 Usuario: **${target.user.tag}**\n` +
              `👮 Moderador: **${message.author.tag}**`
            )
          ]
        });
      }

      // ==================================================
      // 🔓 UNBAN
      // ==================================================

      if (
        command === "unban"
      ) {
        const id =
          args[0];

        if (!id) {
          return reply({
            embeds: [
              fail(
                "Uso: **p.unban ID**."
              )
            ]
          });
        }

        try {
          await message.guild.members.unban(
            id
          );

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

      // ==================================================
      // 👢 KICK
      // ==================================================

      if (
        command === "kick"
      ) {
        const target =
          message.mentions.members.first();

        if (!target) {
          return reply({
            embeds: [
              fail(
                "Uso: **p.kick @usuario**."
              )
            ]
          });
        }

        if (
          !target.kickable
        ) {
          return reply({
            embeds: [
              fail(
                "❌ No puedo expulsar a ese usuario."
              )
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

      // ==================================================
      // ⚠️ WARN
      // ==================================================

      if (
        command === "warn"
      ) {
        const target =
          message.mentions.users.first();

        if (!target) {
          return reply({
            embeds: [
              fail(
                "Uso: **p.warn @usuario motivo**."
              )
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
              .setTitle(
                "╭━━━〔 ⚠️ ADVERTENCIA 〕━━━╮"
              )
              .setDescription(
                `👤 **Usuario:** ${target.tag}\n` +
                `👮 **Moderador:** ${message.author.tag}\n` +
                `📝 **Motivo:** ${reason}`
              )
              .setTimestamp()
          ]
        });
      }

      // ==================================================
      // 🧹 PURGE
      // ==================================================

      if (
        command === "purge"
      ) {
        const amount =
          Number(args[0]);

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
          () =>
            msg.delete()
              .catch(() => {}),
          5000
        );

        return;
      }

      // ==================================================
      // 🔒 LOCK
      // ==================================================

      if (
        command === "lock"
      ) {
        await message.channel.permissionOverwrites.edit(
          message.guild.roles.everyone,
          {
            SendMessages: false
          }
        );

        return reply({
          embeds: [
            ok(
              "🔒 Canal bloqueado correctamente."
            )
          ]
        });
      }

      // ==================================================
      // 🔓 UNLOCK
      // ==================================================

      if (
        command === "unlock"
      ) {
        await message.channel.permissionOverwrites.edit(
          message.guild.roles.everyone,
          {
            SendMessages: null
          }
        );

        return reply({
          embeds: [
            ok(
              "🔓 Canal desbloqueado correctamente."
            )
          ]
        });
      }

      // ==================================================
      // 🐌 SLOWMODE
      // ==================================================

      if (
        command === "slowmode"
      ) {
        const seconds =
          Number(args[0]);

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

      // ==================================================
      // ✏️ NICK
      // ==================================================

      if (
        command === "nick"
      ) {
        const target =
          message.mentions.members.first();

        const nickname =
          args
            .filter(
              arg =>
                !arg.startsWith("<@")
            )
            .join(" ");

        if (
          !target ||
          !nickname
        ) {
          return reply({
            embeds: [
              fail(
                "Uso: **p.nick @usuario nuevo-nombre**."
              )
            ]
          });
        }

        if (
          !target.manageable
        ) {
          return reply({
            embeds: [
              fail(
                "❌ No puedo cambiar el apodo de ese usuario."
              )
            ]
          });
        }

        await target.setNickname(
          nickname
        );

        return reply({
          embeds: [
            ok(
              `✏️ Nuevo apodo de **${target.user.tag}**: **${nickname}**`
            )
          ]
        });
      }

      // ==================================================
      // 🎭 ADDROLE / REMOVEROLE
      // ==================================================

      if (
        command === "addrole" ||
        command === "removerole"
      ) {
        const target =
          message.mentions.members.first();

        const role =
          message.mentions.roles.first();

        if (
          !target ||
          !role
        ) {
          return reply({
            embeds: [
              fail(
                `Uso: **p.${command} @usuario @rol**`
              )
            ]
          });
        }

        if (
          role.managed ||
          !role.editable
        ) {
          return reply({
            embeds: [
              fail(
                "❌ Joshua no puede gestionar ese rol."
              )
            ]
          });
        }

        try {
          if (
            command === "addrole"
          ) {
            await target.roles.add(
              role
            );
          } else {
            await target.roles.remove(
              role
            );
          }

          return reply({
            embeds: [
              ok(
                command === "addrole"
                  ? `🎭 ${role} fue añadido a ${target}.`
                  : `🗑️ ${role} fue quitado de ${target}.`
              )
            ]
          });
        } catch {
          return reply({
            embeds: [
              fail(
                "❌ No pude modificar ese rol."
              )
            ]
          });
        }
      }

      // ==================================================
      // 🔇 MUTE
      // ==================================================

      if (
        command === "mute"
      ) {
        const target =
          message.mentions.members.first();

        if (!target) {
          return reply({
            embeds: [
              fail(
                "Uso: **p.mute @usuario**."
              )
            ]
          });
        }

        let mutedRole =
          message.guild.roles.cache.find(
            role =>
              role.name === "Muted"
          );

        if (!mutedRole) {
          mutedRole =
            await message.guild.roles.create({
              name: "Muted",
              reason:
                "Rol creado por Joshua"
            });
        }

        if (
          mutedRole.position >=
          message.guild.members.me.roles.highest.position
        ) {
          return reply({
            embeds: [
              fail(
                "❌ El rol Muted está por encima de mi rol."
              )
            ]
          });
        }

        await target.roles.add(
          mutedRole
        );

        return reply({
          embeds: [
            ok(
              `🔇 **${target.user.tag}** recibió el rol **Muted**.`
            )
          ]
        });
      }

      // ==================================================
      // 🔊 UNMUTE
      // ==================================================

      if (
        command === "unmute"
      ) {
        const target =
          message.mentions.members.first();

        if (!target) {
          return reply({
            embeds: [
              fail(
                "Uso: **p.unmute @usuario**."
              )
            ]
          });
        }

        const mutedRole =
          message.guild.roles.cache.find(
            role =>
              role.name === "Muted"
          );

        if (!mutedRole) {
          return reply({
            embeds: [
              fail(
                "❌ No existe el rol Muted."
              )
            ]
          });
        }

        await target.roles.remove(
          mutedRole
        );

        return reply({
          embeds: [
            ok(
              `🔊 Se quitó el rol **Muted** a **${target.user.tag}**.`
            )
          ]
        });
      }

      // ==================================================
      // ❓ COMANDO DESCONOCIDO
      // ==================================================

      return reply({
        embeds: [
          fail(
            `❓ No conozco el comando **${PREFIX}${command}**.\n\n` +
            "📚 Usa **p.help** para ver todos los comandos."
          )
        ]
      });

    } catch (error) {
      console.error(
        "❌ Error en messageCreate:",
        error
      );
    }
  }
);

// ======================================================
// 📚 MENÚ DE AYUDA
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.isStringSelectMenu() ||
        interaction.customId !==
          "joshua_help"
      ) {
        return;
      }

      await interaction.update({
        embeds: [
          help(
            interaction.values[0]
          )
        ],
        components: [
          helpMenu()
        ]
      });
    } catch (error) {
      console.error(
        "❌ Error en menú de ayuda:",
        error
      );
    }
  }
);

// ======================================================
// 🟢 READY
// ======================================================

client.once(
  "ready",
  () => {
    console.log(
      `🤖 Joshua está conectado como ${client.user.tag}`
    );

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log(
      "✅ Sistema iniciado correctamente."
    );

    console.log(
      "👋 Bienvenidas: ACTIVADAS"
    );

    console.log(
      "🎭 Autorroles: ACTIVADOS"
    );

    console.log(
      "💬 Autorespuestas: ACTIVADAS"
    );

    console.log(
      "⭐ Autoreacciones: ACTIVADAS"
    );

    console.log(
      "🏆 Sistema Rank: DISPONIBLE"
    );

    console.log(
      "🛡️ Administración: ACTIVADA"
    );

    console.log(
      "🌐 Servidor Render: ACTIVADO"
    );

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );
  }
);

// ======================================================
// ❌ ERRORES
// ======================================================

client.on(
  "error",
  error => {
    console.error(
      "❌ Error de Discord:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);

// ======================================================
// 🌐 SERVIDOR PARA RENDER
// ======================================================

const PORT =
  Number(process.env.PORT) || 3000;

const webServer =
  http.createServer(
    (req, res) => {
      res.writeHead(
        200,
        {
          "Content-Type":
            "text/plain; charset=utf-8"
        }
      );

      res.end(
        "Joshua está funcionando 🤖🟢"
      );
    }
  );

webServer.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `🌐 Servidor iniciado en el puerto ${PORT}`
    );
  }
);

// ======================================================
// 🔐 LOGIN
// ======================================================

if (
  !process.env.DISCORD_TOKEN
) {
  console.error(
    "❌ Falta DISCORD_TOKEN en las variables de Render."
  );

  process.exit(1);
}

client
  .login(
    process.env.DISCORD_TOKEN
  )
  .then(
    () => {
      console.log(
        "🔐 Login de Discord correcto."
      );
    }
  )
  .catch(
    error => {
      console.error(
        "❌ No se pudo iniciar sesión en Discord."
      );

      console.error(
        error.message
      );

      process.exit(1);
    }
  );
