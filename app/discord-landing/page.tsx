"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Image from "next/image";

export const dynamic = "force-dynamic";

// Create a separate component for the main content
function DiscordLandingContent() {
  const searchParams = useSearchParams();
  const botInviteUrl = searchParams?.get("botInvite") ?? null;
  const userId = searchParams?.get("userId") ?? null;
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [showDiscordModal, setShowDiscordModal] = useState(false);

  useEffect(() => {
    const fetchApplicationId = async () => {
      try {
        const response = await fetch("/api/discord/config");
        const data = await response.json();
        setApplicationId(data.applicationId);
      } catch (error) {
        console.error("Failed to fetch Discord config:", error);
      }
    };
    fetchApplicationId();
  }, []);

  console.log("Discord Landing Page Parameters:", {
    botInviteUrl: botInviteUrl ? "[REDACTED]" : "null",
    userId: userId ? "[REDACTED]" : "null",
  });

  // handle adding the bot to the server
  const handleAddToServer = () => {
    if (botInviteUrl) {
      console.log("Opening bot invite URL in new window");
      window.open(botInviteUrl, "_blank");
    } else {
      console.error("Bot invite URL is missing");
    }
  };

  // handle starting a direct message with the bot
  const handleStartDM = () => {
    if (!applicationId) {
      console.error("Discord application ID not available");
      return;
    }

    // Show modal with three options
    setShowDiscordModal(true);
  };

  const handleDiscordDesktop = () => {
    if (!applicationId) return;

    try {
      // Create a hidden iframe to attempt the deep link
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = `discord:///users/${applicationId}`;
      document.body.appendChild(iframe);

      // Remove iframe after a short delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);

      setShowDiscordModal(false);
    } catch (error) {
      console.error("Error opening Discord desktop app:", error);
      setShowDiscordModal(false);
    }
  };

  const handleDiscordWeb = () => {
    if (!applicationId) return;

    window.open(`https://discord.com/users/${applicationId}`, "_blank");
    setShowDiscordModal(false);
  };

  const handleDiscordCancel = () => {
    setShowDiscordModal(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      <div className="relative bg-white/95 backdrop-blur-sm p-10 rounded-2xl shadow-2xl max-w-lg w-full mx-4 border border-white/20">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/assets/video-game-wingman-logo.png"
            alt="Video Game Wingman Logo"
            width={180}
            height={180}
            className="mb-6 drop-shadow-lg"
            priority
          />
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Introducing Video Game Wingman!
          </h1>
          <p className="text-gray-600 text-center text-sm">
            Your AI-powered gaming companion is ready to join your Discord
            server
          </p>
        </div>
        <div className="space-y-4">
          <button
            onClick={handleAddToServer}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
          >
            🚀 Add Bot to Server
          </button>
          <button
            onClick={handleStartDM}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
          >
            💬 Start Direct Message
          </button>
        </div>

        {/* Feature highlights */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>Pro Access</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>Slash Commands</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>24/7 Available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Discord Modal */}
      {showDiscordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
              Choose how to open Discord
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Select your preferred way to start a conversation with Hero Game
              Wingman
            </p>

            <div className="space-y-4">
              <button
                onClick={handleDiscordDesktop}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
              >
                🖥️ Open Discord Desktop App
              </button>

              <button
                onClick={handleDiscordWeb}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 px-6 rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
              >
                🌐 Open Discord in Browser
              </button>

              <button
                onClick={handleDiscordCancel}
                className="w-full bg-gray-500 text-white py-3 px-6 rounded-xl hover:bg-gray-600 transition-all duration-300 font-semibold"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component with Suspense wrapper
export default function DiscordLanding() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      }
    >
      <DiscordLandingContent />
    </Suspense>
  );
}
