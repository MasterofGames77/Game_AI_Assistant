import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as NetSocket } from 'net';

// Define the SocketServer type
interface SocketServer extends HTTPServer {
  io?: SocketIOServer;
}

// Define the SocketWithIO type
interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

// Define the NextApiResponseWithSocket type
interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// Define the SocketHandler function
const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  // Initialize the Socket.IO server
  const io = new SocketIOServer(res.socket.server);
  res.socket.server.io = io;

  io.on('connection', () => {
    console.log('Client connected');
  });

  io.on('disconnect', () => {
    console.log('Client disconnected');
  });

  console.log('Socket is initialized');
  res.end();
};

export default SocketHandler;