// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/router";
// import axios from "axios";
// import { Topic } from "../types";

// export default function ForumTopicPage() {
//   const router = useRouter();
//   const { forumId, topicId } = router.query;
//   const [forumTopic, setForumTopic] = useState<Topic | null>(null);
//   const [newPost, setNewPost] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [success, setSuccess] = useState("");

//   useEffect(() => {
//     const fetchTopic = async () => {
//       if (forumId && topicId) {
//         try {
//           setLoading(true);
//           const userId = localStorage.getItem("userId");
//           const response = await axios.get("/api/getForumTopic", {
//             params: { forumId, topicId, userId },
//           });
//           setForumTopic(response.data);
//         } catch (error) {
//           console.error("Error fetching topic:", error);
//           setError("Error fetching forum topic");
//         } finally {
//           setLoading(false);
//         }
//       }
//     };

//     fetchTopic();
//   }, [forumId, topicId]);

//   const handlePostSubmit = async () => {
//     if (!newPost.trim()) return;

//     try {
//       const userId = localStorage.getItem("userId");
//       if (!userId) {
//         setError("User ID not found");
//         return;
//       }

//       await axios.post("/api/addPostToForum", {
//         forumId,
//         topicId,
//         userId,
//         message: newPost,
//       });

//       // Refresh the topic data after posting
//       const response = await axios.get("/api/getForumTopic", {
//         params: { forumId, topicId, userId },
//       });
//       setForumTopic(response.data);
//       setNewPost("");
//       setSuccess("Post added successfully!");
//       setError("");

//       setTimeout(() => {
//         setSuccess("");
//       }, 3000);
//     } catch (err) {
//       console.error("Error adding post:", err);
//       setError("Error adding post to the forum");
//     }
//   };

//   if (loading) return <p>Loading topic...</p>;
//   if (!forumTopic) return <p>Topic not found</p>;

//   return (
//     <div className="forum-topic-container max-w-4xl mx-auto p-4">
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold mb-2">{forumTopic.topicTitle}</h1>
//         <p className="text-gray-600 mb-4">{forumTopic.description}</p>
//         <div className="text-sm text-gray-500">
//           <span>Created by: User {forumTopic.createdBy}</span>
//           <span className="mx-2">•</span>
//           <span>Posts: {forumTopic.metadata.postCount}</span>
//           <span className="mx-2">•</span>
//           <span>Views: {forumTopic.metadata.viewCount}</span>
//           <span className="mx-2">•</span>
//           <span>Status: {forumTopic.metadata.status}</span>
//         </div>
//       </div>

//       {error && <div className="text-red-500 mb-4">{error}</div>}
//       {success && <div className="text-green-500 mb-4">{success}</div>}

//       <div className="space-y-4 mb-6">
//         {forumTopic.posts.map((post, index) => (
//           <div key={index} className="bg-white p-4 rounded-lg shadow">
//             <div className="flex justify-between items-start mb-2">
//               <div className="font-semibold">User {post.userId}</div>
//               <div className="text-sm text-gray-500">
//                 {new Date(post.timestamp).toLocaleString()}
//               </div>
//             </div>
//             <div className="text-gray-800">{post.message}</div>
//             {post.metadata?.edited && (
//               <div className="text-xs text-gray-500 mt-1">
//                 Edited by {post.metadata.editedBy} on{" "}
//                 {new Date(post.metadata.editedAt).toLocaleString()}
//               </div>
//             )}
//           </div>
//         ))}
//       </div>

//       <div className="mt-6">
//         <textarea
//           value={newPost}
//           onChange={(e) => setNewPost(e.target.value)}
//           placeholder="Write your reply..."
//           className="w-full p-2 border border-gray-300 rounded mb-4 h-32"
//         />
//         <button
//           onClick={handlePostSubmit}
//           className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//         >
//           Submit Post
//         </button>
//       </div>
//     </div>
//   );
// }
