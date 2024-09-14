// import { Client, GatewayIntentBits } from 'discord.js';
// import dotenv from 'dotenv';

// dotenv.config();

// // Create a new Discord client with appropriate intents
// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,           // Required to access guilds
//     GatewayIntentBits.GuildMessages,    // Required to read messages
//     GatewayIntentBits.MessageContent,   // Required to access message content (needs proper permissions and intents)
//   ]
// });

// // When the bot is ready
// client.once('ready', () => {
//   console.log(`Logged in as ${client.user?.tag}!`);
// });

// // Event listener for messages
// client.on('messageCreate', (message) => {
//   // Ignore messages from bots
//   if (message.author.bot) return;

//   // Example command handling
//   if (message.content.toLowerCase() === '!ping') {
//     message.channel.send('Pong!');
//   }

//   // Add more commands and logic here
// });

// // Event listener for interactions (e.g., slash commands)
// client.on('interactionCreate', async (interaction) => {
//   if (!interaction.isCommand()) return;

//   const { commandName } = interaction;

//   if (commandName === 'ping') {
//     await interaction.reply('Pong!');
//   }
  
//   // Handle other interactions or slash commands here
// });

// // Log in to Discord using your bot's token from the .env file
// client.login(process.env.DISCORD_BOT_TOKEN);

// // Export the client for use in other parts of the application
// export default client;