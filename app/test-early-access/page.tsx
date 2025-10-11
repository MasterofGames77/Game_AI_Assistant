"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const TestEarlyAccessPage: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleTestEarlyAccess = () => {
    if (!userId) {
      setMessage("Please enter a user ID");
      return;
    }

    setLoading(true);
    setMessage("");

    // Simulate early access redirect
    const testUrl = new URL("/", window.location.origin);
    testUrl.searchParams.append("earlyAccess", "true");
    testUrl.searchParams.append("userId", userId);
    if (email) {
      testUrl.searchParams.append("email", email);
    }

    // Redirect to main page with early access parameters
    window.location.href = testUrl.toString();
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

      <div className="relative bg-white/95 backdrop-blur-sm p-10 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-white/20">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/assets/video-game-wingman-logo.png"
            alt="Video Game Wingman Logo"
            width={120}
            height={120}
            className="mb-6 drop-shadow-lg"
            priority
          />
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Test Early Access Flow
          </h1>
          <p className="text-gray-600 text-center text-sm">
            Simulate an early access user coming from the splash page
          </p>
        </div>

        <div className="space-y-4">
          {/* User ID Field */}
          <div>
            <label
              htmlFor="userId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              User ID (Required)
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter user ID (e.g., user-12345)"
              required
            />
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email (Optional)
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>

          {/* Test Button */}
          <button
            onClick={handleTestEarlyAccess}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Testing...
              </div>
            ) : (
              "Test Early Access Flow"
            )}
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div className="mt-4 p-3 rounded-lg text-sm bg-red-100 text-red-800">
            {message}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            How to Test:
          </h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>
              • Enter a user ID (this should exist in your splash database)
            </li>
            <li>• Optionally enter an email address</li>
            <li>
              • Click &quot;Test Early Access Flow&quot; to simulate the
              redirect
            </li>
            <li>
              • You should be automatically signed in and see the setup modal
            </li>
          </ul>
        </div>

        {/* Back to Main Page */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
          >
            Back to Main Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestEarlyAccessPage;
