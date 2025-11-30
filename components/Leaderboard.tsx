import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LeaderboardType,
  Timeframe,
  LeaderboardResponse,
  LeaderboardEntry,
} from "../types";

interface LeaderboardProps {
  username?: string | null;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ username }) => {
  const router = useRouter();
  const [leaderboardData, setLeaderboardData] =
    useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] =
    useState<LeaderboardType>("questions");
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<Timeframe>("weekly");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [limit, setLimit] = useState(10);

  const leaderboardTypes: {
    value: LeaderboardType;
    label: string;
    icon: string;
  }[] = [
    { value: "questions", label: "Questions", icon: "❓" },
    { value: "achievements", label: "Achievements", icon: "🏆" },
    { value: "forumPosts", label: "Forum Posts", icon: "💬" },
    { value: "contributors", label: "Top Contributors", icon: "⭐" },
    { value: "genreSpecialists", label: "Genre Specialists", icon: "🎮" },
  ];

  const timeframes: { value: Timeframe; label: string }[] = [
    { value: "weekly", label: "This Week" },
    { value: "monthly", label: "This Month" },
    { value: "allTime", label: "All Time" },
  ];

  // All genres for genre specialists (matching the API mapping)
  const commonGenres = [
    "RPG",
    "Action",
    "Adventure",
    "Strategy",
    "Shooter",
    "Platformer",
    "Puzzle",
    "Racing",
    "Sports",
    "Simulation",
    "Survival",
    "Battle Royale",
    "Stealth",
    "Horror",
    "Fighting",
    "Visual Novel",
    "Beat Em Up",
    "Rhythm",
    "Sandbox",
  ];

  const fetchLeaderboard = useCallback(async () => {
    // Don't fetch if genre specialists is selected but no genre is chosen
    if (selectedType === "genreSpecialists" && !selectedGenre) {
      setLoading(false);
      setError(null);
      setLeaderboardData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type: selectedType,
        timeframe: selectedTimeframe,
        limit: limit.toString(),
      });

      if (selectedType === "genreSpecialists" && selectedGenre) {
        params.append("genre", selectedGenre);
      }

      const response = await fetch(`/api/leaderboard?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch leaderboard");
      }

      const data: LeaderboardResponse = await response.json();
      setLeaderboardData(data);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch leaderboard"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedTimeframe, selectedGenre, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getTypeIcon = (type: LeaderboardType) => {
    return leaderboardTypes.find((t) => t.value === type)?.icon || "📊";
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + "k";
    }
    return count.toString();
  };

  const getTypeLabel = (type: LeaderboardType) => {
    return leaderboardTypes.find((t) => t.value === type)?.label || type;
  };

  if (loading && !leaderboardData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error && !leaderboardData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Error Loading Leaderboard
          </h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Back to Main Page Button */}
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
              aria-label="Back to Main Page"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Wingman
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <span>{getTypeIcon(selectedType)}</span>
                {getTypeLabel(selectedType)} Leaderboard
              </h1>
              <p className="text-gray-300 mt-1">
                {selectedTimeframe === "weekly"
                  ? "Top performers this week"
                  : selectedTimeframe === "monthly"
                  ? "Top performers this month"
                  : "All-time top performers"}
              </p>
            </div>
          </div>
          {leaderboardData && (
            <div className="text-sm text-gray-400">
              {leaderboardData.cached ? (
                <span className="flex items-center gap-1">
                  <span>💾</span>
                  Cached
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span>🔄</span>
                  Live
                </span>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Leaderboard Type Selector */}
          <div className="flex flex-wrap gap-2">
            {leaderboardTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setSelectedType(type.value);
                  if (type.value !== "genreSpecialists") {
                    setSelectedGenre("");
                  }
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedType === type.value
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <span className="mr-1">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>

          {/* Timeframe Selector */}
          <div className="flex flex-wrap gap-2">
            {timeframes.map((timeframe) => (
              <button
                key={timeframe.value}
                onClick={() => setSelectedTimeframe(timeframe.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedTimeframe === timeframe.value
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {timeframe.label}
              </button>
            ))}
          </div>

          {/* Genre Selector (only for genre specialists) */}
          {selectedType === "genreSpecialists" && (
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="px-4 py-2 rounded-md text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select Genre</option>
                {commonGenres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Limit Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Show:</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-2 rounded-md text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchLeaderboard}
            disabled={
              loading || (selectedType === "genreSpecialists" && !selectedGenre)
            }
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Genre Selection Warning */}
      {selectedType === "genreSpecialists" && !selectedGenre && (
        <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-200">
            Please select a genre to view genre specialists leaderboard.
          </p>
        </div>
      )}

      {/* Leaderboard Table */}
      {leaderboardData && leaderboardData.entries.length > 0 ? (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Count
                  </th>
                  {selectedType === "contributors" && (
                    <>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Questions
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Achievements
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Posts
                      </th>
                    </>
                  )}
                  {selectedType === "genreSpecialists" && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Genre
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {leaderboardData.entries.map((entry) => (
                  <tr
                    key={`${entry.username}-${entry.rank}`}
                    className={`hover:bg-gray-700/50 transition-colors ${
                      entry.username === username
                        ? "bg-purple-500/20 border-l-4 border-purple-500"
                        : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-white">
                          {getRankIcon(entry.rank)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className={`text-sm font-medium ${
                            entry.username === username
                              ? "text-purple-300"
                              : "text-white"
                          }`}
                        >
                          {entry.username}
                          {entry.username === username && (
                            <span className="ml-2 text-xs text-purple-400">
                              (You)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-300">
                        {formatCount(entry.count)}
                      </span>
                    </td>
                    {selectedType === "contributors" && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-400">
                            {entry.metadata?.questionCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-400">
                            {entry.metadata?.achievementCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-400">
                            {entry.metadata?.forumPostCount || 0}
                          </span>
                        </td>
                      </>
                    )}
                    {selectedType === "genreSpecialists" && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full">
                          {entry.metadata?.genre || leaderboardData.genre}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : leaderboardData && leaderboardData.entries.length === 0 ? (
        <div className="bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-700">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No Data Available
          </h3>
          <p className="text-gray-300">
            {selectedType === "genreSpecialists" && !selectedGenre
              ? "Please select a genre to view the leaderboard."
              : "No entries found for this leaderboard."}
          </p>
        </div>
      ) : null}

      {/* Footer Info */}
      {leaderboardData && (
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>
            Last updated:{" "}
            {new Date(leaderboardData.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
