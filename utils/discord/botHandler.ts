import { Client, Message } from 'discord.js';
import { botConfig } from '../../config/botConfig';
import { getChatCompletion } from '../aiHelper';
import { checkProAccess } from '../checkProAccess';

export class DiscordBotHandler {
  private client: Client;

  // Initialize the bot handler
  constructor(client: Client) {
    this.client = client;
    this.setupEventHandlers();
  }

  // Setup event handlers
  private setupEventHandlers() {
    this.client.on('messageCreate', async (message: Message) => {
      if (message.author.bot) return;
      
      try {
        // Check if user has Pro access
        const hasAccess = await checkProAccess(message.author.id);
        if (!hasAccess) {
          await message.reply("This feature is only available to Video Game Wingman Pro users.");
          return;
        }

        // Process the message
        const response = await this.processMessage(message);
        if (response) {
          await message.reply(response);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        await message.reply('Sorry, I encountered an error processing your request.');
      }
    });
  }

  // Process the message
  private async processMessage(message: Message): Promise<string> {
    const question = message.content;
    
    try {
      // Create a system message using botConfig
      const systemMessage = `You are ${botConfig.name}, ${botConfig.description}. 
Your expertise includes: ${botConfig.knowledge.join(', ')}. 
Character: ${botConfig.bio[0]}`;

      // Get AI response with context from botConfig
      const response = await getChatCompletion(question, systemMessage);
      return response || `I apologize, but I was unable to generate a response. As ${botConfig.name}, I aim to provide helpful gaming advice and information.`;
    } catch (error) {
      console.error('Error getting chat completion:', error);
      throw error;
    }
  }
}
