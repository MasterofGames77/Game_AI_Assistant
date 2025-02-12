// Import necessary dependencies and types
import { useState, useEffect } from "react";
import axios from "axios";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Conversation, SideBarProps } from "../types";

// Sidebar component that displays conversation history
const Sidebar = ({
  userId,
  onSelectConversation,
  onDeleteConversation,
}: SideBarProps) => {
  // State to store the list of conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Effect hook to fetch conversations when userId changes
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get(`/api/getConversation?userId=${userId}`);
        setConversations(res.data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    fetchConversations();
  }, [userId]);

  // Function to create shortened titles from questions
  const shortenQuestion = (question: string): string => {
    // List of keywords to identify important context in questions
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
    ];

    // Create pattern to match keywords
    const titlePattern = new RegExp(keywords.join("|"), "i");
    const match = question.match(titlePattern);

    // Extract context and create title
    let context = match ? match[0] : null; // Capture the context if found
    let title = question.split(/\s+/).slice(0, 8).join(" "); // Get the first few words of the question

    // Create the summary based on whether a context is found or not
    let summary = context ? title : title; // Only use the title if context is null

    return summary.length > 50 ? `${summary.substring(0, 47)}...` : summary;
  };

  // Function to handle conversation deletion
  const handleDelete = async (id: string) => {
    try {
      await axios.post(`/api/deleteInteraction`, { id });
      setConversations(conversations.filter((convo) => convo._id !== id));
      onDeleteConversation();
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  // Render the sidebar component
  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <h2 className="text-2xl font-bold mb-4">Conversations</h2>
      {/* Map through conversations and render each one */}
      {conversations.map((convo) => (
        <div key={convo._id} className="mb-4">
          <div className="flex justify-between items-center">
            {/* Clickable conversation title */}
            <div
              className="cursor-pointer"
              onClick={() => onSelectConversation(convo)}
            >
              {shortenQuestion(convo.question)}
            </div>
            {/* Dropdown menu for conversation actions */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path d="M12 7a2 2 0 110-4 2 2 0 010 4zM12 13a2 2 0 110-4 2 2 0 010 4zM12 19a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </DropdownMenu.Trigger>
              {/* Dropdown menu content */}
              <DropdownMenu.Content className="bg-gray-700 text-white p-2 rounded-md">
                <DropdownMenu.Item onSelect={() => handleDelete(convo._id)}>
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
