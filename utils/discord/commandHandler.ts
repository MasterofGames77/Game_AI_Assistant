import { Client, CommandInteraction, Interaction } from 'discord.js';
import { logger } from '../logger';

// Define command structure
interface Command {
  name: string;
  description: string;
  execute: (interaction: CommandInteraction) => Promise<void>;
}

// Store commands in a Map for easy access
const commands = new Map<string, Command>();

// Register basic commands
commands.set('ping', {
  name: 'ping',
  description: 'Replies with Pong!',
  execute: async (interaction: CommandInteraction) => {
    await interaction.reply('Pong!');
  },
});

// Help command
commands.set('help', {
  name: 'help',
  description: 'Lists all available commands',
  execute: async (interaction: CommandInteraction) => {
    const commandList = Array.from(commands.values())
      .map(cmd => `**/${cmd.name}** - ${cmd.description}`)
      .join('\n');
    
    await interaction.reply({
      content: `Available commands:\n${commandList}`,
      ephemeral: true
    });
  },
});

// Handle command interactions
export const handleCommand = async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;

  const command = commands.get(interaction.commandName);
  
  if (!command) {
    logger.warn('Unknown command received', { 
      command: interaction.commandName,
      user: interaction.user.id 
    });
    await interaction.reply({ 
      content: 'Command not recognized.', 
      ephemeral: true 
    });
    return;
  }

  // Execute the command
  try {
    logger.info('Executing command', { 
      command: interaction.commandName,
      user: interaction.user.id 
    });
    await command.execute(interaction);
  } catch (error) {
    logger.error('Error executing command:', { 
      error,
      command: interaction.commandName,
      user: interaction.user.id
    });
    await interaction.reply({ 
      content: 'There was an error executing this command.', 
      ephemeral: true 
    });
  }
};

// Function to register commands with Discord
export const registerCommands = async (client: Client) => {
  try {
    logger.info('Starting command registration');
    
    const applicationId = process.env.DISCORD_APPLICATION_ID;
    if (!applicationId) {
      throw new Error('DISCORD_APPLICATION_ID is not defined');
    }

    const commands = Array.from(getCommands().values()).map(({ name, description }) => ({
      name,
      description,
    }));

    await client.application?.commands.set(commands);
    
    logger.info('Commands registered successfully', { 
      commandCount: commands.length 
    });
  } catch (error) {
    logger.error('Error registering commands:', { error });
  }
};

// Export commands map for external use
export const getCommands = () => commands;

// Add new command helper function
export const addCommand = (command: Command) => {
  commands.set(command.name, command);
  logger.info('New command added', { command: command.name });
};