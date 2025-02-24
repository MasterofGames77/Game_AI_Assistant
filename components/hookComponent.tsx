import React from "react";
import useSocket from "../hooks/useSocket";

const HookComponent: React.FC = () => {
  const socketURL =
    process.env.NODE_ENV === "production"
      ? "https://assistant.videogamewingman.com/"
      : "http://localhost:3000";

  const socket = useSocket(socketURL);

  const sendMessage = () => {
    socket.emit("message", "Hello from Video Game Wingman!");
  };

  return (
    <div>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
};

export default HookComponent;
