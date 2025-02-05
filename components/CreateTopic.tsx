// import { useState } from "react";
// import axios from "axios";
// import { containsOffensiveContent } from "../utils/contentModeration";

// export default function CreateTopic({
//   onTopicCreated,
// }: {
//   onTopicCreated?: (forumId: string) => void;
// }) {
//   const [gameTitle, setGameTitle] = useState("");
//   const [topicTitle, setTopicTitle] = useState("");
//   const [category, setCategory] = useState("");
//   const [isPrivate, setIsPrivate] = useState(false);
//   const [allowedUsers, setAllowedUsers] = useState("");
//   const [error, setError] = useState("");
//   const [topicSuccess, setTopicSuccess] = useState("");

//   const handleCreateTopic = async () => {
//     if (!gameTitle.trim() || !topicTitle.trim()) {
//       setError("Game title and topic title are required.");
//       return;
//     }

//     // Check for offensive content
//     const userId = localStorage.getItem("userId");
//     const titleCheck = await containsOffensiveContent(topicTitle, userId!);
//     const gameTitleCheck = await containsOffensiveContent(gameTitle, userId!);

//     if (titleCheck.isOffensive || gameTitleCheck.isOffensive) {
//       const offendingWords = [
//         ...titleCheck.offendingWords,
//         ...gameTitleCheck.offendingWords,
//       ];
//       setError(
//         `The following words/phrases violates Video Game Wingman's policy: ${offendingWords.join(
//           ", "
//         )}`
//       );
//       return;
//     }

//     try {
//       const forumId = gameTitle.toLowerCase().replace(/[^a-z0-9]/g, "-");

//       const response = await axios.post(
//         "/api/createForumTopic",
//         {
//           forumId,
//           topicTitle: topicTitle.trim(),
//           isPrivate,
//           allowedUsers: allowedUsers.split(",").map((id) => id.trim()),
//           gameTitle,
//           category,
//         },
//         {
//           headers: {
//             "user-id": userId,
//           },
//         }
//       );

//       setTopicSuccess("Topic created successfully!");
//       setTimeout(() => {
//         setTopicSuccess("");
//       }, 3000);
//       if (onTopicCreated) {
//         onTopicCreated(forumId);
//       }

//       // Reset form
//       setGameTitle("");
//       setTopicTitle("");
//       setCategory("");
//       setAllowedUsers("");
//       setError("");
//     } catch (err) {
//       setError("Error creating forum topic.");
//       setTopicSuccess("");
//     }
//   };

//   return (
//     <div className="create-topic-container">
//       <h2>Create a New Topic</h2>

//       <input
//         type="text"
//         value={gameTitle}
//         onChange={(e) => setGameTitle(e.target.value)}
//         placeholder="Enter game title (e.g., Super Mario 64, Sonic 3, etc.)"
//         className="w-full p-2 border border-gray-300 rounded mb-4"
//       />

//       <select
//         value={category}
//         onChange={(e) => setCategory(e.target.value)}
//         className="w-full p-2 border border-gray-300 rounded mb-4"
//       >
//         <option value="">Select Category (Optional)</option>
//         <option value="General Discussion">General Discussion</option>
//         <option value="Speedrun">Speedrun</option>
//         <option value="Guides">Guides</option>
//         <option value="Tips & Tricks">Tips & Tricks</option>
//         <option value="Bugs & Glitches">Bugs & Glitches</option>
//         <option value="Mods">Mods</option>
//       </select>

//       <input
//         type="text"
//         value={topicTitle}
//         onChange={(e) => setTopicTitle(e.target.value)}
//         placeholder="Enter topic title"
//         className="w-full p-2 border border-gray-300 rounded mb-4"
//       />

//       <div className="flex items-center">
//         <input
//           type="checkbox"
//           checked={isPrivate}
//           onChange={() => setIsPrivate(!isPrivate)}
//           className="mr-2"
//         />
//         <label>Private Topic</label>
//       </div>

//       {isPrivate && (
//         <input
//           type="text"
//           value={allowedUsers}
//           onChange={(e) => setAllowedUsers(e.target.value)}
//           placeholder="Enter user IDs (comma-separated)"
//           className="w-full p-2 border border-gray-300 rounded mt-2"
//         />
//       )}

//       <button
//         onClick={handleCreateTopic}
//         className="p-2 bg-blue-500 text-white rounded mt-4"
//       >
//         Create Topic
//       </button>

//       {error && <p className="text-red-500">{error}</p>}
//       {topicSuccess && <p className="text-green-500">{topicSuccess}</p>}
//     </div>
//   );
// }
