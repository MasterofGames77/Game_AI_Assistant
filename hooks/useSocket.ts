import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

// Declare AchievementData interface at the top
interface AchievementData {
  userId: string;
  achievements: { name: string; dateEarned: Date }[];
  isPro?: boolean;
  totalAchievements?: number;
}

const useSocket = (url: string): Socket => {
  const { current: socket } = useRef<Socket>(
    io(url, {
      path: '/api/socket',
      addTrailingSlash: false
    })
  );

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to socket.io server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from socket.io server");
    });

    socket.on("achievementEarned", (data: AchievementData) => {
      console.log("Achievement earned:", data);
      const achievementNames = data.achievements
        .map((achievement, index) => `${index + 1}. ${achievement.name}`)
        .join("\n");
      alert(`Congratulations! You earned the following achievements:\n${achievementNames}`);
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