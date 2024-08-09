"use client"; // client-side component

import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import { Conversation } from "../types"; // Adjust the import path as necessary
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null); // Initialize userId as null
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null); // Ensure correct type
  const [conversations, setConversations] = useState<Conversation[]>([]); // Track conversations

  // Prompt user for userId or generate a new one
  useEffect(() => {
    let storedUserId = localStorage.getItem("userId");
    if (!storedUserId || storedUserId === "null") {
      storedUserId = prompt("Enter your user ID or create a new one:");
      if (!storedUserId) {
        storedUserId = uuidv4();
        alert(
          `Your new user ID is: ${storedUserId}. Please save it for future use.`
        );
      }
      localStorage.setItem("userId", storedUserId);
    }
    setUserId(storedUserId);
  }, [userId]); // Add userId as a dependency

  // Fetch conversations when userId changes
  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId]);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`/api/getConversation?userId=${userId}`);
      setConversations(res.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      setQuestion(selectedConversation.question);
      setResponse(selectedConversation.response);
    }
  }, [selectedConversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    console.log("Form submitted with question:", question);
    setLoading(true); // Set loading state to true
    setError(""); // Reset error state

    try {
      // Make a POST request to the API endpoint with the question and userId
      const res = await axios.post("/api/assistant", { userId, question });
      console.log("Response from server:", res.data);
      setResponse(res.data.answer); // Set the response state with the server's answer
      fetchConversations(); // Refresh conversations list
    } catch (error) {
      console.error("Error submitting form:", error); // Log any errors
      setError("There was an error processing your request. Please try again."); // Set error state
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  const handleClear = () => {
    setQuestion("");
    setResponse("");
    setError("");
    setSelectedConversation(null); // Clear selected conversation
  };

  const handleDeleteConversation = () => {
    handleClear(); // Clear the input and response fields
    fetchConversations(); // Refresh the conversation list
  };

  const handleResetUserId = () => {
    localStorage.removeItem("userId");
    setUserId(null);
    setConversations([]);
    handleClear();
  };

  const handleTwitchAuth = () => {
    const domain =
      process.env.NODE_ENV === "production"
        ? "https://game-ai-assistant.vercel.app"
        : "http://localhost:3000";

    const twitchLoginUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${
      process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(
      domain + "/api/twitchCallback"
    )}&scope=user:read:email`;

    window.open(twitchLoginUrl, "_blank");
  };

  // Comment out Steam functionality until I can get it working properly.
  // const handleSteamAuth = () => {
  //   const domain =
  //     process.env.NODE_ENV === "production"
  //       ? "https://game-ai-assistant.vercel.app"
  //       : "http://localhost:3000";

  //   const steamLoginUrl = `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=${encodeURIComponent(
  //     domain + "/api/steamCallback"
  //   )}&openid.realm=${encodeURIComponent(
  //     domain
  //   )}&openid.identity=http://specs.openid.net/auth/2.0/identifier_select`;

  //   window.open(steamLoginUrl, "_blank");
  // };

  const formatResponse = (response: string) => {
    const sentences = response.split("\n").map((sentence) => sentence.trim());
    let stepCounter = 1;
    return sentences.map((sentence, index) => {
      if (sentence.match(/^\d+\.\s/)) {
        return (
          <p key={index} className="mt-2">
            <strong>{stepCounter++}. </strong>
            {sentence.replace(/^\d+\.\s/, "").trim()}
          </p>
        );
      } else {
        return (
          <p key={index} className="mt-2">
            {sentence}
          </p>
        );
      }
    });
  };

  return (
    <div className="min-h-screen flex">
      {userId ? (
        <>
          <Sidebar
            userId={userId}
            onSelectConversation={setSelectedConversation}
            onDeleteConversation={handleDeleteConversation} // Pass delete handler
          />
          <div className="flex-1 flex flex-col items-center justify-center py-2">
            <h1 className="text-4xl font-bold mb-6">Video Game Wingman</h1>
            <form onSubmit={handleSubmit} className="w-full max-w-md">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter your gameplay data or question for analysis"
                className="w-full p-2 border border-gray-300 rounded mb-4"
              />
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="w-full p-2 bg-blue-500 text-white rounded"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full p-2 bg-red-500 text-white rounded"
                >
                  Clear
                </button>
              </div>
            </form>
            <button
              onClick={handleTwitchAuth}
              className="mt-4 p-2 bg-purple-500 text-white rounded"
            >
              Login with Twitch
            </button>
            {/* <button
              onClick={handleSteamAuth} // This button triggers Steam login
              className="mt-4 p-2 bg-green-500 text-white rounded"
            >
              Login with Steam
            </button> */}
            <button
              onClick={handleResetUserId}
              className="mt-4 p-2 bg-yellow-500 text-white rounded"
            >
              Reset User ID
            </button>
            {loading && <div className="spinner mt-4"></div>}
            {error && <div className="mt-4 text-red-500">{error}</div>}
            {response && (
              <div className="mt-8 w-full max-w-3xl">
                <h2 className="text-2xl font-bold">Response</h2>
                <div className="bg-gray-100 p-4 rounded response-box">
                  {formatResponse(response)}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <p>Loading user ID...</p>
      )}
    </div>
  );
}
