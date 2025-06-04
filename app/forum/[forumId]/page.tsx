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
  const {
    forums,
    currentForum,
    setCurrentForum,
    addPost,
    deletePost,
    likePost,
  } = useForum();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchForum = async () => {
      try {
        const userId = localStorage.getItem("userId") || "test-user";
        const response = await axios.get(
          `/api/getForumTopic?forumId=${params.forumId}&userId=${userId}&incrementView=false`
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
      const userId = localStorage.getItem("userId") || "test-user";
      const response = await axios.get(
        `/api/getForumTopic?forumId=${params.forumId}&userId=${userId}&incrementView=false`
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
      const userId = localStorage.getItem("userId") || "test-user";
      const response = await axios.get(
        `/api/getForumTopic?forumId=${params.forumId}&userId=${userId}&incrementView=false`
      );
      setCurrentForum(response.data);
    } catch (err: any) {
      setError(err.message || "Failed to delete post");
    }
  };

  // const handleLikePost = async (postId: string) => {
  //   try {
  //     await likePost(params.forumId, postId);
  //   } catch (err: any) {
  //     setError(err.message || "Failed to like post");
  //   }
  // };

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{currentForum.title}</h1>
        <div className="mb-2 text-gray-800 dark:text-gray-200">
          <p>Game: {currentForum.gameTitle}</p>
          <p>Category: {currentForum.category}</p>
          <p>Status: {currentForum.metadata.status}</p>
          <p>Total Posts: {currentForum.posts?.length || 0}</p>
          <p>Views: {currentForum.metadata.viewCount}</p>
        </div>
      </div>

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
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="mb-2 text-gray-800 dark:text-gray-200">
                  Posted by {post.createdBy} on{" "}
                  {new Date(post.timestamp).toLocaleString()}
                </p>
                <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                  {post.message}
                </p>
                <div className="mt-2 flex items-center space-x-4">
                  {/* 
                  <button
                    onClick={() => handleLikePost(post._id)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    {post.likes?.length || 0} Likes
                  </button>
                  */}
                  {post.createdBy === localStorage.getItem("userId") && (
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
            No posts yet. Be the first to post!
          </div>
        )}
      </div>
    </div>
  );
}
