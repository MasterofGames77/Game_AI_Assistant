"use client";

import { useState, useEffect } from "react";
import { useForum } from "../context/ForumContext";
import { Forum } from "../types";
import CreateForum from "./CreateForum";
import Link from "next/link";

const categoryLabels: Record<string, string> = {
  speedruns: "Speedruns",
  hacks: "Hacks",
  mods: "Mods",
  general: "General Discussion",
  help: "Help & Support",
};

export default function ForumList() {
  const { forums, fetchForums, deleteForum } = useForum();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showCreateForm ? "Cancel" : "Create Forum"}
        </button>
      </div>

      {showCreateForm && <CreateForum />}

      <div className="grid gap-4">
        {forums.map((forum: Forum) => (
          <div
            key={forum._id}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <Link
                  href={`/forum/${forum.forumId}`}
                  className="text-xl font-semibold text-blue-600 hover:text-blue-800"
                >
                  {forum.title}
                </Link>
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
              {forum.createdBy === localStorage.getItem("userId") && (
                <button
                  onClick={() => handleDelete(forum._id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}

        {forums.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No forums found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
