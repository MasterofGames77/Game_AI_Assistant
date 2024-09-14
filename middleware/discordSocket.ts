// import { Client, GatewayIntentBits } from 'discord.js';
// import dotenv from 'dotenv';

// // Load environment variables from .env file
// dotenv.config();

// const discordClient = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//     GatewayIntentBits.GuildPresences,
//   ],
// });

// // Event handler when the bot is ready
// discordClient.once('ready', () => {
//   console.log(`Discord Bot is ready! Logged in as ${discordClient.user?.tag}`);
// });

// // Event handler for message creation
// discordClient.on('messageCreate', (message) => {
//   if (message.author.bot) return; // Ignore messages from bots

//   // Handle commands or interactions here
//   if (message.content.toLowerCase() === '!ping') {
//     message.channel.send('Pong!');
//   }

//   // Add more event handling logic here
// });

// // Event handler for presence updates
// discordClient.on('presenceUpdate', (oldPresence, newPresence) => {
//   console.log(`User ${newPresence.user?.username} has updated their presence.`);
//   // Add logic to handle presence updates
// });

// // Handle other events as needed

// // Connect to Discord using the bot token from the .env file
// discordClient.login(process.env.DISCORD_BOT_TOKEN);

// // Export the client for use in other parts of the application
// export default discordClient;