// import { Client, GatewayIntentBits } from 'discord.js';
// import { handleCommand, registerCommands } from './discord/commandHandler';
// import { logger } from './logger';
// import dotenv from 'dotenv';

// dotenv.config();

// // Validate environment variables
// if (!process.env.DISCORD_BOT_TOKEN) {
//   throw new Error('DISCORD_BOT_TOKEN is not defined in environment variables');
// }

// // Create Discord client with required intents
// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//     GatewayIntentBits.GuildMembers,
//   ]
// });

// // Bot ready event
// client.once('ready', async () => {
//   logger.info(`Bot logged in as ${client.user?.tag}`);
  
//   try {
//     // Register slash commands
//     await registerCommands(client);
//     logger.info('Slash commands registered successfully');
//   } catch (error) {
//     logger.error('Error registering slash commands:', { error });
//   }
// });

// // Handle interactions (slash commands)
// client.on('interactionCreate', async (interaction) => {
//   try {
//     await handleCommand(interaction);
//   } catch (error) {
//     logger.error('Error handling interaction:', { error });
//   }
// });

// // Error handling
// client.on('error', (error) => {
//   logger.error('Discord client error:', { error });
// });

// // Handle rate limits
// client.on('rateLimit', (rateLimitInfo) => {
//   logger.warn('Rate limit hit:', { 
//     timeout: rateLimitInfo.timeout,
//     limit: rateLimitInfo.limit,
//     method: rateLimitInfo.method
//   });
// });

// // Debug events in development
// if (process.env.NODE_ENV === 'development') {
//   client.on('debug', (message) => {
//     logger.debug('Discord debug:', { message });
//   });
// }

// // Process error handling
// process.on('unhandledRejection', (error) => {
//   logger.error('Unhandled promise rejection:', { error });
// });

// process.on('uncaughtException', (error) => {
//   logger.error('Uncaught exception:', { error });
//   // Gracefully shutdown on uncaught exceptions
//   client.destroy();
//   process.exit(1);
// });

// // Login to Discord
// client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
//   logger.error('Failed to login to Discord:', { error });
//   process.exit(1);
// });

// export default client;