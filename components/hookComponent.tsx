import React, { useMemo, useState, useEffect } from "react";
import useSocket from "../hooks/useSocket";

const HookComponent: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const socketURL = useMemo(
    () =>
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_SOCKET_URL ||
          "https://assistant.videogamewingman.com/"
        : process.env.NEXT_PUBLIC_DEV_SOCKET_URL || "http://localhost:3000",
    []
  );

  const socket = useSocket(socketURL);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  const sendMessage = async () => {
    try {
      setIsLoading(true);
      socket.emit("message", "Hello from Video Game Wingman!");
    } catch (error) {
      console.error("Failed to send message:", error);
      // You might want to show an error toast here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-sm">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <button
        onClick={sendMessage}
        disabled={!isConnected || isLoading}
        className={`px-4 py-2 rounded-md ${
          isConnected && !isLoading
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : "bg-gray-300 cursor-not-allowed"
        }`}
      >
        {isLoading ? "Sending..." : "Send Message"}
      </button>
    </div>
  );
};

export default HookComponent;
