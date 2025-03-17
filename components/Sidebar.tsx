import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Conversation, SideBarProps } from "../types";

// Precompile the keyword pattern once
const keywords = [
  "release",
  "complete",
  "unlock",
  "guide",
  "time",
  "finish",
  "strategy",
  "find",
  "progress",
  "walkthrough",
  "weapon",
  "item",
  "speedrun",
  "100%",
  "character",
  "class",
  "search",
  "fast",
  "tips",
  "hidden",
  "secret",
  "gameplay",
  "obtain",
  "collect",
  "discover",
  "improve",
  "area",
  "level",
  "create",
  "build",
  "upload",
  "inventory",
  "how to",
  "how to do",
  "how to get",
  "how to unlock",
  "how to find",
  "how to progress",
].join("|");

const titlePattern = new RegExp(keywords, "i");

// Sidebar component that displays conversation history
const Sidebar = ({
  userId,
  onSelectConversation,
  onDeleteConversation,
}: SideBarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the fetch function
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/getConversation?userId=${userId}`);
      setConversations(res.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Memoize the shorten function
  const shortenQuestion = useCallback((question: string): string => {
    const match = question.match(titlePattern);
    if (match) {
      // If we find a keyword, include it and surrounding context
      const keywordIndex = question
        .toLowerCase()
        .indexOf(match[0].toLowerCase());
      const start = Math.max(0, keywordIndex - 20);
      const end = Math.min(
        question.length,
        keywordIndex + match[0].length + 20
      );
      let title = question.slice(start, end);
      if (start > 0) title = "..." + title;
      if (end < question.length) title = title + "...";
      return title.length > 50 ? `${title.substring(0, 47)}...` : title;
    }
    // Fallback to original behavior if no keyword found
    const title = question.split(/\s+/).slice(0, 8).join(" ");
    return title.length > 50 ? `${title.substring(0, 47)}...` : title;
  }, []);

  // Memoize the delete handler
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await axios.post(`/api/deleteInteraction`, { id });
        setConversations((prev) => prev.filter((convo) => convo._id !== id));
        onDeleteConversation();
      } catch (error) {
        console.error("Error deleting conversation:", error);
      }
    },
    [onDeleteConversation]
  );

  // Memoize the conversation list
  const conversationList = useMemo(
    () =>
      conversations.map((convo) => (
        <div key={convo._id} className="mb-4">
          <div className="flex justify-between items-center">
            <div
              className="cursor-pointer truncate flex-1 mr-2"
              onClick={() => onSelectConversation(convo)}
            >
              {shortenQuestion(convo.question)}
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="text-white flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path d="M12 7a2 2 0 110-4 2 2 0 010 4zM12 13a2 2 0 110-4 2 2 0 010 4zM12 19a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content className="bg-gray-700 text-white p-2 rounded-md">
                <DropdownMenu.Item onSelect={() => handleDelete(convo._id)}>
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
      )),
    [conversations, handleDelete, onSelectConversation, shortenQuestion]
  );

  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <h2 className="text-2xl font-bold mb-4">Conversations</h2>
      {isLoading ? (
        <div className="text-center">Loading...</div>
      ) : (
        conversationList
      )}
    </div>
  );
};

export default Sidebar;
