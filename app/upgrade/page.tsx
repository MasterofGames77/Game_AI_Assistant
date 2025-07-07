"use client";

import React from "react";

const ProFeatures = [
  {
    title: "Real-time Notifications",
    description:
      "Get instant updates about achievements, forum responses, and community activity.",
    icon: "🔔",
  },
  {
    title: "Forum Access",
    description: "Participate in exclusive Pro-only forums and discussions.",
    icon: "💬",
  },
  {
    title: "Advanced Analytics",
    description: "Track your gaming progress and get personalized insights.",
    icon: "📊",
  },
  {
    title: "Priority Support",
    description: "Get faster responses to your questions and issues.",
    icon: "⭐",
  },
];

export default function UpgradePage() {
  //   const handleUpgrade = async () => {
  //     // TODO: Implement upgrade logic
  //     console.log("Upgrade clicked");
  //   };

  return (
    <div className="min-h-screen bg-[#1a1b2e] text-white py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Upgrade to Video Game Wingman Pro
            <div className="w-48 h-1 bg-gradient-to-r from-[#00ffff] via-[#ff69b4] to-[#00ffff] mx-auto mt-4"></div>
          </h1>
          <p className="text-xl text-gray-300">
            Get exclusive features and enhance your gaming experience
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {ProFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-[#00ffff]">
                {feature.title}
              </h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4">Special Offer</h2>
            <p className="text-xl text-gray-300">
              Sign up before December 31st, 2025 and get 1 year of Pro access
              for free!
            </p>
          </div>

          {/* <button
            onClick={handleUpgrade}
            className="px-8 py-4 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white text-xl font-bold rounded-lg hover:from-[#00e6e6] hover:to-[#ff4da6] transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Upgrade Now
          </button> */}
        </div>
      </div>
    </div>
  );
}
