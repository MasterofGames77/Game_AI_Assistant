import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SideBarProps } from "../types";

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
  "how to beat",
  "world record",
  "develop",
  "craft",
  "cheats",
  "hack",
  "mod",
  "update",
  "grind",
  "available",
  "upgrade",
  "quest",
  "collectable",
  "achievement",
].join("|");

const titlePattern = new RegExp(keywords, "i");

// Sidebar component that displays conversation history
const Sidebar = ({
  conversations,
  onSelectConversation,
  onDeleteConversation,
}: SideBarProps) => {
  // Memoize the shorten function
  const shortenQuestion = (question: string): string => {
    const match = question.match(titlePattern);
    if (match) {
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
      return title.length > 50 ? `${title.substring(0, 45)}...` : title;
    }
    const title = question.split(/\s+/).slice(0, 8).join(" ");
    return title.length > 50 ? `${title.substring(0, 45)}...` : title;
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteConversation(id);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-4 flex flex-col fixed left-0 top-0">
      <h2 className="text-2xl font-bold mb-4">Conversations</h2>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((convo, index) => {
          const uniqueKey =
            convo._id || `temp-${index}-${convo.question?.substring(0, 10)}`;
          return (
            <div key={uniqueKey} className="mb-4">
              <div className="flex justify-between items-center">
                <div
                  className="cursor-pointer truncate flex-1 mr-2"
                  onClick={() => onSelectConversation(convo)}
                >
                  {shortenQuestion(convo.question || "Untitled conversation")}
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
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="bg-gray-700 text-white p-2 rounded-md"
                      sideOffset={5}
                    >
                      <DropdownMenu.Item
                        onSelect={() => handleDelete(convo._id)}
                        className="outline-none cursor-pointer hover:bg-gray-600 px-2 py-1 rounded"
                        disabled={!convo._id}
                      >
                        Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
