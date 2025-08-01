"use client";

import { useState, useEffect } from "react";
import { useForum } from "../../../context/ForumContext";
import { ForumProvider } from "../../../context/ForumContext";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function ForumPageWrapper({
  params,
}: {
  params: { forumId: string };
}) {
  return (
    <ForumProvider>
      <ForumPage params={params} />
    </ForumProvider>
  );
}

function ForumPage({ params }: { params: { forumId: string } }) {
  const { currentForum, setCurrentForum, addPost, deletePost, likePost } =
    useForum();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchForum = async () => {
      try {
        const userId = localStorage.getItem("username") || "test-user";
        const response = await axios.get(
          `/api/getForumTopic?forumId=${params.forumId}&userId=${userId}`
        );
        setCurrentForum(response.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to load forum");
        setLoading(false);
      }
    };

    fetchForum();
  }, [params.forumId, setCurrentForum]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await addPost(params.forumId, message);
      setMessage("");
      // Fetch updated forum data
      const userId = localStorage.getItem("username") || "test-user";
      const response = await axios.get(
        `/api/getForumTopic?forumId=${params.forumId}&userId=${userId}`
      );
      setCurrentForum(response.data);
    } catch (err: any) {
      setError(err.message || "Failed to add post");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await deletePost(params.forumId, postId);
      // Fetch updated forum data
      const userId = localStorage.getItem("username") || "test-user";
      const response = await axios.get(
        `/api/getForumTopic?forumId=${params.forumId}&userId=${userId}`
      );
      setCurrentForum(response.data);
    } catch (err: any) {
      setError(err.message || "Failed to delete post");
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      await likePost(params.forumId, postId);
      // Fetch updated forum data so the UI reflects the new like state/count
      const userId = localStorage.getItem("username") || "test-user";
      const response = await axios.get(
        `/api/getForumTopic?forumId=${params.forumId}&userId=${userId}`
      );
      setCurrentForum(response.data);
    } catch (err: any) {
      setError(err.message || "Failed to like post");
    }
  };

  if (loading) {
    return <div className="text-center">Loading forum...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!currentForum) {
    return <div>Forum not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <button
        onClick={() => router.push("/")}
        className="mb-4 px-4 py-2 rounded font-semibold transition
          bg-gray-200 text-gray-800 hover:bg-gray-300
          dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600
          border border-gray-300 dark:border-gray-600
          shadow"
      >
        ← Back to Main Page
      </button>
      {/* <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{currentForum.title}</h1>
        <div className="mb-2 text-gray-800 dark:text-gray-200">
          <p>Game: {currentForum.gameTitle}</p>
          <p>Category: {currentForum.category}</p>
          <p>Status: {currentForum.metadata.status}</p>
          <p>Total Posts: {currentForum.posts?.length || 0}</p>
          <p>Views: {currentForum.metadata.viewCount}</p>
        </div>
      </div> */}

      <div className="mb-8">
        <form onSubmit={handlePostSubmit} className="space-y-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's new..?"
            className="w-full p-2 border border-gray-300 rounded"
            rows={4}
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Post
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {currentForum.posts?.map((post) => (
          <div
            key={post._id}
            className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="mb-2 text-gray-900 dark:text-gray-200">
                  Posted by {post.createdBy} on{" "}
                  {new Date(post.timestamp).toLocaleString()}
                </p>
                <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                  {post.message}
                </p>
                <div className="mt-2 flex items-center space-x-4">
                  <button
                    onClick={() => handleLikePost(post._id)}
                    className={`flex items-center space-x-1 ${
                      post.metadata.likedBy?.includes(
                        localStorage.getItem("username") || "test-user"
                      )
                        ? "text-blue-600"
                        : "text-gray-400"
                    } hover:text-blue-700`}
                  >
                    {/* Heart icon: filled if liked, outline if not */}
                    {post.metadata.likedBy?.includes(
                      localStorage.getItem("username") || "test-user"
                    ) ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 fill-current"
                        viewBox="0 0 20 20"
                      >
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
                        />
                      </svg>
                    )}
                    <span>
                      {post.metadata.likes || 0} Like
                      {(post.metadata.likes || 0) !== 1 ? "s" : ""}
                    </span>
                  </button>
                  {post.createdBy === localStorage.getItem("username") && (
                    <button
                      onClick={() => handleDeletePost(post._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete Post
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {currentForum.posts?.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No posts yet. Be the first to add a post!
          </div>
        )}
      </div>
    </div>
  );
}
