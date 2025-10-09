import { createServer } from "http";
import { parse, UrlWithParsedQuery } from "url";
import next, { NextApiRequest, NextApiResponse } from "next";
import { initSocket } from "./middleware/realtime";

// Import Discord bot with error handling
let discordClient;
try {
  console.log('🔄 Attempting to import Discord bot...');
  discordClient = require("./utils/discordBot").default;
  console.log('✅ Discord bot imported successfully');
} catch (error) {
  console.error('❌ Failed to import Discord bot:', error);
  console.error('Error details:', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : 'Unknown'
  });
  discordClient = null;
}
// import fs from "fs";
// import path from "path";

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

// Function to set up Google Vision credentials
// const setupGoogleCredentials = () => {
//   const credentialsPath = path.join("/tmp", "service-account-key.json");
//   const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
//   if (credentials) {
//     // Write the JSON credentials to a file in the temporary directory
//     fs.writeFileSync(credentialsPath, credentials);
//     // Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to the file
//     process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
//     console.log("Google Vision API credentials set up successfully.");
//   } else {
//     console.error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not set.");
//   }
// };

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    const parsedUrl: UrlWithParsedQuery = req.url
      ? parse(req.url, true)
      : { query: {}, pathname: "/", path: null, href: "", search: null, slashes: null, auth: null, hash: null, host: null, hostname: null, port: null, protocol: null };

    handle(req as unknown as NextApiRequest, res as unknown as NextApiResponse, parsedUrl);
  });

  // Initialize the Socket.IO server
  initSocket(server);

  // Start the Discord bot
  console.log('🤖 Starting Discord bot...');
  console.log('Environment variables check:', {
    hasDiscordToken: !!process.env.DISCORD_API_TOKEN,
    hasApplicationId: !!process.env.DISCORD_APPLICATION_ID,
    nodeEnv: process.env.NODE_ENV
  });
  
  if (discordClient) {
    console.log('✅ Discord bot client initialized');
    
    // Check if the bot is actually connected
    if (discordClient.isReady()) {
      console.log('✅ Discord bot is already connected and ready');
    } else {
      console.log('⏳ Discord bot is connecting...');
      
      // Add event listeners to track connection status
      discordClient.once('ready', () => {
        console.log('✅ Discord bot connected successfully!');
      });
      
      discordClient.on('error', (error: any) => {
        console.error('❌ Discord bot connection error:', error);
      });
    }
  } else {
    console.error('❌ Discord bot client failed to initialize - check environment variables');
    console.error('Required: DISCORD_API_TOKEN');
  }

  // Start the server
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});