import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordBotHandler } from './discord/botHandler';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DISCORD_API_TOKEN) {
  throw new Error('DISCORD_API_TOKEN is not defined in environment variables');
}

// Initialize the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// Initialize bot handler
const botHandler = new DiscordBotHandler(client);

// Export the bot handler for use in other modules
export { botHandler };

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user?.tag}`);
});

client.login(process.env.DISCORD_API_TOKEN);

export default client;