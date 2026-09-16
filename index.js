const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const http = require("http");

const PREFIX = "p.";
const DATA_FILE = path.join(__dirname, "economy.json");
const PORT = Number(process.env.PORT) || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

let economy = {};
try {
  if (fs.existsSync(DATA_FILE)) economy = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch (error) {
  console.error("❌ No se pudo leer economy.json:", error.message);
  economy = {};
}
if (!economy || typeof economy !== "object" || Array.isArray(economy)) economy = {};
function save() { try { fs.writeFileSync(DATA_FILE, JSON.stringify(economy, null, 2)); } catch (error) { console.error("❌ Error guardando datos:", error.message); } }

function getUser(id) {
  if (!economy[id] || typeof economy[id] !== "object" || economy[id]._guildConfig) {
    economy[id] = { cash: 1000, bank: 0, wins: 0, losses: 0, messages: 0, commands: 0, daily: 0, work: 0, crime: 0, warnings: 0, inventory: {} };
  }
  const user = economy[id];
  for (const key of ["cash", "bank", "wins", "losses", "messages", "commands", "daily", "work", "crime", "warnings"]) user[key] = Number(user[key]) || 0;
  if (!user.inventory || typeof user.inventory !== "object" || Array.isArray(user.inventory)) user.inventory = {};
  return user;
}

function getGuildConfig(id) {
  const key = `guild:${id}`;
  if (!economy[key] || typeof economy[key] !== "object") economy[key] = { _guildConfig: true, welcomeChannel: null, autoRole: null, autoReplies: {}, autoReactions: {} };
  const config = economy[key];
  if (!config.autoReplies || typeof config.autoReplies !== "object") config.autoReplies = {};
  if (!config.autoReactions || typeof config.autoReactions !== "object") config.autoReactions = {};
  return config;
}

const money = value => Number(value || 0).toLocaleString("es-ES");
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const info = text => new EmbedBuilder().setColor(0x5865f2).setTitle("╭━━━〔 🤖 JOSHUA 〕━━━╮").setDescription(text).setFooter({ text: "Joshua 🤖 • Sistema oficial" }).setTimestamp();
const ok = text => new EmbedBuilder().setColor(0x57f287).setTitle("╭━━━〔 ✅ JOSHUA 〕━━━╮").setDescription(text).setFooter({ text: "Joshua 🤖 • Acción completada" }).setTimestamp();
const fail = text => new EmbedBuilder().setColor(0xed4245).setTitle("╭━━━〔 ❌ JOSHUA 〕━━━╮").setDescription(text).setFooter({ text: "Joshua 🤖 • Ha ocurrido un problema" }).setTimestamp();
const isAdmin = message => Boolean(message.member?.permissions?.has(PermissionFlagsBits.Administrator));
const cooldowns = new Map();
function cooldown(id, command, seconds) {
  const key = `${id}:${command}`, now = Date.now(), last = cooldowns.get(key) || 0, remaining = seconds * 1000 - (now - last);
  if (remaining > 0) return remaining;
  cooldowns.set(key, now);
  return 0;
}
function left(ms) { const seconds = Math.ceil(ms / 1000); return seconds >= 3600 ? `${Math.floor(seconds / 3600)}h` : seconds >= 60 ? `${Math.floor(seconds / 60)}m` : `${seconds}s`; }

const shopItems = {
  cookie: { name: "🍪 Galleta", price: 100 },
  pizza: { name: "🍕 Pizza", price: 500 },
  diamond: { name: "💎 Diamante", price: 2500 },
  crown: { name: "👑 Corona", price: 5000 }
};

const helpPages = {
  main: ["╭━━━〔 📚 CENTRO DE AYUDA 〕━━━╮", "🤖 **JOSHUA**\n\n💰 Economía\n🛒 Tienda\n👤 Perfil\n🎮 Diversión\n👥 Social\n🏰 Servidor\n⚙️ Utilidades\n🛡️ Administración\n🤖 Automatización\n\n📌 Selecciona una categoría abajo."],
  economy: ["╭━━━〔 💰 ECONOMÍA 〕━━━╮", "**p.balance** · Dinero\n**p.bank** · Banco\n**p.daily** · Recompensa diaria\n**p.work** · Trabajar\n**p.crimen** · Crimen ficticio\n**p.dep cantidad** · Depositar\n**p.with cantidad** · Retirar\n**p.pay @usuario cantidad** · Enviar dinero\n**p.gift @usuario cantidad** · Regalar dinero"],
  shop: ["╭━━━〔 🛒 TIENDA 〕━━━╮", "**p.shop** · Ver tienda\n**p.buy objeto cantidad** · Comprar\n**p.inventory** · Inventario\n**p.sell objeto cantidad** · Vender"],
  profile: ["╭━━━〔 👤 PERFIL 〕━━━╮", "**p.profile** · Ver perfil\n**p.stats** · Estadísticas\n**p.userinfo @usuario** · Información"],
  fun: ["╭━━━〔 🎮 DIVERSIÓN 〕━━━╮", "**p.coinflip** · Moneda\n**p.dado** · Dado\n**p.random 1 100** · Aleatorio\n**p.choose uno | dos** · Elegir\n**p.8ball pregunta** · Bola mágica\n**p.rps** · Piedra, papel o tijera\n**p.joke** · Chiste"],
  social: ["╭━━━〔 👥 SOCIAL 〕━━━╮", "**p.highfive @usuario** · Chocar los cinco\n**p.compliment @usuario** · Elogiar\n**p.say texto** · Hablar como Joshua\n**p.userinfo @usuario** · Información"],
  server: ["╭━━━〔 🏰 SERVIDOR 〕━━━╮", "**p.serverinfo** · Información\n**p.channels** · Canales\n**p.roles** · Roles\n**p.emojis** · Emojis\n**p.boosts** · Boosts\n**p.created @usuario** · Creación"],
  utility: ["╭━━━〔 ⚙️ UTILIDADES 〕━━━╮", "**p.ping** · Ping\n**p.help** · Ayuda\n**p.created @usuario** · Fecha de creación"],
  admin: ["╭━━━〔 🛡️ ADMINISTRACIÓN 〕━━━╮", "**p.ban @usuario** · Banear\n**p.unban ID** · Desbanear\n**p.kick @usuario** · Expulsar\n**p.mute @usuario** · Silenciar\n**p.unmute @usuario** · Quitar silencio\n**p.warn @usuario motivo** · Advertir\n**p.purge cantidad** · Borrar\n**p.lock / p.unlock** · Bloquear\n**p.slowmode segundos** · Slowmode\n**p.nick @usuario nombre** · Apodo"],
  automation: ["╭━━━〔 🤖 AUTOMATIZACIÓN 〕━━━╮", "⚠️ Solo administradores\n\n`p.bienvenidas #canal` · `p.bienvenidas off`\n`p.autoroles @rol` · `p.autoroles off`\n`p.autorespuestas agregar hola | respuesta`\n`p.autorespuestas quitar hola` · `p.autorespuestas lista`\n`p.autoreacciones agregar hola | 👋`\n`p.autoreacciones quitar hola` · `p.autoreacciones lista`"]
};
function help(category = "main") { const page = helpPages[category] || helpPages.main; return new EmbedBuilder().setColor(0x5865f2).setTitle(page[0]).setDescription(page[1]).setFooter({ text: "Joshua 🤖 • p.help" }).setTimestamp(); }
function helpMenu() {
  const options = [["Economía", "economy", "💰"], ["Tienda", "shop", "🛒"], ["Perfil", "profile", "👤"], ["Diversión", "fun", "🎮"], ["Social", "social", "👥"], ["Servidor", "server", "🏰"], ["Utilidades", "utility", "⚙️"], ["Administración", "admin", "🛡️"], ["Automatización", "automation", "🤖"]];
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("joshua_help").setPlaceholder("📚 Selecciona una categoría").addOptions(options.map(([label, value, emoji]) => ({ label, value, emoji }))));
}
function reply(message, payload) { return message.reply(typeof payload === "string" ? { content: payload, allowedMentions: { repliedUser: false } } : { ...payload, allowedMentions: { repliedUser: false } }); }

