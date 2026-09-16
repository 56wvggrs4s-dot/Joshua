const {
  Client,
  GatewayIntentBits,
  Events
} = require("discord.js");

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

  if (message.content === "!ping") {
    await message.reply("🏓 ¡Pong!");
  }

  if (message.content === "!hola") {
    await message.reply(`👋 ¡Hola, ${message.author}!`);
  }

  if (message.content === "!info") {
    await message.reply(
      "🤖 **Jodua Bot**\n\n" +
      "⚙️ Bot de Discord\n" +
      "📌 Escribe `!ayuda` para ver mis comandos."
    );
  }

  if (message.content === "!ayuda") {
    await message.reply(
      "📚 **COMANDOS**\n\n" +
      "🏓 `!ping` — Comprueba si estoy funcionando\n" +
      "👋 `!hola` — Saluda\n" +
      "ℹ️ `!info` — Información del bot\n" +
      "📚 `!ayuda` — Muestra esta lista"
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
