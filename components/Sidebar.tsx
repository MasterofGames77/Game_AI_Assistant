import { SideBarProps } from "../types";
import ProStatus from "./ProStatus";
import DarkModeToggle from "./DarkModeToggle";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// Precompile the keyword pattern once
const keywords = [
  "release",
  "complete",
  "unlock",
  "guide",
  "time",
  "finish",
  "strategy",
  "find",
  "progress",
  "walkthrough",
  "weapon",
  "item",
  "speedrun",
  "100%",
  "character",
  "class",
  "search",
  "fast",
  "tips",
  "hidden",
  "secret",
  "gameplay",
  "obtain",
  "collect",
  "discover",
  "improve",
  "area",
  "level",
  "create",
  "build",
  "upload",
  "inventory",
  "how to",
  "how to do",
  "how to get",
  "how to unlock",
  "how to find",
  "how to progress",
  "how to beat",
  "world record",
  "develop",
  "craft",
  "cheats",
  "hack",
  "mod",
  "update",
  "grind",
  "available",
  "upgrade",
  "quest",
  "collectable",
  "achievement",
].join("|");

const titlePattern = new RegExp(keywords, "i");

type HotTopicSummary = {
  forumId: string;
  title: string;
  gameTitle: string;
  category: string;
  viewCount: number;
  totalPosts: number;
  lastActivityAt: string | Date | null;
};

