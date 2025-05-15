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
      const success = await createForum({
        title,
        gameTitle,
        category,
        isPrivate,
      });

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
    <div className="bg-white dark:bg-black p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Create New Forum
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-400 dark:text-gray-200"
          >
            Forum Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            placeholder="Forum title"
            required
          />
        </div>

        <div>
          <label
            htmlFor="gameTitle"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Game Title
          </label>
          <input
            type="text"
            id="gameTitle"
            value={gameTitle}
            onChange={(e) => setGameTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            placeholder="Game title"
            required
          />
        </div>

        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            required
          >
            <option value="">Select a category</option>
            <option value="speedruns">Speedruns</option>
            <option value="hacks">Hacks</option>
            <option value="mods">Mods</option>
            <option value="general">General Discussion</option>
            <option value="help">Help & Support</option>
          </select>
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

        <button
          type="submit"
          disabled={loading}
          className="w-half py-2 px-4 rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Forum"}
        </button>
      </form>
    </div>
  );
}
