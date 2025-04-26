"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForum, ForumProvider } from "@/context/ForumContext";
//import { Topic } from "@/types";

function ForumPageContent() {
  const { forumId } = useParams() as { forumId: string };
  const router = useRouter();
  const { fetchTopics, topics, loading, error, deleteForum, setError } =
    useForum();
  const [isLoading, setIsLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const mounted = useRef(false);

  const loadTopics = useCallback(async () => {
    if (!forumId || !mounted.current) return;

    try {
      setIsLoading(true);
      await fetchTopics(forumId);
    } catch (err) {
      console.error("Error loading topics:", err);
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, [forumId, fetchTopics]);

  const handleDeleteForum = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this forum? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await deleteForum(forumId);
      router.push("/");
    } catch (error) {
      console.error("Error deleting forum:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete forum"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    loadTopics();

    return () => {
      mounted.current = false;
    };
  }, [loadTopics]);

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || deleteError) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Error
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          {error || deleteError}
        </p>
        {deleteError && (
          <button
            onClick={() => setDeleteError(null)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Forum Details</h1>
        <button
          onClick={handleDeleteForum}
          disabled={isLoading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isLoading ? "Deleting..." : "Delete Forum"}
        </button>
      </div>

      {error && (
        <div className="text-red-500 mb-4">Error loading forum: {error}</div>
      )}

      {topics.length === 0 ? (
        <div className="text-center py-8">
          No discussions yet. Start a new discussion to get the conversation
          going!
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm">
            {topics.length} {topics.length === 1 ? "discussion" : "discussions"}
          </div>
          {topics.map((topic) => (
            <div
              key={topic.topicId}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
            >
              <h2 className="text-xl font-semibold mb-2">{topic.topicTitle}</h2>
              <p className="mb-4">{topic.description}</p>
              <div className="flex justify-between items-center text-sm">
                <span>{topic.posts.length} discussions</span>
                <span>
                  Created {new Date(topic.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ForumPage() {
  return (
    <ForumProvider>
      <ForumPageContent />
    </ForumProvider>
  );
}
