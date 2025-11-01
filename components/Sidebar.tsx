import { SideBarProps } from "../types";
import ProStatus from "./ProStatus";
import { useState, useEffect, useCallback } from "react";

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

// Sidebar component that displays conversation history
const Sidebar: React.FC<SideBarProps & { className?: string }> = ({
  conversations,
  onSelectConversation,
  onDeleteConversation,
  onNavigateToAccount,
  activeView,
  setActiveView,
  className,
}) => {
  const [hasProAccess, setHasProAccess] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

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
    } else {
      // Clear state if no username
      setHasProAccess(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    updateUserData();

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
      </div>
    </div>
  );
};

export default Sidebar;
