const {
  Client,
  GatewayIntentBits,
  Events
} = require("discord.js");

const http = require("http");

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

client.once(Events.ClientReady, (bot) => {
  console.log(`🤖 ${bot.user.tag} está conectado!`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (!message.content.startsWith(PREFIX)) return;

  const command = message.content
    .slice(PREFIX.length)
    .trim()
    .toLowerCase();

  if (command === "ping") {
    await message.reply("🏓 ¡Pong! Joshua está funcionando.");
  }

  if (command === "help") {
    await message.reply(
      "📚 **COMANDOS DE JOSHUA**\n\n" +
      "🏓 `p.ping` — Comprueba si estoy funcionando\n" +
      "📚 `p.help` — Muestra esta lista\n" +
      "👋 `p.hola` — Saluda\n" +
      "ℹ️ `p.info` — Información del bot"
    );
  }

  if (command === "hola") {
    await message.reply(`👋 ¡Hola, ${message.author}!`);
  }

  if (command === "info") {
    await message.reply(
      "🤖 **Joshua Bot**\n\n" +
      "⚙️ Bot de Discord\n" +
      "🔧 Prefijo: `p.`"
    );
  }
});

// Puerto para Render
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Joshua está funcionando 🤖");
}).listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

// Conectar a Discord
client.login(TOKEN);
