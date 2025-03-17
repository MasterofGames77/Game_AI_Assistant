import { Client, GatewayIntentBits, Message, GuildMember, TextChannel, Collection, ActivityType } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Command prefix
const PREFIX = '!';

// Command collection to store available commands
const commands = new Collection<string, (message: Message, args: string[]) => void>();

// Register commands
commands.set('ping', (message) => {
  message.reply('Pong!');
});

commands.set('kick', (message, args) => {
  const member = message.mentions.members?.first();
  if (!member) {
    message.reply('Please mention a user to kick');
    return;
  }
  if (!message.member?.permissions.has('KickMembers')) {
    message.reply('You do not have permission to kick members');
    return;
  }
  member.kick().then(() => {
    message.reply(`Successfully kicked ${member.user.tag}`);
  }).catch(error => {
    message.reply('Failed to kick the user');
  });
});

commands.set('ban', (message, args) => {
  const member = message.mentions.members?.first();
  if (!member) {
    message.reply('Please mention a user to ban');
    return;
  }
  if (!message.member?.permissions.has('BanMembers')) {
    message.reply('You do not have permission to ban members');
    return;
  }
  member.ban().then(() => {
    message.reply(`Successfully banned ${member.user.tag}`);
  }).catch(error => {
    message.reply('Failed to ban the user');
  });
});

// Event handler when the bot is ready
discordClient.once('ready', () => {
  console.log(`Discord Bot is ready! Logged in as ${discordClient.user?.tag}`);
  
  // Set bot's activity status
  discordClient.user?.setActivity('!help for commands', { type: ActivityType.Playing });
});

// Event handler for message creation
discordClient.on('messageCreate', (message) => {
  if (message.author.bot) return; // Ignore messages from bots

  // Command handling
  if (message.content.startsWith(PREFIX)) {
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (command && commands.has(command)) {
      commands.get(command)?.(message, args);
    }
  }

  // Auto-moderation example
  if (message.content.match(/bad word/i)) {
    message.delete().catch(console.error);
    message.channel.send(`${message.author}, please keep the chat family-friendly!`);
  }
});

// Welcome message for new members
discordClient.on('guildMemberAdd', (member: GuildMember) => {
  const welcomeChannel = member.guild.channels.cache.find(
    channel => channel.name === 'welcome'
  ) as TextChannel;

  if (welcomeChannel) {
    welcomeChannel.send(
      `Welcome ${member} to the server! 🎉\nPlease read our rules and enjoy your stay!`
    );
  }
});

// Role management on reaction
discordClient.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  // Example: Give role when reacting to a specific message
  if (reaction.message.id === 'YOUR_MESSAGE_ID' && reaction.emoji.name === '✅') {
    const member = reaction.message.guild?.members.cache.get(user.id);
    const role = reaction.message.guild?.roles.cache.find(r => r.name === 'Verified');
    
    if (member && role) {
      await member.roles.add(role);
    }
  }
});

// Presence update with more detailed logging
discordClient.on('presenceUpdate', (oldPresence, newPresence) => {
  const user = newPresence.user;
  const status = newPresence.status;
  const activity = newPresence.activities[0];

  console.log(`User ${user?.username}:
    Status: ${status}
    Activity: ${activity?.name || 'None'}
    Type: ${activity?.type || 'None'}`);
});

// Error handling
discordClient.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Connect to Discord using the bot token from the .env file
discordClient.login(process.env.DISCORD_API_TOKEN);

// Export the client for use in other parts of the application
export default discordClient;