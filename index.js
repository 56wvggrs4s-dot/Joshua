const {
  Client,
  GatewayIntentBits,
  Events
} = require("discord.js");

const http = require("http");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = "p.";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==========================
// 💰 ECONOMÍA
// ==========================

const ECONOMY_FILE = "./economy.json";

let economy = {};

if (fs.existsSync(ECONOMY_FILE)) {
  try {
    economy = JSON.parse(fs.readFileSync(ECONOMY_FILE, "utf8"));
  } catch {
    economy = {};
  }
}

function saveEconomy() {
  fs.writeFileSync(
    ECONOMY_FILE,
    JSON.stringify(economy, null, 2)
  );
}

function getUser(userId) {
  if (!economy[userId]) {
    economy[userId] = {
      balance: 0,
      bank: 0,
      lastDaily: 0,
      lastWork: 0,
      lastRisk: 0,
      lastCrime: 0,
      lastHut: 0,
      lastRob: 0
    };
  }

  return economy[userId];
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cooldownMessage(time) {
  const seconds = Math.ceil(time / 1000);

  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  return `${seconds}s`;
}

// ==========================
// 🤖 BOT
// ==========================

client.once(Events.ClientReady, (bot) => {
  console.log(`🤖 ${bot.user.tag} está conectado!`);
});

// ==========================
// 📩 COMANDOS
// ==========================

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = args.shift().toLowerCase();
  const user = getUser(message.author.id);

  if (command === "ping") {
    return message.reply("🏓 ¡Pong! Joshua está funcionando.");
  }

  if (command === "help") {
    return message.reply(
      "📚 **COMANDOS DE JOSHUA**\n\n" +
      "🤖 **Generales**\n" +
      "🏓 `p.ping`\n👋 `p.hola`\nℹ️ `p.info`\n📚 `p.help`\n\n" +
      "💰 **Economía**\n" +
      "💰 `p.balance`\n🎁 `p.daily`\n💼 `p.work`\n🎲 `p.risk`\n🚨 `p.crimen`\n🧠 `p.hut`\n🥷 `p.rob`\n\n" +
      "🏦 **Banco**\n💵 `p.dep all`\n💳 `p.with all`"
    );
  }

  if (command === "hola") {
    return message.reply(`👋 ¡Hola, ${message.author}!`);
  }

  if (command === "info") {
    return message.reply(
      "🤖 **Joshua Bot**\n\n" +
      "⚙️ Bot de Discord\n🔧 Prefijo: `p.`\n💰 Sistema de economía activo"
    );
  }

  if (command === "balance" || command === "bal") {
    return message.reply(
      `💰 **${message.author.username}**\n\n` +
      `💵 Dinero: **${user.balance.toLocaleString()}**\n` +
      `🏦 Banco: **${user.bank.toLocaleString()}**\n` +
      `💎 Total: **${(user.balance + user.bank).toLocaleString()}**`
    );
  }

  if (command === "daily") {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const remaining = cooldown - (now - user.lastDaily);

    if (remaining > 0) {
      return message.reply(`⏰ Ya reclamaste tu recompensa diaria.\nVuelve en **${cooldownMessage(remaining)}**.`);
    }

    const reward = 1000;
    user.balance += reward;
    user.lastDaily = now;
    saveEconomy();

    return message.reply(
      `🎁 **RECOMPENSA DIARIA**\n\n` +
      `💰 Recibiste **${reward.toLocaleString()} monedas**.\n` +
      `💵 Ahora tienes **${user.balance.toLocaleString()} monedas**.`
    );
  }

  if (command === "work") {
    const now = Date.now();
    const cooldown = 30 * 1000;
    const remaining = cooldown - (now - user.lastWork);

    if (remaining > 0) {
      return message.reply(`⏰ Debes esperar **${cooldownMessage(remaining)}** para volver a trabajar.`);
    }

    const reward = random(10, 150);
    user.balance += reward;
    user.lastWork = now;
    saveEconomy();

    return message.reply(
      `💼 **¡Trabajaste!**\n\n` +
      `💰 Ganaste **${reward.toLocaleString()} monedas**.\n` +
      `💵 Ahora tienes **${user.balance.toLocaleString()} monedas**.`
    );
  }

  if (command === "risk" || command === "crimen") {
    const isCrime = command === "crimen";
    const now = Date.now();
    const cooldown = isCrime ? 2 * 60 * 1000 : 60 * 1000;
    const lastKey = isCrime ? "lastCrime" : "lastRisk";
    const remaining = cooldown - (now - user[lastKey]);

    if (remaining > 0) {
      return message.reply(`⏰ Espera **${cooldownMessage(remaining)}** para volver a intentarlo.`);
    }

    user[lastKey] = now;
    const success = Math.random() < (isCrime ? 0.20 : 0.30);

    if (success) {
      const reward = isCrime ? random(300, 500) : random(100, 300);
      user.balance += reward;
      saveEconomy();

      return message.reply(
        `${isCrime ? "🚨" : "🎲"} **¡Tuviste suerte!**\n\n` +
        `💰 Ganaste **${reward.toLocaleString()} monedas**.\n` +
        `💵 Ahora tienes **${user.balance.toLocaleString()} monedas**.`
      );
    }

    const loss = Math.min(
      isCrime ? random(200, 600) : random(100, 400),
      user.balance
    );
    user.balance -= loss;
    saveEconomy();

    return message.reply(
      `${isCrime ? "🚔 **¡Te atraparon!**" : "😵 **Perdiste esta vez.**"}\n\n` +
      `💸 Perdiste **${loss.toLocaleString()} monedas**.\n` +
      `💵 Ahora tienes **${user.balance.toLocaleString()} monedas**.`
    );
  }

  if (command === "hut") {
    const now = Date.now();
    const cooldown = 3 * 60 * 1000;
    const remaining = cooldown - (now - user.lastHut);

    if (remaining > 0) {
      return message.reply(`⏰ Ya tienes una pregunta activa.\nEspera **${cooldownMessage(remaining)}**.`);
    }

    user.lastHut = now;
    const questions = [
      { question: "🌍 ¿Cuál es la capital de Francia?", answer: "paris" },
      { question: "🪐 ¿Cuál es el planeta más cercano al Sol?", answer: "mercurio" },
      { question: "🐟 ¿Qué animal es conocido como el rey del mar?", answer: "tiburón" }
    ];
    const selected = questions[random(0, questions.length - 1)];

    await message.reply(
      `🧠 **PREGUNTA POR DINERO**\n\n${selected.question}\n\n` +
      `⏳ Tienes **30 segundos** para responder.`
    );

    try {
      const collected = await message.channel.awaitMessages({
        filter: (msg) => msg.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ["time"]
      });
      const answer = collected.first().content.trim().toLowerCase();

      if (answer === selected.answer) {
        const reward = random(200, 500);
        user.balance += reward;
        saveEconomy();
        return message.channel.send(`✅ **¡Correcto!**\n💰 Ganaste **${reward.toLocaleString()} monedas**.\n💵 Ahora tienes **${user.balance.toLocaleString()} monedas**.`);
      }

      const loss = Math.min(random(300, 500), user.balance);
      user.balance -= loss;
      saveEconomy();
      return message.channel.send(`❌ **Incorrecto.**\n💸 Perdiste **${loss.toLocaleString()} monedas**.\n💵 Ahora tienes **${user.balance.toLocaleString()} monedas**.`);
    } catch {
      return message.channel.send(`⏰ Se acabó el tiempo. La respuesta era **${selected.answer}**.`);
    }
  }

  if (command === "rob") {
    const now = Date.now();
    const cooldown = 5 * 60 * 1000;
    const remaining = cooldown - (now - user.lastRob);

    if (remaining > 0) {
      return message.reply(`⏰ Espera **${cooldownMessage(remaining)}** para volver a intentarlo.`);
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply("🥷 Debes mencionar a alguien para intentar robarle.\nEjemplo: `p.rob @Usuario`");
    if (target.id === message.author.id) return message.reply("😂 No puedes robarte a ti mismo.");
    if (target.bot) return message.reply("🤖 No puedes robarle a un bot.");

    const targetUser = getUser(target.id);
    if (targetUser.balance <= 0) return message.reply(`���� ${target.username} no tiene dinero disponible para robar.`);

    user.lastRob = now;
    if (Math.random() < 0.50) {
      const stolen = Math.min(random(50, 300), targetUser.balance);
      targetUser.balance -= stolen;
      user.balance += stolen;
      saveEconomy();
      return message.reply(`🥷 **¡Robo exitoso!**\n\n💰 Robaste **${stolen.toLocaleString()} monedas** a ${target}.\n💵 Ahora tienes **${user.balance.toLocaleString()} monedas**.`);
    }

    const fine = Math.min(random(50, 200), user.balance);
    user.balance -= fine;
    saveEconomy();
    return message.reply(`🚔 **¡Te atraparon!**\n\n💸 Perdiste **${fine.toLocaleString()} monedas**.`);
  }

  if (command === "dep" || command === "deposit") {
    if (args[0]?.toLowerCase() !== "all") return message.reply("🏦 Usa `p.dep all` para depositar todo tu dinero.");
    if (user.balance <= 0) return message.reply("💸 No tienes dinero en efectivo para depositar.");

    const amount = user.balance;
    user.balance = 0;
    user.bank += amount;
    saveEconomy();
    return message.reply(`🏦 **Depósito realizado**\n\n💰 Depositaste **${amount.toLocaleString()} monedas**.\n🏦 Banco: **${user.bank.toLocaleString()} monedas**.`);
  }

  if (command === "with" || command === "withdraw") {
    if (args[0]?.toLowerCase() !== "all") return message.reply("💳 Usa `p.with all` para retirar todo tu dinero.");
    if (user.bank <= 0) return message.reply("🏦 No tienes dinero en el banco para retirar.");

    const amount = user.bank;
    user.bank = 0;
    user.balance += amount;
    saveEconomy();
    return message.reply(`💳 **Retiro realizado**\n\n💰 Retiraste **${amount.toLocaleString()} monedas**.\n💵 Dinero disponible: **${user.balance.toLocaleString()} monedas**.`);
  }
});

// ==========================
// 🌐 PUERTO PARA RENDER
// ==========================

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Joshua está funcionando 🤖");
}).listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

// ==========================
// 🔑 CONECTAR A DISCORD
// ==========================

client.login(TOKEN);
