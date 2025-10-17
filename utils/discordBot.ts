import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordBotHandler } from './discord/botHandler';
import { handleCommand, registerCommands } from './discord/commandHandler';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DISCORD_API_TOKEN) {
  console.error('DISCORD_API_TOKEN is not defined in environment variables');
  throw new Error('DISCORD_API_TOKEN is not defined in environment variables');
}

// console.log('Discord bot initialization starting...'); // Commented out for production
// console.log('Environment check:', {
//   hasToken: !!process.env.DISCORD_API_TOKEN,
//   hasApplicationId: !!process.env.DISCORD_APPLICATION_ID,
//   environment: process.env.NODE_ENV
// }); // Commented out for production

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

client.once('ready', async () => {
  // console.log(`✅ Bot logged in as ${client.user?.tag}`); // Commented out for production
  // console.log(`✅ Bot ID: ${client.user?.id}`); // Commented out for production
  // console.log(`✅ Bot is now online and ready!`); // Commented out for production
  
  // Register slash commands
  try {
    await registerCommands(client);
    // console.log('✅ Slash commands registered successfully'); // Commented out for production
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
});

// Add error handling for connection issues
client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

client.on('disconnect', () => {
  // console.log('⚠️ Discord bot disconnected'); // Commented out for production
});

client.on('reconnecting', () => {
  // console.log('🔄 Discord bot reconnecting...'); // Commented out for production
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
  await handleCommand(interaction);
});

// console.log('🔄 Attempting to login to Discord...'); // Commented out for production
client.login(process.env.DISCORD_API_TOKEN)
  .then(() => {
    // console.log('✅ Discord login initiated successfully'); // Commented out for production
  })
  .catch((error) => {
    console.error('❌ Discord login failed:', error);
  });

export default client;