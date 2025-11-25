import { createServer } from "http";
import { parse, UrlWithParsedQuery } from "url";
import next, { NextApiRequest, NextApiResponse } from "next";
import { initSocket } from "./middleware/realtime";
import { initializeScheduler } from "./utils/automatedUsersScheduler";
import fs from "fs";
import path from "path";

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

// Function to set up Google Vision credentials
const setupGoogleCredentials = () => {
  const credentialsPath = path.join("/tmp", "service-account-key.json");
  
  // Check for GOOGLE_CREDENTIALS first (used by API routes), then fall back to GOOGLE_APPLICATION_CREDENTIALS_JSON
  let credentials = process.env.GOOGLE_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  if (credentials) {
    // If GOOGLE_CREDENTIALS is already a JSON object string, use it directly
    // If it's already parsed or needs parsing, handle it
    try {
      // Try to parse if it's a string (GOOGLE_CREDENTIALS might already be JSON)
      const parsed = typeof credentials === 'string' ? JSON.parse(credentials) : credentials;
      // Write the JSON credentials to a file in the temporary directory
      fs.writeFileSync(credentialsPath, JSON.stringify(parsed));
      // Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to the file
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      console.log("Google Vision API credentials set up successfully.");
    } catch (error) {
      // If parsing fails, assume it's already a JSON string and write it directly
      fs.writeFileSync(credentialsPath, credentials);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      console.log("Google Vision API credentials set up successfully.");
    }
  } else {
    // Only log as warning, not error, since the app can work without it (image moderation will be skipped)
    console.warn("Google Vision API credentials not set. Image analysis and moderation features will be limited.");
    console.warn("Set GOOGLE_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable to enable full functionality.");
  }
};

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    const parsedUrl: UrlWithParsedQuery = req.url
      ? parse(req.url, true)
      : { query: {}, pathname: "/", path: null, href: "", search: null, slashes: null, auth: null, hash: null, host: null, hostname: null, port: null, protocol: null };

    handle(req as unknown as NextApiRequest, res as unknown as NextApiResponse, parsedUrl);
  });

  // Initialize the Socket.IO server
  initSocket(server);

  // Initialize automated users scheduler
  console.log('Initializing automated users scheduler...');
  console.log(`AUTOMATED_USERS_ENABLED: ${process.env.AUTOMATED_USERS_ENABLED}`);
  console.log(`Server starting at: ${new Date().toISOString()}`);
  console.log(`Node version: ${process.version}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  
  // Server keepalive commented out - not needed with Standard 1x dyno (always on)
  // The scheduler heartbeat (every 5 minutes) is sufficient for monitoring
  // setInterval(() => {
  //   console.log(`[SERVER KEEPALIVE] Server is alive at ${new Date().toISOString()}`);
  // }, 60000); // Every minute
  
  initializeScheduler();
  setupGoogleCredentials();

  // Start the server
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});