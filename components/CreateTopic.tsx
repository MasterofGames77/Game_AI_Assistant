"use client";

import { useState } from "react";
import { useForum } from "../context/ForumContext";
import { containsOffensiveContent } from "../utils/contentModeration";

interface CreateTopicProps {
  onTopicCreated?: (forumId: string) => void;
}

export default function CreateTopic({ onTopicCreated }: CreateTopicProps) {
  const { createTopic, error: forumError, setError } = useForum();
  const [gameTitle, setGameTitle] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowedUsers, setAllowedUsers] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleCreateTopic = async () => {
    // Reset states
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Basic validation
      if (!gameTitle.trim() || !topicTitle.trim()) {
        setError("Game title and topic title are required");
        return;
      }

      // Check for offensive content
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("User ID not found");
        return;
      }

      const titleCheck = await containsOffensiveContent(topicTitle, userId);
      const gameTitleCheck = await containsOffensiveContent(gameTitle, userId);

      if (titleCheck.isOffensive || gameTitleCheck.isOffensive) {
        const offendingWords = [
          ...titleCheck.offendingWords,
          ...gameTitleCheck.offendingWords,
        ];
        setError(
          `The following words/phrases violate our policy: ${offendingWords.join(
            ", "
          )}`
        );
        return;
      }

      // Generate forumId from game title
      const forumId = gameTitle.toLowerCase().replace(/[^a-z0-9]/g, "-");

      // Create topic data
      const topicData = {
        topicTitle: topicTitle.trim(),
        description: description.trim(),
        isPrivate,
        allowedUsers: isPrivate
          ? allowedUsers.split(",").map((id) => id.trim())
          : [],
        gameTitle: gameTitle.trim(),
        category: category || "General",
      };

      // Create topic using context
      await createTopic(forumId, topicData);

      // Show success message
      setSuccess("Topic created successfully!");
      setTimeout(() => setSuccess(""), 3000);

      // Reset form
      setGameTitle("");
      setTopicTitle("");
      setDescription("");
      setCategory("");
      setIsPrivate(false);
      setAllowedUsers("");

      // Callback if provided
      if (onTopicCreated) {
        onTopicCreated(forumId);
      }
    } catch (err) {
      console.error("Error creating topic:", err);
      setError("Failed to create topic. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-topic-container max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Create a New Topic</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Game Title
          </label>
          <input
            type="text"
            value={gameTitle}
            onChange={(e) => setGameTitle(e.target.value)}
            placeholder="Enter game title (e.g., Super Mario 64, Sonic 3, etc.)"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Category (Optional)</option>
            <option value="General Discussion">General Discussion</option>
            <option value="Speedrun">Speedrun</option>
            <option value="Guides">Guides</option>
            <option value="Tips & Tricks">Tips & Tricks</option>
            <option value="Bugs & Glitches">Bugs & Glitches</option>
            <option value="Mods">Mods</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic Title
          </label>
          <input
            type="text"
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            placeholder="Enter topic title"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter topic description (optional)"
            className="w-full p-2 border border-gray-300 rounded h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={() => setIsPrivate(!isPrivate)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            Private Topic
          </label>
        </div>

        {isPrivate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allowed Users (comma-separated user IDs)
            </label>
            <input
              type="text"
              value={allowedUsers}
              onChange={(e) => setAllowedUsers(e.target.value)}
              placeholder="Enter user IDs (comma-separated)"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {forumError && <div className="text-red-500 text-sm">{forumError}</div>}

        {success && <div className="text-green-500 text-sm">{success}</div>}

        <button
          onClick={handleCreateTopic}
          disabled={loading}
          className={`w-full py-2 px-4 rounded text-white font-medium ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Creating..." : "Create Topic"}
        </button>
      </div>
    </div>
  );
}
