const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const PREFIX = "p.";
const DATA_FILE = path.join(__dirname, "economy.json");
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMessageReactions],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

let economy = {};
try { if (fs.existsSync(DATA_FILE)) economy = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { economy = {}; }
if (!economy || typeof economy !== "object" || Array.isArray(economy)) economy = {};
economy.users ||= {};
economy.guilds ||= {};
function saveData() { try { fs.writeFileSync(DATA_FILE, JSON.stringify(economy, null, 2)); } catch (error) { console.error("❌ Error guardando datos:", error); } }
function getUser(id) { economy.users[id] ||= { cash: 100, bank: 0, inventory: [], lastDaily: 0, lastWork: 0, lastRob: 0, robWins: 0, robLosses: 0 }; const u = economy.users[id]; for (const key of ["cash", "bank", "lastDaily", "lastWork", "lastRob", "robWins", "robLosses"]) u[key] = Number(u[key]) || 0; if (!Array.isArray(u.inventory)) u.inventory = []; return u; }
function getGuild(id) { economy.guilds[id] ||= { welcomeChannelId: null, autoRoleIds: [], autoResponses: {}, autoReactions: {}, rankActive: false }; const g = economy.guilds[id]; if (!Array.isArray(g.autoRoleIds)) g.autoRoleIds = []; if (!g.autoResponses || typeof g.autoResponses !== "object") g.autoResponses = {}; if (!g.autoReactions || typeof g.autoReactions !== "object") g.autoReactions = {}; if (typeof g.rankActive !== "boolean") g.rankActive = false; return g; }
const money = n => `${Number(n || 0).toLocaleString("es-ES")} 💰`;
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const remaining = (last, ms) => Math.max(0, ms - (Date.now() - last));
const time = ms => { const s = Math.ceil(ms / 1000); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; };
const isAdmin = m => m.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
const embed = (color, title, description) => new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
const info = text => embed(0x5865f2, "🤖 Joshua", text);
const ok = text => embed(0x57f287, "✅ Joshua", text);
const fail = text => embed(0xed4245, "❌ Joshua", text);
const adminCommands = new Set(["ban", "kick", "clear", "purge", "say", "bienvenidas", "autorroles", "autorespuestas", "autorespuesta", "autoreacciones", "autoreaccion", "config", "announce", "addrole", "removerole", "rank", "lock", "unlock", "slowmode"]);
const prices = { sombrero: 500, gafas: 750, consola: 1500, diamante: 3000 };

const pages = {
  inicio: ["📚 JOSHUA • AYUDA", "Selecciona una categoría en el menú.\n\n⚡ Prefijo: **p.**\n\n🛡️ Moderación\n💰 Economía\n🛒 Tienda\n🎮 Diversión\n👥 Social\n🌐 Servidor\n⚙️ Configuración\n🏆 Rank"],
  moderacion: ["🛡️ MODERACIÓN", "`p.ban` `p.kick` `p.clear` `p.lock` `p.unlock` `p.slowmode` `p.addrole` `p.removerole` `p.announce`"],
  economia: ["💰 ECONOMÍA", "`p.balance` `p.daily` `p.work` `p.dep` `p.with` `p.pay` `p.give` `p.robar` `p.profile` `p.stats` `p.leaderboard` `p.top`"],
  tienda: ["🛒 TIENDA", "`p.shop` `p.buy` `p.sell` `p.inventory` `p.inv`"],
  diversion: ["🎮 DIVERSIÓN", "`p.random` `p.dado` `p.coinflip` `p.8ball` `p.choose` `p.rps` `p.reverse` `p.joke`"],
  social: ["👥 SOCIAL", "`p.avatar` `p.user` `p.profile` `p.rank` `p.membercount`"],
  servidor: ["🌐 SERVIDOR", "`p.serverinfo` `p.servericon` `p.channels` `p.roles` `p.emojis` `p.boosts` `p.created` `p.membercount` `p.ping`"],
  configuracion: ["⚙️ CONFIGURACIÓN • ADMIN", "Solo administradores: `p.say` `p.bienvenidas` `p.autorroles` `p.autorespuestas` `p.autoreacciones` `p.config` `p.addrole` `p.removerole` `p.announce`"],
  rank: ["🏆 SISTEMA DE RANK", "`p.rank active` activar · `p.rank off` desactivar · `p.rank` ver · `p.rank top` ranking"]
};
function helpMenu() { return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("joshua_help").setPlaceholder("📚 Selecciona una categoría").addOptions(Object.entries(pages).map(([value, [label, description]]) => ({ label, description: description.slice(0, 100), value })))); }
function helpEmbed(category = "inicio") { const [title, description] = pages[category] || pages.inicio; return embed(0x5865f2, title, description); }
function rankData(id) { const u = getUser(id), total = u.cash + u.bank, xp = Math.floor(total / 10); return { total, xp, level: Math.floor(xp / 100) + 1 }; }
function leaderboard(guild) { return [...guild.members.cache.values()].filter(m => !m.user.bot).map(member => ({ member, ...rankData(member.id) })).sort((a, b) => b.total - a.total); }
function reply(message, data) { return message.reply(typeof data === "string" ? { content: data, allowedMentions: { repliedUser: false } } : { ...data, allowedMentions: { repliedUser: false } }); }

