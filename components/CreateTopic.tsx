// import { useState } from "react";
// import axios from "axios";

// export default function CreateTopic({ forumId }: { forumId: string }) {
//   const [topicTitle, setTopicTitle] = useState("");
//   const [isPrivate, setIsPrivate] = useState(false);
//   const [allowedUsers, setAllowedUsers] = useState("");
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   const handleCreateTopic = async () => {
//     if (!topicTitle.trim()) {
//       setError("Topic title cannot be empty.");
//       return;
//     }

//     try {
//       const response = await axios.post("/api/createTopic", {
//         forumId,
//         topicTitle,
//         isPrivate,
//         allowedUsers: allowedUsers.split(",").map((id) => id.trim()), // Convert comma-separated user IDs into an array
//       });

//       setSuccess("Topic created successfully!");
//       setTopicTitle(""); // Clear the form fields
//       setAllowedUsers("");
//       setError("");
//       // Optionally refresh the list of topics here if necessary
//     } catch (err) {
//       setError("Error creating forum topic.");
//       setSuccess("");
//     }
//   };

//   return (
//     <div className="create-topic-container">
//       <h2>Create a New Topic</h2>
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
//       {success && <p className="text-green-500">{success}</p>}
//     </div>
//   );
// }
