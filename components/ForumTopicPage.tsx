"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useForum } from "../context/ForumContext";
import { Topic } from "../types";
import { validatePostData } from "../utils/validation";
import { containsOffensiveContent } from "../utils/contentModeration";

export default function ForumTopicPage() {
  const router = useRouter();
  const { forumId, topicId } = router.query;
  const {
    addPost,
    error: forumError,
    setError,
    loading: forumLoading,
  } = useForum();
  const [forumTopic, setForumTopic] = useState<Topic | null>(null);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchTopic = async () => {
      if (forumId && topicId) {
        try {
          setLoading(true);
          const userId = localStorage.getItem("userId");
          const response = await fetch(
            `/api/getForumTopic?forumId=${forumId}&topicId=${topicId}&userId=${userId}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch topic");
          }
          const data = await response.json();
          setForumTopic(data);
        } catch (error) {
          console.error("Error fetching topic:", error);
          setError("Error fetching forum topic");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTopic();
  }, [forumId, topicId, setError]);

  const handlePostSubmit = async () => {
    if (!newPost.trim()) return;

    try {
      setLoading(true);
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("User ID not found");
        return;
      }

      // Validate post data
      const validationErrors = validatePostData({
        message: newPost,
        userId,
        topicId: topicId as string,
        forumId: forumId as string,
      });

      if (validationErrors.length > 0) {
        setError(validationErrors[0]);
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
      await addPost(forumId as string, topicId as string, newPost);

      // Refresh topic data
      const response = await fetch(
        `/api/getForumTopic?forumId=${forumId}&topicId=${topicId}&userId=${userId}`
      );
      if (!response.ok) {
        throw new Error("Failed to refresh topic");
      }
      const data = await response.json();
      setForumTopic(data);

      // Reset form and show success
      setNewPost("");
      setSuccess("Post added successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error adding post:", err);
      setError("Error adding post to the forum");
    } finally {
      setLoading(false);
    }
  };

  if (loading || forumLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!forumTopic) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-800">Topic not found</h2>
        <p className="text-gray-600 mt-2">
          The requested topic could not be found or you don&apos;t have access
          to it.
        </p>
      </div>
    );
  }

  return (
    <div className="forum-topic-container max-w-4xl mx-auto p-4">
      {/* Topic Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {forumTopic.topicTitle}
            </h1>
            <p className="text-gray-600 mb-4">{forumTopic.description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span>Created by: User {forumTopic.createdBy}</span>
              <span>•</span>
              <span>Posts: {forumTopic.metadata.postCount}</span>
              <span>•</span>
              <span>Views: {forumTopic.metadata.viewCount}</span>
              <span>•</span>
              <span
                className={`px-2 py-1 rounded ${
                  forumTopic.metadata.status === "active"
                    ? "bg-green-100 text-green-800"
                    : forumTopic.metadata.status === "locked"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Status: {forumTopic.metadata.status}
              </span>
            </div>
          </div>
          {forumTopic.isPrivate && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              Private Topic
            </div>
          )}
        </div>
      </div>

      {/* Error and Success Messages */}
      {forumError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {forumError}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Posts Section */}
      <div className="space-y-4 mb-6">
        {forumTopic.posts.map((post, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <div className="font-semibold text-gray-900">
                  User {post.userId}
                </div>
                {post.userId === forumTopic.createdBy && (
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                    Topic Creator
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(post.timestamp).toLocaleString()}
              </div>
            </div>
            <div className="text-gray-800 whitespace-pre-wrap">
              {post.message}
            </div>
            {post.metadata?.edited &&
              post.metadata.editedBy &&
              post.metadata.editedAt && (
                <div className="text-xs text-gray-500 mt-2">
                  Edited by {post.metadata.editedBy} on{" "}
                  {new Date(post.metadata.editedAt).toLocaleString()}
                </div>
              )}
            {post.metadata?.likes && post.metadata.likes > 0 && (
              <div className="text-xs text-gray-500 mt-2">
                {post.metadata.likes}{" "}
                {post.metadata.likes === 1 ? "like" : "likes"}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Post Form */}
      {forumTopic.metadata.status === "active" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Add a Reply</h3>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Write your reply..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
          />
          <button
            onClick={handlePostSubmit}
            disabled={loading}
            className={`mt-4 px-6 py-2 rounded-lg text-white font-medium ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {loading ? "Posting..." : "Post Reply"}
          </button>
        </div>
      )}

      {forumTopic.metadata.status !== "active" && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          This topic is {forumTopic.metadata.status}. New posts cannot be added.
        </div>
      )}
    </div>
  );
}
