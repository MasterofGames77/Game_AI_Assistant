"use client";

import { useState, useEffect } from "react";
import { useForum } from "../context/ForumContext";
import { Forum } from "../types";
import CreateForum from "./CreateForum";
import Link from "next/link";

const categoryLabels: Record<string, string> = {
  speedruns: "Speedruns",
  gameplay: "Gameplay",
  mods: "Mods",
  general: "General Discussion",
  help: "Help & Support",
};

export default function ForumList() {
  const {
    forums,
    fetchForums,
    deleteForum,
    pagination,
    loading: contextLoading,
  } = useForum();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const forumsPerPage = 10;

  // Check Pro access on component mount
  useEffect(() => {
    const checkProAccess = async () => {
      try {
        const username = localStorage.getItem("username");
        const userId = localStorage.getItem("userId");

        // Only check Pro access if user is logged in
        if (!username) {
          setHasProAccess(false);
          return;
        }

        const response = await fetch("/api/checkProAccess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, userId }),
        });

        if (!response.ok) {
          // If request fails, assume no Pro access
          setHasProAccess(false);
          return;
        }

        const data = await response.json();
        setHasProAccess(data.hasProAccess || false);
      } catch (error) {
        console.error("Error checking Pro access:", error);
        // On error, assume no Pro access
        setHasProAccess(false);
      }
    };

    checkProAccess();
  }, []);

  const loadForums = async (page: number) => {
    try {
      setLoading(true);
      setError("");
      await fetchForums(page, forumsPerPage);
    } catch (err: any) {
      setError(err.message || "Failed to load forums");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadForums(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Refresh forums when create form is closed (after successful creation)
  useEffect(() => {
    if (!showCreateForm) {
      // Small delay to ensure the forum was created in the database
      const timer = setTimeout(() => {
        loadForums(currentPage);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateForm]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && currentPage < pagination.pages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleReload = () => {
    setIsRefreshing(true);
    loadForums(currentPage);
  };

  const handleDelete = async (forumId: string) => {
    if (!confirm("Are you sure you want to delete this forum?")) return;

    try {
      await deleteForum(forumId);
      // Refresh the current page after deletion
      // If we're on the last page and it becomes empty, go to previous page
      if (pagination && forums.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        loadForums(currentPage);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete forum");
    }
  };

  const isLoading = loading || contextLoading || isRefreshing;

  if (loading && !isRefreshing) {
    return <div className="text-center">Loading forums...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Forums</h2>
        <div className="flex gap-2">
          <button
            onClick={handleReload}
            disabled={isLoading}
            className={`px-4 py-2 rounded flex items-center gap-2 ${
              isLoading
                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
            title="Reload forums"
          >
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Reloading...
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
                Reload
              </>
            )}
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={!hasProAccess}
            className={`px-4 py-2 rounded ${
              hasProAccess
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-400 text-gray-600 cursor-not-allowed"
            }`}
            title={!hasProAccess ? "Pro access required to create forums" : ""}
          >
            {showCreateForm ? "Cancel" : "Create Forum"}
          </button>
        </div>
      </div>

      {!hasProAccess && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Pro Access Required:</strong> Upgrade to Wingman Pro to
            create and manage forums. Free users can still browse discussions,
            post, and reply.
          </p>
        </div>
      )}

      {showCreateForm && <CreateForum />}

      <div className="grid gap-4">
        {forums.map((forum: Forum) => {
          // console.log("Forum object:", forum); // Commented out for production
          return (
            <div
              key={forum._id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/forum/${forum.forumId}`}
                      className="text-xl font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {forum.title}
                    </Link>
                    {forum.isPrivate && (
                      <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full">
                        Private
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-1">
                    Game: {forum.gameTitle} | Category:{" "}
                    {categoryLabels[forum.category] ||
                      forum.category ||
                      "Uncategorized"}
                  </p>
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="mr-4">
                      Posts: {forum.posts?.length || 0}
                    </span>
                    <span className="mr-4">
                      Views: {forum.metadata?.viewCount || 0}
                    </span>
                    <span>Status: {forum.metadata?.status || "active"}</span>
                  </div>
                </div>
                {forum.createdBy === localStorage.getItem("username") && (
                  <button
                    onClick={() => handleDelete(forum._id)}
                    className="text-red-500 hover:text-red-700 ml-4"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {forums.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 py-8">
            No forums found. Create one to get started!
            {!hasProAccess && (
              <div className="mt-2 text-sm">
                <p>Upgrade to Pro to create your own communities.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || isLoading}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                currentPage === 1 || isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {currentPage} of {pagination.pages} ({pagination.total} total
              forums)
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= pagination.pages || isLoading}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                currentPage >= pagination.pages || isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Next
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Show pagination info even if only one page */}
      {pagination && pagination.pages === 1 && pagination.total > 0 && (
        <div className="text-center text-gray-600 text-sm py-2">
          Showing all {pagination.total} forum
          {pagination.total !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
