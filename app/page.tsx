"use client"; // client-side component

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import Image from "next/image";
import { Conversation } from "../types";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  //const [image, setImage] = useState<File | null>(null);

  useEffect(() => {
    const initializeUser = async () => {
      let storedUserId = localStorage.getItem("userId");
      let storedEmail = localStorage.getItem("userEmail");

      const urlParams = new URLSearchParams(window.location.search);
      const urlUserId = urlParams.get("userId");
      const urlEmail = urlParams.get("email");

      if (urlUserId && urlEmail) {
        storedUserId = urlUserId;
        storedEmail = urlEmail;
        localStorage.setItem("userId", urlUserId);
        localStorage.setItem("userEmail", urlEmail);
      } else if (!storedUserId || storedUserId === "null") {
        storedUserId = uuidv4();
        alert(
          `Your new user ID is: ${storedUserId}. Please save it for future use.`
        );
        localStorage.setItem("userId", storedUserId);
      }

      try {
        await axios.post("/api/syncUser", {
          userId: storedUserId,
          email: storedEmail,
        });
      } catch (error) {
        console.error("Error syncing user data:", error);
      }

      setUserId(storedUserId);
    };

    initializeUser();
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(`/api/getConversation?userId=${userId}`);
      setConversations(res.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId, fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      setQuestion(selectedConversation.question);
      setResponse(selectedConversation.response);
    }
  }, [selectedConversation]);

  // const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     setImage(e.target.files[0]);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let imageFilePath = null;

      // Upload the image if provided
      // if (image) {
      //   const formData = new FormData();
      //   formData.append("image", image);

      //   const uploadRes = await axios.post("/api/uploadImage", formData, {
      //     headers: { "Content-Type": "multipart/form-data" },
      //   });
      //   imageFilePath = uploadRes.data.filePath; // Extract the file path from the response
      // }

      // Send question and image file path to analyzeImage API
      const analysisRes = await axios.post("/api/analyzeImage", {
        question,
        imageFilePath, // Include filePath if available
      });

      console.log("Payload to /api/analyzeImage:", {
        question,
        imageFilePath,
      });

      // Update the response
      setResponse(
        analysisRes.data.analysis || "Analysis complete. No details provided."
      );
      fetchConversations();
    } catch (error) {
      console.error("Error submitting form:", error);
      setError("There was an error processing your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuestion("");
    setResponse("");
    setError("");
    setSelectedConversation(null);
    //setImage(null);
  };

  const handleResetUserId = () => {
    const newUserId = prompt("Enter your new user ID or create a new one:");

    if (newUserId) {
      localStorage.setItem("userId", newUserId);
      setUserId(newUserId);
      setConversations([]);
      handleClear();
      alert(
        `Your new user ID is: ${newUserId}. Please save it for future use.`
      );
    } else {
      alert("User ID reset canceled.");
    }
  };

  const handleTwitchAuth = () => {
    const domain =
      process.env.NODE_ENV === "production"
        ? "https://assistant.videogamewingman.com"
        : "http://localhost:3000";

    const redirectUri = `${domain}/api/twitchCallback`;

    const twitchLoginUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${
      process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:read:email`;

    window.open(twitchLoginUrl, "_blank");
  };

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
            onDeleteConversation={handleClear}
          />
          <div className="flex-1 flex flex-col items-center justify-center py-2 main-content">
            <Image
              src="/assets/video-game-wingman-logo.png"
              alt="Video Game Wingman Logo"
              className="logo"
              width={350}
              height={350}
            />

            <ul className="mt-4 text-lg text-center">
              <li>Discover a game&apos;s hidden secrets.</li>
              <li>Get personalized game recommendations.</li>
              <li>Analyze gameplay data to improve your strategies.</li>
              <li>Access detailed game guides.</li>
            </ul>

            {/* Form to submit question and upload image */}
            <form onSubmit={handleSubmit} className="w-full max-w-md mt-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Message Video Game Wingman"
                className="w-full p-2 border border-gray-300 rounded mb-4"
              />

              <label className="block mb-4">
                <span className="text-gray-700">Upload an Image:</span>
                <input
                  type="file"
                  accept="image/*"
                  // onChange={handleImageChange}
                  className="block mt-2"
                />
              </label>

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
                  className="w-full p-2 bg-blue-500 text-white rounded"
                >
                  Clear
                </button>
              </div>
            </form>

            {loading && <div className="spinner mt-4"></div>}
            {error && <div className="mt-4 text-red-500">{error}</div>}
            {response && (
              <div className="mt-8 w-full max-w-3xl">
                <h2 className="text-2xl font-bold">Response</h2>
                <div className="bg-gray-100 p-4 rounded response-box">
                  {formatResponse(response)}
                </div>
                <div className="mt-4 footer-buttons">
                  <button
                    onClick={handleTwitchAuth}
                    className="mt-2 p-2 bg-blue-500 text-white rounded"
                  >
                    Login with Twitch
                  </button>
                  <button
                    onClick={handleResetUserId}
                    className="mt-2 p-2 bg-blue-500 text-white rounded"
                  >
                    Reset User ID
                  </button>
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
