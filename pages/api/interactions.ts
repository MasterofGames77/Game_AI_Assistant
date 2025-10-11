import { InteractionType, InteractionResponseType } from 'discord-api-types/v9';
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyKey } from 'discord-interactions';

// Assuming you have a verification function
const verifyDiscordRequest = (req: NextApiRequest) => {
  const signature = req.headers['x-signature-ed25519'] as string;
  const timestamp = req.headers['x-signature-timestamp'] as string;
  const body = JSON.stringify(req.body);

  return verifyKey(body, signature, timestamp, process.env.DISCORD_PUBLIC_KEY!);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    if (!verifyDiscordRequest(req)) {
      return res.status(401).send('Bad request signature');
    }

    const interaction = req.body;

    // Handle Ping Interaction
    if (interaction.type === InteractionType.Ping) {
      return res.json({ type: InteractionResponseType.Pong });
    }

    // Handle Slash Commands
    if (interaction.type === InteractionType.ApplicationCommand) {
      const { name } = interaction.data;
      
      if (name === 'recommend') {
        // Handle the recommend command
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Here are some game recommendations based on your preferences...',
            // You can include embeds, buttons, etc.
          },
        });
      } else if (name === 'stats') {
        // Handle the stats command
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Here are your gaming stats...',
          },
        });
      } else if (name === 'guide') {
        // Handle the guide command
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Here is a guide for the game...',
          },
        });
      } else if (name === 'help') {
        // Handle the help command
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Here are the available commands: /recommend, /stats, /guide, /help.',
          },
        });
      }
    }

    // Handle Component Interactions (e.g., Button presses)
    if (interaction.type === InteractionType.MessageComponent) {
      const customId = interaction.data.custom_id;

      if (customId === 'more_info') {
        // Handle the "More Info" button press
        return res.json({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Here is more information...',
          },
        });
      }
    }
  }

  return res.status(405).send('Method not allowed');
}

export const config = {
  api: {
    bodyParser: false, // Required for raw body verification
  },
};