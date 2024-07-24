import React from "react";
import useSocket from "../hooks/useSocket";

const HookComponent: React.FC = () => {
  const socket = useSocket("http://localhost:3000");

  const sendMessage = () => {
    socket.emit("message", "Hello from the client!");
  };

  return (
    <div>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
};

export default HookComponent;
