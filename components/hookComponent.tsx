import React from "react";
import useSocket from "../hooks/useSocket";

const hookComponent: React.FC = () => {
  const socket = useSocket("http://localhost:3000");

  const sendMessage = () => {
    socket.emit("message", "Hello!");
  };

  return (
    <div>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
};

export default hookComponent;
