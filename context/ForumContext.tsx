"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import axios from "axios";
import { Topic, Forum as ForumType, ForumContextType } from "../types";
import {
  validateTopicData,
  validateTopicStatus,
  validateUserAuthentication,
  validateRateLimit,
  validateUserAccess,
} from "@/utils/validation";

const ForumContext = createContext<ForumContextType | undefined>(undefined);

// Rate limiting constants
const RATE_LIMIT_MS = 1000; // 1 second between actions
const MAX_REQUESTS_PER_MINUTE = 60;

export function ForumProvider({ children }: { children: ReactNode }) {
  const [forums, setForums] = useState<ForumType[]>([]);
  const [currentForum, setCurrentForum] = useState<ForumType | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastActionTime, setLastActionTime] = useState<Date | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [lastRequestReset, setLastRequestReset] = useState<Date>(new Date());

  // Reset request count every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRequestCount(0);
      setLastRequestReset(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const checkRateLimit = useCallback(() => {
    const rateLimitErrors = validateRateLimit(lastActionTime, RATE_LIMIT_MS);
    if (rateLimitErrors.length > 0) {
      throw new Error(rateLimitErrors[0]);
    }

    if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(
          (60000 - (Date.now() - lastRequestReset.getTime())) / 1000
        )} seconds.`
      );
    }

    setRequestCount((prev) => prev + 1);
    setLastActionTime(new Date());
  }, [lastActionTime, requestCount, lastRequestReset]);

  const fetchForums = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = localStorage.getItem("userId");

      const authErrors = validateUserAuthentication(userId);
      if (authErrors.length > 0) {
        throw new Error(authErrors[0]);
      }

      checkRateLimit();

      const response = await axios.get("/api/getAllForums", {
        params: { userId },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      setForums(response.data);
    } catch (err) {
      console.error("Error fetching forums:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch forums");
    } finally {
      setLoading(false);
    }
  }, [checkRateLimit]);

  const fetchTopics = useCallback(
    async (forumId: string) => {
      try {
        setLoading(true);
        setError(null);
        const userId = localStorage.getItem("userId");

        const authErrors = validateUserAuthentication(userId);
        if (authErrors.length > 0) {
          throw new Error(authErrors[0]);
        }

        checkRateLimit();

        const response = await axios.get("/api/getForumTopic", {
          params: { forumId, userId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        });
        setTopics(response.data);
      } catch (err) {
        console.error("Error fetching topics:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch topics");
      } finally {
        setLoading(false);
      }
    },
    [checkRateLimit]
  );

  const addPost = useCallback(
    async (forumId: string, topicId: string, message: string) => {
      try {
        setError(null);
        const userId = localStorage.getItem("userId");

        const authErrors = validateUserAuthentication(userId);
        if (authErrors.length > 0) {
          throw new Error(authErrors[0]);
        }

        checkRateLimit();

        // Find the topic to check access
        const topic = topics.find((t) => t.topicId === topicId);
        if (!topic) {
          throw new Error("Topic not found");
        }

        const accessErrors = validateUserAccess(topic, userId!);
        if (accessErrors.length > 0) {
          throw new Error(accessErrors[0]);
        }

        // Optimistic update with proper typing
        const updatedTopics = topics.map((topic) => {
          if (topic.topicId === topicId) {
            return {
              ...topic,
              posts: [
                ...topic.posts,
                {
                  userId,
                  message,
                  timestamp: new Date(),
                  createdBy: userId,
                  metadata: {
                    edited: false,
                    likes: 0,
                    status: "active",
                  },
                },
              ],
              metadata: {
                ...topic.metadata,
                postCount: topic.metadata.postCount + 1,
                lastPostAt: new Date(),
                lastPostBy: userId,
              },
            } as Topic;
          }
          return topic;
        });
        setTopics(updatedTopics);

        await axios.post(
          "/api/addPostToForum",
          {
            forumId,
            topicId,
            userId,
            message,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          }
        );

        await fetchTopics(forumId);
      } catch (err) {
        console.error("Error adding post:", err);
        setError(err instanceof Error ? err.message : "Failed to add post");
        await fetchTopics(forumId);
      }
    },
    [topics, fetchTopics, checkRateLimit]
  );

  const createTopic = useCallback(
    async (forumId: string, topicData: Partial<Topic>) => {
      try {
        setError(null);
        const userId = localStorage.getItem("userId");

        const authErrors = validateUserAuthentication(userId);
        if (authErrors.length > 0) {
          throw new Error(authErrors[0]);
        }

        checkRateLimit();

        const validationErrors = validateTopicData(topicData);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors[0]);
        }

        const response = await axios.post(
          "/api/createForumTopic",
          {
            ...topicData,
            forumId,
            userId,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          }
        );

        // Optimistic update
        setTopics((prev) => [...prev, response.data.topic]);

        // Refresh forums to update counts
        await fetchForums();
      } catch (err) {
        console.error("Error creating topic:", err);
        setError(err instanceof Error ? err.message : "Failed to create topic");
      }
    },
    [fetchForums, checkRateLimit]
  );

  const deleteTopic = useCallback(
    async (forumId: string, topicId: string) => {
      try {
        setError(null);
        const userId = localStorage.getItem("userId");

        const authErrors = validateUserAuthentication(userId);
        if (authErrors.length > 0) {
          throw new Error(authErrors[0]);
        }

        checkRateLimit();

        // Find the topic to check access
        const topic = topics.find((t) => t.topicId === topicId);
        if (!topic) {
          throw new Error("Topic not found");
        }

        // Only allow deletion by creator or moderators
        if (topic.createdBy !== userId) {
          const forum = forums.find((f) => f.forumId === forumId);
          if (!forum?.metadata.moderators.includes(userId!)) {
            throw new Error("Not authorized to delete this topic");
          }
        }

        // Optimistic update
        setTopics((prev) => prev.filter((topic) => topic.topicId !== topicId));

        await axios.delete("/api/deleteTopic", {
          params: { forumId, topicId, userId },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        });

        // Refresh forums to update counts
        await fetchForums();
      } catch (err) {
        console.error("Error deleting topic:", err);
        setError(err instanceof Error ? err.message : "Failed to delete topic");
        // Revert optimistic update on error
        await fetchTopics(forumId);
      }
    },
    [fetchForums, fetchTopics, topics, forums, checkRateLimit]
  );

  const validateState = (state: Topic[]) => {
    return state.every(
      (topic) =>
        validateTopicData(topic) &&
        topic.metadata.status &&
        validateTopicStatus(topic.metadata.status)
    );
  };

  const recoverState = async (forumId: string) => {
    try {
      const userId = localStorage.getItem("userId");
      const authErrors = validateUserAuthentication(userId);
      if (authErrors.length > 0) {
        throw new Error(authErrors[0]);
      }

      const response = await axios.get(
        `/api/getForumTopics?forumId=${forumId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );
      if (validateState(response.data)) {
        setTopics(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to recover state");
    }
  };

  useEffect(() => {
    localStorage.setItem("forumTopics", JSON.stringify(topics));
  }, [topics]);

  return (
    <ForumContext.Provider
      value={{
        forums,
        currentForum,
        topics,
        loading,
        error,
        fetchForums,
        fetchTopics,
        addPost,
        createTopic,
        deleteTopic,
        setCurrentForum,
        setError,
      }}
    >
      {children}
    </ForumContext.Provider>
  );
}

export function useForum() {
  const context = useContext(ForumContext);
  if (context === undefined) {
    throw new Error("useForum must be used within a ForumProvider");
  }
  return context;
}
