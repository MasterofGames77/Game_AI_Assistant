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
    console.log("A user connected");

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

// Get the Socket.IO server instance
const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

export { initSocket, getIO };