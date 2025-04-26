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

  const fetchForums = useCallback(async (page: number, limit: number) => {
    try {
      setLoading(true);
      setError(null);
      const userId = localStorage.getItem("userId");
      const authToken = localStorage.getItem("authToken");

      const authErrors = validateUserAuthentication(userId);
      if (authErrors.length > 0) {
        throw new Error(authErrors[0]);
      }

      // Add delay before making the request
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const response = await axios.get("/api/getAllForums", {
        params: { page, limit },
        headers: {
          Authorization: `Bearer ${authToken}`,
          "user-id": userId,
        },
      });
      setForums(response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching forums:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch forums");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTopics = useCallback(async (forumId: string) => {
    try {
      setLoading(true);
      setError(null);
      const userId = localStorage.getItem("userId");
      const authToken = localStorage.getItem("authToken");

      const authErrors = validateUserAuthentication(userId);
      if (authErrors.length > 0) {
        throw new Error(authErrors[0]);
      }

      // Add delay before making the request
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const response = await axios.get("/api/getForumTopic", {
        params: { forumId },
        headers: {
          Authorization: `Bearer ${authToken}`,
          "user-id": userId,
        },
      });
      setTopics(response.data);
    } catch (err) {
      console.error("Error fetching topics:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch topics");
    } finally {
      setLoading(false);
    }
  }, []);

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
        await fetchForums(1, 10);
      } catch (err) {
        console.error("Error creating topic:", err);
        setError(err instanceof Error ? err.message : "Failed to create topic");
      }
    },
    [fetchForums, checkRateLimit]
  );

  const deleteTopic = useCallback(async (forumId: string, topicId: string) => {
    const authToken = localStorage.getItem("authToken");
    const userId = localStorage.getItem("userId");

    if (!authToken || !userId) {
      throw new Error("Authentication required. Please log in again.");
    }

    try {
      // Add delay for rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const response = await axios.delete(
        `/api/deleteTopic?forumId=${forumId}&topicId=${topicId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "user-id": userId,
          },
        }
      );

      if (response.status === 200) {
        setTopics((prevTopics) =>
          prevTopics.filter((topic) => topic.topicId !== topicId)
        );
      }
    } catch (error) {
      console.error("Error deleting topic:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      }
      throw new Error("Failed to delete topic. Please try again.");
    }
  }, []);

  const deleteForum = useCallback(async (forumId: string) => {
    const authToken = localStorage.getItem("authToken");
    const userId = localStorage.getItem("userId");

    if (!authToken || !userId) {
      throw new Error("Authentication required. Please log in again.");
    }

    try {
      // Add delay for rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const response = await axios.delete(
        `/api/deleteForum?forumId=${forumId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "user-id": userId,
          },
        }
      );

      if (response.status === 200) {
        setForums((prevForums) =>
          prevForums.filter((forum) => forum.forumId !== forumId)
        );
      }
    } catch (error) {
      console.error("Error deleting forum:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      }
      throw new Error("Failed to delete forum. Please try again.");
    }
  }, []);

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
        deleteForum,
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
