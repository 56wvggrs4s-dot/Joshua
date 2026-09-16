const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const http = require("http");
const OpenAI = require("openai");

const PREFIX = "p.";
const DATA_FILE = "./economy.json";
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences] });
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}");
let economy = {};
try { economy = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { economy = {}; }
function save() { fs.writeFileSync(DATA_FILE, JSON.stringify(economy, null, 2)); }
function getUser(id) {
  if (!economy[id] || typeof economy[id] !== "object") economy[id] = { cash: 1000, bank: 0, inventory: [], warnings: 0, commands: 0, daily: 0 };
  if (!Array.isArray(economy[id].inventory)) economy[id].inventory = Object.entries(economy[id].inventory || {}).flatMap(([item, count]) => Array(Number(count) || 0).fill(item));
  economy[id].cash = Number(economy[id].cash) || 0;
  economy[id].bank = Number(economy[id].bank) || 0;
  economy[id].warnings = Number(economy[id].warnings) || 0;
  economy[id].commands = Number(economy[id].commands) || 0;
  economy[id].daily = Number(economy[id].daily) || 0;
  return economy[id];
}
const money = n => Number(n || 0).toLocaleString("es-ES");
const random = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const info = text => new EmbedBuilder().setColor(0x5865f2).setTitle("🤖 Joshua").setDescription(text);
const ok = text => new EmbedBuilder().setColor(0x57f287).setTitle("✅ Joshua").setDescription(text);
const fail = text => new EmbedBuilder().setColor(0xed4245).setTitle("❌ Joshua").setDescription(text);
const isAdmin = m => m.member?.permissions?.has(PermissionFlagsBits.Administrator);
const cooldowns = new Map();
function cooldown(key, seconds) { const now = Date.now(), last = cooldowns.get(key) || 0, left = Math.ceil((seconds * 1000 - (now - last)) / 1000); if (left > 0) return left; cooldowns.set(key, now); return 0; }

const items = { sombrero: ["🎩 Sombrero", 500], consola: ["🎮 Consola", 1500], laptop: ["💻 Laptop", 3000], auto: ["🚗 Auto", 5000], diamante: ["💎 Diamante", 10000] };
function help() { return new EmbedBuilder().setColor(0x5865f2).setTitle("📚 Comandos de Joshua").setDescription(["Usa el prefijo `p.`", "", "🤖 `p.r <pregunta>`", "💰 `p.balance` `p.bank` `p.daily` `p.work` `p.crimen` `p.dep` `p.with` `p.pay` `p.profile` `p.stats`", "🛒 `p.shop` `p.buy` `p.inventory` `p.sell`", "🎮 `p.coinflip` `p.dado` `p.random` `p.choose` `p.8ball` `p.joke` `p.rps`", "👥 `p.highfive` `p.compliment` `p.say` `p.userinfo` `p.whois`", "🏠 `p.serverinfo` `p.channels` `p.roles` `p.emojis` `p.boosts` `p.created`", "🛡️ `p.ban` `p.unban` `p.kick` `p.warn` `p.purge` `p.lock` `p.unlock` `p.slowmode` `p.nick` `p.mute` `p.unmute`"].join("\n")); }
function helpMenu() { return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("help_menu").setPlaceholder("📚 Selecciona una categoría").addOptions([{ label: "🤖 IA", value: "ia" }, { label: "💰 Economía", value: "economy" }, { label: "🛒 Tienda", value: "shop" }, { label: "🎮 Diversión", value: "fun" }, { label: "👥 Social", value: "social" }, { label: "🏠 Servidor", value: "server" }, { label: "🛡️ Moderación", value: "mod" }])); }

