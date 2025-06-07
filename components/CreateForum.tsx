"use client";

import { useState } from "react";
import { useForum } from "../context/ForumContext";

export default function CreateForum() {
  const [title, setTitle] = useState("");
  const [gameTitle, setGameTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { createForum } = useForum();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userId = localStorage.getItem("userId") || "test-user";
      const forumData = {
        title,
        gameTitle,
        category,
        isPrivate,
        allowedUsers: isPrivate ? [userId] : [],
      };

      const success = await createForum(forumData);

      if (success) {
        setTitle("");
        setGameTitle("");
        setCategory("");
        setIsPrivate(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create forum");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-forum-container max-w-2xl mx-auto p-6 bg-white dark:bg-black rounded-lg shadow mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Create New Forum
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="gameTitle"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            Game Title
          </label>
          <input
            type="text"
            id="gameTitle"
            value={gameTitle}
            onChange={(e) => setGameTitle(e.target.value)}
            placeholder="Enter game title"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-white dark:border-gray-600"
            required
          />
        </div>

        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-white dark:border-gray-600"
          >
            <option value="" disabled>
              Select a category
            </option>
            <option value="speedruns">Speedruns</option>
            <option value="gameplay">Gameplay</option>
            <option value="mods">Mods</option>
            <option value="general">General Discussion</option>
            <option value="help">Help & Support</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            Forum Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter forum title"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-white dark:border-gray-600"
            required
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPrivate"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="isPrivate"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-200"
          >
            Make this forum private
          </label>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="py-2 px-4 rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Forum"}
          </button>
        </div>
      </form>
    </div>
  );
}
