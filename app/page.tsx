"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import Image from "next/image";
import { Conversation } from "../types";
// import ForumList from "../components/ForumList";
// import CreateTopic from "../components/CreateTopic";
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
  const [metrics, setMetrics] = useState<any>({});

  const [activeView, setActiveView] = useState<"chat" | "forum">("chat");
  // const [currentForumId, setCurrentForumId] = useState("");
  // const [forumTopics, setForumTopics] = useState([]);

  // Comment out image state variables
  // const [image, setImage] = useState<File | null>(null);
  // const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const initializeUser = async () => {
      let storedUserId: string | null = null;
      try {
        storedUserId = localStorage.getItem("userId");
        let storedEmail = localStorage.getItem("userEmail");

        // For development only: Create test user if no data exists
        if (
          process.env.NODE_ENV === "development" &&
          (!storedUserId || !storedEmail)
        ) {
          storedUserId = "test-" + Math.random().toString(36).substr(2, 9);
          storedEmail = "test@example.com";
          localStorage.setItem("userId", storedUserId);
          localStorage.setItem("userEmail", storedEmail);
        }

        if (storedUserId && storedEmail) {
          let retries = 3;
          while (retries > 0) {
            try {
              const response = await axios.post(
                "/api/syncUser",
                {
                  userId: storedUserId,
                  email: storedEmail,
                },
                {
                  timeout: 10000, // Increased timeout to 10 seconds
                }
              );

              if (response.status === 200) {
                setUserId(storedUserId);
                break;
              }
            } catch (syncError) {
              console.error(
                `Error syncing user (attempts left: ${retries - 1}):`,
                syncError
              );
              retries--;
              if (retries === 0) {
                // If all retries fail, still set userId to allow basic functionality
                setUserId(storedUserId);
              } else {
                // Wait 1 second before retrying
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }
          }
        }
      } catch (error) {
        console.error("Error initializing user:", error);
        if (storedUserId) setUserId(storedUserId);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  // function to get conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(`/api/getConversation?userId=${userId}`);
      setConversations(res.data.conversations);
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

  // Display conversation count in the UI
  const conversationCount = conversations.length;

  // function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const startTime = performance.now();

    try {
      console.log("Submitting question:", {
        userId,
        question,
        timestamp: new Date().toISOString(),
      });
      // let imageFilePath = null;

      // Comment out image upload section
      // if (image) {
      //   try {
      //     const formData = new FormData();
      //     formData.append("image", image);
      //     const uploadRes = await axios.post("/api/uploadImage", formData);
      //     imageFilePath = uploadRes.data.filePath;
      //   } catch (imageError) {
      //     console.error("Error uploading image:", imageError);
      //   }
      // }

      const res = await axios.post(
        "/api/assistant",
        {
          userId,
          question,
          // imageFilePath, // Comment out this line
        },
        {
          timeout: 30000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const endTime = performance.now();
      console.log(
        `Total frontend latency: ${(endTime - startTime).toFixed(2)}ms`
      );
      console.log("Response:", res.data);

      setResponse(res.data.answer);
      if (res.data.metrics) {
        setMetrics(res.data.metrics);
      }
      fetchConversations();

      // Clear image after successful submission
      // setImage(null);
      // setImageUrl(null);
    } catch (error: any) {
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      setError(
        error.response?.data?.message ||
          "There was an error processing your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Comment out image handler
  // const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     setImage(e.target.files[0]);
  //     setImageUrl(URL.createObjectURL(e.target.files[0]));
  //   }
  // };

  // const handleTopicCreated = (forumId: string) => {
  //   setCurrentForumId(forumId);
  // };

  // useEffect(() => {
  //   const fetchForums = async () => {
  //     if (activeView === "forum") {
  //       try {
  //         const userId = localStorage.getItem("userId");
  //         const response = await axios.get("/api/getAllForums", {
  //           params: { userId },
  //         });
  //         setForumTopics(response.data);
  //       } catch (error) {
  //         console.error("Error fetching forums:", error);
  //       }
  //     }
  //   };
  //   fetchForums();
  // }, [activeView]);

  // const renderForumSection = () => (
  //   <div className="w-full mt-4">
  //     <CreateTopic onTopicCreated={handleTopicCreated} />
  //     <ForumList
  //       forumId={currentForumId}
  //       key={currentForumId}
  //       initialTopics={forumTopics}
  //     />
  //   </div>
  // );

  // function to clear the form
  const handleClear = () => {
    setQuestion("");
    setResponse("");
    setError("");
    setSelectedConversation(null);
    // setImage(null); // Clear file input if using image
  };

  // delete conversation from database
  const handleDeleteConversation = () => {
    handleClear();
    fetchConversations();
  };

  // function to reset user id
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

  // handle twitch authentication
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

  // const handleDiscordAuth = async () => {
  //   try {
  //     // Get the current domain based on environment
  //     const domain =
  //       process.env.NODE_ENV === "production"
  //         ? "https://assistant.videogamewingman.com"
  //         : "http://localhost:3000";

  //     // Construct the Discord login URL
  //     const discordLoginUrl = `${domain}/api/discordLogin`;

  //     // Open Discord login in new tab instead of current window
  //     window.open(discordLoginUrl, "_blank");
  //   } catch (error) {
  //     console.error("Error during Discord authentication:", error);
  //     setError("Failed to authenticate with Discord");
  //   }
  // };

  // format assistant's response
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
            conversations={conversations}
          />
          <div className="flex-1 flex flex-col items-center justify-center py-2 main-content">
            <Image
              src="/assets/video-game-wingman-logo.png"
              alt="Video Game Wingman Logo"
              className="logo"
              width={350}
              height={350}
            />

            {conversationCount > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                You have {conversationCount} saved conversation
                {conversationCount !== 1 ? "s" : ""}
              </p>
            )}

            <ul className="mt-4 text-lg text-center">
              <li>Discover a game&apos;s hidden secrets.</li>
              <li>Get personalized game recommendations.</li>
              <li>Analyze gameplay data to improve your strategies.</li>
              <li>Access detailed game guides.</li>
            </ul>

            <div className="flex space-x-4 mb-4">
              <button
                className={`px-4 py-2 rounded ${
                  activeView === "chat"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
                onClick={() => setActiveView("chat")}
              >
                Chat
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-300 text-gray-500 cursor-not-allowed"
                disabled
              >
                Forum (Coming Soon)
              </button>
            </div>

            {activeView === "chat" && (
              <form onSubmit={handleSubmit} className="w-full max-w-md mt-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Message Video Game Wingman"
                  className="w-full p-2 border border-gray-300 rounded mb-4"
                />

                {/* Comment out image upload UI section
                <div className="mb-4">
                  <label className="cursor-pointer flex items-center gap-2">
                    <FontAwesomeIcon icon={faPaperclip} size="lg" />
                    <span>Attach Screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: "none" }}
                    />
                  </label>
                  {imageUrl && (
                    <div className="mt-2">
                      <Image
                        src={imageUrl}
                        alt="Selected"
                        width={200}
                        height={200}
                        className="rounded"
                      />
                    </div>
                  )}
                </div>
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
            )}

            {loading && <div className="spinner mt-4"></div>}
            {error && <div className="mt-4 text-red-500">{error}</div>}
            {response && (
              <div className="mt-8 w-full max-w-3xl">
                <h2 className="text-2xl font-bold">Response</h2>
                <div className="bg-gray-100 p-4 rounded response-box">
                  {formatResponse(response)}
                </div>

                {/* Display metrics if available */}
                {Object.keys(metrics).length > 0 && (
                  <div className="mt-4 text-xs text-gray-500">
                    <details>
                      <summary>Performance Metrics</summary>
                      <div className="mt-2 p-2 bg-gray-100 rounded">
                        {metrics.totalTime && (
                          <p>
                            Total time: {Number(metrics.totalTime).toFixed(2)}ms
                          </p>
                        )}
                        {metrics.responseSize && (
                          <p>
                            Response size:{" "}
                            {metrics.responseSize.kilobytes || "N/A"}
                          </p>
                        )}
                        {metrics.aiCacheMetrics && (
                          <p>
                            Cache hit rate:{" "}
                            {metrics.aiCacheMetrics.hitRate || "N/A"}
                          </p>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                {/* Move buttons below the response */}
                <div className="mt-4 footer-buttons">
                  <button
                    onClick={handleTwitchAuth}
                    className="mt-2 p-2 bg-blue-500 text-white rounded"
                  >
                    Login with Twitch
                  </button>

                  {/* <button
                    onClick={handleDiscordAuth}
                    className="mt-2 p-2 bg-[#5865F2] text-white rounded"
                  >
                    Login with Discord
                  </button> */}
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
