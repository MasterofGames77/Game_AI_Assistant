// import { useState, useEffect } from "react";
// import axios from "axios";
// import { ForumTopic } from "../types";
// import { useRouter } from "next/router";

// export default function ForumList({ forumId }: { forumId: string }) {
//   const [topics, setTopics] = useState<ForumTopic[]>([]);
//   const [error, setError] = useState("");
//   const router = useRouter();

//   useEffect(() => {
//     const fetchTopics = async () => {
//       try {
//         const response = await axios.get(`/api/getForumTopics?forumId=${forumId}`);
//         setTopics(response.data);
//       } catch (error) {
//         setError("Error fetching forum topics.");
//       }
//     };

//     fetchTopics();
//   }, [forumId]);

//   const handleTopicSelect = (topicId: string) => {
//     router.push(`/forum/${forumId}/${topicId}`); // Navigate to the specific topic page
//   };

//   if (error) return <p>{error}</p>;

//   return (
//     <div className="forum-list-container">
//       <h2>Forum Topics</h2>
//       <ul className="forum-topics-list">
//         {topics.map((topic) => (
//           <li
//             key={topic._id}
//             onClick={() => handleTopicSelect(topic._id)}
//             className="cursor-pointer"
//           >
//             {topic.topicTitle}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }
