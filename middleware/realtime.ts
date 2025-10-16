import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

// Initialize the Socket.IO server
const initSocket = (server: HttpServer): void => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ User connected via ${socket.conn.transport.name}`);
    
    // Log when transport upgrades
    socket.conn.on("upgrade", () => {
      console.log(`🔄 Transport upgraded to: ${socket.conn.transport.name}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ User disconnected: ${reason}`);
    });
  });

  console.log('🔌 Socket.IO server initialized on path: /socket.io/');
};

// Get the Socket.IO server instance
const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

export { initSocket, getIO };