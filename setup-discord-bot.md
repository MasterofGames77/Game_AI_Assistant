# Discord Bot Setup Guide

## Step 1: Get Your Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your "Hero Game Wingman" application (ID: 1280633369532563510)
3. Go to the "Bot" section in the left sidebar
4. Click "Reset Token" if you don't have one, or copy the existing token
5. **IMPORTANT**: Keep this token secret! Don't share it publicly.

## Step 2: Add Token to Environment Variables

Add this to your `.env.local` file:

```bash
# Discord Bot Configuration
DISCORD_API_TOKEN=your_discord_bot_token_here
DISCORD_APPLICATION_ID=1280633369532563510
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:3000/api/discordCallback
```

## Step 3: Restart Your Development Server

```bash
npm run dev
```

## Step 4: Check Console for Bot Startup Messages

You should see:

- `🔄 Importing Discord bot...`
- `✅ Discord bot imported successfully`
- `🤖 Starting Discord bot...`
- `✅ Discord bot connected successfully!`

## Step 5: Verify Bot is Online

1. Go to your Discord server
2. Check if "Hero Game Wingman" shows as online (green dot)
3. Try sending a message to the bot

## Troubleshooting

If the bot still shows offline:

1. Check that `DISCORD_API_TOKEN` is correct
2. Make sure the token is the **Bot Token**, not the Client Secret
3. Verify the bot has proper permissions in your Discord server
4. Check the console for any error messages
