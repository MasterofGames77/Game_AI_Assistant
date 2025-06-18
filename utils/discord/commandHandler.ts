// import { Client, CommandInteraction, Interaction, PermissionResolvable } from 'discord.js';
// import { logger } from '../logger';

// // Enhanced command structure
// interface Command {
//   name: string;
//   description: string;
//   category: 'General' | 'Moderation' | 'Fun' | 'Utility' | 'Admin';
//   cooldown?: number; // Cooldown in seconds
//   permissions?: PermissionResolvable[];
//   execute: (interaction: CommandInteraction) => Promise<void>;
// }

// // Cooldown management
// const cooldowns = new Map<string, Map<string, number>>();

// // Store commands in a Map for easy access
// const commands = new Map<string, Command>();

// // Register basic commands with enhanced features
// commands.set('ping', {
//   name: 'ping',
//   description: 'Replies with Pong and latency',
//   category: 'Utility',
//   cooldown: 5,
//   execute: async (interaction: CommandInteraction) => {
//     const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
//     const latency = sent.createdTimestamp - interaction.createdTimestamp;
//     await interaction.editReply(`Pong! 🏓\nBot Latency: ${latency}ms\nAPI Latency: ${interaction.client.ws.ping}ms`);
//   },
// });

// // Enhanced help command with categories
// commands.set('help', {
//   name: 'help',
//   description: 'Lists all available commands',
//   category: 'General',
//   cooldown: 10,
//   execute: async (interaction: CommandInteraction) => {
//     const categories = new Map<string, Command[]>();
    
//     // Group commands by category
//     Array.from(commands.values()).forEach(cmd => {
//       if (!categories.has(cmd.category)) {
//         categories.set(cmd.category, []);
//       }
//       categories.get(cmd.category)?.push(cmd);
//     });

//     // Build help message
//     let helpMessage = '**📚 Available Commands**\n\n';
    
//     categories.forEach((cmds, category) => {
//       helpMessage += `**${category}**\n`;
//       cmds.forEach(cmd => {
//         const cooldownStr = cmd.cooldown ? ` (Cooldown: ${cmd.cooldown}s)` : '';
//         helpMessage += `> \`/${cmd.name}\` - ${cmd.description}${cooldownStr}\n`;
//       });
//       helpMessage += '\n';
//     });
    
//     await interaction.reply({
//       content: helpMessage,
//       ephemeral: true
//     });
//   },
// });

// // Check command permissions
// const checkPermissions = (interaction: CommandInteraction, command: Command): boolean => {
//   if (!command.permissions) return true;
  
//   return command.permissions.every(permission => 
//     interaction.memberPermissions?.has(permission)
//   );
// };

// // Check and handle cooldowns
// const handleCooldown = (interaction: CommandInteraction, command: Command): boolean => {
//   if (!command.cooldown) return true;

//   if (!cooldowns.has(command.name)) {
//     cooldowns.set(command.name, new Map());
//   }

//   const timestamps = cooldowns.get(command.name)!;
//   const now = Date.now();
//   const cooldownAmount = command.cooldown * 1000;

//   if (timestamps.has(interaction.user.id)) {
//     const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

//     if (now < expirationTime) {
//       const timeLeft = (expirationTime - now) / 1000;
//       interaction.reply({
//         content: `Please wait ${timeLeft.toFixed(1)} more seconds before using \`/${command.name}\` again.`,
//         ephemeral: true
//       });
//       return false;
//     }
//   }

//   timestamps.set(interaction.user.id, now);
//   setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
//   return true;
// };

// // Enhanced command handler
// export const handleCommand = async (interaction: Interaction) => {
//   if (!interaction.isCommand()) return;

//   const command = commands.get(interaction.commandName);
  
//   if (!command) {
//     logger.warn('Unknown command received', { 
//       command: interaction.commandName,
//       user: interaction.user.id 
//     });
//     await interaction.reply({ 
//       content: 'Command not recognized.', 
//       ephemeral: true 
//     });
//     return;
//   }

//   // Check permissions
//   if (!checkPermissions(interaction, command)) {
//     logger.warn('Permission denied', {
//       command: interaction.commandName,
//       user: interaction.user.id
//     });
//     await interaction.reply({
//       content: 'You do not have permission to use this command.',
//       ephemeral: true
//     });
//     return;
//   }

//   // Check cooldown
//   if (!handleCooldown(interaction, command)) return;

//   // Execute the command with enhanced error handling
//   try {
//     logger.info('Executing command', { 
//       command: interaction.commandName,
//       user: interaction.user.id,
//       channel: interaction.channel?.id,
//       guild: interaction.guild?.id
//     });
    
//     await command.execute(interaction);
    
//     // Log successful execution
//     logger.info('Command executed successfully', {
//       command: interaction.commandName,
//       user: interaction.user.id
//     });
//   } catch (error) {
//     logger.error('Error executing command:', { 
//       error,
//       command: interaction.commandName,
//       user: interaction.user.id
//     });
    
//     const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
//     if (interaction.replied || interaction.deferred) {
//       await interaction.followUp({ 
//         content: `Error: ${errorMessage}`, 
//         ephemeral: true 
//       });
//     } else {
//       await interaction.reply({ 
//         content: `Error: ${errorMessage}`, 
//         ephemeral: true 
//       });
//     }
//   }
// };

// // Enhanced command registration
// export const registerCommands = async (client: Client) => {
//   try {
//     logger.info('Starting command registration');
    
//     const applicationId = process.env.DISCORD_APPLICATION_ID;
//     if (!applicationId) {
//       throw new Error('DISCORD_APPLICATION_ID is not defined');
//     }

//     const commandData = Array.from(commands.values()).map(({ name, description }) => ({
//       name,
//       description,
//     }));

//     await client.application?.commands.set(commandData);
    
//     logger.info('Commands registered successfully', { 
//       commandCount: commandData.length,
//       commands: commandData.map(cmd => cmd.name)
//     });
//   } catch (error) {
//     logger.error('Error registering commands:', { error });
//     throw error; // Re-throw to handle at a higher level
//   }
// };

// // Enhanced command management functions
// export const getCommands = () => commands;

// export const addCommand = (command: Command) => {
//   if (!command.category) {
//     command.category = 'General';
//   }
  
//   commands.set(command.name, command);
//   logger.info('New command added', { 
//     command: command.name,
//     category: command.category
//   });
// };