// "use client";

// import { useState, useEffect } from "react";
// import axios from "axios";
// import { ForumTopic } from "../types";

// import { containsOffensiveContent } from "../utils/contentModeration";

// export default function ForumList({
//   forumId,
//   initialTopics = [],
// }: {
//   forumId: string;
//   initialTopics?: ForumTopic[];
// }) {
//   const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
//   const [topics, setTopics] = useState<ForumTopic[]>(initialTopics);
//   const [newPost, setNewPost] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [success, setSuccess] = useState("");
//   const [topicSuccess, setTopicSuccess] = useState("");

//   useEffect(() => {
//     const fetchTopics = async () => {
//       try {
//         setLoading(true);
//         const userId = localStorage.getItem("userId");
//         const response = await axios.get("/api/getAllForums", {
//           params: { userId },
//         });
//         setTopics(response.data.flatMap((forum: any) => forum.topics));
//       } catch (error: any) {
//         console.error("Forum fetch error:", error);
//         setError("Error fetching forum topics");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchTopics();
//   }, []);

//   const handlePostSubmit = async (topicId: string, currentForumId: string) => {
//     if (!newPost.trim()) return;

//     try {
//       const userId = localStorage.getItem("userId");
//       if (!userId) {
//         setError("User ID not found");
//         return;
//       }

//       // Check for offensive content
//       const contentCheck = await containsOffensiveContent(newPost, userId);
//       if (contentCheck.isOffensive) {
//         setError(
//           `The following words violate our policy: ${contentCheck.offendingWords.join(
//             ", "
//           )}`
//         );
//         return;
//       }

//       // If content is clean, proceed with post
//       await axios.post("/api/addPostToForum", {
//         forumId: currentForumId,
//         topicId,
//         userId,
//         message: newPost,
//       });

//       // Refresh topics after posting
//       const response = await axios.get("/api/getAllForums", {
//         params: { userId },
//       });
//       setTopics(response.data.flatMap((forum: any) => forum.topics));
//       setNewPost("");
//       setError(""); // Clear any existing errors
//     } catch (err) {
//       console.error("Error adding post to forum:", err);
//       setError("Error adding post to forum");
//     }
//   };

//   const handleDeleteForum = async (specificForumId: string) => {
//     try {
//       const userId = localStorage.getItem("userId");
//       await axios.delete(`/api/deleteTopic`, {
//         params: { forumId: specificForumId, userId, deleteForum: true },
//       });
//       // Remove all topics associated with this forum
//       setTopics(topics.filter((topic) => topic.forumId !== specificForumId));
//       setSuccess({ message: "Forum deleted successfully!", isError: true });
//       setTopicSuccess(""); // Clear any existing topic success message

//       // Clear success message after 3 seconds
//       setTimeout(() => {
//         setSuccess({ message: "", isError: false });
//       }, 3000);
//     } catch (error) {
//       console.error("Error deleting forum:", error);
//       setError("Failed to delete forum");
//     }
//   };

//   // Group topics by forum
//   const groupedTopics = topics.reduce(
//     (acc: { [key: string]: ForumTopic[] }, topic) => {
//       // Group by forumId instead
//       if (!acc[topic.forumId]) {
//         acc[topic.forumId] = [];
//       }
//       acc[topic.forumId].push(topic);
//       return acc;
//     },
//     {}
//   );

//   if (loading) return <p>Loading topics...</p>;

//   if (error)
//     return (
//       <div className="forum-list-container">
//         <h2>Forum Topics</h2>
//         <p className="text-red-500">{error}</p>
//         <p className="mt-4">Try creating a new topic to get started!</p>
//       </div>
//     );

//   return (
//     <div className="forum-container space-y-6">
//       {(success.message || topicSuccess) && (
//         <div className="transition-opacity duration-500 ease-in-out">
//           {success.message && (
//             <div
//               className={`mb-4 ${
//                 success.isError ? "text-red-500" : "text-green-500"
//               }`}
//             >
//               {success.message}
//             </div>
//           )}
//           {topicSuccess && (
//             <div className="text-green-500 mb-4">{topicSuccess}</div>
//           )}
//         </div>
//       )}
//       {Object.entries(groupedTopics).map(([forumId, forumTopics]) => (
//         <div key={forumId} className="bg-white p-4 rounded-lg shadow">
//           <div className="flex justify-between items-center mb-4">
//             <div>
//               <h2 className="text-2xl font-bold">
//                 {forumTopics[0].topicTitle}
//               </h2>
//               <p className="text-gray-600">{forumTopics[0].gameTitle}</p>
//             </div>
//             <button
//               onClick={() => handleDeleteForum(forumId)}
//               className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
//             >
//               Delete Forum
//             </button>
//           </div>

//           {/* Single response section for the forum */}
//           <div className="mt-4">
//             <textarea
//               value={newPost}
//               onChange={(e) => setNewPost(e.target.value)}
//               placeholder="Write a response..."
//               className="w-full p-2 border rounded"
//             />
//             <button
//               onClick={() =>
//                 handlePostSubmit(forumTopics[0]._id, forumTopics[0].forumId)
//               }
//               className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//             >
//               Post Response
//             </button>
//           </div>

//           {/* Display all posts for this forum */}
//           <div className="space-y-4 mt-4">
//             {forumTopics.map((topic) =>
//               topic.posts?.map((post, index) => (
//                 <div
//                   key={`${topic._id}-${index}`}
//                   className="bg-gray-50 p-3 rounded"
//                 >
//                   <div className="font-semibold">User {post.userId}</div>
//                   <div>{post.message}</div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }
