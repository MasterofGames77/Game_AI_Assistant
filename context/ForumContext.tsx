"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";
import { Forum, ForumContextType } from "../types";

const ForumContext = createContext<ForumContextType | undefined>(undefined);

export function ForumProvider({ children }: { children: React.ReactNode }) {
  const [forums, setForums] = useState<Forum[]>([]);
  const [currentForum, setCurrentForum] = useState<Forum | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForums = useCallback(async (page: number, limit: number) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/getAllForums?page=${page}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem("userId") || "test-user"
            }`,
          },
        }
      );
      setForums(response.data.forums);
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch forums");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createForum = useCallback(async (forumData: Partial<Forum>) => {
    try {
      setLoading(true);
      const response = await axios.post("/api/createForum", forumData, {
        headers: {
          Authorization: `Bearer ${
            localStorage.getItem("userId") || "test-user"
          }`,
        },
      });
      const newForum = response.data.forum;
      setForums((prevForums) => [...prevForums, newForum]);
      return newForum;
    } catch (err: any) {
      setError(err.message || "Failed to create forum");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteForum = useCallback(
    async (forumId: string) => {
      try {
        setLoading(true);
        await axios.delete(`/api/deleteForum?forumId=${forumId}`, {
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem("userId") || "test-user"
            }`,
          },
        });
        setForums((prevForums) => prevForums.filter((f) => f._id !== forumId));
        if (currentForum?._id === forumId) {
          setCurrentForum(null);
        }
      } catch (err: any) {
        setError(err.message || "Failed to delete forum");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentForum]
  );

  const addPost = useCallback(
    async (forumId: string, message: string) => {
      try {
        setLoading(true);
        const response = await axios.post(
          "/api/addPostToForum",
          {
            forumId,
            message,
            userId: localStorage.getItem("userId"),
          },
          {
            headers: {
              Authorization: `Bearer ${
                localStorage.getItem("userId") || "test-user"
              }`,
            },
          }
        );

        const updatedForum = response.data.forum;
        setForums((prevForums) =>
          prevForums.map((f) => (f._id === forumId ? updatedForum : f))
        );
        if (currentForum?._id === forumId) {
          setCurrentForum(updatedForum);
        }
      } catch (err: any) {
        setError(err.message || "Failed to add post");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentForum]
  );

  const deletePost = useCallback(
    async (forumId: string, postId: string) => {
      try {
        setLoading(true);
        const response = await axios.delete(
          `/api/deletePost?forumId=${forumId}&postId=${postId}`,
          {
            headers: {
              Authorization: `Bearer ${
                localStorage.getItem("userId") || "test-user"
              }`,
            },
          }
        );

        const updatedForum = response.data.forum;
        setForums((prevForums) =>
          prevForums.map((f) => (f._id === forumId ? updatedForum : f))
        );
        if (currentForum?._id === forumId) {
          setCurrentForum(updatedForum);
        }
      } catch (err: any) {
        setError(err.message || "Failed to delete post");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentForum]
  );

  const likePost = useCallback(
    async (forumId: string, postId: string) => {
      try {
        setLoading(true);
        const response = await axios.post(
          "/api/likePost",
          {
            forumId,
            postId,
            userId: localStorage.getItem("userId"),
          },
          {
            headers: {
              Authorization: `Bearer ${
                localStorage.getItem("userId") || "test-user"
              }`,
            },
          }
        );

        const updatedForum = response.data.forum;
        setForums((prevForums) =>
          prevForums.map((f) => (f._id === forumId ? updatedForum : f))
        );
        if (currentForum?._id === forumId) {
          setCurrentForum(updatedForum);
        }
      } catch (err: any) {
        setError(err.message || "Failed to like post");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentForum]
  );

  const value = {
    forums,
    currentForum,
    loading,
    error,
    fetchForums,
    createForum,
    deleteForum,
    addPost,
    deletePost,
    likePost,
    setCurrentForum,
    setError,
  };

  return (
    <ForumContext.Provider value={value}>{children}</ForumContext.Provider>
  );
}

export function useForum() {
  const context = useContext(ForumContext);
  if (context === undefined) {
    throw new Error("useForum must be used within a ForumProvider");
  }
  return context;
}
