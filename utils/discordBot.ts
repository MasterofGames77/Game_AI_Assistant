import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { DiscordBotHandler } from './discord/botHandler';
import { handleCommand, registerCommands } from './discord/commandHandler';
import dotenv from 'dotenv';

dotenv.config();

// Initialize variables that will be set during initialization
let client: Client | null = null;
let botHandler: DiscordBotHandler | null = null;
let isInitializing = false;
let isInitialized = false;

const dev = process.env.NODE_ENV !== 'production';

/**
 * Initialize the Discord bot
 * @returns Promise<boolean> - true if initialization succeeded, false otherwise
 */
export async function initializeDiscordBot(): Promise<boolean> {
  // Prevent multiple simultaneous initialization attempts
  if (isInitializing) {
    if (dev) {
      console.warn('⚠️ Discord bot initialization already in progress, skipping duplicate call');
    }
    return false;
  }

  // If already initialized, return success
  if (isInitialized && client && botHandler) {
    if (dev) {
      console.log('ℹ️ Discord bot already initialized');
    }
    return true;
  }

  // Check for Discord API token
  if (!process.env.DISCORD_API_TOKEN) {
    // Only log as warning, not error, since the app can work without it (Discord bot features will be unavailable)
    console.warn('⚠️ DISCORD_API_TOKEN is not defined in environment variables. Discord bot will not start.');
    console.warn('Set DISCORD_API_TOKEN environment variable to enable Discord bot functionality.');
    return false;
  }

  isInitializing = true;

  try {
    if (dev) {
      console.log('🔄 Initializing Discord bot...');
      console.log('Environment check:', {
        hasToken: !!process.env.DISCORD_API_TOKEN,
        hasApplicationId: !!process.env.DISCORD_APPLICATION_ID,
        environment: process.env.NODE_ENV
      });
    } else {
      console.log('🔄 Initializing Discord bot...');
    }
    
    // Initialize the Discord client
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages, // Required to receive DMs
      ],
      partials: [
        Partials.Channel, // Required to handle DM channels (they're not cached by default)
        Partials.Message, // Required for partial message handling
        Partials.User, // Required for partial user handling
      ]
    });

    // Check if bot handler already exists (prevent duplicate initialization)
    if (botHandler) {
      console.warn('⚠️ Bot handler already exists! Destroying old handler to prevent duplicates.');
      // Try to clean up old handler if possible
      try {
        const oldClient = botHandler['client'];
        if (oldClient && oldClient !== client) {
          console.warn('⚠️ Multiple Discord clients detected! This may cause duplicate responses.');
        }
      } catch (e) {
        // Ignore errors during cleanup check
      }
    }

    // Initialize bot handler
    botHandler = new DiscordBotHandler(client);
    console.log('✅ Discord bot handler created', {
      timestamp: new Date().toISOString(),
      clientReady: client.isReady()
    });

    // Set up event handlers
    client.once('ready', async () => {
      console.log(`✅ Bot logged in as ${client?.user?.tag}`);
      console.log(`✅ Bot ID: ${client?.user?.id}`);
      console.log(`✅ Bot is now online and ready!`);
      
      // Log guild information
      if (client) {
        const guilds = client.guilds.cache;
        console.log(`📊 Bot is in ${guilds.size} server(s):`);
        guilds.forEach((guild) => {
          console.log(`   - ${guild.name} (${guild.id})`);
        });
      }
      
      // Register slash commands
      try {
        await registerCommands(client!);
        console.log('✅ Slash commands registered successfully');
      } catch (error) {
        console.error('❌ Error registering slash commands:', error);
      }
    });

    // Add error handling for connection issues
    client.on('error', (error) => {
      console.error('❌ Discord client error:', error);
    });

    client.on('disconnect', () => {
      console.log('⚠️ Discord bot disconnected');
    });

    client.on('reconnecting', () => {
      console.log('🔄 Discord bot reconnecting...');
    });

    // Handle slash command interactions
    client.on('interactionCreate', async (interaction) => {
      await handleCommand(interaction);
    });

    // Attempt to login
    if (dev) {
      console.log('🔄 Attempting to login to Discord...');
    }
    await client.login(process.env.DISCORD_API_TOKEN);
    console.log('✅ Discord login initiated successfully');
    
    isInitialized = true;
    isInitializing = false;
    return true;
  } catch (error) {
    // Log error but don't throw - server should continue even if bot fails
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to initialize Discord bot:', errorMessage);
    if (error instanceof Error && error.stack) {
      if (dev) {
        console.error('Error stack:', error.stack);
      }
    }
    // Clean up on failure
    client = null;
    botHandler = null;
    isInitialized = false;
    isInitializing = false;
    return false;
  }
}

/**
 * Gracefully shutdown the Discord bot
 * Call this on process exit or server shutdown
 */
export async function shutdownDiscordBot(): Promise<void> {
  if (!client || !isInitialized) {
    return;
  }

  try {
    if (dev) {
      console.log('🔄 Shutting down Discord bot...');
    }
    await client.destroy();
    client = null;
    botHandler = null;
    isInitialized = false;
    if (dev) {
      console.log('✅ Discord bot shut down successfully');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error shutting down Discord bot:', errorMessage);
    // Force cleanup even if destroy fails
    client = null;
    botHandler = null;
    isInitialized = false;
  }
}

// Export the bot handler and client for use in other modules (backward compatibility)
export function getBotHandler(): DiscordBotHandler | null {
  if (!isInitialized || !botHandler) {
    if (dev) {
      console.warn('⚠️ Bot handler accessed before initialization. Call initializeDiscordBot() first.');
    }
    return null;
  }
  return botHandler;
}

export function getClient(): Client | null {
  if (!isInitialized || !client) {
    if (dev) {
      console.warn('⚠️ Discord client accessed before initialization. Call initializeDiscordBot() first.');
    }
    return null;
  }
  return client;
}

/**
 * Check if the bot is initialized and ready
 */
export function isBotInitialized(): boolean {
  return isInitialized && client !== null && botHandler !== null;
}

// Legacy exports for backward compatibility
// Note: These will be null until initializeDiscordBot() is called
export { botHandler };
export default client;