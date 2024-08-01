import { createServer } from "http";
import { parse, UrlWithParsedQuery } from "url";
import next, { NextApiRequest, NextApiResponse } from "next";
import { initSocket } from "./middleware/realtime";
import { setupOpenAIAssistant } from "./utils/assistantSetup";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    const parsedUrl: UrlWithParsedQuery = req.url
      ? parse(req.url, true)
      : { query: {}, pathname: "/", path: null, href: "", search: null, slashes: null, auth: null, hash: null, host: null, hostname: null, port: null, protocol: null };

    handle(req as unknown as NextApiRequest, res as unknown as NextApiResponse, parsedUrl);
  });

  // Initialize the Socket.IO server
  initSocket(server);

  // Define the assistant's prompt
  const prompt = `
    You are an AI assistant specializing in video games. Your main role is to provide detailed analytics and insights into gameplay, help players track their progress, and offer advice on improving their skills.
    You can answer questions about game completion times, strategies to progress past difficult sections, the fastest speedrun times, and provide general tips and tricks.
  `;

  // Call the setup function for the AI Assistant
  try {
    const assistant = await setupOpenAIAssistant(prompt);
    if (assistant) {
      console.log("> Assistant created successfully.");
    } else {
      console.error("> Failed to create assistant.");
    }
  } catch (error) {
    console.error("> Error setting up assistant:", error);
  }

  // Start the server
  server.listen(3000, () => {
    console.log("> Ready on http://localhost:3000");
  });
});