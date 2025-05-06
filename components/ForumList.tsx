"use client";

import { useState, useEffect, useCallback } from "react";
import { useForum } from "../context/ForumContext";
import { Topic, Forum } from "../types";
import { containsOffensiveContent } from "../utils/contentModeration";
import { useRouter } from "next/navigation";
import ErrorBoundary from "../components/ErrorBoundary";

export default function ForumList() {
  const {
    forums,
    topics,
    loading,
    error: forumError,
    setError,
    fetchForums,
    fetchTopics,
    deleteTopic,
    addPost,
  } = useForum();

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [newPost, setNewPost] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [selectedForum, setSelectedForum] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 9;
  const router = useRouter();

  // Load forums
  const loadForums = useCallback(async () => {
    try {
      const result = await fetchForums(page, ITEMS_PER_PAGE);
      setHasMore(result.length === ITEMS_PER_PAGE);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch forums"
      );
    }
  }, [page, fetchForums, setError, ITEMS_PER_PAGE]);

  // Fetch topics for the selected forum
  const handleTopicsFetch = useCallback(async () => {
    if (selectedForum) {
      try {
        await fetchTopics(selectedForum);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to fetch topics"
        );
      }
    }
  }, [selectedForum, fetchTopics, setError]);

  useEffect(() => {
    const loadInitialForums = async () => {
      try {
        setIsLoading(true);
        await loadForums();
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to fetch forums"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialForums();
  }, [loadForums, setError]);

  useEffect(() => {
    if (selectedForum) {
      const loadForumTopics = async () => {
        try {
          setIsLoading(true);
          await handleTopicsFetch();
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Failed to fetch topics"
          );
        } finally {
          setIsLoading(false);
        }
      };

      loadForumTopics();
    }
  }, [handleTopicsFetch, selectedForum, setError]);

  const handleLoadMore = () => {
    setPage((prevPage) => prevPage + 1);
  };

  // Handle topic deletion
  const handleDeleteTopic = async (topicId: string) => {
    try {
      setIsLoading(true);
      await deleteTopic(selectedForum!, topicId);
      setSuccess("Topic deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error deleting topic:", err);
      setError("Failed to delete topic");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle post submission
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
        let errorMessage = `The following words violate our policy: ${contentCheck.offendingWords.join(
          ", "
        )}`;

        // Add additional context if there's a violation result
        if (contentCheck.violationResult) {
          if (contentCheck.violationResult.action === "banned") {
            errorMessage = `Your account is suspended until ${new Date(
              contentCheck.violationResult.expiresAt!
            ).toLocaleString()}`;
          } else if (contentCheck.violationResult.action === "warning") {
            errorMessage = `Warning ${contentCheck.violationResult.count}/3: ${errorMessage}`;
          }
        }

        setError(errorMessage);
        return;
      }

      // Add post using context
      await addPost(selectedForum!, topicId, newPost);
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

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={<div>Something went wrong. Please try again later.</div>}
    >
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Your Forums
        </h2>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forums.map((forum: Forum) => (
            <div
              key={forum._id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedForum(forum.forumId);
                router.push(`/forums/${forum.forumId}`);
              }}
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                {forum.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {forum.description}
              </p>
              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span>{forum.topics?.length || 0} topics</span>
                <span>
                  Created {new Date(forum.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
        {selectedForum && topics.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Topics
            </h3>
            <div className="space-y-4">
              {topics.map((topic) => (
                <div
                  key={topic.topicId}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
                >
                  <h4 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
                    {topic.topicTitle}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {topic.description}
                  </p>
                  {selectedTopic?.topicId === topic.topicId ? (
                    <div className="space-y-4">
                      <textarea
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Write your post..."
                        rows={4}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTopic(null);
                          }}
                          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePostSubmit(topic.topicId);
                          }}
                          disabled={isLoading}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                          {isLoading ? "Posting..." : "Submit Post"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTopic(topic);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Reply
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTopic(topic.topicId);
                        }}
                        className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {forums.length === 0 && !loading && (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
            No forums found. Create your first forum to get started!
          </p>
        )}
        {hasMore && !loading && forums.length > 0 && (
          <button
            onClick={handleLoadMore}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Load More
          </button>
        )}
      </div>
    </ErrorBoundary>
  );
}