// Sidebar component that displays conversation history
const Sidebar: React.FC<SideBarProps & { className?: string }> = ({
  conversations,
  onSelectConversation,
  onDeleteConversation,
  onNavigateToAccount,
  onOpenGuides,
  activeView,
  setActiveView,
  className,
  conversationCount,
  onLoadMore,
}) => {
  const [hasProAccess, setHasProAccess] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [streak, setStreak] = useState<{
    currentStreak: number;
    longestStreak: number;
  } | null>(null);
  const [stats, setStats] = useState<{
    questionsToday: number;
    totalQuestions: number;
    currentStreak: number;
  } | null>(null);
  const [hotTopics, setHotTopics] = useState<{
    trendingTopics: HotTopicSummary[];
    newThisWeek: HotTopicSummary[];
  }>({ trendingTopics: [], newThisWeek: [] });
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);
  const [hotTopicsError, setHotTopicsError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actualTotalConversations, setActualTotalConversations] = useState<
    number | null
  >(null);
  const [showHotTopics, setShowHotTopics] = useState(true);

  // Calculate if there are more conversations to load
  // Prioritize actualTotalConversations (fetched from API), then conversationCount prop, then check array length
  const totalToUse =
    actualTotalConversations !== null
      ? actualTotalConversations
      : conversationCount > 0
      ? conversationCount
      : null;

  const hasMore = totalToUse !== null && totalToUse > conversations.length;

  // Function to update username and check Pro access
  const updateUserData = useCallback(async () => {
    const storedUsername = localStorage.getItem("username");
    const storedUserId = localStorage.getItem("userId");

    // Always read fresh from localStorage and update state
    setUsername(storedUsername);

    // Check Pro access only if we have a username
    if (storedUsername) {
      try {
        const response = await fetch("/api/checkProAccess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: storedUsername,
            userId: storedUserId,
          }),
        });
        const data = await response.json();
        setHasProAccess(data.hasProAccess);
      } catch (error) {
        console.error("Error checking Pro access:", error);
      }

      // Fetch streak data
      try {
        const streakResponse = await fetch(
          `/api/streak?username=${encodeURIComponent(storedUsername)}`
        );
        if (streakResponse.ok) {
          const streakData = await streakResponse.json();
          setStreak({
            currentStreak: streakData.currentStreak || 0,
            longestStreak: streakData.longestStreak || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching streak:", error);
      }

      // Fetch stats data
      try {
        const statsResponse = await fetch(
          `/api/stats?username=${encodeURIComponent(storedUsername)}`
        );
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats({
            questionsToday: statsData.questionsToday || 0,
            totalQuestions: statsData.totalQuestions || 0,
            currentStreak: statsData.currentStreak || 0,
          });
          // Also set the actual total for Load More button
          setActualTotalConversations(statsData.totalQuestions || 0);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }

      // Also fetch conversation count directly to ensure Load More button shows correctly
      try {
        const convResponse = await fetch(
          `/api/getConversation?username=${encodeURIComponent(
            storedUsername
          )}&page=1&pageSize=20`
        );
        if (convResponse.ok) {
          const convData = await convResponse.json();
          if (convData.pagination && convData.pagination.total !== undefined) {
            setActualTotalConversations(convData.pagination.total);
          }
        }
      } catch (error) {
        console.error("Error fetching conversation count:", error);
      }
    } else {
      // Clear state if no username
      setHasProAccess(false);
      setStreak(null);
      setStats(null);
    }
  }, []);

  const fetchHotTopics = useCallback(async (user?: string | null) => {
    const effectiveUsername =
      user || localStorage.getItem("username") || "test-user";
    setHotTopicsLoading(true);
    setHotTopicsError(null);
    try {
      const response = await fetch(
        `/api/hotTopics?username=${encodeURIComponent(effectiveUsername)}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch hot topics (${response.status})`);
      }
      const data = await response.json();
      setHotTopics({
        trendingTopics: data.trendingTopics || [],
        newThisWeek: data.newThisWeek || [],
      });
    } catch (error) {
      console.error("Error fetching hot topics:", error);
      setHotTopicsError("Unable to load hot topics right now.");
      setHotTopics({ trendingTopics: [], newThisWeek: [] });
    } finally {
      setHotTopicsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    updateUserData();
    const storedHotTopicsPref = localStorage.getItem("showHotTopics");
    if (storedHotTopicsPref !== null) {
      setShowHotTopics(storedHotTopicsPref === "true");
    }

    // Debounce function to prevent too many API calls
    let debounceTimer: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        updateUserData();
      }, 500); // Wait 500ms after last event before updating
    };

    // Listen for storage changes (cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "username" || e.key === "userId") {
        console.log(
          "Storage changed detected (cross-tab), updating user data:",
          {
            key: e.key,
            oldValue: e.oldValue,
            newValue: e.newValue,
          }
        );
        debouncedUpdate();
      }
    };

    // Listen for custom localStorage change events (same-tab synchronization)
    const handleCustomStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        customEvent.detail &&
        (customEvent.detail.key === "username" ||
          customEvent.detail.key === "userId")
      ) {
        console.log(
          "Storage changed detected (same-tab), updating user data:",
          {
            key: customEvent.detail.key,
            oldValue: customEvent.detail.oldValue,
            newValue: customEvent.detail.newValue,
          }
        );
        debouncedUpdate();
      }
    };

    // Add storage event listener for cross-tab sync
    window.addEventListener("storage", handleStorageChange);
    // Add custom event listener for same-tab sync
    window.addEventListener("localStorageChange", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "localStorageChange",
        handleCustomStorageChange
      );
      clearTimeout(debounceTimer);
    };
  }, [updateUserData]);

  useEffect(() => {
    fetchHotTopics(username);
  }, [username, fetchHotTopics]);

  // Reset currentPage when conversations are refreshed from parent (e.g., after new question)
  // This happens when conversations are reset to page 1
  useEffect(() => {
    // Count non-temporary conversations (excluding optimistic updates with temp- IDs)
    const nonTempConversations = conversations.filter(
      (conv) => !conv._id?.startsWith("temp-")
    );

    // If we have 20 or fewer non-temp conversations, we're on page 1
    // Reset currentPage to ensure Load More works correctly
    if (nonTempConversations.length <= 20 && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [conversations, currentPage]);

  // Refresh stats when conversations change (e.g., after a new question)
  useEffect(() => {
    if (username) {
      // Add a small delay to ensure database has been updated
      const refreshStats = async () => {
        // Wait a bit for database write to complete
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          const statsResponse = await fetch(
            `/api/stats?username=${encodeURIComponent(username)}`
          );
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setStats({
              questionsToday: statsData.questionsToday || 0,
              totalQuestions: statsData.totalQuestions || 0,
              currentStreak: statsData.currentStreak || 0,
            });
            setActualTotalConversations(statsData.totalQuestions || 0);
          }
        } catch (error) {
          console.error("Error refreshing stats:", error);
        }
      };
      refreshStats();
    }
  }, [username, conversations.length]);

  // Memoize the shorten function
  const shortenQuestion = (question: string): string => {
    const match = question.match(titlePattern);
    if (match) {
      const keywordIndex = question
        .toLowerCase()
        .indexOf(match[0].toLowerCase());
      const start = Math.max(0, keywordIndex - 20);
      const end = Math.min(
        question.length,
        keywordIndex + match[0].length + 20
      );
      let title = question.slice(start, end);
      if (start > 0) title = "..." + title;
      if (end < question.length) title = title + "...";
      return title.length > 50 ? `${title.substring(0, 45)}...` : title;
    }
    const title = question.split(/\s+/).slice(0, 8).join(" ");
    return title.length > 50 ? `${title.substring(0, 45)}...` : title;
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteConversation(id);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const formatRelativeTime = (value: string | Date | null) => {
    if (!value) return "No recent activity";
    const date = value instanceof Date ? value : new Date(value);
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60 * 1000) return "Just now";
    if (diffMs < 60 * 60 * 1000) {
      const minutes = Math.floor(diffMs / (60 * 1000));
      return `${minutes}m ago`;
    }
    if (diffMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      return `${hours}h ago`;
    }
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return `${days}d ago`;
  };

  return (
    <div
      className={
        className
          ? className
          : "fixed left-0 top-0 h-full w-64 bg-[#1a1b2e] text-white p-4 flex flex-col overflow-hidden"
      }
      style={{ width: "256px" }}
    >
      <div className="mb-4">
        <ProStatus
          hasProAccess={hasProAccess}
          username={username || undefined}
        />
      </div>

      {/* Quick Stats Widget */}
      {username && stats && (
        <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
            Your Stats
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Questions Today</span>
              <span className="text-sm font-bold text-white">
                {stats.questionsToday}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Total Questions</span>
              <span className="text-sm font-bold text-white">
                {stats.totalQuestions}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Daily Streak Counter (keep for visual emphasis if streak > 0) */}
      {username && streak && streak.currentStreak > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-white text-center">
          <div className="text-2xl font-bold">🔥 {streak.currentStreak}</div>
          <div className="text-xs opacity-90">
            Day{streak.currentStreak !== 1 ? "s" : ""} Streak
          </div>
          {streak.longestStreak > streak.currentStreak && (
            <div className="text-xs opacity-75 mt-1">
              Best: {streak.longestStreak} days
            </div>
          )}
        </div>
      )}

      {/* Dark Mode Toggle */}
      <DarkModeToggle />

      {/* View Switching Buttons */}
      <div className="grid grid-cols-2 gap-1 mb-6">
        <button
          className={`px-3 py-2 rounded text-sm ${
            activeView === "chat"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
          onClick={() => setActiveView("chat")}
        >
          Chat
        </button>
        <button
          className={`px-3 py-2 rounded text-sm ${
            activeView === "forum"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
          onClick={() => setActiveView("forum")}
        >
          Forum
        </button>
        <button
          className={`px-3 py-2 rounded text-sm col-span-2 ${
            activeView === "feedback"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
          onClick={() => setActiveView("feedback")}
        >
          Feedback
        </button>
      </div>

      {/* Hot Topics Widget */}
      <div className="mb-6 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Hot Topics
          </div>
          <div className="flex items-center space-x-2">
            {hotTopicsLoading && (
              <span className="text-[10px] text-gray-400 animate-pulse">
                Refreshing...
              </span>
            )}
            <button
              onClick={() => {
                const next = !showHotTopics;
                setShowHotTopics(next);
                localStorage.setItem("showHotTopics", String(next));
              }}
              className="text-xs text-gray-300 hover:text-white transition"
            >
              {showHotTopics ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {!showHotTopics ? (
          <p className="text-xs text-gray-500 mt-2"></p>
        ) : hotTopicsError ? (
          <p className="text-xs text-red-400 mt-2">{hotTopicsError}</p>
        ) : (
          <>
            <div className="mt-3">
              <p className="text-[11px] uppercase text-gray-500 mb-1 tracking-wide">
                Top 3 Trending
              </p>
              {hotTopics.trendingTopics.length === 0 ? (
                <p className="text-xs text-gray-500">No trending topics yet.</p>
              ) : (
                <div className="space-y-2">
                  {hotTopics.trendingTopics.map((topic, index) => (
                    <Link
                      key={`${topic.forumId}-${index}`}
                      href={`/forum/${topic.forumId}`}
                      className="block"
                    >
                      <div className="p-2 rounded-md bg-gray-900/40 hover:bg-gray-900 transition text-sm">
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>#{index + 1}</span>
                          <span>
                            {formatRelativeTime(topic.lastActivityAt)}
                          </span>
                        </div>
                        <div className="text-white font-semibold truncate">
                          {topic.title}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {topic.gameTitle} • Views {topic.viewCount} • Posts{" "}
                          {topic.totalPosts}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="text-[11px] uppercase text-gray-500 mb-1 tracking-wide">
                New this week
              </p>
              {hotTopics.newThisWeek.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No fresh topics yet. Check back soon!
                </p>
              ) : (
                <div className="space-y-2">
                  {hotTopics.newThisWeek.map((topic) => (
                    <Link
                      key={`new-${topic.forumId}`}
                      href={`/forum/${topic.forumId}`}
                    >
                      <div className="p-2 rounded-md bg-gray-900/30 hover:bg-gray-900/60 transition text-sm">
                        <div className="text-white font-semibold truncate">
                          {topic.title}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {topic.gameTitle} • Updated{" "}
                          {formatRelativeTime(topic.lastActivityAt)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* My Guides Button */}
      {username && onOpenGuides && (
        <div className="mb-4">
          <button
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
            onClick={onOpenGuides}
            aria-label="View My Guides"
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
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <span>My Guides</span>
          </button>
        </div>
      )}

      {/* Account Button */}
      <div className="mb-6">
        <button
          className="w-full px-4 py-3 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
          onClick={onNavigateToAccount}
          aria-label="Go to Account Dashboard"
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span>Account</span>
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-4">Conversations</h2>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {conversations.map((convo, index) => {
          const uniqueKey =
            convo._id || `temp-${index}-${convo.question?.substring(0, 10)}`;
          return (
            <div key={uniqueKey} className="mb-4">
              <div className="flex justify-between items-center gap-2">
                <div
                  className="cursor-pointer truncate flex-1 min-w-0"
                  onClick={() => onSelectConversation(convo)}
                  title={convo.question || "Untitled conversation"}
                >
                  {shortenQuestion(convo.question || "Untitled conversation")}
                </div>
                <button
                  onClick={() => handleDelete(convo._id)}
                  className="text-red-400 hover:text-red-300 p-1 rounded flex-shrink-0"
                  disabled={!convo._id}
                  aria-label="Delete conversation"
                >
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-4 mb-2">
            <button
              onClick={async () => {
                if (loadingMore || !username) return;
                setLoadingMore(true);
                try {
                  const nextPage = currentPage + 1;
                  const response = await fetch(
                    `/api/getConversation?username=${encodeURIComponent(
                      username
                    )}&page=${nextPage}&pageSize=20`
                  );
                  if (response.ok) {
                    const data = await response.json();
                    // Update parent component's conversations via callback
                    if (onLoadMore) {
                      onLoadMore(data.conversations);
                    }
                    setCurrentPage(nextPage);
                  }
                } catch (error) {
                  console.error("Error loading more conversations:", error);
                } finally {
                  setLoadingMore(false);
                }
              }}
              disabled={loadingMore}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore
                ? "Loading..."
                : `Load More (${
                    (actualTotalConversations || conversationCount) -
                    conversations.length
                  } remaining)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
