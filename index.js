const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");

const http = require("http");
const fs = require("fs");

// ═══════════════════════════════════════
// ⚙️ CONFIGURACIÓN
// ═══════════════════════════════════════

const PREFIX = "p.";
const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 3000;
const ECONOMY_FILE = "./economy.json";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ═══════════════════════════════════════
// 💾 ECONOMÍA
// ═══════════════════════════════════════

let economy = {};

if (fs.existsSync(ECONOMY_FILE)) {
  try {
    economy = JSON.parse(
      fs.readFileSync(ECONOMY_FILE, "utf8")
    );
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

function getUser(id) {
  if (!economy[id]) {
    economy[id] = {
      cash: 0,
      bank: 0,
      daily: 0,
      work: 0,
      crime: 0,
      hut: 0,
      rob: 0,
      risk: 0,
      stats: {
        work: 0,
        crime: 0,
        rob: 0,
        gifts: 0
      }
    };
  }

  return economy[id];
}

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function money(amount) {
  return `${amount.toLocaleString("es-ES")} 🪙`;
}

function getCooldown(last, seconds) {
  const remaining =
    seconds * 1000 - (Date.now() - last);

  if (remaining <= 0) return null;

  const totalSeconds =
    Math.ceil(remaining / 1000);

  if (totalSeconds >= 60) {
    const minutes =
      Math.ceil(totalSeconds / 60);

    return `⏳ Espera **${minutes} minuto(s)**.`;
  }

  return `⏳ Espera **${totalSeconds} segundo(s)**.`;
}

// ═══════════════════════════════════════
// 🎨 DECORACIÓN
// ═══════════════════════════════════════

function success(text) {
  return (
    "╭━━━〔 ✅ ÉXITO 〕━━━╮\n" +
    `┃ ${text}\n` +
    "╰━━━━━━━━━━━━━━━━━━╯"
  );
}

function error(text) {
  return (
    "╭━━━〔 ❌ ERROR 〕━━━╮\n" +
    `┃ ${text}\n` +
    "╰━━━━━━━━━━━━━━━━━━╯"
  );
}

function box(title, text) {
  return (
    `╔══════════════════════════════╗\n` +
    `║ ${title}\n` +
    `╠══════════════════════════════╣\n` +
    `${text}\n` +
    `╚══════════════════════════════╝`
  );
}

function isAdmin(message) {
  return message.member?.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

// ═══════════════════════════════════════
// 🤖 BOT LISTO
// ═══════════════════════════════════════

client.once("ready", () => {
  console.log(
    `🤖 Joshua conectado como ${client.user.tag}`
  );

  client.user.setPresence({
    activities: [
      {
        name: "p.help 📖",
        type: 0
      }
    ],
    status: "online"
  });
});

// ═══════════════════════════════════════
// 💬 MENSAJES
// ═══════════════════════════════════════

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.content
    .toLowerCase()
    .startsWith(PREFIX)) {
    return;
  }

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = args
    .shift()
    ?.toLowerCase();

  if (!command) return;

  const user = getUser(message.author.id);

  // ═══════════════════════════════════════
  // 🏓 PING
  // ═══════════════════════════════════════

  if (command === "ping") {
    return message.reply(
      box(
        "🏓 PONG",
        `┃ ⚡ Latencia: **${client.ws.ping}ms**
┃ 🤖 Joshua está funcionando.
┃ 🌐 Estado: **ONLINE 🟢**`
      )
    );
  }

  // ═══════════════════════════════════════
  // 👋 HOLA
  // ═══════════════════════════════════════

  if (command === "hola") {
    return message.reply(
      box(
        "👋 HOLA",
        `┃ ¡Hola, ${message.author}! 😎
┃ ✨ ¡Qué bueno verte por aquí!
┃ 🤖 Joshua te saluda.`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🤖 INFO
  // ═══════════════════════════════════════

  if (command === "info") {
    return message.reply(
      box(
        "🤖 JOSHUA",
        `┃ 🛠️ Versión: **1.0**
┃ ⚡ Prefix: **p.**
┃ 💰 Economía: **ACTIVA**
┃ 🎮 Diversión: **ACTIVA**
┃ 🛡️ Administración: **ACTIVA**
┃ 🌐 Estado: **ONLINE 🟢**`
      )
    );
  }

  // ═══════════════════════════════════════
  // 📖 HELP
  // ═══════════════════════════════════════

  if (command === "help") {
    return message.reply(
`╔══════════════════════════════════╗
║       🤖 JOSHUA — AYUDA 📖      ║
╚══════════════════════════════════╝

💰 ━━━ ECONOMÍA ━━━

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
> 💸 \`p.pay @usuario cantidad\` — Pagar

👤 ━━━ PERFIL ━━━

> 👤 \`p.profile\` — Tu perfil
> 📊 \`p.stats\` — Tus estadísticas
> 🔎 \`p.userinfo @usuario\` — Información
> 🏰 \`p.serverinfo\` — Información del servidor
> 👑 \`p.rank\` — Ranking

🎮 ━━━ DIVERSIÓN ━━━

> 🪙 \`p.coinflip\` — Lanzar moneda
> 🎲 \`p.dado\` — Lanzar dado
> 🎲 \`p.risk\` — Juego de riesgo
> 🎱 \`p.8ball pregunta\` — Bola mágica
> 😎 \`p.emoji\` — Emoji aleatorio
> 🎯 \`p.challenge\` — Reto
> 📢 \`p.say texto\` — Joshua habla

⚙️ ━━━ UTILIDADES ━━━

> 🏓 \`p.ping\` — Ver latencia
> 👋 \`p.hola\` — Saludar
> 🤖 \`p.info\` — Información de Joshua

━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ ¿Eres administrador?

Usa **p.helpadmin** para ver
los comandos de administración.

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  // ═══════════════════════════════════════
  // 🛡️ HELP ADMIN
  // ══════════���════════════════════════════

  if (command === "helpadmin") {
    if (!isAdmin(message)) {
      return message.reply(
        error(
          "🚫 Necesitas permisos de Administrador."
        )
      );
    }

    return message.reply(
`╔══════════════════════════════════╗
║       🛡️ JOSHUA — ADMIN         ║
╚══════════════════════════════════╝

🔨 ━━━ MODERACIÓN ━━━

> 🔇 \`p.mute @usuario\`
> 🔊 \`p.unmute @usuario\`
> 👢 \`p.kick @usuario\`
> 🔨 \`p.ban @usuario\`
> 🔓 \`p.unban ID\`
> ☠️ \`p.permaban @usuario\`
> ⚠️ \`p.warn @usuario\`
> 🧹 \`p.purge cantidad\`

━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 Todos estos comandos requieren
**permisos de Administrador**.

🛡️ Usa las herramientas con cuidado.

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  // ════════════════════════��══════════════
  // 💰 BALANCE
  // ═══════════════════════════════════════

  if (
    command === "balance" ||
    command === "bal"
  ) {
    const total =
      user.cash + user.bank;

    return message.reply(
      box(
        "💰 TU ECONOMÍA",
        `┃ 💵 Efectivo: **${money(user.cash)}**
┃ 🏦 Banco: **${money(user.bank)}**
┃ 💎 TOTAL: **${money(total)}**
┃
┃ 🔐 El dinero del banco está protegido.`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🏦 BANK
  // ═══════════════════════════════════════

  if (command === "bank") {
    return message.reply(
      box(
        "🏦 BANCO",
        `┃ 🔐 Dinero protegido:
┃ **${money(user.bank)}**
┃
┃ 💵 Efectivo:
┃ **${money(user.cash)}**
┃
┃ 💎 Total:
┃ **${money(user.cash + user.bank)}**`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🎁 DAILY
  // ══════════════════════════════════════���

  if (command === "daily") {
    const cd =
      getCooldown(user.daily, 86400);

    if (cd) {
      return message.reply(error(cd));
    }

    const reward = 1000;

    user.cash += reward;
    user.daily = Date.now();

    saveEconomy();

    return message.reply(
      success(
        `🎁 Recompensa diaria: **${money(reward)}**`
      )
    );
  }

  // ═══════════════════════════════════════
  // 💼 WORK
  // ═══════════════════════════════════════

  if (command === "work") {
    const cd =
      getCooldown(user.work, 30);

    if (cd) {
      return message.reply(error(cd));
    }

    const reward =
      random(10, 150);

    user.cash += reward;
    user.work = Date.now();
    user.stats.work++;

    saveEconomy();

    return message.reply(
      success(
        `💼 Trabajaste y ganaste **${money(reward)}**.`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🕵️ CRIMEN
  // ═══════════════════════���═══════════════

  if (command === "crimen") {
    const cd =
      getCooldown(user.crime, 120);

    if (cd) {
      return message.reply(error(cd));
    }

    user.crime = Date.now();
    user.stats.crime++;

    if (Math.random() < 0.20) {
      const reward =
        random(300, 500);

      user.cash += reward;

      saveEconomy();

      return message.reply(
        success(
          `🕵️ ¡La misión salió bien!
┃ 💰 Ganaste **${money(reward)}**.`
        )
      );
    }

    const loss =
      Math.min(
        user.cash,
        random(200, 600)
      );

    user.cash -= loss;

    saveEconomy();

    return message.reply(
      error(
        `🚨 La misión salió mal.
┃ 💸 Perdiste **${money(loss)}**.`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🧠 HUT
  // ═══════════════════════════════════════

  if (command === "hut") {
    const cd =
      getCooldown(user.hut, 180);

    if (cd) {
      return message.reply(error(cd));
    }

    const questions = [
      {
        q: "¿Cuánto es 7 × 8?",
        a: "56"
      },
      {
        q: "¿Cuál es el planeta rojo?",
        a: "marte"
      },
      {
        q: "¿Cuántos días tiene una semana?",
        a: "7"
      },
      {
        q: "¿Cuál es la capital de Francia?",
        a: "paris"
      }
    ];

    const question =
      questions[
        random(0, questions.length - 1)
      ];

    user.hut = Date.now();

    await message.reply(
      `╭━━━〔 🧠 PREGUNTA 〕━━━╮
┃ ❓ ${question.q}
┃
┃ ⏳ Tienes **30 segundos**.
╰━━━━━━━━━━━━━━━━━━━━╯`
    );

    try {
      const collected =
        await message.channel.awaitMessages({
          filter: m =>
            m.author.id ===
            message.author.id,
          max: 1,
          time: 30000
        });

      const answer =
        collected.first()
          .content
          .toLowerCase()
          .trim();

      if (answer === question.a) {
        const reward =
          random(200, 500);

        user.cash += reward;

        saveEconomy();

        return message.reply(
          success(
            `🧠 ¡Correcto!
┃ 💰 Ganaste **${money(reward)}**.`
          )
        );
      }

      const loss =
        Math.min(
          user.cash,
          random(300, 500)
        );

      user.cash -= loss;

      saveEconomy();

      return message.reply(
        error(
          `❌ Respuesta incorrecta.
┃ 💸 Perdiste **${money(loss)}**.`
        )
      );

    } catch {
      return message.reply(
        error(
          "⏰ Se acabó el tiempo."
        )
      );
    }
  }

  // ═══════════════════════════════════════
  // 🥷 ROB
  // ═══════════════════════════════════════

  if (command === "rob") {
    const cd =
      getCooldown(user.rob, 300);

    if (cd) {
      return message.reply(error(cd));
    }

    const target =
      message.mentions.users.first();

    if (!target) {
      return message.reply(
        error(
          "🥷 Menciona a alguien."
        )
      );
    }

    if (
      target.id ===
      message.author.id
    ) {
      return message.reply(
        error(
          "😂 No puedes robarte a ti mismo."
        )
      );
    }

    const victim =
      getUser(target.id);

    if (victim.cash <= 0) {
      return message.reply(
        error(
          "💸 Esa persona no tiene efectivo."
        )
      );
    }

    user.rob = Date.now();

    if (Math.random() < 0.50) {
      const amount =
        Math.min(
          victim.cash,
          random(
            50,
            Math.max(50, victim.cash)
          )
        );

      victim.cash -= amount;
      user.cash += amount;
      user.stats.rob++;

      saveEconomy();

      return message.reply(
        success(
          `🥷 ¡Robo exitoso!
┃ 💰 Conseguí **${money(amount)}**.`
        )
      );
    }

    saveEconomy();

    return message.reply(
      error(
        "🚨 ¡Te descubrieron! El robo falló."
      )
    );
  }

  // ═══════════════════════════════════════
  // 🏦 DEPOSITAR
  // ═══════════════════════════════════════

  if (
    command === "dep" ||
    command === "deposit"
  ) {
    if (
      args[0]?.toLowerCase() !==
      "all"
    ) {
      return message.reply(
        error(
          "🏦 Usa: `p.dep all`"
        )
      );
    }

    if (user.cash <= 0) {
      return message.reply(
        error(
          "💵 No tienes efectivo."
        )
      );
    }

    const amount = user.cash;

    user.bank += amount;
    user.cash = 0;

    saveEconomy();

    return message.reply(
      success(
        `🏦 Depositaste **${money(amount)}**.`
      )
    );
  }

  // ═══════════════════════════════════════
  // 💵 RETIRAR
  // ═══════════════════════════════════════

  if (
    command === "with" ||
    command === "withdraw"
  ) {
    if (
      args[0]?.toLowerCase() !==
      "all"
    ) {
      return message.reply(
        error(
          "💵 Usa: `p.with all`"
        )
      );
    }

    if (user.bank <= 0) {
      return message.reply(
        error(
          "🏦 No tienes dinero en el banco."
        )
      );
    }

    const amount = user.bank;

    user.cash += amount;
    user.bank = 0;

    saveEconomy();

    return message.reply(
      success(
        `💵 Retiraste **${money(amount)}**.`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🎁 GIFT
  // ═══════════════════════════════════════

  if (command === "gift") {
    const target =
      message.mentions.users.first();

    const amount =
      parseInt(args[1]);

    if (
      !target ||
      !amount ||
      amount <= 0
    ) {
      return message.reply(
        error(
          "🎁 Usa: `p.gift @usuario cantidad`"
        )
      );
    }

    if (
      target.id ===
      message.author.id
    ) {
      return message.reply(
        error(
          "😂 No puedes regalarte dinero."
        )
      );
    }

    if (user.cash < amount) {
      return message.reply(
        error(
          "💸 No tienes suficiente efectivo."
        )
      );
    }

    const receiver =
      getUser(target.id);

    user.cash -= amount;
    receiver.cash += amount;
    user.stats.gifts++;

    saveEconomy();

    return message.reply(
      success(
        `🎁 Regalaste **${money(amount)}** a **${target.username}**.`
      )
    );
  }

  // ═══════════════════════════════════════
  // 💸 PAY
  // ═══════════════════════════════════════

  if (command === "pay") {
    const target =
      message.mentions.users.first();

    const amount =
      parseInt(args[1]);

    if (
      !target ||
      !amount ||
      amount <= 0
    ) {
      return message.reply(
        error(
          "💸 Usa: `p.pay @usuario cantidad`"
        )
      );
    }

    if (
      target.id ===
      message.author.id
    ) {
      return message.reply(
        error(
          "😂 No puedes pagarte a ti mismo."
        )
      );
    }

    if (user.cash < amount) {
      return message.reply(
        error(
          "💰 No tienes suficiente dinero."
        )
      );
    }

    const receiver =
      getUser(target.id);

    user.cash -= amount;
    receiver.cash += amount;

    saveEconomy();

    return message.reply(
      success(
        `💸 Enviaste **${money(amount)}** a **${target.username}**.`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🪙 COINFLIP
  // ═══════════════════════════════════════

  if (command === "coinflip") {
    const result =
      Math.random() < 0.5
        ? "CARA 🪙"
        : "CRUZ 🪙";

    return message.reply(
      box(
        "🪙 COINFLIP",
        `┃ 🎯 Resultado:
┃
┃ **${result}**`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🎲 RISK
  // ═══════════════════════════════════════

  if (command === "risk") {
    const cd =
      getCooldown(user.risk, 60);

    if (cd) {
      return message.reply(error(cd));
    }

    user.risk = Date.now();

    if (Math.random() < 0.30) {
      const reward =
        random(100, 300);

      user.cash += reward;

      saveEconomy();

      return message.reply(
        success(
          `🎲 ¡Ganaste!
┃ 💰 Recibiste **${money(reward)}**.`
        )
      );
    }

    const loss =
      Math.min(
        user.cash,
        random(100, 400)
      );

    user.cash -= loss;

    saveEconomy();

    return message.reply(
      error(
        `🎲 Salió mal.
┃ 💸 Perdiste **${money(loss)}**.`
      )
    );
  }

  // ═══════════════════════════════════════
  // 👤 PROFILE
  // ═══════════════════════════════════════

  if (command === "profile") {
    const total =
      user.cash + user.bank;

    return message.reply(
      box(
        `👤 PERFIL DE ${message.author.username}`,
        `┃ 💵 Efectivo: **${money(user.cash)}**
┃ 🏦 Banco: **${money(user.bank)}**
┃ 💎 Total: **${money(total)}**
┃
┃ 💼 Trabajos: **${user.stats.work}**
┃ 🕵️ Misiones: **${user.stats.crime}**
┃ 🥷 Robos: **${user.stats.rob}**
┃ 🎁 Regalos: **${user.stats.gifts}**`
      )
    );
  }

  // ═══════════════════════════════════════
  // 📊 STATS
  // ═══════════════════════════════════════

  if (command === "stats") {
    return message.reply(
      box(
        "📊 TUS ESTADÍSTICAS",
        `┃ 💼 Trabajos: **${user.stats.work}**
┃ 🕵️ Misiones: **${user.stats.crime}**
┃ 🥷 Robos: **${user.stats.rob}**
┃ 🎁 Regalos: **${user.stats.gifts}**`
      )
    );
  }

  // ═══════════════════════════════════════
  // 👑 RANK
  // ═══════════════════════════════════════

  if (command === "rank") {
    const ranking =
      Object.entries(economy)
        .map(([id, data]) => ({
          id,
          total:
            data.cash + data.bank
        }))
        .sort(
          (a, b) =>
            b.total - a.total
        )
        .slice(0, 10);

    let text = "";

    for (
      let i = 0;
      i < ranking.length;
      i++
    ) {
      const item = ranking[i];

      let member = null;

      try {
        member =
          await message.guild.members.fetch(
            item.id
          );
      } catch {}

      const name =
        member?.user.username ||
        "Usuario";

      const medals = [
        "🥇",
        "🥈",
        "🥉"
      ];

      const medal =
        medals[i] ||
        "🏅";

      text +=
        `┃ ${medal} **${name}** — ${money(item.total)}\n`;
    }

    return message.reply(
      box(
        "👑 TOP 10 RICOS",
        text ||
          "┃ 😢 Todavía no hay jugadores."
      )
    );
  }

  // ═══════════════════════════════════════
  // 🎲 DADO
  // ═══════════════════════════════════════

  if (command === "dado") {
    const result =
      random(1, 6);

    return message.reply(
      box(
        "🎲 DADO",
        `┃ 🎯 Resultado:
┃
┃ **${result}**`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🎱 8BALL
  // ═══════════════════════════════════════

  if (command === "8ball") {
    if (!args.length) {
      return message.reply(
        error(
          "🎱 Hazme una pregunta."
        )
      );
    }

    const answers = [
      "🎯 Sí.",
      "🤔 Probablemente.",
      "✨ Definitivamente.",
      "😬 No estoy seguro.",
      "❌ No.",
      "🔮 Las estrellas dicen que sí.",
      "🌙 Pregunta más tarde."
    ];

    const answer =
      answers[
        random(
          0,
          answers.length - 1
        )
      ];

    return message.reply(
      box(
        "🎱 MAGIC 8BALL",
        `┃ ❓ Pregunta:
┃ ${args.join(" ")}
┃
┃ 🔮 Respuesta:
┃ **${answer}**`
      )
    );
  }

  // ═══════════════════════════════════════
  // 😎 EMOJI
  // ═══════════════════════════════════════

  if (command === "emoji") {
    const emojis = [
      "😀",
      "😂",
      "😎",
      "🤯",
      "🔥",
      "💀",
      "👑",
      "🚀",
      "🎉",
      "🤖",
      "🤑",
      "🥶"
    ];

    const emoji =
      emojis[
        random(
          0,
          emojis.length - 1
        )
      ];

    return message.reply(
      box(
        "😎 EMOJI",
        `┃ Tu emoji es:
┃
┃ ${emoji}`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🎯 CHALLENGE
  // ═══════════════════════════════════════

  if (command === "challenge") {
    const challenges = [
      "🎯 Escribe un mensaje usando solo emojis.",
      "😂 Cuenta un chiste.",
      "🧠 Di una capital de un país.",
      "🎮 Di tu videojuego favorito.",
      "⚡ Escribe una palabra al revés."
    ];

    const challenge =
      challenges[
        random(
          0,
          challenges.length - 1
        )
      ];

    return message.reply(
      box(
        "🎯 RETO",
        `┃ ${challenge}`
      )
    );
  }

  // ═══════════════════════════════════════
  // 📢 SAY
  // ═══════════════════════════════════════

  if (command === "say") {
    if (!args.length) {
      return message.reply(
        error(
          "📢 Escribe algo después de `p.say`."
        )
      );
    }

    return message.reply(
      box(
        "📢 JOSHUA DICE",
        `┃ ${args.join(" ")}`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🏰 SERVERINFO
  // ═══════════════════════════════════════

  if (command === "serverinfo") {
    const guild =
      message.guild;

    const humans =
      guild.members.cache.filter(
        member => !member.user.bot
      ).size;

    const bots =
      guild.members.cache.filter(
        member => member.user.bot
      ).size;

    return message.reply(
      box(
        "🏰 INFORMACIÓN DEL SERVIDOR",
        `┃ 🏠 Nombre: **${guild.name}**
┃ 🆔 ID: \`${guild.id}\`
┃ 👑 Dueño: <@${guild.ownerId}>
┃ 👥 Miembros: **${guild.memberCount}**
┃ 👤 Humanos: **${humans}**
┃ 🤖 Bots: **${bots}**
┃ 💬 Canales: **${guild.channels.cache.size}**
┃ 🎭 Roles: **${guild.roles.cache.size}**
┃ 📅 Creado: <t:${Math.floor(guild.createdTimestamp / 1000)}:D>`
      )
    );
  }

  // ═══════════════════════════════════════
  // 👤 USERINFO
  // ═══════════════════════════════════════

  if (
    command === "userinfo" ||
    command === "user"
  ) {
    const member =
      message.mentions.members.first() ||
      message.member;

    const targetUser =
      member.user;

    const roles =
      member.roles.cache
        .filter(
          role =>
            role.id !==
            message.guild.id
        )
        .map(role => role.name)
        .slice(0, 10)
        .join(", ") ||
      "Ninguno";

    return message.reply(
      box(
        "👤 INFORMACIÓN DEL USUARIO",
        `┃ 👤 Usuario: **${targetUser.username}**
┃ 🆔 ID: \`${targetUser.id}\`
┃ 🤖 Bot: **${targetUser.bot ? "Sí" : "No"}**
┃ 📅 Cuenta: <t:${Math.floor(targetUser.createdTimestamp / 1000)}:D>
┃ 📥 Entró: <t:${Math.floor(member.joinedTimestamp / 1000)}:D>
┃ 🎭 Roles: **${roles}**`
      )
    );
  }

  // ═══════════════════════════════════════
  // 🛡️ COMANDOS ADMIN
  // ═══════════════════════════════════════

  const adminCommands = [
    "mute",
    "unmute",
    "kick",
    "ban",
    "unban",
    "permaban",
    "warn",
    "purge"
  ];

  if (adminCommands.includes(command)) {

    if (!isAdmin(message)) {
      return message.reply(
        error(
          "🚫 Necesitas permisos de Administrador."
        )
      );
    }

    // 🔇 MUTE
    if (command === "mute") {
      const member =
        message.mentions.members.first();

      if (!member) {
        return message.reply(
          error(
            "🔇 Menciona al usuario."
          )
        );
      }

      if (!member.moderatable) {
        return message.reply(
          error(
            "❌ No puedo silenciar a ese usuario."
          )
        );
      }

      try {
        await member.timeout(
          60 * 60 * 1000,
          `Mute por ${message.author.tag}`
        );

        return message.reply(
          success(
            `🔇 **${member.user.username}** fue silenciado durante **1 hora**.`
          )
        );
      } catch {
        return message.reply(
          error(
            "❌ No pude silenciar al usuario."
          )
        );
      }
    }

    // 🔊 UNMUTE
    if (command === "unmute") {
      const member =
        message.mentions.members.first();

      if (!member) {
        return message.reply(
          error(
            "🔊 Menciona al usuario."
          )
        );
      }

      try {
        await member.timeout(null);

        return message.reply(
          success(
            `🔊 Se quitó el silencio a **${member.user.username}**.`
          )
        );
      } catch {
        return message.reply(
          error(
            "❌ No pude quitar el silencio."
          )
        );
      }
    }

    // 👢 KICK
    if (command === "kick") {
      const member =
        message.mentions.members.first();

      if (!member) {
        return message.reply(
          error(
            "👢 Menciona al usuario."
          )
        );
      }

      if (!member.kickable) {
        return message.reply(
          error(
            "❌ No puedo expulsar a ese usuario."
          )
        );
      }

      try {
        await member.kick(
          `Kick por ${message.author.tag}`
        );

        return message.reply(
          success(
            `👢 **${member.user.username}** fue expulsado.`
          )
        );
      } catch {
        return message.reply(
          error(
            "❌ No pude expulsar al usuario."
          )
        );
      }
    }

    // 🔨 BAN
    if (
      command === "ban" ||
      command === "permaban"
    ) {
      const member =
        message.mentions.members.first();

      if (!member) {
        return message.reply(
          error(
            "🔨 Menciona al usuario."
          )
        );
      }

      if (!member.bannable) {
        return message.reply(
          error(
            "❌ No puedo banear a ese usuario."
          )
        );
      }

      try {
        await member.ban({
          reason:
            `${command} por ${message.author.tag}`
        });

        return message.reply(
          success(
            `🔨 **${member.user.username}** fue baneado.`
          )
        );
      } catch {
        return message.reply(
          error(
            "❌ No pude banear al usuario."
          )
        );
      }
    }

    // 🔓 UNBAN
    if (command === "unban") {
      const id = args[0];

      if (!id) {
        return message.reply(
          error(
            "🔓 Usa: `p.unban ID`"
          )
        );
      }

      try {
        await message.guild.members.unban(id);

        return message.reply(
          success(
            `🔓 Usuario \`${id}\` desbaneado.`
          )
        );
      } catch {
        return message.reply(
          error(
            "❌ No encontré ese usuario en los baneados."
          )
        );
      }
    }

    // ⚠️ WARN
    if (command === "warn") {
      const member =
        message.mentions.members.first();

      if (!member) {
        return message.reply(
          error(
            "⚠️ Menciona al usuario."
          )
        );
      }

      return message.reply(
        box(
          "⚠️ ADVERTENCIA",
          `┃ 👤 Usuario: **${member.user.username}**
┃ 👮 Moderador: **${message.author.username}**
┃
┃ ⚠️ El usuario recibió una advertencia.`
        )
      );
    }

    // 🧹 PURGE
    if (command === "purge") {
      const amount =
        parseInt(args[0]);

      if (
        !amount ||
        amount < 1 ||
        amount > 99
      ) {
        return message.reply(
          error(
            "🧹 Usa una cantidad entre **1 y 99**."
          )
        );
      }

      try {
        const deleted =
          await message.channel.bulkDelete(
            amount,
            true
          );

        const msg =
          await message.channel.send(
            success(
              `🧹 Eliminé **${deleted.size} mensajes**.`
            )
          );

        setTimeout(
          () =>
            msg.delete().catch(() => {}),
          4000
        );

        return;
      } catch {
        return message.reply(
          error(
            "❌ No pude borrar los mensajes."
          )
        );
      }
    }
  }

  // ═══════════════════════════════════════
  // ❓ COMANDO DESCONOCIDO
  // ═══════════════════════════════════════

  return message.reply(
    `╭━━━〔 ❓ ¿QUÉ? 〕━━━╮
┃ ❌ No conozco \`${PREFIX}${command}\`.
┃
┃ 📖 Usa **p.help**
┃ para ver todos los comandos.
╰━━━━━��━━━━━━━━━━━━╯`
  );
});

// ═══════════════════════════════════════
// 🌐 SERVIDOR PARA RENDER
// ═══════════════════════════════════════

http
  .createServer((req, res) => {
    res.writeHead(200);
    res.end(
      "🤖 Joshua está funcionando correctamente."
    );
  })
  .listen(PORT, () => {
    console.log(
      `🌐 Puerto ${PORT} activo.`
    );
  });

// ═══════════════════════════════════════
// 🚀 LOGIN
// ═══════════════════════════════════════

client.login(TOKEN);
