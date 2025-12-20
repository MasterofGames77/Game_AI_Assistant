/**
 * Utility script to send bot information to a Discord channel
 * 
 * Usage:
 *   npx tsx scripts/sendBotInfoToChannel.ts <channelName> [options]
 * 
 * Options:
 *   --clear, -c              Clear channel before sending (deletes all messages)
 *   --embeds=<numbers>        Only send specific embeds (e.g., --embeds=1,2,3)
 *                             Embed numbers: 1=Welcome, 2=Communication, 3=Rules,
 *                             4=Questions, 5=Pro Access, 6=Add to Server, 7=Additional Info
 *   --timestamp, -t           Add "Last Updated" timestamp to embeds
 * 
 * Examples:
 *   npx tsx scripts/sendBotInfoToChannel.ts bot-information
 *   npx tsx scripts/sendBotInfoToChannel.ts bot-information --clear
 *   npx tsx scripts/sendBotInfoToChannel.ts bot-information --embeds=1,3,7
 *   npx tsx scripts/sendBotInfoToChannel.ts bot-information --clear --timestamp
 */

import { initializeDiscordBot, getClient, shutdownDiscordBot } from '../utils/discordBot';
import { ChannelType, EmbedBuilder, GuildBasedChannel, TextChannel } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_APPLICATION_ID}&permissions=1617525337286&scope=bot%20applications.commands`;
const WEBSITE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://assistant.videogamewingman.com'
  : 'http://localhost:3000';

interface ScriptOptions {
  clearChannel: boolean;
  embedNumbers: number[] | null; // null means send all
  addTimestamp: boolean;
}

/**
 * Parse command-line arguments
 */
function parseArguments(): { channelName: string; options: ScriptOptions } {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Please provide a channel name as an argument');
    console.log('\nUsage: npx tsx scripts/sendBotInfoToChannel.ts <channelName> [options]');
    console.log('\nOptions:');
    console.log('  --clear, -c              Clear channel before sending');
    console.log('  --embeds=<numbers>        Only send specific embeds (e.g., --embeds=1,2,3)');
    console.log('  --timestamp, -t          Add "Last Updated" timestamp');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/sendBotInfoToChannel.ts bot-information');
    console.log('  npx tsx scripts/sendBotInfoToChannel.ts bot-information --clear');
    console.log('  npx tsx scripts/sendBotInfoToChannel.ts bot-information --embeds=1,3,7');
    console.log('  npx tsx scripts/sendBotInfoToChannel.ts bot-information --clear --timestamp');
    process.exit(1);
  }

  const channelName = args[0];
  const options: ScriptOptions = {
    clearChannel: false,
    embedNumbers: null,
    addTimestamp: false
  };

  // Parse flags
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--clear' || arg === '-c') {
      options.clearChannel = true;
    } else if (arg === '--timestamp' || arg === '-t') {
      options.addTimestamp = true;
    } else if (arg.startsWith('--embeds=')) {
      const embedStr = arg.split('=')[1];
      const numbers = embedStr.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 7);
      if (numbers.length > 0) {
        options.embedNumbers = numbers;
      } else {
        console.warn('⚠️ Invalid embed numbers, ignoring --embeds flag');
      }
    }
  }

  return { channelName, options };
}

/**
 * Clear all messages from a channel
 */
async function clearChannel(channel: TextChannel): Promise<void> {
  console.log('🧹 Clearing channel messages...');
  
  try {
    let deletedCount = 0;
    let hasMore = true;
    
    while (hasMore) {
      // Fetch messages (Discord limits to 100 per fetch)
      const messages = await channel.messages.fetch({ limit: 100 });
      
      if (messages.size === 0) {
        hasMore = false;
        break;
      }

      // Delete messages in batches (Discord rate limit: 5 messages per second)
      const messageArray = Array.from(messages.values());
      for (let i = 0; i < messageArray.length; i++) {
        try {
          await messageArray[i].delete();
          deletedCount++;
          
          // Rate limit: wait 200ms between deletions (5 per second)
          if (i < messageArray.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          // Some messages might not be deletable (too old, permissions, etc.)
          if (error instanceof Error && error.message.includes('Unknown Message')) {
            // Message already deleted, continue
            continue;
          }
          console.warn(`⚠️ Could not delete message ${messageArray[i].id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Cleared ${deletedCount} message(s) from channel`);
  } catch (error) {
    console.error('❌ Error clearing channel:', error);
    throw error;
  }
}

async function sendBotInfoToChannel(channelName: string, options: ScriptOptions) {
  try {
    console.log('🔄 Initializing Discord bot...');
    const initialized = await initializeDiscordBot();
    
    if (!initialized) {
      console.error('❌ Failed to initialize Discord bot');
      process.exit(1);
    }

    const client = getClient();
    if (!client) {
      console.error('❌ Discord client not available');
      process.exit(1);
    }

    // Wait for bot to be ready
    await new Promise<void>((resolve) => {
      if (client.isReady()) {
        resolve();
      } else {
        client.once('ready', () => resolve());
      }
    });

    console.log('✅ Bot is ready');

    // Find the channel by name
    let targetChannel = null;
    for (const guild of Array.from(client.guilds.cache.values())) {
      const channel = guild.channels.cache.find(
        (ch: GuildBasedChannel) => ch.name === channelName && ch.type === ChannelType.GuildText
      );
      if (channel) {
        targetChannel = channel;
        console.log(`✅ Found channel #${channelName} in server: ${guild.name}`);
        break;
      }
    }

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      console.error(`❌ Channel #${channelName} not found or is not a text channel`);
      console.log('Available channels:');
      for (const guild of Array.from(client.guilds.cache.values())) {
        console.log(`\nServer: ${guild.name}`);
        guild.channels.cache
          .filter((ch: GuildBasedChannel) => ch.type === ChannelType.GuildText)
          .forEach((ch: GuildBasedChannel) => console.log(`  - #${ch.name}`));
      }
      process.exit(1);
    }

    const textChannel = targetChannel as TextChannel;

    // Clear channel if requested
    if (options.clearChannel) {
      await clearChannel(textChannel);
    }

    // Create informational embeds
    const embeds: EmbedBuilder[] = [];

    // Get current timestamp for "Last Updated" if requested
    const lastUpdated = options.addTimestamp ? new Date().toLocaleString('en-US', { 
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short'
    }) : null;

    // Main welcome embed (Embed #1)
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('🎮 The Hero Game Wingman has arrived!')
      .setDescription('Your AI-powered gaming assistant is here to help you with all your video game questions, guides, and tips!')
      .setColor('#5865F2') // Discord blurple
      .setThumbnail(client.user?.displayAvatarURL() || null)
      .setTimestamp();
    
    if (lastUpdated) {
      welcomeEmbed.addFields({
        name: '📅 Last Updated',
        value: lastUpdated + ' (UTC)',
        inline: false
      });
    }

    embeds.push(welcomeEmbed);

    // How to communicate embed
    const communicationEmbed = new EmbedBuilder()
      .setTitle('💬 How to Communicate with the Bot')
      .setColor('#57F287') // Discord green
      .addFields(
        {
          name: '📨 Direct Messages (DMs)',
          value: 'You can send direct messages to the bot anytime! Just open a DM with **Hero Game Wingman** and ask your question. No need to mention the bot - just start chatting!',
          inline: false
        },
        {
          name: '📢 Server Channels',
          value: `In server channels, you need to **mention the bot** for it to respond. Simply type \`@Hero Game Wingman\` followed by your question.\n\n**Example:**\n\`@Hero Game Wingman How do I unlock the Master Sword in Zelda: Tears of the Kingdom?\``,
          inline: false
        },
        {
          name: '⚡ Slash Commands',
          value: 'You can also use slash commands! Try typing `/` in any channel where the bot is present to see available commands like `/ping` and `/help`.',
          inline: false
        }
      )
      .setTimestamp();

    embeds.push(communicationEmbed);

    // Rules and guidelines embed
    const rulesEmbed = new EmbedBuilder()
      .setTitle('📜 Rules & Guidelines')
      .setColor('#ED4245') // Discord red for importance
      .setDescription('To ensure a positive experience for everyone, please follow these rules when using **Hero Game Wingman**:')
      .addFields(
        {
          name: '1. No Derogatory Language or Actions',
          value: 'Racism, sexism, homophobia, hateful speech, inappropriate language and hazing of any kind will NOT be tolerated and will result in an instant ban. We are committed to maintaining a respectful and inclusive community.',
          inline: false
        },
        {
          name: '2. No NSFW Content',
          value: 'Keep all interactions appropriate and family-friendly. NSFW (Not Safe For Work) content is strictly prohibited.',
          inline: false
        },
        {
          name: '3. No Spamming',
          value: 'Please do not spam the bot with repeated messages or abuse the service. Rate limits are in place to ensure fair usage for all users.',
          inline: false
        },
        {
          name: '⚠️ Consequences',
          value: 'Violations of these rules may result in warnings, temporary restrictions, or permanent bans from using the bot.',
          inline: false
        }
      )
      .setTimestamp();

    embeds.push(rulesEmbed);

    // What questions to ask embed
    const questionsEmbed = new EmbedBuilder()
      .setTitle('❓ What Kind of Questions Can You Ask?')
      .setColor('#FEE75C') // Discord yellow
      .setDescription('The bot can help with a wide variety of gaming-related topics!')
      .addFields(
        {
          name: '🎯 Game Guides & Walkthroughs',
          value: '• How to unlock specific items or characters\n• Quest walkthroughs and solutions\n• Achievement guides\n• Location guides',
          inline: false
        },
        {
          name: '⚔️ Gameplay Tips & Strategies',
          value: '• Combat strategies\n• Build recommendations\n• Resource management\n• Difficulty tips',
          inline: false
        },
        {
          name: '📚 Game Information',
          value: '• Lore and story explanations\n• Character information\n• Game mechanics explanations\n• System requirements',
          inline: false
        },
        {
          name: '💰 Sales, Bundles & Console Information',
          value: '• Current sales and discounts on games or consoles\n• Game console bundle deals and what\'s included\n• Console comparisons (PlayStation 5 vs Nintendo Switch 2, Xbox Series X vs PlayStation 5, etc.)\n• Console specifications and features\n• Best deals and where to find them\n• Console recommendations based on your gaming preferences',
          inline: false
        },
        {
          name: '💡 Examples',
          value: '• "How do I unlock the Master Sword in Zelda: Tears of the Kingdom?"\n• "What\'s the best build for a mage in Elden Ring?"\n• "How do I complete the Water Temple in Ocarina of Time?"\n• "What are the differences between PlayStation 5 and Nintendo Switch 2?"\n• "Are there any good console bundles available right now?"\n• "What games are currently on sale?"',
          inline: false
        }
      )
      .setTimestamp();

    embeds.push(questionsEmbed);

    // Pro Access embed
    const proAccessEmbed = new EmbedBuilder()
      .setTitle('⭐ Pro Access')
      .setColor('#ED4245') // Discord red
      .setDescription('Some features require **Video Game Wingman Pro** access.')
      .addFields(
        {
          name: '🔓 What\'s Included?',
          value: '• Full access to AI-powered gaming assistance\n• Detailed guides and walkthroughs\n• Game tips and strategies\n• And much more!',
          inline: false
        },
        {
          name: '🌐 Get Pro Access',
          value: `Visit [Video Game Wingman](${WEBSITE_URL}) to learn more about Pro benefits and subscribe!`,
          inline: false
        }
      )
      .setTimestamp();

    embeds.push(proAccessEmbed);

    // Add to other servers embed
    const addToServerEmbed = new EmbedBuilder()
      .setTitle('➕ Add Hero Game Wingman to Your Server')
      .setColor('#EB459E') // Discord fuchsia
      .setDescription('Want to use the bot in your own Discord server? Follow these steps:')
      .addFields(
        {
          name: '📋 Step 1: Link Your Discord Account',
          value: `1. Visit [Video Game Wingman](${WEBSITE_URL})\n2. Log in to your account\n3. Click "Connect Discord" to link your Discord account`,
          inline: false
        },
        {
          name: '📋 Step 2: Add the Bot',
          value: `After linking your account, you'll receive an invite link. Click it to add **Hero Game Wingman** to your server!`,
          inline: false
        },
        {
          name: '🔗 Direct Invite Link',
          value: `[Click here to invite the bot](${BOT_INVITE_URL})\n\n**Note:** You must have "Manage Server" permissions to add bots.`,
          inline: false
        },
        {
          name: '⚙️ Required Permissions',
          value: 'The bot needs the following permissions:\n• Send Messages\n• Read Message History\n• Use Slash Commands\n• Embed Links\n• Read Messages/View Channels',
          inline: false
        }
      )
      .setTimestamp();

    embeds.push(addToServerEmbed);

    // Additional info embed
    const additionalInfoEmbed = new EmbedBuilder()
      .setTitle('ℹ️ Additional Information')
      .setColor('#95A5A6') // Gray
      .addFields(
        {
          name: '📝 Response Length',
          value: 'The bot may split long responses into multiple messages due to Discord\'s 2000 character limit per message. This is normal and ensures you receive the complete answer!',
          inline: false
        },
        {
          name: '⏱️ Response Time',
          value: 'The bot typically responds within a few seconds. For complex questions, it may take a bit longer to generate a comprehensive answer.',
          inline: false
        },
        {
          name: '🔄 Always Active',
          value: 'The bot is always online and ready to help! You don\'t need to have the Video Game Wingman website open - the bot works independently.',
          inline: false
        },
        {
          name: '🆘 Need Help?',
          value: `If you encounter any issues or have questions about the bot, visit [Video Game Wingman](${WEBSITE_URL}) for support.`,
          inline: false
        }
      )
      .setTimestamp();

    embeds.push(additionalInfoEmbed);

    // Filter embeds if specific ones are requested
    let embedsToSend = embeds;
    if (options.embedNumbers) {
      embedsToSend = options.embedNumbers
        .map(num => embeds[num - 1]) // Convert 1-based to 0-based index
        .filter(embed => embed !== undefined); // Remove invalid numbers
      
      if (embedsToSend.length === 0) {
        console.error('❌ No valid embeds selected');
        process.exit(1);
      }
      
      console.log(`📋 Sending ${embedsToSend.length} embed(s): ${options.embedNumbers.join(', ')}`);
    } else {
      console.log(`📋 Sending all ${embeds.length} embeds`);
    }

    // Send all embeds
    console.log(`📤 Sending information to #${channelName}...`);
    
    // Send embeds in batches (Discord allows up to 10 embeds per message)
    const batchSize = 10;
    for (let i = 0; i < embedsToSend.length; i += batchSize) {
      const batch = embedsToSend.slice(i, i + batchSize);
      await textChannel.send({ embeds: batch });
      
      // Small delay between batches
      if (i + batchSize < embedsToSend.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('✅ Successfully sent bot information to the channel!');
    
  } catch (error) {
    console.error('❌ Error sending bot information:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await shutdownDiscordBot();
    process.exit(0);
  }
}

// Parse command-line arguments
const { channelName, options } = parseArguments();

// Display options being used
if (options.clearChannel || options.embedNumbers || options.addTimestamp) {
  console.log('📋 Options:');
  if (options.clearChannel) console.log('  ✓ Clear channel before sending');
  if (options.embedNumbers) console.log(`  ✓ Send only embeds: ${options.embedNumbers.join(', ')}`);
  if (options.addTimestamp) console.log('  ✓ Add "Last Updated" timestamp');
  console.log('');
}

// Run the script
sendBotInfoToChannel(channelName, options);