client.once("ready", () => {
  console.log(`🤖 Joshua está conectado como ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: "p.help", type: 0 }], status: "online" });
});

client.on("guildMemberAdd", async member => {
  try {
    const config = getGuildConfig(member.guild.id);
    if (config.autoRole) {
      const role = member.guild.roles.cache.get(config.autoRole);
      if (role?.editable) await member.roles.add(role, "Autorol de Joshua");
    }
    if (config.welcomeChannel) {
      const channel = member.guild.channels.cache.get(config.welcomeChannel);
      if (channel?.isTextBased()) await channel.send({ content: `👋 ¡Bienvenido/a ${member}! 🎉`, embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("╭━━━〔 👋 ¡BIENVENIDO/A! 〕━━━╮").setDescription(`🎉 ¡Qué alegría tenerte aquí, ${member}!\n\n👤 **Usuario:** ${member.user.username}\n🏰 **Servidor:** ${member.guild.name}\n\n📚 Lee las reglas y disfruta tu estancia.\n🤖 Usa \`p.help\` si necesitas ayuda.`).setThumbnail(member.user.displayAvatarURL({ size: 256 })).setTimestamp()] });
    }
  } catch (error) { console.error("❌ Error en bienvenida/autorol:", error); }
});

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;
  const user = getUser(message.author.id);
  user.messages++;
  save();
  const raw = message.content.trim(), content = raw.toLowerCase(), config = getGuildConfig(message.guild.id);

  if (!content.startsWith(PREFIX)) {
    for (const [trigger, response] of Object.entries(config.autoReplies)) if (content === trigger.toLowerCase()) { await reply(message, response); break; }
    for (const [trigger, emoji] of Object.entries(config.autoReactions)) if (content === trigger.toLowerCase()) { await message.react(emoji).catch(() => {}); break; }
    if (content.includes("hola joshua")) return reply(message, "👋 ¡Holaaa! Soy Joshua 🤖🔥");
    if (content === "buenas") return reply(message, "😎 ¡Buenas! ¿Qué tal?");
    if (content.includes("te quiero joshua")) return message.react("❤️").catch(() => {});
    if (content.includes("joshua god") || content.includes("joshua goat")) return message.react("🔥").catch(() => {});
    return;
  }

  const args = raw.slice(PREFIX.length).trim().split(/\s+/).filter(Boolean), command = (args.shift() || "").toLowerCase();
  if (!command) return;
  user.commands++;
  save();
  const send = payload => reply(message, payload);

  if (["help", "ayuda"].includes(command)) return send({ embeds: [help()], components: [helpMenu()] });
  if (command === "ping") return send({ embeds: [info(`🏓 **Ping:** ${client.ws.ping}ms\n\n🟢 Joshua está conectado.`)] });
  if (["balance", "bal"].includes(command)) return send({ embeds: [info(`💵 **Efectivo:** ${money(user.cash)} 🪙\n🏦 **Banco:** ${money(user.bank)} 🪙\n💎 **Total:** ${money(user.cash + user.bank)} 🪙`)] });
  if (command === "bank") return send({ embeds: [info(`🏦 **Banco:** ${money(user.bank)} 🪙\n💵 **Efectivo:** ${money(user.cash)} 🪙\n\nUsa \`p.dep all\` o \`p.with all\`.`)] });

  if (["daily", "work", "crimen"].includes(command)) {
    const seconds = { daily: 86400, work: 30, crimen: 120 }[command], cd = cooldown(message.author.id, command, seconds);
    if (cd) return send({ embeds: [fail(`⏰ Espera **${left(cd)}** para volver a usarlo.`)] });
    if (command === "daily") { user.cash += 1000; user.wins++; user.daily++; save(); return send({ embeds: [ok("🎁 Recibiste **1.000 🪙** por tu recompensa diaria.")] }); }
    if (command === "work") { const n = random(10, 150); user.cash += n; user.wins++; user.work++; save(); return send({ embeds: [ok(`💼 Trabajaste y ganaste **${money(n)} 🪙**.`)] }); }
    if (Math.random() < 0.2) { const n = random(300, 500); user.cash += n; user.wins++; user.crime++; save(); return send({ embeds: [ok(`🕵️ Crimen exitoso: ganaste **${money(n)} 🪙**.`)] }); }
    const n = Math.min(user.cash, random(200, 600)); user.cash -= n; user.losses++; user.crime++; save(); return send({ embeds: [fail(`🚔 Crimen fallido: perdiste **${money(n)} 🪙**.`)] });
  }

  if (["dep", "deposit", "with", "withdraw"].includes(command)) {
    const withdraw = ["with", "withdraw"].includes(command), arg = (args[0] || "").toLowerCase(), source = withdraw ? user.bank : user.cash, amount = arg === "all" ? source : Number(arg);
    if (!Number.isSafeInteger(amount) || amount <= 0) return send({ embeds: [fail(`Usa \`p.${command} cantidad\` o \`all\`.`)] });
    if (amount > source) return send({ embeds: [fail("💸 No tienes fondos suficientes.")] });
    if (withdraw) { user.bank -= amount; user.cash += amount; } else { user.cash -= amount; user.bank += amount; }
    save();
    return send({ embeds: [ok(`${withdraw ? "📤 Retiraste" : "📥 Depositaste"} **${money(amount)} 🪙**.`)] });
  }

  if (["pay", "gift"].includes(command)) {
    const target = message.mentions.users.first(), amount = Number(args.find(value => /^\d+$/.test(value)));
    if (!target || target.bot || target.id === message.author.id || !Number.isSafeInteger(amount) || amount <= 0) return send({ embeds: [fail(`Uso: \`p.${command} @usuario cantidad\``)] });
    if (user.cash < amount) return send({ embeds: [fail("💸 No tienes suficiente efectivo.")] });
    user.cash -= amount; getUser(target.id).cash += amount; save();
    return send({ embeds: [ok(`🎁 Enviaste **${money(amount)} 🪙** a ${target}.`)] });
  }

  if (["profile", "stats"].includes(command)) {
    if (command === "stats") return send({ embeds: [info(`📊 **ESTADÍSTICAS**\n\n🎁 Daily: **${user.daily}**\n💼 Trabajo: **${user.work}**\n🕵️ Crimen: **${user.crime}**\n🏆 Victorias: **${user.wins}**\n💔 Derrotas: **${user.losses}**`)] });
    return send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`╭━━━〔 👤 PERFIL 〕━━━╮`).setThumbnail(message.author.displayAvatarURL()).setDescription(`👤 **Usuario:** ${message.author.username}\n\n💵 **Efectivo:** ${money(user.cash)} 🪙\n🏦 **Banco:** ${money(user.bank)} 🪙\n🏆 **Victorias:** ${user.wins}\n💔 **Derrotas:** ${user.losses}\n💬 **Mensajes:** ${user.messages}\n⚙️ **Comandos:** ${user.commands}`).setTimestamp()] });
  }

  if (command === "shop") return send({ embeds: [info(Object.entries(shopItems).map(([id, item]) => `🛍️ **${id}** — ${item.name} — **${money(item.price)} 🪙**`).join("\n"))] });
  if (command === "buy" || command === "sell") {
    const id = (args[0] || "").toLowerCase(), quantity = Math.max(1, Number(args[1]) || 1), item = shopItems[id];
    if (!item) return send({ embeds: [fail("Ese objeto no existe. Usa `p.shop`.")] });
    if (command === "buy") { const total = item.price * quantity; if (user.cash < total) return send({ embeds: [fail("💸 No tienes suficiente dinero.")] }); user.cash -= total; user.inventory[id] = (user.inventory[id] || 0) + quantity; save(); return send({ embeds: [ok(`🛒 Compraste **${quantity}x ${item.name}** por **${money(total)} 🪙**.`)] }); }
    if ((user.inventory[id] || 0) < quantity) return send({ embeds: [fail("��� No tienes suficientes unidades.")] }); user.inventory[id] -= quantity; const total = Math.floor(item.price * quantity / 2); user.cash += total; save(); return send({ embeds: [ok(`💰 Vendiste **${quantity}x ${item.name}** y recibiste **${money(total)} 🪙**.`)] });
  }
  if (["inventory", "inv"].includes(command)) { const entries = Object.entries(user.inventory).filter(([, amount]) => amount > 0); return send({ embeds: [info(entries.length ? `🎒 **TU INVENTARIO**\n\n${entries.map(([id, amount]) => `${shopItems[id]?.name || id}: **${amount}**`).join("\n")}` : "🎒 Tu inventario está vacío.")] }); }

  if (command === "coinflip") return send({ embeds: [info(`🪙 Salió **${Math.random() < 0.5 ? "Cara" : "Cruz"}**.`)] });
  if (["dado", "dice"].includes(command)) return send({ embeds: [info(`🎲 Tiraste el dado y salió **${random(1, 6)}**.`)] });
  if (command === "random") { const min = Number(args[0]) || 1, max = Number(args[1]) || 100; if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return send({ embeds: [fail("Usa `p.random 1 100`.")] }); return send({ embeds: [info(`🎲 **Número aleatorio:** ${random(min, max)}`)] }); }
  if (command === "choose" || command === "elegir") { const choices = args.join(" ").split("|").map(x => x.trim()).filter(Boolean); if (choices.length < 2) return send({ embeds: [fail("Usa `p.choose opción1 | opción2`.")] }); return send({ embeds: [info(`🤔 Joshua eligió: **${choices[random(0, choices.length - 1)]}**`)] }); }
  if (command === "8ball") return send({ embeds: [info(["🟢 Sí.", "🔴 No.", "🤔 Tal vez.", "✨ Probablemente.", "🔥 Definitivamente."][random(0, 4)])] });
  if (["joke", "chiste"].includes(command)) return send({ embeds: [info(["😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!", "🤣 ¿Qué le dijo un cero a un ocho? Bonito cinturón.", "😎 ¿Por qué el libro fue al médico? Porque tenía muchas páginas en blanco."][random(0, 2)])] });
  if (["rps", "piedrapapel"].includes(command)) return send({ embeds: [info(`🎮 Joshua eligió **${["🪨 Piedra", "📄 Papel", "✂️ Tijera"][random(0, 2)]}**.`)] });
  if (["highfive", "compliment"].includes(command)) { const target = message.mentions.users.first(); if (!target) return send({ embeds: [fail("Menciona a alguien.")] }); return send({ embeds: [ok(command === "highfive" ? `🙌 ¡${message.author} chocó los cinco con ${target}!` : `${target}, ✨ ¡Eres genial!`)] }); }

  if (["userinfo", "user", "whois"].includes(command)) { const target = message.mentions.users.first() || message.author; return send({ embeds: [info(`👤 **Usuario:** ${target.username}\n🆔 **ID:** ${target.id}\n🤖 **Bot:** ${target.bot ? "Sí" : "No"}\n📅 **Cuenta creada:** <t:${Math.floor(target.createdTimestamp / 1000)}:F>`)] }); }
  if (command === "serverinfo") { const guild = message.guild; return send({ embeds: [info(`🏰 **${guild.name}**\n👥 Miembros: **${guild.memberCount}**\n💬 Canales: **${guild.channels.cache.size}**\n🎭 Roles: **${guild.roles.cache.size}**\n😀 Emojis: **${guild.emojis.cache.size}**\n🚀 Boosts: **${guild.premiumSubscriptionCount || 0}**`)] }); }
  if (command === "channels") return send({ embeds: [info(`💬 **CANALES**\n\n${message.guild.channels.cache.map(channel => `• ${channel}`).slice(0, 30).join("\n") || "Ninguno"}`)] });
  if (command === "roles") return send({ embeds: [info(`🎭 **ROLES**\n\n${message.guild.roles.cache.filter(role => role.id !== message.guild.id).map(role => `• ${role}`).slice(0, 30).join("\n") || "Ninguno"}`)] });
  if (command === "emojis") return send({ embeds: [info(`😀 **EMOJIS**\n\n${message.guild.emojis.cache.map(String).slice(0, 50).join(" ") || "Ninguno"}`)] });
  if (command === "boosts") return send({ embeds: [info(`🚀 Este servidor tiene **${message.guild.premiumSubscriptionCount || 0} boosts**.`)] });
  if (command === "created") { const target = message.mentions.users.first() || message.author; return send({ embeds: [info(`📅 La cuenta de **${target.username}** fue creada el:\n<t:${Math.floor(target.createdTimestamp / 1000)}:F>`)] }); }

  const automationCommands = ["bienvenidas", "autoroles", "autorespuestas", "autoreacciones"];
  if (automationCommands.includes(command)) {
    if (!isAdmin(message)) return send({ embeds: [fail("🛡️ Este comando es exclusivamente para administradores.")] });
    if (command === "bienvenidas") { if (args[0] === "off") config.welcomeChannel = null; else { const channel = message.mentions.channels.first(); if (!channel) return send({ embeds: [fail("Uso: `p.bienvenidas #canal` o `p.bienvenidas off`")] }); config.welcomeChannel = channel.id; } save(); return send({ embeds: [ok(config.welcomeChannel ? "👋 Bienvenidas configuradas." : "👋 Bienvenidas desactivadas.")] }); }
    if (command === "autoroles") { if (args[0] === "off") config.autoRole = null; else { const role = message.mentions.roles.first(); if (!role || role.id === message.guild.id || role.position >= message.guild.members.me.roles.highest.position) return send({ embeds: [fail("❌ Rol inválido o no asignable.")] }); config.autoRole = role.id; } save(); return send({ embeds: [ok(config.autoRole ? "🎭 Autorol configurado." : "🎭 Autorol desactivado.")] }); }
    const store = command === "autorespuestas" ? config.autoReplies : config.autoReactions, action = (args.shift() || "").toLowerCase();
    if (action === "lista") return send({ embeds: [info(Object.entries(store).map(([key, value]) => `🔹 **${key}** → ${value}`).join("\n") || "No hay configuraciones.")] });
    const key = args.join(" ");
    if (action === "quitar") { if (!store[key.toLowerCase()]) return send({ embeds: [fail("❌ No existe esa configuración.")] }); delete store[key.toLowerCase()]; save(); return send({ embeds: [ok("🗑️ Configuración eliminada.")] }); }
    if (action === "agregar") { const separator = key.indexOf("|"); if (separator < 0) return send({ embeds: [fail("Usa `agregar disparador | respuesta`.")] }); const trigger = key.slice(0, separator).trim().toLowerCase(), value = key.slice(separator + 1).trim(); if (!trigger || !value) return send({ embeds: [fail("Debes indicar el disparador y la respuesta.")] }); store[trigger] = value; save(); return send({ embeds: [ok("✅ Configuración agregada.")] }); }
    return send({ embeds: [fail("Usa `agregar`, `quitar` o `lista`.")] });
  }

  const adminCommands = ["ban", "unban", "kick", "mute", "unmute", "warn", "purge", "clear", "lock", "unlock", "slowmode", "nick", "say"];
  if (adminCommands.includes(command) && !isAdmin(message)) return send({ embeds: [fail("🛡️ Necesitas permisos de administrador.")] });
  const target = message.mentions.members.first();
  if (command === "ban" || command === "kick") { if (!target) return send({ embeds: [fail(`Uso: \`p.${command} @usuario\`.`)] }); if (command === "ban") { if (!target.bannable) return send({ embeds: [fail("No puedo banear a ese usuario.")] }); await target.ban({ reason: `Joshua: ${message.author.tag}` }); } else { if (!target.kickable) return send({ embeds: [fail("No puedo expulsar a ese usuario.")] }); await target.kick(`Joshua: ${message.author.tag}`); } return send({ embeds: [ok(`✅ ${target.user.tag} fue ${command === "ban" ? "baneado" : "expulsado"}.`)] }); }
  if (command === "unban") { if (!args[0]) return send({ embeds: [fail("Uso: `p.unban ID`.")] }); try { await message.guild.members.unban(args[0]); return send({ embeds: [ok("🔓 Usuario desbaneado.")] }); } catch { return send({ embeds: [fail("No encontré un usuario baneado con ese ID.")] }); } }
  if (["mute", "unmute"].includes(command)) { if (!target) return send({ embeds: [fail(`Uso: \`p.${command} @usuario\`.`)] }); if (!target.moderatable) return send({ embeds: [fail("No puedo moderar a ese usuario.")] }); await target.timeout(command === "mute" ? Math.min(Number(args[1]) || 10, 40320) * 60000 : null, `Joshua: ${command}`); return send({ embeds: [ok(command === "mute" ? "🔇 Usuario silenciado." : "🔊 Usuario desilenciado.")] }); }
  if (command === "warn") { if (!target) return send({ embeds: [fail("Uso: `p.warn @usuario motivo`.")] }); const warned = getUser(target.id); warned.warnings++; save(); return send({ embeds: [ok(`⚠️ Advertencias de ${target.user.tag}: **${warned.warnings}**`)] }); }
  if (command === "purge" || command === "clear") { const amount = Number(args[0]); if (!Number.isInteger(amount) || amount < 1 || amount > 100) return send({ embeds: [fail("Usa una cantidad entre 1 y 100.")] }); const deleted = await message.channel.bulkDelete(amount, true); const notice = await message.channel.send({ embeds: [ok(`🧹 Se eliminaron **${deleted.size} mensajes**.`)] }); setTimeout(() => notice.delete().catch(() => {}), 5000); return; }
  if (command === "lock" || command === "unlock") { await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: command === "lock" ? false : null }); return send({ embeds: [ok(command === "lock" ? "🔒 Canal bloqueado." : "🔓 Canal desbloqueado.")] }); }
  if (command === "slowmode") { const seconds = Number(args[0]); if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) return send({ embeds: [fail("Usa un número entre 0 y 21600.")] }); await message.channel.setRateLimitPerUser(seconds); return send({ embeds: [ok(`🐌 Slowmode establecido en **${seconds} segundos**.`)] }); }
  if (command === "nick") { if (!target || !args.slice(1).join(" ")) return send({ embeds: [fail("Uso: `p.nick @usuario nuevo-nombre`.")] }); if (!target.manageable) return send({ embeds: [fail("No puedo cambiar el apodo de ese usuario.")] }); await target.setNickname(args.slice(1).join(" ").slice(0, 32)); return send({ embeds: [ok("✏️ Apodo actualizado.")] }); }
  if (command === "say") { if (!args.length) return send({ embeds: [fail("Escribe algo para que Joshua lo diga.")] }); return send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`╭━━━〔 🤖 JOSHUA 〕━━━╮\n\n${args.join(" ")}\n\n╰━━━━━━━━━━━━━━━━━━╯`).setFooter({ text: `Enviado por ${message.author.tag}` })] }); }
  return send({ embeds: [fail(`❓ No conozco \`${PREFIX}${command}\`. Usa \`p.help\`.`)] });
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== "joshua_help") return;
  await interaction.update({ embeds: [help(interaction.values[0])], components: [helpMenu()] });
});
client.on("error", error => console.error("❌ Error de Discord:", error));
process.on("unhandledRejection", error => console.error("❌ Unhandled Rejection:", error));
process.on("uncaughtException", error => console.error("❌ Uncaught Exception:", error));

http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Joshua está funcionando 🤖🟢"); }).listen(PORT, "0.0.0.0", () => console.log(`🌐 Servidor iniciado en el puerto ${PORT}`));
if (!process.env.DISCORD_TOKEN) { console.error("❌ Falta DISCORD_TOKEN en las variables de Render."); process.exit(1); }
client.login(process.env.DISCORD_TOKEN).then(() => console.log("🔐 Login de Discord correcto.")).catch(error => { console.error("❌ No se pudo iniciar sesión en Discord:", error.message); process.exit(1); });