client.once("ready", () => { console.log(`🤖 Joshua conectado como ${client.user.tag}`); client.user.setPresence({ activities: [{ name: "p.help | p.r", type: 0 }], status: "online" }); });
client.on("messageCreate", async message => {
  try {
    if (message.author.bot || !message.guild) return;
    const raw = message.content.trim(), lower = raw.toLowerCase();
    if (!lower.startsWith(PREFIX)) {
      if (["hola joshua", "hola joshua!"].includes(lower)) return message.reply({ embeds: [info(`👋 ¡Hola ${message.author}! Soy **Joshua**. Usa \`p.help\`.`)], allowedMentions: { repliedUser: false } });
      if (lower.includes("buenas joshua") || lower.includes("buenos dias joshua")) return message.reply({ embeds: [info(`😎 ¡Buenas, ${message.author}! ¿Qué hacemos hoy?`)], allowedMentions: { repliedUser: false } });
      return;
    }
    const args = raw.slice(PREFIX.length).trim().split(/\s+/), command = (args.shift() || "").toLowerCase(); if (!command) return;
    const user = getUser(message.author.id); user.commands++; save();
    const reply = p => message.reply(typeof p === "string" ? { content: p, allowedMentions: { repliedUser: false } } : { ...p, allowedMentions: { repliedUser: false } });
    if (["help", "ayuda"].includes(command)) return reply({ embeds: [help()], components: [helpMenu()] });
    if (command === "ping") return reply({ embeds: [info(`🏓 Ping: **${client.ws.ping}ms**`)] });
    if (["r", "chatgpt"].includes(command)) {
      const question = args.join(" "); if (!question) return reply({ embeds: [fail("Escribe una pregunta. Ejemplo: `p.r ¿Qué es Minecraft?`")] });
      if (!openai) return reply({ embeds: [fail("Falta la variable `OPENAI_API_KEY` en Render.")] });
      const cd = cooldown(`ai:${message.author.id}`, 5); if (cd) return reply({ embeds: [fail(`⏳ Espera **${cd}s**.`)] });
      const thinking = await reply({ embeds: [info("🧠 Pensando... ⏳")] });
      try { const response = await openai.responses.create({ model: "gpt-5.6-luna", input: [{ role: "developer", content: "Eres Joshua, un asistente amigable. Responde en español de forma clara y apropiada." }, { role: "user", content: question }] }); let answer = response.output_text || "No pude generar una respuesta."; await thinking.edit({ embeds: [info(answer.slice(0, 3900))] }); } catch (e) { console.error("❌ Error OpenAI:", e); await thinking.edit({ embeds: [fail("No pude conectarme con la IA. Revisa OPENAI_API_KEY y los logs de Render.")] }); } return;
    }
    if (["balance", "bal"].includes(command)) return reply({ embeds: [info(`💵 Efectivo: **${money(user.cash)} 🪙**\n🏦 Banco: **${money(user.bank)} 🪙**\n💎 Total: **${money(user.cash + user.bank)} 🪙**`)] });
    if (command === "bank") return reply({ embeds: [info(`🏦 Banco: **${money(user.bank)} 🪙**\n💵 Efectivo: **${money(user.cash)} 🪙**`)] });
    if (command === "daily") { const cd = cooldown(`daily:${message.author.id}`, 86400); if (cd) return reply({ embeds: [fail(`⏳ Vuelve en **${Math.floor(cd / 3600)}h ${Math.floor(cd % 3600 / 60)}m**.`)] }); const n = random(500, 1500); user.cash += n; save(); return reply({ embeds: [ok(`🎁 Recibiste **${money(n)} 🪙**.`)] }); }
    if (["work", "trabajar"].includes(command)) { const cd = cooldown(`work:${message.author.id}`, 30); if (cd) return reply({ embeds: [fail(`⏳ Espera **${cd}s**.`)] }); const n = random(100, 500); user.cash += n; save(); return reply({ embeds: [ok(`💼 Ganaste **${money(n)} 🪙**.`)] }); }
    if (command === "crimen") { const n = Math.random() < .55 ? random(200, 800) : -Math.min(user.cash, random(50, 300)); user.cash += n; save(); return reply({ embeds: [n >= 0 ? ok(`🎭 Ganaste **${money(n)} 🪙**.`) : fail(`🚨 Perdiste **${money(-n)} 🪙**.`)] }); }
    if (["dep", "deposit", "with", "withdraw"].includes(command)) { const out = ["with", "withdraw"].includes(command), arg = args[0]; if (!arg) return reply("Indica una cantidad o `all`."); const n = arg.toLowerCase() === "all" ? (out ? user.bank : user.cash) : Number(arg), source = out ? user.bank : user.cash; if (!Number.isSafeInteger(n) || n <= 0 || n > source) return reply("❌ Cantidad o fondos inválidos."); if (out) { user.bank -= n; user.cash += n; } else { user.cash -= n; user.bank += n; } save(); return reply({ embeds: [ok(`${out ? "💵 Retiraste" : "🏦 Depositaste"} **${money(n)} 🪙**.`)] }); }
    if (["pay", "pagar", "gift"].includes(command)) { const target = message.mentions.users.first(), n = Number(args[1]); if (!target || target.bot || target.id === message.author.id || !Number.isSafeInteger(n) || n <= 0 || n > user.cash) return reply("❌ Usa `p.pay @usuario cantidad` con fondos suficientes."); const receiver = getUser(target.id); user.cash -= n; receiver.cash += n; save(); return reply({ embeds: [ok(`💸 Enviaste **${money(n)} 🪙** a ${target}.`)] }); }
    if (["profile", "perfil"].includes(command)) return reply({ embeds: [info(`👤 **${message.author.username}**\n💵 Efectivo: **${money(user.cash)}**\n🏦 Banco: **${money(user.bank)}**\n💎 Total: **${money(user.cash + user.bank)}**\n⚙️ Comandos: **${user.commands}**\n⚠️ Advertencias: **${user.warnings}**`)] });
    if (command === "stats") return reply({ embeds: [info(`📊 Servidores: **${client.guilds.cache.size}**\n👥 Usuarios: **${client.users.cache.size}**\n🏓 Ping: **${client.ws.ping}ms**`)] });
    if (["shop", "tienda"].includes(command)) return reply({ embeds: [info(Object.entries(items).map(([id, x]) => `**${id}** — ${x[0]} — **${money(x[1])} 🪙**`).join("\n"))] });
    if (["buy", "comprar"].includes(command)) { const id = args[0]?.toLowerCase(); if (!items[id]) return reply("❌ Objeto inexistente. Usa `p.shop`."); if (user.cash < items[id][1]) return reply("❌ No tienes suficiente dinero."); user.cash -= items[id][1]; user.inventory.push(id); save(); return reply({ embeds: [ok(`🛒 Compraste **${items[id][0]}**.`)] }); }
    if (["inventory", "inv", "inventario"].includes(command)) return reply({ embeds: [info(user.inventory.length ? user.inventory.map((x, i) => `${i + 1}. ${x}`).join("\n") : "🎒 Tu inventario está vacío.")] });
    if (["sell", "vender"].includes(command)) { const id = args[0]?.toLowerCase(), index = user.inventory.indexOf(id); if (index < 0 || !items[id]) return reply("❌ No tienes ese objeto."); user.inventory.splice(index, 1); user.cash += Math.floor(items[id][1] / 2); save(); return reply({ embeds: [ok(`💰 Vendiste **${id}**.`)] }); }
    if (["coinflip", "moneda"].includes(command)) return reply({ embeds: [info(`🪙 Resultado: **${Math.random() < .5 ? "Cara" : "Cruz"}**`)] });
    if (["dado", "dice"].includes(command)) return reply({ embeds: [info(`🎲 Sacaste un **${random(1, 6)}**.`)] });
    if (command === "random") { const a = Number(args[0]), b = Number(args[1]); if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return reply("Usa `p.random 1 100`."); return reply({ embeds: [info(`🎲 Número aleatorio: **${random(a, b)}**`)] }); }
    if (["choose", "elegir"].includes(command)) { const choices = args.join(" ").split("|").map(x => x.trim()).filter(Boolean); if (choices.length < 2) return reply("Usa `p.choose opción 1 | opción 2`."); return reply({ embeds: [info(`🤔 Joshua elige: **${choices[random(0, choices.length - 1)]}**`)] }); }
    if (["8ball", "8-ball"].includes(command)) return reply({ embeds: [info(["🟢 Sí.", "🟢 Definitivamente.", "🟡 Puede ser.", "🔴 No."][random(0, 3)])] });
    if (["joke", "chiste"].includes(command)) return reply({ embeds: [info("😂 ¿Qué hace una abeja en el gimnasio? ¡Zum-ba!")] });
    if (["rps", "piedrapapel"].includes(command)) return reply({ embeds: [info(`🤖 Joshua eligió **${["🪨 Piedra", "📄 Papel", "✂️ Tijera"][random(0, 2)]}**.`)] });
    if (command === "highfive" || command === "compliment") { const t = message.mentions.users.first(); return reply({ embeds: [info(t ? `${command === "highfive" ? "🙌" : "✨"} ${t}, ${command === "highfive" ? "¡choca esos cinco!" : "¡eres genial!"}` : "Menciona a alguien.")] }); }
    if (["say", "decir"].includes(command)) return reply({ embeds: [info(`💬 ${args.join(" ") || "Escribe algo."}`)] });
    if (["userinfo", "user", "whois"].includes(command)) { const t = message.mentions.users.first() || message.author; return reply({ embeds: [info(`👤 **${t.username}**\n🆔 ${t.id}\n📅 <t:${Math.floor(t.createdTimestamp / 1000)}:F>`)] }); }
    if (command === "serverinfo") return reply({ embeds: [info(`🏠 **${message.guild.name}**\n👥 Miembros: **${message.guild.memberCount}**\n💬 Canales: **${message.guild.channels.cache.size}**\n🎭 Roles: **${message.guild.roles.cache.size}**\n😀 Emojis: **${message.guild.emojis.cache.size}**`)] });
    if (["channels", "roles", "emojis", "boosts", "created"].includes(command)) return reply({ embeds: [info(command === "created" ? `📅 Creado: <t:${Math.floor(message.guild.createdTimestamp / 1000)}:F>` : `📊 ${command}: **${command === "roles" ? message.guild.roles.cache.size : command === "emojis" ? message.guild.emojis.cache.size : command === "boosts" ? message.guild.premiumSubscriptionCount || 0 : message.guild.channels.cache.size}**`)] });
    const adminCommands = ["ban", "unban", "kick", "warn", "purge", "clear", "lock", "unlock", "slowmode", "nick", "mute", "unmute"];
    if (adminCommands.includes(command)) {
      if (!isAdmin(message)) return reply({ embeds: [fail("🛡️ No tienes permisos de administrador.")] });
      const target = message.mentions.members.first();
      if (command === "unban") { if (!args[0]) return reply("Indica el ID."); await message.guild.members.unban(args[0]); return reply({ embeds: [ok("🔓 Usuario desbaneado.")] }); }
      if (["ban", "kick", "warn", "nick", "mute", "unmute"].includes(command) && !target) return reply("Menciona al usuario.");
      if (command === "ban") { if (!target.bannable) return reply("No puedo banearlo."); await target.ban({ reason: args.slice(1).join(" ") || "Joshua" }); }
      else if (command === "kick") { if (!target.kickable) return reply("No puedo expulsarlo."); await target.kick(args.slice(1).join(" ") || "Joshua"); }
      else if (command === "warn") { const u = getUser(target.id); u.warnings++; save(); return reply({ embeds: [ok(`⚠️ Advertencias: **${u.warnings}**`)] }); }
      else if (command === "mute") await target.timeout((Number(args[1]) || 10) * 60000, "Mute aplicado por Joshua");
      else if (command === "unmute") await target.timeout(null, "Mute retirado por Joshua");
      else if (command === "nick") await target.setNickname(args.slice(1).join(" ") || null);
      else if (command === "purge" || command === "clear") { const n = Number(args[0]); if (!Number.isInteger(n) || n < 1 || n > 100) return reply("Usa una cantidad entre 1 y 100."); const d = await message.channel.bulkDelete(n, true); return message.channel.send({ embeds: [ok(`🧹 Se eliminaron **${d.size} mensajes**.`)] }); }
      else if (command === "lock" || command === "unlock") await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: command === "lock" ? false : null });
      else if (command === "slowmode") { const n = Number(args[0]); if (!Number.isInteger(n) || n < 0 || n > 21600) return reply("Usa un valor entre 0 y 21600."); await message.channel.setRateLimitPerUser(n); }
      return reply({ embeds: [ok(`✅ Comando **${command}** ejecutado.`)] });
    }
    return reply({ embeds: [fail(`No conozco \`${PREFIX}${command}\`. Usa \`p.help\`.`)] });
  } catch (error) { console.error("❌ Error en messageCreate:", error); try { await message.reply({ embeds: [fail("❌ Ocurrió un error ejecutando ese comando.")], allowedMentions: { repliedUser: false } }); } catch {} }
});

