import { createServer } from "http";
import { parse, UrlWithParsedQuery } from "url";
import next, { NextApiRequest, NextApiResponse } from "next";
import { initSocket } from "./middleware/realtime";

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
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

  // Start the server
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
