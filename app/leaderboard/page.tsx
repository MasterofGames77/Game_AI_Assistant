"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Leaderboard from "@/components/Leaderboard";

export default function LeaderboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Get username from localStorage or session
    // This matches the pattern used in other pages
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      // Try to get from headers or context if available
      // For now, we'll allow viewing without username
      setUsername(null);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto py-8">
        <Leaderboard username={username} />
      </div>
    </div>
  );
}
