import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

// Declare AchievementData interface at the top
interface AchievementData {
  userId: string;
  achievements: { name: string; dateEarned: Date }[];
}

const useSocket = (url: string): Socket => {
  const { current: socket } = useRef<Socket>(io(url));

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to socket.io server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from socket.io server");
    });

    // // Listen for achievement notifications with proper typing
    socket.on("achievementEarned", (data: AchievementData) => {
      console.log("Achievement earned:", data);
      alert(`Congratulations! You earned the following achievements: ${data.achievements.map(a => a.name).join(", ")}`);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("achievementEarned");
    };
  }, [socket]);

  return socket;
};

export default useSocket;