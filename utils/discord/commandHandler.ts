// import { Client, CommandInteraction, Interaction } from 'discord.js';

// // Example of a command structure
// const commands = new Map<string, { description: string, execute: (interaction: CommandInteraction) => void }>();

// // Define your commands
// commands.set('ping', {
//   description: 'Replies with Pong!',
//   execute: async (interaction: CommandInteraction) => {
//     await interaction.reply('Pong!');
//   },
// });

// // You can add more commands like this:
// commands.set('hello', {
//   description: 'Replies with a greeting!',
//   execute: async (interaction: CommandInteraction) => {
//     await interaction.reply(`Hello, ${interaction.user.username}!`);
//   },
// });

// // Handle command interactions
// export const handleCommand = async (interaction: Interaction) => {
//   if (!interaction.isCommand()) return;

//   const command = commands.get(interaction.commandName);
  
//   if (!command) {
//     await interaction.reply({ content: 'Command not recognized.', ephemeral: true });
//     return;
//   }

//   try {
//     await command.execute(interaction);
//   } catch (error) {
//     console.error('Error executing command:', error);
//     await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
//   }
// };

// // Function to register commands with Discord
// export const registerCommands = (client: Client) => {
//   client.on('ready', async () => {
//     const guild = client.guilds.cache.get('your-guild-id');
//     if (!guild) return;

//     // Register the commands
//     const commandsArray = Array.from(commands.keys()).map(name => ({
//       name,
//       description: commands.get(name)!.description,
//     }));

//     await guild.commands.set(commandsArray);
//     console.log('Commands registered with Discord.');
//   });
// };