import { createServer } from "http";
import { parse, UrlWithParsedQuery } from "url";
import next, { NextApiRequest, NextApiResponse } from "next";
import { initSocket } from "./middleware/realtime";
import fs from "fs";
import path from "path";

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

// Function to set up Google Vision credentials
const setupGoogleCredentials = () => {
  const credentialsPath = path.join("/tmp", "service-account-key.json");
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (credentials) {
    // Write the JSON credentials to a file in the temporary directory
    fs.writeFileSync(credentialsPath, credentials);
    // Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to the file
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    console.log("Google Vision API credentials set up successfully.");
  } else {
    console.error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not set.");
  }
};

app.prepare().then(async () => {
  // Setup Google Vision API credentials
  setupGoogleCredentials();

  const server = createServer((req, res) => {
    const parsedUrl: UrlWithParsedQuery = req.url
      ? parse(req.url, true)
      : { query: {}, pathname: "/", path: null, href: "", search: null, slashes: null, auth: null, hash: null, host: null, hostname: null, port: null, protocol: null };

    handle(req as unknown as NextApiRequest, res as unknown as NextApiResponse, parsedUrl);
  });

  // Initialize the Socket.IO server
  initSocket(server);

  // Start the server
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
