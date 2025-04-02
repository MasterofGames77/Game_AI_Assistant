// "use client";

// import { useState, useEffect } from "react";
// import axios from "axios";
// import { ForumTopic, Topic } from "../types";
// import { containsOffensiveContent } from "../utils/contentModeration";

// interface SuccessMessage {
//   message: string;
//   isError?: boolean;
// }

// export default function ForumList({
//   forumId,
//   initialTopics = [],
// }: {
//   forumId: string;
//   initialTopics?: Topic[];
// }) {
//   const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
//   const [topics, setTopics] = useState<Topic[]>(initialTopics);
//   const [newPost, setNewPost] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [success, setSuccess] = useState<SuccessMessage | string>("");
//   const [topicSuccess, setTopicSuccess] = useState("");

//   useEffect(() => {
//     const fetchTopics = async () => {
//       try {
//         setLoading(true);
//         const userId = localStorage.getItem("userId");
//         const response = await axios.get("/api/getForumTopic", {
//           params: { forumId, userId },
//         });
//         setTopics(response.data);
//       } catch (error: any) {
//         console.error("Forum fetch error:", error);
//         setError("Error fetching forum topics");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchTopics();
//   }, [forumId]);

//   const handlePostSubmit = async (topicId: string) => {
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

//       await axios.post("/api/addPostToForum", {
//         forumId,
//         topicId,
//         userId,
//         message: newPost,
//       });

//       // Refresh topics after posting
//       const response = await axios.get("/api/getForumTopic", {
//         params: { forumId, userId },
//       });
//       setTopics(response.data);
//       setNewPost("");
//       setError("");
//     } catch (err) {
//       console.error("Error adding post to forum:", err);
//       setError("Error adding post to forum");
//     }
//   };

//   const handleDeleteTopic = async (topicId: string) => {
//     try {
//       const userId = localStorage.getItem("userId");
//       await axios.delete(`/api/deleteTopic`, {
//         params: { forumId, topicId, userId },
//       });

//       setTopics(topics.filter((topic) => topic.topicId !== topicId));
//       setSuccess("Topic deleted successfully!");
//       setTopicSuccess("");

//       setTimeout(() => {
//         setSuccess("");
//       }, 3000);
//     } catch (error) {
//       console.error("Error deleting topic:", error);
//       setError("Failed to delete topic");
//     }
//   };

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
//       {(typeof success === "object" && "message" in success
//         ? success.message
//         : success || topicSuccess) && (
//         <div className="transition-opacity duration-500 ease-in-out">
//           {typeof success === "object" && "message" in success && (
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

//       {topics.map((topic) => (
//         <div key={topic.topicId} className="bg-white p-4 rounded-lg shadow">
//           <div className="flex justify-between items-center mb-4">
//             <div>
//               <h2 className="text-2xl font-bold">{topic.topicTitle}</h2>
//               <p className="text-gray-600">{topic.description}</p>
//               <div className="text-sm text-gray-500 mt-1">
//                 <span>Posts: {topic.metadata.postCount}</span>
//                 <span className="mx-2">•</span>
//                 <span>Views: {topic.metadata.viewCount}</span>
//                 <span className="mx-2">•</span>
//                 <span>
//                   Last Activity:{" "}
//                   {new Date(topic.metadata.lastPostAt).toLocaleDateString()}
//                 </span>
//               </div>
//             </div>
//             {topic.createdBy === localStorage.getItem("userId") && (
//               <button
//                 onClick={() => handleDeleteTopic(topic.topicId)}
//                 className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
//               >
//                 Delete Topic
//               </button>
//             )}
//           </div>

//           {/* Posts section */}
//           <div className="space-y-4 mt-4">
//             {topic.posts.map((post, index) => (
//               <div
//                 key={`${topic.topicId}-${index}`}
//                 className="bg-gray-50 p-3 rounded"
//               >
//                 <div className="font-semibold">User {post.userId}</div>
//                 <div>{post.message}</div>
//                 <div className="text-sm text-gray-500 mt-1">
//                   {new Date(post.timestamp).toLocaleString()}
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* New post form */}
//           <div className="mt-4">
//             <textarea
//               value={newPost}
//               onChange={(e) => setNewPost(e.target.value)}
//               placeholder="Write a response..."
//               className="w-full p-2 border rounded"
//             />
//             <button
//               onClick={() => handlePostSubmit(topic.topicId)}
//               className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//             >
//               Post Response
//             </button>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }
