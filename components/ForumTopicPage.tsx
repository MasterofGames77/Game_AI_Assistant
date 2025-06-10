"use client";

import { useState } from "react";
import { validatePostData } from "../utils/validation";
import { containsOffensiveContent } from "../utils/contentModeration";

export default function ContentModeration() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handlePostSubmit = async () => {
    if (!message.trim()) return;

    try {
      // Validate post data
      const validationErrors = validatePostData({
        message,
        username: localStorage.getItem("username") || "test-user",
        forumId: "your-forum-id", // Replace with actual forum ID if needed
      });
      if (validationErrors.length > 0) {
        setError(validationErrors[0]);
        return;
      }

      // Check for offensive content
      const contentCheck = await containsOffensiveContent(
        message,
        localStorage.getItem("username") || "test-user"
      );
      if (contentCheck.isOffensive) {
        setError(
          `The following words violate our policy: ${contentCheck.offendingWords.join(
            ", "
          )}`
        );
        return;
      }

      // If validation and moderation pass, proceed with posting
      console.log("Post is valid and not offensive:", message);
      setMessage("");
      setError("");
    } catch (err: any) {
      setError(err.message || "Error checking post");
    }
  };

  return (
    <div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What's new..?"
        className="w-full p-2 border border-gray-300 rounded"
        rows={4}
      />
      <button
        onClick={handlePostSubmit}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Check Post
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
