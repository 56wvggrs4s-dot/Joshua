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
    GatewayIntentBits.GuildMembers
  ]
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

let database = {};

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

function info(text) {
  return new EmbedBuilder().setColor("Blue").setDescription(text).setTimestamp();
}

function ok(text) {
  return new EmbedBuilder().setColor("Green").setDescription(`✅ ${text}`).setTimestamp();
}

function fail(text) {
  return new EmbedBuilder().setColor("Red").setDescription(`❌ ${text}`).setTimestamp();
}

function help() {
  return new EmbedBuilder()
    .setColor("Purple")
    .setTitle("🤖 Joshua — Ayuda")
    .setDescription([
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
    ].join("\n"))
    .setFooter({ text: "Joshua 🤖" });
}

function helpMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_menu")
      .setPlaceholder("📚 Elige una categoría")
      .addOptions([
        { label: "🤖 IA", value: "ia" },
        { label: "💰 Economía", value: "economy" },
        { label: "🎮 Diversión", value: "fun" },
        { label: "👥 Social", value: "social" },
        { label: "🛡️ Moderación", value: "mod" }
      ])
  );
}

client.once("ready", () => {
  console.log(`🤖 Joshua conectado como ${client.user.tag}`);
  console.log(`🟢 Servidores: ${client.guilds.cache.size}`);
  client.user.setPresence({
    activities: [{ name: "p.help | IA 🤖", type: 0 }],
    status: "online"
  });
});

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

  const content = message.content.slice(PREFIX.length).trim();
  if (!content) return;

  const parts = content.split(/\s+/);
  const command = parts.shift().toLowerCase();
  const args = parts;
  const user = getUser(message.author.id);
  user.commands++;
  save();

  const reply = payload => message.reply(typeof payload === "string"
    ? { content: payload, allowedMentions: { repliedUser: false } }
    : { ...payload, allowedMentions: { repliedUser: false } });

  if (command === "r" || command === "chatgpt") {
    const pregunta = args.join(" ").trim();
    if (!pregunta) return reply("🤖💭 Escribe una pregunta.\n\nEjemplo: `p.r ¿Qué es un agujero negro?`");

    try {
      await message.channel.sendTyping();
      const response = await openai.responses.create({
        model: "gpt-5.6-luna",
        input: pregunta
      });
      const texto = response.output_text || "No pude generar una respuesta.";
      if (texto.length <= 1900) return reply(`🤖 **Joshua AI**\n\n${texto}`);
      const chunks = texto.match(/[\s\S]{1,1900}/g);
      for (const chunk of chunks) await message.channel.send(`🤖 **Joshua AI**\n\n${chunk}`);
      return;
    } catch (error) {
      console.error("❌ Error de OpenAI:", error);
      return reply("❌ Joshua AI tuvo un problema al responder. Inténtalo de nuevo.");
    }
  }

  if (command === "help" || command === "ayuda") return reply({ embeds: [help()], components: [helpMenu()] });
  if (command === "ping") return reply({ embeds: [info(`🏓 Ping: **${client.ws.ping}ms**\n🟢 Joshua está conectado.`)] });

  if (command === "balance" || command === "bal") return reply({ embeds: [info(`💵 Efectivo: **${money(user.cash)} 🪙**\n🏦 Banco: **${money(user.bank)} 🪙**\n💎 Total: **${money(user.cash + user.bank)} 🪙**`)] });
  if (command === "bank") return reply({ embeds: [info(`🏦 Banco: **${money(user.bank)} 🪙**\n💵 Efectivo: **${money(user.cash)} 🪙**\n\nUsa p.dep all o p.with all.`)] });

  if (command === "daily") {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    if (user.daily && now - user.daily < cooldown) {
      const hours = Math.ceil((cooldown - (now - user.daily)) / (60 * 60 * 1000));
      return reply(`⏳ Ya reclamaste tu recompensa diaria.\nVuelve en aproximadamente **${hours} hora(s)**.`);
    }
    const reward = random(500, 1500);
    user.cash += reward;
    user.daily = now;
    save();
    return reply({ embeds: [ok(`🎁 Recibiste **${money(reward)} 🪙**.\n💵 Ahora tienes **${money(user.cash)} 🪙**.`)] });
  }

  if (command === "work") {
    const jobs = ["💻 Programaste un pequeño proyecto.", "🍕 Trabajaste repartiendo pizzas.", "🎮 Probaste videojuegos durante tu turno.", "📦 Organizaste unas cajas.", "🐶 Paseaste algunos perros."];
    const reward = random(100, 500);
    user.cash += reward;
    save();
    return reply({ embeds: [ok(`${jobs[random(0, jobs.length - 1)]}\n\n💰 Ganaste **${money(reward)} 🪙**.`)] });
  }

  if (command === "crimen") {
    const result = [["😎 Salió perfecto.", 300], ["🚨 Casi te atrapan, pero escapaste.", 150], ["😂 El plan fue un desastre.", -100], ["🕶️ Joshua dice que nadie vio nada.", 250]][random(0, 3)];
    user.cash = Math.max(0, user.cash + result[1]);
    save();
    return reply({ embeds: [info(`🎭 **Crimen ficticio**\n\n${result[0]}\n${result[1] >= 0 ? "💰 Ganaste" : "💸 Perdiste"} **${money(Math.abs(result[1]))} 🪙**.`)] });
  }

  if (command === "dep" || command === "deposit" || command === "with" || command === "withdraw") {
    const withdraw = command === "with" || command === "withdraw";
    if (!args[0]) return reply(`🏦 Usa \`p.${command} <cantidad>\` o \`p.${command} all\`.`);
    const amount = args[0].toLowerCase() === "all" ? (withdraw ? user.bank : user.cash) : Number(args[0]);
    const source = withdraw ? user.bank : user.cash;
    if (!Number.isSafeInteger(amount) || amount <= 0) return reply("❌ Cantidad inválida.");
    if (amount > source) return reply("❌ No tienes fondos suficientes.");
    if (withdraw) { user.bank -= amount; user.cash += amount; } else { user.cash -= amount; user.bank += amount; }
    save();
    return reply({ embeds: [ok(`${withdraw ? "💵 Retiraste" : "🏦 Depositaste"} **${money(amount)} 🪙**.`)] });
  }

  if (command === "pay" || command === "gift") {
    const target = message.mentions.users.first();
    const amount = Number(args[1]);
    if (!target) return reply("💸 Menciona a la persona que recibirá el dinero.");
    if (target.bot) return reply("🤖 No puedes enviar dinero a un bot.");
    if (!Number.isSafeInteger(amount) || amount <= 0) return reply("💰 Escribe una cantidad válida.");
    if (amount > user.cash) return reply("❌ No tienes suficiente dinero.");
    const receiver = getUser(target.id);
    user.cash -= amount;
    receiver.cash += amount;
    save();
    return reply({ embeds: [ok(`💸 Enviaste **${money(amount)} 🪙** a ${target}.\n💰 Tu efectivo: **${money(user.cash)} 🪙**`)] });
  }

  if (command === "profile" || command === "perfil") return reply({ embeds: [new EmbedBuilder().setColor("Gold").setTitle(`👤 Perfil de ${message.author.username}`).setThumbnail(message.author.displayAvatarURL()).addFields(
    { name: "💵 Efectivo", value: `${money(user.cash)} 🪙`, inline: true },
    { name: "🏦 Banco", value: `${money(user.bank)} 🪙`, inline: true },
    { name: "📨 Comandos", value: `${money(user.commands)}`, inline: true }
  )] });

  if (command === "stats") return reply({ embeds: [info(`📊 **Estadísticas de Joshua**\n\n👥 Servidores: **${client.guilds.cache.size}**\n👤 Usuarios visibles: **${client.users.cache.size}**\n🏓 Ping: **${client.ws.ping}ms**`)] });

  const items = {
    sombrero: { name: "🎩 Sombrero", price: 500 },
    diamante: { name: "💎 Diamante", price: 1000 },
    consola: { name: "🎮 Consola", price: 2500 },
    corona: { name: "👑 Corona", price: 5000 }
  };

  if (command === "shop") return reply({ embeds: [new EmbedBuilder().setColor("Orange").setTitle("🛒 Tienda de Joshua").setDescription("🎩 Sombrero — **500 🪙**\n💎 Diamante — **1.000 🪙**\n🎮 Consola — **2.500 🪙**\n👑 Corona — **5.000 🪙**\n\nCompra con `p.buy <objeto>`. ")] });
  if (command === "buy") {
    const item = args[0]?.toLowerCase();
    if (!item || !items[item]) return reply("❌ Ese objeto no existe. Usa `p.shop`.");
    if (user.cash < items[item].price) return reply("❌ No tienes suficiente dinero.");
    user.cash -= items[item].price;
    user.inventory[item] = (user.inventory[item] || 0) + 1;
    save();
    return reply({ embeds: [ok(`🛒 Compraste **${items[item].name}** por **${money(items[item].price)} 🪙**.`)] });
  }
  if (command === "inventory" || command === "inv") {
    const entries = Object.entries(user.inventory);
    if (!entries.length) return reply("🎒 Tu inventario está vacío.");
    return reply({ embeds: [info(`🎒 **Inventario**\n\n${entries.map(([item, amount]) => `📦 **${item}** × ${amount}`).join("\n")}`)] });
  }
  if (command === "sell") {
    const item = args[0]?.toLowerCase();
    const prices = { sombrero: 250, diamante: 500, consola: 1250, corona: 2500 };
    if (!item || !user.inventory[item] || user.inventory[item] <= 0) return reply("❌ No tienes ese objeto.");
    if (!prices[item]) return reply("❌ Ese objeto no se puede vender.");
    user.inventory[item]--;
    user.cash += prices[item];
    save();
    return reply({ embeds: [ok(`💰 Vendiste **${item}** por **${money(prices[item])} 🪙**.`)] });
  }

  if (command === "coinflip" || command === "moneda") return reply({ embeds: [info(`🪙 La moneda cayó en **${Math.random() < 0.5 ? "🪙 Cara" : "🪙 Cruz"}**.`)] });
  if (command === "dado" || command === "dice") return reply({ embeds: [info(`🎲 Sacaste un **${random(1, 6)}**.`)] });
  if (command === "random") {
    const max = Number(args[0]);
    if (!Number.isSafeInteger(max) || max < 1) return reply("🎲 Usa `p.random <número>`.");
    return reply({ embeds: [info(`🎲 Número aleatorio: **${random(1, max)}**`)] });
  }
  if (command === "choose" || command === "elegir") {
    if (args.length < 2) return reply("🤔 Dame varias opciones.\nEjemplo: `p.choose pizza hamburguesa`");
    return reply({ embeds: [info(`🤔 Joshua eligió: **${args[random(0, args.length - 1)]}**`)] });
  }
  if (command === "8ball") return reply({ embeds: [info(["🎱 Sí, definitivamente.", "🎱 Probablemente.", "🎱 No parece probable.", "🎱 Las señales no son claras.", "🎱 Pregunta de nuevo."][random(0, 4)])] });
  if (command === "joke" || command === "chiste") return reply({ embeds: [info(["😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!", "🤣 ¿Qué le dijo un pez a otro? ¡Nada!", "😎 ¿Cuál es el colmo de un electricista? No encontrar su corriente."][random(0, 2)])] });
  if (command === "rps") return reply({ embeds: [info(`🎮 Joshua eligió **${["🪨 Piedra", "📄 Papel", "✂️ Tijera"][random(0, 2)]}**.`)] });

  if (command === "highfive" || command === "compliment") {
    const target = message.mentions.users.first();
    if (!target) return reply(command === "highfive" ? "🙌 Menciona a alguien." : "✨ Menciona a alguien.");
    return reply({ embeds: [info(command === "highfive" ? `🙌 ${message.author} chocó los cinco con ${target}.` : `✨ ${target}, ¡eres genial! 😎`)] });
  }
  if (command === "say") {
    const text = args.join(" ");
    if (!text) return reply("💬 Escribe algo para que Joshua lo diga.");
    return reply(text);
  }
  if (command === "userinfo" || command === "user") {
    const target = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(target.id);
    return reply({ embeds: [new EmbedBuilder().setColor("Blue").setTitle(`👤 Información de ${target.username}`).setThumbnail(target.displayAvatarURL()).addFields(
      { name: "🆔 ID", value: target.id },
      { name: "📅 Cuenta creada", value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>` },
      { name: "👑 Apodo", value: member?.nickname || "Ninguno" }
    )] });
  }

  if (command === "serverinfo") return reply({ embeds: [new EmbedBuilder().setColor("Green").setTitle(`🏠 ${message.guild.name}`).setThumbnail(message.guild.iconURL()).addFields(
    { name: "👥 Miembros", value: `${message.guild.memberCount}`, inline: true },
    { name: "💬 Canales", value: `${message.guild.channels.cache.size}`, inline: true },
    { name: "🎭 Roles", value: `${message.guild.roles.cache.size}`, inline: true }
  )] });
  if (command === "channels") return reply({ embeds: [info(`💬 Canales del servidor: **${message.guild.channels.cache.size}**`)] });
  if (command === "roles") return reply({ embeds: [info(`🎭 Este servidor tiene **${message.guild.roles.cache.size} roles**.`)] });
  if (command === "emojis") return reply({ embeds: [info(`😀 Emojis del servidor: **${message.guild.emojis.cache.size}**`)] });
  if (command === "boosts") return reply({ embeds: [info(`🚀 Boosts del servidor: **${message.guild.premiumSubscriptionCount || 0}**`)] });
  if (command === "created") return reply({ embeds: [info(`📅 Este servidor fue creado el <t:${Math.floor(message.guild.createdTimestamp / 1000)}:F>.`)] });

  if (command === "ban" || command === "unban" || command === "kick" || command === "warn" || command === "purge" || command === "clear" || command === "lock" || command === "unlock" || command === "slowmode" || command === "nick" || command === "mute" || command === "unmute") {
    const permissions = {
      ban: PermissionFlagsBits.BanMembers,
      unban: PermissionFlagsBits.BanMembers,
      kick: PermissionFlagsBits.KickMembers,
      warn: PermissionFlagsBits.ModerateMembers,
      purge: PermissionFlagsBits.ManageMessages,
      clear: PermissionFlagsBits.ManageMessages,
      lock: PermissionFlagsBits.ManageChannels,
      unlock: PermissionFlagsBits.ManageChannels,
      slowmode: PermissionFlagsBits.ManageChannels,
      nick: PermissionFlagsBits.ManageNicknames,
      mute: PermissionFlagsBits.ModerateMembers,
      unmute: PermissionFlagsBits.ModerateMembers
    };
    if (!message.member.permissions.has(permissions[command])) return reply("❌ No tienes permiso para ejecutar este comando.");

    if (command === "unban") {
      if (!args[0]) return reply("🆔 Usa `p.unban <ID>`.");
      try { await message.guild.members.unban(args[0]); return reply({ embeds: [ok(`🔓 Usuario **${args[0]}** desbaneado.`)] }); }
      catch { return reply("❌ No pude quitar el baneo."); }
    }
    if (["ban", "kick", "warn", "nick", "mute", "unmute"].includes(command)) {
      const target = message.mentions.members.first();
      if (!target) return reply("👤 Menciona al usuario.");
      if (command === "ban") {
        if (!target.bannable) return reply("❌ No puedo banear a ese usuario.");
        await target.ban({ reason: args.slice(1).join(" ") || "Sin razón especificada" });
        return reply({ embeds: [ok(`🔨 **${target.user.tag}** fue baneado del servidor.`)] });
      }
      if (command === "kick") {
        if (!target.kickable) return reply("❌ No puedo expulsar a ese usuario.");
        await target.kick(args.slice(1).join(" ") || "Sin razón especificada");
        return reply({ embeds: [ok(`👢 **${target.user.tag}** fue expulsado.`)] });
      }
      if (command === "warn") {
        const targetData = getUser(target.id);
        targetData.warnings++;
        save();
        return reply({ embeds: [new EmbedBuilder().setColor("Orange").setTitle("⚠️ Advertencia").setDescription(`${target} recibió una advertencia.\n\n📊 Advertencias: **${targetData.warnings}**`)] });
      }
      if (command === "nick") {
        const nickname = args.slice(1).join(" ");
        if (!nickname) return reply("✏️ Escribe el nuevo apodo.");
        try { await target.setNickname(nickname); return reply({ embeds: [ok(`✏️ Apodo cambiado para **${target.user.tag}**.`)] }); }
        catch { return reply("❌ No pude cambiar el apodo."); }
      }
      if (command === "mute") {
        try { await target.timeout(10 * 60 * 1000, "Mute mediante Joshua"); return reply({ embeds: [ok(`🔇 **${target.user.tag}** fue silenciado durante **10 minutos**.`)] }); }
        catch { return reply("❌ No pude silenciar a ese usuario."); }
      }
      if (command === "unmute") {
        try { await target.timeout(null, "Mute retirado mediante Joshua"); return reply({ embeds: [ok(`🔊 **${target.user.tag}** ya no está silenciado.`)] }); }
        catch { return reply("❌ No pude quitar el silencio."); }
      }
    }
    if (command === "purge" || command === "clear") {
      const amount = Number(args[0]);
      if (!Number.isInteger(amount) || amount < 1 || amount > 100) return reply("🧹 Usa una cantidad entre **1 y 100**.");
      const deleted = await message.channel.bulkDelete(amount, true);
      const confirmation = await message.channel.send(`🧹 Se eliminaron **${deleted.size} mensajes**.`);
      setTimeout(() => confirmation.delete().catch(() => {}), 3000);
      return;
    }
    if (command === "lock" || command === "unlock") {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: command === "lock" ? false : null });
      return reply({ embeds: [ok(command === "lock" ? "🔒 Canal bloqueado." : "🔓 Canal desbloqueado.")] });
    }
    if (command === "slowmode") {
      const seconds = Number(args[0]);
      if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) return reply("⏱️ Usa un valor entre 0 y 21600 segundos.");
      await message.channel.setRateLimitPerUser(seconds);
      return reply({ embeds: [ok(`⏱️ Slowmode establecido en **${seconds} segundos**.`)] });
    }
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== "help_menu") return;
  const texts = {
    ia: "🤖 **IA**\n\n`p.r <pregunta>` — Pregúntale a Joshua AI.",
    economy: "💰 **Economía**\n\n`p.balance`\n`p.daily`\n`p.work`\n`p.dep`\n`p.with`\n`p.pay`",
    fun: "🎮 **Diversión**\n\n`p.coinflip`\n`p.dado`\n`p.random`\n`p.choose`\n`p.8ball`\n`p.joke`",
    social: "👥 **Social**\n\n`p.highfive @usuario`\n`p.compliment @usuario`\n`p.say texto`\n`p.userinfo @usuario`",
    mod: "🛡️ **Moderación**\n\n`p.ban @usuario`\n`p.kick @usuario`\n`p.warn @usuario`\n`p.purge cantidad`\n`p.lock`\n`p.unlock`\n`p.mute @usuario`\n`p.unmute @usuario`"
  };
  await interaction.reply({ embeds: [info(texts[interaction.values[0]] || "❌ Categoría desconocida.")], ephemeral: true });
});

process.on("unhandledRejection", error => console.error("❌ Unhandled Rejection:", error));
process.on("uncaughtException", error => console.error("❌ Uncaught Exception:", error));

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Joshua está funcionando 🤖🟢");
}).listen(PORT, "0.0.0.0", () => console.log(`🌐 Servidor iniciado en el puerto ${PORT}`));

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ Falta DISCORD_TOKEN en Render.");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Falta OPENAI_API_KEY en Render.");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("🔐 Login de Discord correcto."))
  .catch(error => {
    console.error("❌ No se pudo iniciar sesión en Discord.");
    console.error(error.message);
    process.exit(1);
  });