client.on("interactionCreate", async interaction => { if (!interaction.isStringSelectMenu() || interaction.customId !== "help_menu") return; const pages = { ia: "🤖 `p.r <pregunta>`", economy: "💰 `p.balance` `p.daily` `p.work` `p.dep` `p.with` `p.pay`", shop: "🛒 `p.shop` `p.buy` `p.inventory` `p.sell`", fun: "🎮 `p.coinflip` `p.dado` `p.random` `p.choose` `p.8ball` `p.joke` `p.rps`", social: "👥 `p.highfive` `p.compliment` `p.say` `p.userinfo` `p.whois`", server: "🏠 `p.serverinfo` `p.channels` `p.roles` `p.emojis` `p.boosts` `p.created`", mod: "🛡️ `p.ban` `p.unban` `p.kick` `p.warn` `p.purge` `p.lock` `p.unlock` `p.slowmode` `p.nick` `p.mute` `p.unmute`" }; await interaction.reply({ embeds: [info(pages[interaction.values[0]] || "Categoría no encontrada.")], ephemeral: true }); });

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Joshua está funcionando 🤖🟢"); }).listen(PORT, "0.0.0.0", () => console.log(`🌐 Servidor iniciado en el puerto ${PORT}`));
if (!process.env.DISCORD_TOKEN) { console.error("❌ Falta DISCORD_TOKEN en Render."); process.exit(1); }
client.login(process.env.DISCORD_TOKEN).then(() => console.log("🔐 Login de Discord correcto.")).catch(error => { console.error("❌ No se pudo iniciar sesión en Discord.", error.message); process.exit(1); });
process.on("unhandledRejection", error => console.error("❌ Unhandled Rejection:", error));
process.on("uncaughtException", error => console.error("❌ Uncaught Exception:", error));
