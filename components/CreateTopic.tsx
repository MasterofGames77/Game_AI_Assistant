// "use client";

// import { useState } from "react";
// import { useForum } from "../context/ForumContext";
// import { containsOffensiveContent } from "../utils/contentModeration";
// import { validateTopicData } from "../utils/validation";

// interface CreateTopicProps {
//   onTopicCreated?: (forumId: string) => void;
// }

// export default function CreateTopic({ onTopicCreated }: CreateTopicProps) {
//   const { createTopic, error: forumError, setError } = useForum();
//   const [gameTitle, setGameTitle] = useState("");
//   const [topicTitle, setTopicTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [category, setCategory] = useState("");
//   const [isPrivate, setIsPrivate] = useState(false);
//   const [allowedUsers, setAllowedUsers] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [success, setSuccess] = useState("");

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     setSuccess("");

//     try {
//       setLoading(true);
//       const userId = localStorage.getItem("userId");
//       if (!userId) {
//         setError("User ID not found");
//         return;
//       }

//       // Validate topic data
//       const validationErrors = validateTopicData({
//         topicTitle,
//         description,
//         isPrivate,
//         allowedUsers: isPrivate
//           ? allowedUsers.split(",").map((id) => id.trim())
//           : [],
//       });

//       if (validationErrors.length > 0) {
//         setError(validationErrors[0]);
//         return;
//       }

//       // Check for offensive content in title and description
//       const titleCheck = await containsOffensiveContent(topicTitle, userId);
//       const descriptionCheck = description
//         ? await containsOffensiveContent(description, userId)
//         : null;

//       if (
//         titleCheck.isOffensive ||
//         (descriptionCheck && descriptionCheck.isOffensive)
//       ) {
//         const offendingWords = [
//           ...(titleCheck.offendingWords || []),
//           ...(descriptionCheck?.offendingWords || []),
//         ];

//         let errorMessage = `The following words violate Video Game Wingman's policy: ${offendingWords.join(
//           ", "
//         )}`;

//         // Use the most severe violation result
//         const violationResult =
//           titleCheck.violationResult || descriptionCheck?.violationResult;
//         if (violationResult) {
//           if (violationResult.action === "banned") {
//             errorMessage = `Your account is suspended until ${new Date(
//               violationResult.expiresAt!
//             ).toLocaleString()}`;
//           } else if (violationResult.action === "warning") {
//             errorMessage = `Warning ${violationResult.count}/3: ${errorMessage}`;
//           }
//         }

//         setError(errorMessage);
//         return;
//       }

//       // Create topic
//       const forumId = gameTitle.toLowerCase().replace(/[^a-z0-9]/g, "-");
//       await createTopic(forumId, {
//         topicTitle,
//         description,
//         isPrivate,
//         allowedUsers: isPrivate
//           ? allowedUsers.split(",").map((id) => id.trim())
//           : [],
//         metadata: {
//           lastPostAt: new Date(),
//           lastPostBy: userId,
//           postCount: 0,
//           viewCount: 0,
//           status: "active",
//         },
//       });

//       // Update forum metadata with category
//       await fetch(`/api/updateForumMetadata`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${localStorage.getItem("authToken")}`,
//           "user-id": userId,
//         },
//         body: JSON.stringify({
//           forumId,
//           metadata: {
//             category,
//           },
//         }),
//       });

//       // Reset form
//       setGameTitle("");
//       setTopicTitle("");
//       setDescription("");
//       setCategory("");
//       setIsPrivate(false);
//       setAllowedUsers("");
//       setSuccess("Topic created successfully!");

//       // Notify parent component
//       if (onTopicCreated) {
//         onTopicCreated(forumId);
//       }

//       setTimeout(() => setSuccess(""), 3000);
//     } catch (err) {
//       console.error("Error creating topic:", err);
//       setError(err instanceof Error ? err.message : "Failed to create topic");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="create-topic-container max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
//       <div className="space-y-4">
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Game Title
//           </label>
//           <input
//             type="text"
//             value={gameTitle}
//             onChange={(e) => setGameTitle(e.target.value)}
//             placeholder="Enter game title"
//             className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Category
//           </label>
//           <select
//             value={category}
//             onChange={(e) => setCategory(e.target.value)}
//             className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-white dark:border-gray-600"
//           >
//             <option value="">Select a Category (Optional)</option>
//             <option value="General Discussion">General Discussion</option>
//             <option value="Speedrun">Speedrun</option>
//             <option value="Guides">Guides</option>
//             <option value="Tips & Tricks">Tips & Tricks</option>
//             <option value="Bugs & Glitches">Bugs & Glitches</option>
//             <option value="Mods">Mods</option>
//           </select>
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Topic Title
//           </label>
//           <input
//             type="text"
//             value={topicTitle}
//             onChange={(e) => setTopicTitle(e.target.value)}
//             placeholder="Enter topic title"
//             className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Description
//           </label>
//           <textarea
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             placeholder="Enter topic description"
//             className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
//           />
//         </div>

//         <div className="flex items-center">
//           <input
//             type="checkbox"
//             checked={isPrivate}
//             onChange={() => setIsPrivate(!isPrivate)}
//             className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
//           />
//           <label className="ml-2 block text-sm text-gray-700">
//             Private Topic
//           </label>
//         </div>

//         {isPrivate && (
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Allowed Users (comma-separated user IDs)
//             </label>
//             <input
//               type="text"
//               value={allowedUsers}
//               onChange={(e) => setAllowedUsers(e.target.value)}
//               placeholder="Enter user IDs (comma-separated)"
//               className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//             />
//           </div>
//         )}

//         {forumError && <div className="text-red-500 text-sm">{forumError}</div>}

//         {success && <div className="text-green-500 text-sm">{success}</div>}

//         <button
//           onClick={handleSubmit}
//           disabled={loading}
//           className={`w-full py-2 px-4 rounded text-white font-medium ${
//             loading
//               ? "bg-gray-400 cursor-not-allowed"
//               : "bg-blue-500 hover:bg-blue-600"
//           }`}
//         >
//           {loading ? "Creating..." : "Create Topic"}
//         </button>
//       </div>
//     </div>
//   );
// }
