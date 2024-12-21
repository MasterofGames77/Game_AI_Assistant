"use client"; // client-side component

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import Image from "next/image";
import { Conversation } from "../types";
import { v4 as uuidv4 } from "uuid";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faPaperclip } from "@fortawesome/free-solid-svg-icons";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Optional image-related states (commented for now)
  // const [image, setImage] = useState<File | null>(null);

  useEffect(() => {
    const initializeUser = async () => {
      let storedUserId = localStorage.getItem("userId");
      let storedEmail = localStorage.getItem("userEmail");

      // Check URL parameters for userId and email from splash page
      const urlParams = new URLSearchParams(window.location.search);
      const urlUserId = urlParams.get("userId");
      const urlEmail = urlParams.get("email");

      if (urlUserId && urlEmail) {
        // If we have parameters from the splash page, use those
        storedUserId = urlUserId;
        storedEmail = urlEmail;
        localStorage.setItem("userId", urlUserId);
        localStorage.setItem("userEmail", urlEmail);
      } else if (!storedUserId || storedUserId === "null") {
        // Only generate new ID if we don't have one from splash page or storage
        storedUserId = uuidv4();
        alert(
          `Your new user ID is: ${storedUserId}. Please save it for future use.`
        );
        localStorage.setItem("userId", storedUserId);
      }

      try {
        // Call API endpoint to sync user data
        await axios.post("/api/syncUser", {
          userId: storedUserId,
          email: storedEmail,
        });
      } catch (error) {
        console.error("Error syncing user data:", error);
      }

      setUserId(storedUserId);
      console.log("User ID set:", storedUserId);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with question:", question);
    setLoading(true);
    setError("");

    try {
      // If image upload is added, use FormData (commented for now)
      // const formData = new FormData();
      // formData.append("question", question);
      // if (image) {
      //   formData.append("image", image);
      // }

      const res = await axios.post("/api/assistant", { userId, question });
      console.log("Response from server:", res.data);
      setResponse(res.data.answer);
      fetchConversations();
    } catch (error) {
      console.error("Error submitting form:", error);
      setError("There was an error processing your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Optional image handler (commented for now)
  // const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     setImage(e.target.files[0]);
  //   }
  // };

  const handleClear = () => {
    setQuestion("");
    setResponse("");
    setError("");
    setSelectedConversation(null);
    // setImage(null); // Clear file input if using image
  };

  const handleDeleteConversation = () => {
    handleClear();
    fetchConversations();
  };

  const handleResetUserId = () => {
    console.log("Resetting User ID.");

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
            onDeleteConversation={handleDeleteConversation}
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

            {/* Form to submit question */}
            <form onSubmit={handleSubmit} className="w-full max-w-md mt-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Message Video Game Wingman"
                className="w-full p-2 border border-gray-300 rounded mb-4"
              />

              {/* Optional file upload input (commented for now) */}
              {/* 
              <label className="cursor-pointer">
                <FontAwesomeIcon icon={faPaperclip} size="2x" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </label>
              */}

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

                {/* Move buttons below the response */}
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
