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
  const { forums, fetchForums, deleteForum } = useForum();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [hasProAccess, setHasProAccess] = useState(false);

  // Check Pro access on component mount
  useEffect(() => {
    const checkProAccess = async () => {
      try {
        const username = localStorage.getItem("username");
        if (username) {
          const response = await fetch("/api/checkProAccess", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username }),
          });
          const data = await response.json();
          setHasProAccess(data.hasProAccess);
        }
      } catch (error) {
        console.error("Error checking Pro access:", error);
      }
    };

    checkProAccess();
  }, []);

  useEffect(() => {
    const loadForums = async () => {
      try {
        await fetchForums(1, 10);
      } catch (err: any) {
        setError(err.message || "Failed to load forums");
      } finally {
        setLoading(false);
      }
    };

    loadForums();
  }, [fetchForums]);

  const handleDelete = async (forumId: string) => {
    if (!confirm("Are you sure you want to delete this forum?")) return;

    try {
      await deleteForum(forumId);
    } catch (err: any) {
      setError(err.message || "Failed to delete forum");
    }
  };

  if (loading) {
    return <div className="text-center">Loading forums...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Forums</h2>
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

      {!hasProAccess && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Pro Access Required:</strong> Upgrade to Wingman Pro to
            create forums and participate in discussions.
          </p>
        </div>
      )}

      {showCreateForm && <CreateForum />}

      <div className="grid gap-4">
        {forums.map((forum: Forum) => {
          console.log("Forum object:", forum);
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
                    {forum.isProOnly && (
                      <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full">
                        Pro Only
                      </span>
                    )}
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

        {forums.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No forums found. Create one to get started!
            {!hasProAccess && (
              <div className="mt-2 text-sm">
                <p>
                  Upgrade to Pro to access exclusive forums and create Pro-only
                  discussions.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
