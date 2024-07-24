import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const useSocket = (url: string): Socket => {
  const { current: socket } = useRef<Socket>(io(url));

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to socket.io server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from socket.io server");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket]);

  return socket;
};

export default useSocket;