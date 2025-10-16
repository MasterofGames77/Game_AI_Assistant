import React from "react";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import { AchievementData } from "../types";

const useSocket = (url: string): Socket => {
  const { current: socket } = useRef<Socket>(
    io(url, {
      // Use default Socket.IO configuration
    })
  );

  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Connected to socket.io server");
      console.log("Transport:", socket.io.engine.transport.name);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from socket.io server:", reason);
    });

    socket.on("connect_error", (error) => {
      console.warn("⚠️ Socket.IO connection error:", error.message);
      console.log("Error details:", error);
    });

    socket.on("achievementEarned", (data: AchievementData) => {
      console.log("Achievement earned:", data);

      // Create a more visually appealing notification for Pro users
      if (data.isPro) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <svg
                      className="h-10 w-10 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-white">
                      Pro Achievement Unlocked!
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {data.achievements.map((achievement, index) => (
                        <span key={index} className="block">
                          🏆 {achievement.name}
                        </span>
                      ))}
                    </p>
                    {data.totalAchievements && (
                      <p className="mt-2 text-xs text-white/80">
                        Total Achievements: {data.totalAchievements}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex border-l border-white/20">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white hover:bg-white/10 focus:outline-none"
                >
                  Close
                </button>
              </div>
            </div>
          ),
          {
            duration: 5000,
            position: "top-right",
          }
        );
      } else {
        // Regular achievement notification
        const achievementNames = data.achievements
          .map((achievement, index) => `${index + 1}. ${achievement.name}`)
          .join("\n");
        toast.success(`Achievement Unlocked!\n${achievementNames}`, {
          duration: 4000,
          position: "top-right",
        });
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("achievementEarned");
    };
  }, [socket]);

  return socket;
};

export default useSocket;
