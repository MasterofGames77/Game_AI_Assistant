"use client";

import { useState, useEffect } from "react";
import { useForum } from "../context/ForumContext";
import { Topic, ForumListProps } from "../types";
import { validateTopicData } from "../utils/validation";
import { containsOffensiveContent } from "../utils/contentModeration";

export default function ForumList({
  forumId,
  initialTopics = [],
}: ForumListProps) {
  const {
    topics,
    loading,
    error: forumError,
    setError,
    fetchTopics,
    createTopic,
    deleteTopic,
    addPost,
  } = useForum();

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [newPost, setNewPost] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [topicSuccess, setTopicSuccess] = useState("");

  // Form states for new topic
  const [topicTitle, setTopicTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowedUsers, setAllowedUsers] = useState("");

  useEffect(() => {
    if (forumId) {
      fetchTopics(forumId);
    }
  }, [forumId, fetchTopics]);

  const handlePostSubmit = async (topicId: string) => {
    if (!newPost.trim()) return;

    try {
      setIsLoading(true);
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("User ID not found");
        return;
      }

      // Check for offensive content
      const contentCheck = await containsOffensiveContent(newPost, userId);
      if (contentCheck.isOffensive) {
        setError(
          `The following words violate our policy: ${contentCheck.offendingWords.join(
            ", "
          )}`
        );
        return;
      }

      // Add post using context
      await addPost(forumId, topicId, newPost);
      setNewPost("");
      setSuccess("Post added successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error adding post:", err);
      setError("Failed to add post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTopic = async () => {
    try {
      setIsLoading(true);
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("User ID not found");
        return;
      }

      // Validate topic data
      const validationErrors = validateTopicData({
        topicTitle,
        description,
        isPrivate,
        allowedUsers: isPrivate
          ? allowedUsers.split(",").map((id) => id.trim())
          : [],
      });

      if (validationErrors.length > 0) {
        setError(validationErrors[0]);
        return;
      }

      // Check for offensive content
      const contentCheck = await containsOffensiveContent(topicTitle, userId);
      if (contentCheck.isOffensive) {
        setError(
          `The following words violate our policy: ${contentCheck.offendingWords.join(
            ", "
          )}`
        );
        return;
      }

      // Create topic using context
      await createTopic(forumId, {
        topicTitle,
        description,
        isPrivate,
        allowedUsers: isPrivate
          ? allowedUsers.split(",").map((id) => id.trim())
          : [],
      });

      // Reset form
      setTopicTitle("");
      setDescription("");
      setIsPrivate(false);
      setAllowedUsers("");
      setTopicSuccess("Topic created successfully!");
      setTimeout(() => setTopicSuccess(""), 3000);
    } catch (err) {
      console.error("Error creating topic:", err);
      setError("Failed to create topic");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      setIsLoading(true);
      await deleteTopic(forumId, topicId);
      setSuccess("Topic deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error deleting topic:", err);
      setError("Failed to delete topic");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="forum-container space-y-6">
      {/* Error and Success Messages */}
      {forumError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {forumError}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      {topicSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {topicSuccess}
        </div>
      )}

      {/* Create New Topic Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Create New Topic</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic Title
            </label>
            <input
              type="text"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter topic title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter topic description"
              rows={3}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Private Topic
            </label>
          </div>
          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allowed Users (comma-separated)
              </label>
              <input
                type="text"
                value={allowedUsers}
                onChange={(e) => setAllowedUsers(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter user IDs separated by commas"
              />
            </div>
          )}
          <button
            onClick={handleCreateTopic}
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded text-white font-medium ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isLoading ? "Creating..." : "Create Topic"}
          </button>
        </div>
      </div>

      {/* Topics List */}
      <div className="space-y-4">
        {topics.map((topic) => (
          <div key={topic.topicId} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {topic.topicTitle}
                </h3>
                <p className="text-gray-600 mt-1">{topic.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>Posts: {topic.metadata.postCount}</span>
                  <span>Views: {topic.metadata.viewCount}</span>
                  <span>
                    Last Activity:{" "}
                    {topic.metadata.lastPostAt instanceof Date
                      ? topic.metadata.lastPostAt.toLocaleString()
                      : "No activity yet"}
                  </span>
                  {topic.isPrivate && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      Private
                    </span>
                  )}
                </div>
              </div>
              {topic.createdBy === localStorage.getItem("userId") && (
                <button
                  onClick={() => handleDeleteTopic(topic.topicId)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete Topic
                </button>
              )}
            </div>

            {/* Posts Section */}
            <div className="space-y-4 mt-4">
              {topic.posts.map((post, index) => (
                <div
                  key={`${topic.topicId}-${index}`}
                  className="bg-gray-50 p-4 rounded"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold">User {post.userId}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(post.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-gray-800">{post.message}</div>
                  {post.metadata?.edited && (
                    <div className="text-xs text-gray-500 mt-2">
                      Edited by {post.metadata.editedBy} on{" "}
                      {post.metadata.editedAt
                        ? new Date(post.metadata.editedAt).toLocaleString()
                        : "Unknown time"}
                    </div>
                  )}
                </div>
              ))}

              {/* New Post Form */}
              {topic.metadata.status === "active" && (
                <div className="mt-4">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Write your reply..."
                    rows={3}
                  />
                  <button
                    onClick={() => handlePostSubmit(topic.topicId)}
                    disabled={isLoading}
                    className={`mt-2 px-4 py-2 rounded text-white font-medium ${
                      isLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {isLoading ? "Posting..." : "Post Reply"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
