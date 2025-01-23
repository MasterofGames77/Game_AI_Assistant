// import { useState, useEffect } from "react";
// import { useRouter } from "next/router";
// import axios from "axios";
// import { ForumTopic } from "../types";

// export default function ForumTopicPage() {
//   const router = useRouter();
//   const { forumId, topicId } = router.query; // Extract forumId and topicId from the route
//   const [forumTopic, setForumTopic] = useState<ForumTopic | null>(null);
//   const [newPost, setNewPost] = useState("");
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (forumId && topicId) {
//       axios
//         .get(`/api/getForumTopics?forumId=${forumId}&topicId=${topicId}`)
//         .then((res) => setForumTopic(res.data))
//         .catch(() => setError("Error fetching forum topic."));
//     }
//   }, [forumId, topicId]);

//   const handlePostSubmit = async () => {
//     if (!newPost.trim()) return;

//     try {
//       await axios.post("/api/addPostToForum", {
//         forumId,
//         topicId,
//         userId: localStorage.getItem("userId"),
//         message: newPost,
//       });

//       // Refresh the topic data after posting
//       const response = await axios.get(
//         `/api/getForumTopics?forumId=${forumId}&topicId=${topicId}`
//       );
//       setForumTopic(response.data);
//       setNewPost("");
//     } catch (err) {
//       setError("Error adding post to the forum.");
//     }
//   };

//   if (!forumTopic) return <p>Loading...</p>;

//   return (
//     <div className="forum-topic-container">
//       <h2>{forumTopic.topicTitle}</h2>
//       <div className="forum-posts">
//         {forumTopic.posts.map((post, index) => (
//           <div key={index} className="forum-post">
//             <strong>User {post.userId}</strong>: {post.message}{" "}
//             {/* Updated this line */}
//           </div>
//         ))}
//       </div>

//       <div className="add-post">
//         <textarea
//           value={newPost}
//           onChange={(e) => setNewPost(e.target.value)}
//           placeholder="Write your reply..."
//           className="w-full p-2 border border-gray-300 rounded mb-4"
//         />
//         <button
//           onClick={handlePostSubmit}
//           className="p-2 bg-blue-500 text-white rounded"
//         >
//           Submit Post
//         </button>
//         {error && <p className="text-red-500">{error}</p>}
//       </div>
//     </div>
//   );
// }
