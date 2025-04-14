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
import { validateTopicData, validateTopicStatus } from "@/utils/validation";

const ForumContext = createContext<ForumContextType | undefined>(undefined);

export function ForumProvider({ children }: { children: ReactNode }) {
  const [forums, setForums] = useState<ForumType[]>([]);
  const [currentForum, setCurrentForum] = useState<ForumType | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForums = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = localStorage.getItem("userId");
      const response = await axios.get("/api/getAllForums", {
        params: { userId },
      });
      setForums(response.data);
    } catch (err) {
      console.error("Error fetching forums:", err);
      setError("Failed to fetch forums");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTopics = useCallback(async (forumId: string) => {
    try {
      setLoading(true);
      setError(null);
      const userId = localStorage.getItem("userId");
      const response = await axios.get("/api/getForumTopic", {
        params: { forumId, userId },
      });
      setTopics(response.data);
    } catch (err) {
      console.error("Error fetching topics:", err);
      setError("Failed to fetch topics");
    } finally {
      setLoading(false);
    }
  }, []);

  const addPost = useCallback(
    async (forumId: string, topicId: string, message: string) => {
      try {
        setError(null);
        const userId = localStorage.getItem("userId");
        if (!userId) return;

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
                lastPostBy: userId, // Ensure this is always a string
              },
            } as Topic; // Type assertion to ensure proper typing
          }
          return topic;
        });
        setTopics(updatedTopics);

        await axios.post("/api/addPostToForum", {
          forumId,
          topicId,
          userId,
          message,
        });

        await fetchTopics(forumId);
      } catch (err) {
        console.error("Error adding post:", err);
        setError("Failed to add post");
        await fetchTopics(forumId);
      }
    },
    [topics, fetchTopics]
  );

  const createTopic = useCallback(
    async (forumId: string, topicData: Partial<Topic>) => {
      try {
        setError(null);
        const userId = localStorage.getItem("userId");

        const response = await axios.post("/api/createForumTopic", {
          ...topicData,
          forumId,
          userId,
        });

        // Optimistic update
        setTopics((prev) => [...prev, response.data.topic]);

        // Refresh forums to update counts
        await fetchForums();
      } catch (err) {
        console.error("Error creating topic:", err);
        setError("Failed to create topic");
      }
    },
    [fetchForums]
  );

  const deleteTopic = useCallback(
    async (forumId: string, topicId: string) => {
      try {
        setError(null);
        const userId = localStorage.getItem("userId");

        // Optimistic update
        setTopics((prev) => prev.filter((topic) => topic.topicId !== topicId));

        await axios.delete("/api/deleteTopic", {
          params: { forumId, topicId, userId },
        });

        // Refresh forums to update counts
        await fetchForums();
      } catch (err) {
        console.error("Error deleting topic:", err);
        setError("Failed to delete topic");
        // Revert optimistic update on error
        await fetchTopics(forumId);
      }
    },
    [fetchForums, fetchTopics]
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
      const response = await axios.get(
        `/api/getForumTopics?forumId=${forumId}`
      );
      if (validateState(response.data)) {
        setTopics(response.data);
      }
    } catch (err) {
      setError("Failed to recover state");
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