client.once("ready", () => { console.log(`🤖 Joshua conectado como ${client.user.tag}`); client.user.setActivity("p.help | Joshua", { type: 0 }); });
client.on("guildMemberAdd", async member => { const s = getGuild(member.guild.id); for (const id of s.autoRoleIds) { const role = member.guild.roles.cache.get(id); if (role && !role.managed && role.editable) await member.roles.add(role).catch(() => {}); } if (s.welcomeChannelId) { const ch = member.guild.channels.cache.get(s.welcomeChannelId); if (ch?.isTextBased()) await ch.send({ embeds: [embed(0x5865f2, "👋 ¡Bienvenido/a!", `¡Bienvenido/a ${member} a **${member.guild.name}**! 🎉\n\nEsperamos que disfrutes de la comunidad. 💙`)], allowedMentions: { users: [member.id] } }).catch(() => {}); } saveData(); });

client.on("messageCreate", async message => {
  try {
    if (!message.guild || message.author.bot) return;
    const settings = getGuild(message.guild.id), lower = message.content.toLowerCase();
    if (!message.content.startsWith(PREFIX)) { for (const [trigger, response] of Object.entries(settings.autoResponses)) if (lower.includes(trigger.toLowerCase())) { await message.channel.send({ content: response, allowedMentions: { parse: [] } }).catch(() => {}); break; } for (const [trigger, emoji] of Object.entries(settings.autoReactions)) if (lower.includes(trigger.toLowerCase())) { await message.react(emoji).catch(() => {}); break; } if (["hola joshua", "hola joshua!"].includes(lower)) await message.reply({ content: "👋 ¡Hola! ¿Qué tal?", allowedMentions: { repliedUser: false } }); return; }
    const parts = message.content.slice(PREFIX.length).trim().split(/\s+/), command = (parts.shift() || "").toLowerCase(), args = parts;
    if (!command) return;
    if (adminCommands.has(command) && !isAdmin(message)) return reply(message, { embeds: [fail("❌ Este comando es exclusivo para administradores.")] });
    const user = getUser(message.author.id);
    if (["help", "ayuda"].includes(command)) return reply(message, { embeds: [helpEmbed()], components: [helpMenu()] });
    if (command === "ping") return reply(message, { embeds: [info(`🏓 Pong! Latencia: **${client.ws.ping}ms**`)] });
    if (["balance", "bal"].includes(command)) return reply(message, { embeds: [info(`💰 **${message.author.username}**\n\n💵 Efectivo: **${money(user.cash)}**\n🏦 Banco: **${money(user.bank)}**\n💎 Total: **${money(user.cash + user.bank)}**`)] });
    if (command === "daily" || command === "work") { const key = command === "daily" ? "lastDaily" : "lastWork", cd = command === "daily" ? 86400000 : 3600000, left = remaining(user[key], cd); if (left) return reply(message, { embeds: [fail(`⏰ Vuelve en **${time(left)}**.`)] }); const amount = command === "daily" ? random(250, 750) : random(100, 500); user.cash += amount; user[key] = Date.now(); saveData(); return reply(message, { embeds: [ok(`${command === "daily" ? "🎁 Recompensa diaria" : "💼 Trabajaste y ganaste"}: **${money(amount)}**.`)] }); }
    if (["dep", "deposit", "with", "withdraw"].includes(command)) { const withdraw = ["with", "withdraw"].includes(command), amount = Math.floor(Number(args[0])); if (!Number.isFinite(amount) || amount <= 0) return reply(message, { embeds: [fail("❌ Cantidad inválida.")] }); if (withdraw ? user.bank < amount : user.cash < amount) return reply(message, { embeds: [fail("❌ No tienes fondos suficientes.")] }); if (withdraw) { user.bank -= amount; user.cash += amount; } else { user.cash -= amount; user.bank += amount; } saveData(); return reply(message, { embeds: [ok(`${withdraw ? "💵 Retiraste" : "🏦 Depositaste"} **${money(amount)}**.`)] }); }
    if (["pay", "give"].includes(command)) { const target = message.mentions.users.first(), amount = Math.floor(Number(args[1])); if (!target || target.bot || target.id === message.author.id || !Number.isFinite(amount) || amount <= 0 || user.cash < amount) return reply(message, { embeds: [fail("❌ Usa `p.pay @usuario cantidad` y verifica tus fondos.")] }); user.cash -= amount; getUser(target.id).cash += amount; saveData(); return reply(message, { embeds: [ok(`💸 ${message.author} le dio **${money(amount)}** a ${target}.`)] }); }
    if (["robar", "rob"].includes(command)) { const target = message.mentions.users.first(); if (!target || target.bot || target.id === message.author.id) return reply(message, { embeds: [fail("❌ Menciona a otro usuario válido.")] }); const left = remaining(user.lastRob, 120000); if (left) return reply(message, { embeds: [fail(`⏰ Espera **${time(left)}**.`)] }); const victim = getUser(target.id); user.lastRob = Date.now(); if (victim.cash < 50 || Math.random() >= .5) { user.robLosses++; saveData(); return reply(message, { embeds: [fail("🚨 ¡Fallaste el robo o el usuario no tiene suficiente dinero!")] }); } const amount = random(50, Math.min(victim.cash, 500)); victim.cash -= amount; user.cash += amount; user.robWins++; saveData(); return reply(message, { embeds: [ok(`🕵️ ¡Robo exitoso! Conseguíste **${money(amount)}** de ${target}.`)] }); }
    if (["profile", "stats"].includes(command)) { const target = message.mentions.users.first() || message.author, u = getUser(target.id), rank = rankData(target.id); return reply(message, { embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`👤 PERFIL DE ${target.username}`).setThumbnail(target.displayAvatarURL()).setDescription(`💵 Efectivo: **${money(u.cash)}**\n🏦 Banco: **${money(u.bank)}**\n💎 Total: **${money(u.cash + u.bank)}**\n\n🏆 Nivel: **${rank.level}**\n✨ XP: **${rank.xp}**\n🕵️ Robos exitosos: **${u.robWins}**\n🚨 Robos fallidos: **${u.robLosses}**`)] }); }
    if (["shop", "tienda"].includes(command)) return reply(message, { embeds: [info("🛒 **TIENDA**\n\n🎩 Sombrero — **500 💰**\n🕶️ Gafas — **750 💰**\n🎮 Consola — **1.500 💰**\n💎 Diamante — **3.000 💰**\n\nUsa **p.buy nombre**.")] });
    if (["buy", "comprar"].includes(command)) { const item = args.join(" ").toLowerCase(); if (!prices[item]) return reply(message, { embeds: [fail("❌ Ese objeto no existe en la tienda.")] }); if (user.cash < prices[item]) return reply(message, { embeds: [fail("❌ No tienes suficiente dinero.")] }); user.cash -= prices[item]; user.inventory.push(item); saveData(); return reply(message, { embeds: [ok(`🛒 Compraste **${item}** por **${money(prices[item])}**.`)] }); }
    if (["inventory", "inv"].includes(command)) return reply(message, { embeds: [info(user.inventory.length ? `🎒 **TU INVENTARIO**\n\n${user.inventory.map(i => `• **${i}**`).join("\n")}` : "🎒 Tu inventario está vacío.")] });
    if (["leaderboard", "top"].includes(command)) { const list = leaderboard(message.guild).slice(0, 10); return reply(message, { embeds: [embed(0xf1c40f, "🏆 LEADERBOARD", list.map((x, i) => `**${i + 1}.** ${x.member.user.username} • ${money(x.total)}`).join("\n") || "No hay usuarios todavía.")] }); }
    if (command === "rank") { const sub = args[0]?.toLowerCase(); if (sub === "active" || sub === "on") { settings.rankActive = true; saveData(); return reply(message, "🏆 Sistema de Rank activado."); } if (sub === "off" || sub === "disable") { settings.rankActive = false; saveData(); return reply(message, "🏆 Sistema de Rank desactivado."); } if (!settings.rankActive && !isAdmin(message)) return reply(message, "❌ El sistema de Rank no está activo."); if (sub === "top") return reply(message, { embeds: [embed(0xf39c12, "🏆 TOP RANK", leaderboard(message.guild).slice(0, 10).map((x, i) => `**${i + 1}.** ${x.member.user.username} • Nivel **${x.level}** • ${money(x.total)}`).join("\n") || "No hay datos.")] }); const target = message.mentions.users.first() || message.author, data = rankData(target.id), position = leaderboard(message.guild).findIndex(x => x.member.id === target.id) + 1; return reply(message, `🏆 **RANK DE ${target.username}**\n\n⭐ Nivel: **${data.level}**\n✨ XP: **${data.xp}**\n💰 Total: **${money(data.total)}**\n📊 Posición: **#${position || "?"}**`); }
    if (command === "random") { const min = Number(args[0] || 1), max = Number(args[1] || 100); if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return reply(message, { embeds: [fail("❌ El mínimo debe ser menor que el máximo.")] }); return reply(message, `🎲 Número aleatorio: **${random(min, max)}**`); }
    if (["dado", "dice"].includes(command)) return reply(message, `🎲 Salió un **${random(1, 6)}**`);
    if (["coinflip", "flip"].includes(command)) return reply(message, Math.random() < .5 ? "🪙 Cara" : "🪙 Cruz");
    if (command === "8ball") return reply(message, ["🔮 Sí.", "🔮 No.", "🔮 Probablemente.", "🔮 Puede ser.", "🔮 Pregunta más tarde."][random(0, 4)]);
    if (command === "choose") return reply(message, args.length > 1 ? `🤔 Elijo: **${args[random(0, args.length - 1)]}**` : "❌ Usa `p.choose opción1 opción2`.");
    if (command === "rps") { const choices = ["piedra", "papel", "tijera"], mine = args[0]?.toLowerCase(); if (!choices.includes(mine)) return reply(message, "❌ Usa `p.rps piedra`, `papel` o `tijera`."); const bot = choices[random(0, 2)]; return reply(message, `✊ Tú: **${mine}**\n🤖 Joshua: **${bot}**\n\n${mine === bot ? "🤝 ¡Empate!" : ((mine === "piedra" && bot === "tijera") || (mine === "papel" && bot === "piedra") || (mine === "tijera" && bot === "papel") ? "🎉 ¡Ganaste!" : "😅 ¡Perdiste!")}`); }
    if (command === "reverse") return reply(message, args.length ? `🔄 ${args.join(" ").split("").reverse().join("")}` : "❌ Usa `p.reverse texto`.");
    if (command === "joke") return reply(message, ["😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!", "😂 ¿Qué le dice un techo a otro? Techo de menos.", "😂 ¿Qué hace una computadora cuando tiene frío? Cierra Windows."][random(0, 2)]);
    if (command === "avatar") { const target = message.mentions.users.first() || message.author; return reply(message, { embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🖼️ Avatar de ${target.username}`).setImage(target.displayAvatarURL({ size: 1024 }))] }); }
    if (command === "user") { const target = message.mentions.members.first() || message.member; return reply(message, `👤 **${target.user.username}**\n🆔 ID: **${target.id}**\n📅 Cuenta creada: <t:${Math.floor(target.user.createdTimestamp / 1000)}:D>\n📥 Entró: ${target.joinedTimestamp ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>` : "Desconocido"}`); }
    if (command === "serverinfo") { const g = message.guild; return reply(message, { embeds: [info(`🌐 **${g.name}**\n👥 Miembros: **${g.memberCount}**\n💬 Canales: **${g.channels.cache.size}**\n🎭 Roles: **${g.roles.cache.size}**\n😀 Emojis: **${g.emojis.cache.size}**\n🚀 Boosts: **${g.premiumSubscriptionCount || 0}**`)] }); }
    if (command === "servericon") { const icon = message.guild.iconURL({ size: 1024 }); return reply(message, icon ? { embeds: [new EmbedBuilder().setTitle("🖼️ Icono del servidor").setImage(icon)] } : "❌ Este servidor no tiene icono."); }
    if (["membercount", "boosts", "created"].includes(command)) return reply(message, command === "membercount" ? `👥 Este servidor tiene **${message.guild.memberCount} miembros**.` : command === "boosts" ? `🚀 Este servidor tiene **${message.guild.premiumSubscriptionCount || 0} boosts.**` : `📅 Este servidor fue creado el <t:${Math.floor(message.guild.createdTimestamp / 1000)}:F>.`);
    if (["channels", "roles", "emojis"].includes(command)) { const list = command === "channels" ? message.guild.channels.cache.filter(c => c.isTextBased()).map(String) : command === "roles" ? message.guild.roles.cache.filter(r => r.id !== message.guild.id).map(String) : message.guild.emojis.cache.map(String); return reply(message, `📋 **${command.toUpperCase()}**\n\n${list.slice(0, 50).join("\n") || "Ninguno"}`); }

    if (command === "say") { const text = args.join(" "); if (!text) return reply(message, "❌ Usa `p.say mensaje`."); await message.delete().catch(() => {}); return message.channel.send({ content: text, allowedMentions: { parse: [] } }); }
    if (command === "announce") { const text = args.join(" "); return message.channel.send({ embeds: [embed(0x5865f2, "📢 ANUNCIO", text || "Escribe un anuncio.")] }); }
    if (command === "bienvenidas") { if ((args[0] || "").toLowerCase() === "off") settings.welcomeChannelId = null; else { const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]); if (!channel?.isTextBased()) return reply(message, "❌ Menciona un canal válido."); settings.welcomeChannelId = channel.id; } saveData(); return reply(message, settings.welcomeChannelId ? "👋 Bienvenidas configuradas." : "👋 Bienvenidas desactivadas."); }
    if (command === "autorroles") { const sub = (args[0] || "").toLowerCase(), role = message.mentions.roles.first(); if (["add", "añadir"].includes(sub)) { if (!role || role.managed || !role.editable) return reply(message, "❌ No puedo asignar ese rol."); if (!settings.autoRoleIds.includes(role.id)) settings.autoRoleIds.push(role.id); saveData(); return reply(message, `🎭 ${role} añadido.`); } if (["remove", "eliminar"].includes(sub)) { settings.autoRoleIds = settings.autoRoleIds.filter(id => id !== role?.id); saveData(); return reply(message, `🗑️ ${role || "Rol"} eliminado.`); } if (["list", "lista"].includes(sub)) return reply(message, `🎭 **AUTORROLES**\n\n${settings.autoRoleIds.map(id => `<@&${id}>`).join("\n") || "Ninguno"}`); if (sub === "clear") { settings.autoRoleIds = []; saveData(); return reply(message, "🗑️ Autorroles eliminados."); } return reply(message, "🎭 Usa `p.autorroles add/remove/list/clear`."); }
    if (["autorespuestas", "autorespuesta"].includes(command)) { const sub = (args[0] || "").toLowerCase(), raw = args.slice(1).join(" "); if (["list", "lista"].includes(sub)) return reply(message, `🤖 **AUTO RESPUESTAS**\n\n${Object.entries(settings.autoResponses).map(([k, v]) => `• **${k}** → ${v}`).join("\n") || "Ninguna"}`); if (["remove", "eliminar"].includes(sub)) { delete settings.autoResponses[raw.toLowerCase()]; saveData(); return reply(message, "🗑️ Respuesta eliminada."); } const i = raw.indexOf("|"); if (i < 0) return reply(message, "❌ Usa `p.autorespuestas add palabra | respuesta`."); settings.autoResponses[raw.slice(0, i).trim().toLowerCase()] = raw.slice(i + 1).trim(); saveData(); return reply(message, "🤖 Respuesta automática añadida."); }
    if (["autoreacciones", "autoreaccion"].includes(command)) { const sub = (args[0] || "").toLowerCase(), raw = args.slice(1).join(" "); if (["list", "lista"].includes(sub)) return reply(message, `😀 **AUTO REACCIONES**\n\n${Object.entries(settings.autoReactions).map(([k, v]) => `• **${k}** → ${v}`).join("\n") || "Ninguna"}`); if (["remove", "eliminar"].includes(sub)) { delete settings.autoReactions[raw.toLowerCase()]; saveData(); return reply(message, "🗑️ Reacción eliminada."); } const parts = raw.split(/\s+/), emoji = parts.pop(), trigger = parts.join(" ").toLowerCase(); if (!trigger || !emoji) return reply(message, "❌ Usa `p.autoreacciones add palabra 😀`."); settings.autoReactions[trigger] = emoji; saveData(); return reply(message, "😀 Reacción automática añadida."); }
    if (command === "config") return reply(message, { embeds: [info(`⚙️ **CONFIGURACIÓN**\n👋 Bienvenidas: ${settings.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : "❌"}\n🎭 Autorroles: **${settings.autoRoleIds.length}**\n🤖 Autorespuestas: **${Object.keys(settings.autoResponses).length}**\n😀 Autoreacciones: **${Object.keys(settings.autoReactions).length}**\n🏆 Rank: **${settings.rankActive ? "Activo" : "Inactivo"}**`)] });
    if (["addrole", "removerole"].includes(command)) { const member = message.mentions.members.first(), role = message.mentions.roles.first(); if (!member || !role || !role.editable) return reply(message, "❌ Usa `p.addrole @usuario @rol`."); await (command === "addrole" ? member.roles.add(role) : member.roles.remove(role)).catch(() => {}); return reply(message, `${command === "addrole" ? "🎭 Se añadió" : "🗑️ Se quitó"} ${role} ${command === "addrole" ? "a" : "de"} ${member}.`); }
    if (["ban", "kick"].includes(command)) { const target = message.mentions.members.first(); if (!target) return reply(message, "❌ Menciona al usuario."); if (command === "ban" && !target.bannable || command === "kick" && !target.kickable) return reply(message, "❌ No puedo realizar esa acción."); await (command === "ban" ? target.ban() : target.kick()).catch(() => {}); return reply(message, `✅ ${target.user.username} fue ${command === "ban" ? "baneado" : "expulsado"}.`); }
    if (["clear", "purge"].includes(command)) { const n = Number(args[0]); if (!Number.isInteger(n) || n < 1 || n > 100) return reply(message, "❌ Usa una cantidad entre 1 y 100."); await message.channel.bulkDelete(n, true).catch(() => {}); return message.channel.send(`🧹 Se eliminaron **${n} mensajes**.`); }
    if (["lock", "unlock"].includes(command)) { await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: command === "lock" ? false : null }); return reply(message, command === "lock" ? "🔒 Canal bloqueado." : "🔓 Canal desbloqueado."); }
    if (command === "slowmode") { const n = Number(args[0]); if (!Number.isInteger(n) || n < 0 || n > 21600) return reply(message, "❌ Usa un valor entre 0 y 21600."); await message.channel.setRateLimitPerUser(n); return reply(message, `🐌 Slowmode establecido en **${n} segundos**.`); }
    return reply(message, `❌ No conozco ese comando. Usa **p.help**.`);
  } catch (error) { console.error("❌ Error en messageCreate:", error); }
});

client.on("interactionCreate", async interaction => { if (!interaction.isStringSelectMenu() || interaction.customId !== "joshua_help") return; await interaction.update({ embeds: [helpEmbed(interaction.values[0])], components: [helpMenu()] }).catch(() => {}); });
client.on("error", error => console.error("❌ Error de Discord:", error));
process.on("unhandledRejection", error => console.error("❌ Unhandled Rejection:", error));
process.on("uncaughtException", error => console.error("❌ Uncaught Exception:", error));
if (!process.env.DISCORD_TOKEN) { console.error("❌ No existe la variable DISCORD_TOKEN."); process.exit(1); }
client.login(process.env.DISCORD_TOKEN).then(() => console.log("🔐 Login de Discord correcto.")).catch(error => { console.error("❌ Error iniciando sesión:", error.message); process.exit(1); });
