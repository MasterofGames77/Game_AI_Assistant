"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useForum } from "../context/ForumContext";
import { Forum } from "../types";
import { validatePostData } from "../utils/validation";
import { containsOffensiveContent } from "../utils/contentModeration";
import { ForumProvider } from "../context/ForumContext";

export default function ForumTopicPageWrapper() {
  return (
    <ForumProvider>
      <ForumPage />
    </ForumProvider>
  );
}

function ForumPage() {
  const router = useRouter();
  const { forumId } = router.query;
  const {
    forums,
    addPost,
    deletePost,
    likePost,
    error: forumError,
    setError,
    loading: forumLoading,
  } = useForum();
  const [forum, setForum] = useState<Forum | null>(null);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (forumId) {
      const currentForum = forums.find((f) => f.forumId === forumId);
      if (currentForum) {
        setForum(currentForum);
      }
    }
  }, [forumId, forums]);

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
      await addPost(forumId as string, newPost);

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

  const handleDeletePost = async (postId: string) => {
    try {
      setLoading(true);
      await deletePost(forumId as string, postId);
      setSuccess("Post deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error deleting post:", err);
      setError("Error deleting post");
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      await likePost(forumId as string, postId);
    } catch (err) {
      console.error("Error liking post:", err);
      setError("Error liking post");
    }
  };

  if (loading || forumLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!forum) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-800">Forum not found</h2>
        <p className="text-gray-600 mt-2">
          The requested forum could not be found or you don&apos;t have access
          to it.
        </p>
      </div>
    );
  }

  return (
    <div className="forum-container max-w-4xl mx-auto p-4">
      {/* Forum Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {forum.title}
            </h1>
            <p className="text-gray-600 mb-2">Game: {forum.gameTitle}</p>
            <p className="text-gray-600 mb-4">Category: {forum.category}</p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span>Created by: User {forum.createdBy}</span>
              <span>•</span>
              <span>Posts: {forum.metadata.totalPosts}</span>
              <span>•</span>
              <span>Views: {forum.metadata.viewCount}</span>
              <span>•</span>
              <span
                className={`px-2 py-1 rounded ${
                  forum.metadata.status === "active"
                    ? "bg-green-100 text-green-800"
                    : forum.metadata.status === "locked"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                Status: {forum.metadata.status}
              </span>
            </div>
          </div>
          {forum.isPrivate && (
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              Private Forum
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
        {forum.posts.map((post) => (
          <div key={post._id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <div className="font-semibold text-gray-900">
                  User {post.userId}
                </div>
                {post.userId === forum.createdBy && (
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                    Forum Creator
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
            {post.metadata?.edited && (
              <div className="text-xs text-gray-500 mt-2">
                Edited by {post.metadata.editedBy} on{" "}
                {new Date(post.metadata.editedAt!).toLocaleString()}
              </div>
            )}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => handleLikePost(post._id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
              >
                <span>❤️</span>
                <span>{post.likes.length} likes</span>
              </button>
              {(post.userId === localStorage.getItem("userId") ||
                forum.createdBy === localStorage.getItem("userId")) && (
                <button
                  onClick={() => handleDeletePost(post._id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Post Form */}
      {forum.metadata.status === "active" && (
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

      {forum.metadata.status !== "active" && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          This forum is {forum.metadata.status}. New posts cannot be added.
        </div>
      )}
    </div>
  );
}
