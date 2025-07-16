"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import Image from "next/image";
import { Conversation } from "../types";
import ForumList from "../components/ForumList";
import { ForumProvider } from "../context/ForumContext";
// import { useRouter } from "next/navigation";
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

  // Comment out image state variables
  // const [image, setImage] = useState<File | null>(null);
  // const [imageUrl, setImageUrl] = useState<string | null>(null);

  //const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const initializeUser = async () => {
      setLoading(true);
      try {
        const storedUsername = localStorage.getItem("username");
        if (storedUsername) {
          // Try to fetch user by username
          try {
            const res = await axios.get(
              `/api/findUserByUsername?username=${storedUsername}`
            );
            if (res.data && res.data.user) {
              // Existing user: sync userId/email from backend
              localStorage.setItem("userId", res.data.user.userId);
              localStorage.setItem("userEmail", res.data.user.email);
              setUserId(res.data.user.userId);
              setUsername(storedUsername);
              setShowUsernameModal(false);
              setLoading(false);
              return;
            } else {
              // Username not found, treat as new user
              setShowUsernameModal(true);
              setLoading(false);
              return;
            }
          } catch (err: any) {
            // If error is 404, user not found, treat as new user
            if (err.response && err.response.status === 404) {
              setShowUsernameModal(true);
              setLoading(false);
              return;
            } else {
              // Other errors
              console.error("Error fetching user by username:", err);
            }
          }
        }
        // No username in localStorage, show modal
        setShowUsernameModal(true);
      } catch (error) {
        console.error("Error initializing user:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) {
      setShowUsernameModal(true);
    } else {
      setUsername(storedUsername);
      setShowUsernameModal(false);
    }
  }, []);

  // function to get conversations
  const fetchConversations = useCallback(async () => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) return;
    const res = await axios.get(
      `/api/getConversation?username=${storedUsername}`
    );
    setConversations(res.data.conversations);
  }, []);

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

  // Display conversation and forum count in the UI
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

      // Image upload section
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
          username,
          question,
          // imageFilePath,
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

      if (res.data && res.data.user) {
        setUsername(res.data.user.username);
        setUserId(res.data.user.userId);
        localStorage.setItem("username", res.data.user.username);
        localStorage.setItem("userId", res.data.user.userId);
        localStorage.setItem("userEmail", res.data.user.email);
        setShowUsernameModal(false);
        setConversations([]); // Clear old conversations
        fetchConversations(); // Fetch new user's conversations
      }
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

  // Image handler
  // const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     setImage(e.target.files[0]);
  //     setImageUrl(URL.createObjectURL(e.target.files[0]));
  //   }
  // };

  // function to clear the form
  const handleClear = () => {
    setQuestion("");
    setResponse("");
    setError("");
    setSelectedConversation(null);
    // setImage(null); // Clear file input if using image
  };

  // delete conversation from database
  const handleDeleteConversation = async (id: string) => {
    try {
      const storedUsername = localStorage.getItem("username");
      // Optimistically remove from UI immediately
      setConversations((prev) => prev.filter((conv) => conv._id !== id));

      await axios.post("/api/deleteInteraction", {
        id,
        username: storedUsername,
      });

      // Refresh conversations to ensure sync with database
      fetchConversations();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      // If deletion failed, refresh to restore the conversation
      fetchConversations();
    }
  };

  const handleResetUsername = async () => {
    const newUsername = prompt("Enter your new username:");

    if (newUsername && newUsername.trim().length > 0) {
      // Optionally, you could call your backend to update the username here
      setUsername(newUsername.trim());
      localStorage.setItem("username", newUsername.trim());
      setShowUsernameModal(false);
      setConversations([]); // Optionally clear conversations if you want
      handleClear(); // Clear form state
      alert(
        `Your new username is: ${newUsername.trim()}. Please remember it for future use.`
      );
    } else {
      alert("Username reset canceled.");
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
          <p key={`step-${index}-${stepCounter}`} className="mt-2">
            <strong>{stepCounter++}. </strong>
            {sentence.replace(/^\d+\.\s/, "").trim()}
          </p>
        );
      } else {
        return (
          <p key={`sentence-${index}`} className="mt-2">
            {sentence}
          </p>
        );
      }
    });
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError("");
    if (!usernameInput.trim()) {
      setUsernameError("Username is required");
      return;
    }
    try {
      // 1. Check if username exists
      const findRes = await axios.get(
        `/api/findUserByUsername?username=${usernameInput.trim()}`
      );
      let userId, email;
      if (findRes.data && findRes.data.user) {
        // Existing user: use their userId/email
        userId = findRes.data.user.userId;
        email = findRes.data.user.email;
      } else {
        // New user: generate new userId/email
        userId =
          localStorage.getItem("userId") ||
          "legacy-" + Math.random().toString(36).substring(2, 11);
        email = localStorage.getItem("userEmail") || "user@example.com";
      }
      // 2. Sync user
      if (userId === usernameInput.trim()) userId = undefined;
      if (email === usernameInput.trim()) email = undefined;
      const res = await axios.post("/api/syncUser", {
        userId,
        email,
        username: usernameInput.trim(),
      });
      if (res.data && res.data.user) {
        setUsername(usernameInput.trim());
        localStorage.setItem("username", usernameInput.trim());
        localStorage.setItem("userId", res.data.user.userId);
        localStorage.setItem("userEmail", res.data.user.email);
        setShowUsernameModal(false);
        setConversations([]); // Clear old conversations
        fetchConversations(); // Fetch new user's conversations
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setUsernameError(err.response.data.message);
      } else {
        setUsernameError("Failed to set username. Please try again.");
      }
    }
  };

  const handleSignOut = () => {
    setUsername(null);
    setUserId(null);
    setQuestion("");
    setResponse("");
    setSelectedConversation(null);
    setError("");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    setShowUsernameModal(true);
  };

  // Used for debugging
  // if (typeof window !== "undefined") {
  //   console.log("Current username:", localStorage.getItem("username"));
  // }

  return (
    <div className="flex min-h-screen">
      {/* Username Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-md flex flex-col items-center">
            <Image
              src="/assets/video-game-wingman-logo.png"
              alt="Video Game Wingman Logo"
              width={180}
              height={180}
              className="mb-6"
              priority
            />
            <h2 className="text-2xl font-bold mb-4 text-center">Sign In</h2>
            <form
              onSubmit={handleUsernameSubmit}
              className="space-y-4 w-full mt-2"
            >
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter your username"
                className="w-full p-2 border border-gray-300 rounded"
                minLength={4}
                maxLength={32}
                required
                autoFocus
              />
              {usernameError && (
                <p className="text-red-500 text-sm">{usernameError}</p>
              )}
              <button
                type="submit"
                className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Main App Content (only if signed in) */}
      {!showUsernameModal && (
        <>
          {/* Hamburger menu for mobile */}
          <button
            className="hamburger"
            aria-label="Open sidebar menu"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="4"
                y="6"
                width="16"
                height="2.5"
                rx="1.25"
                fill="currentColor"
              />
              <rect
                x="4"
                y="11"
                width="16"
                height="2.5"
                rx="1.25"
                fill="currentColor"
              />
              <rect
                x="4"
                y="16"
                width="16"
                height="2.5"
                rx="1.25"
                fill="currentColor"
              />
            </svg>
            <span className="hamburger-label">Menu</span>
          </button>
          {/* Show hamburger only on mobile via CSS */}
          <style>{`
            @media (max-width: 767px) {
              .hamburger { display: flex !important; }
            }
          `}</style>

          {/* Sidebar Drawer and Backdrop for mobile */}
          {sidebarOpen && (
            <div
              className="sidebar-backdrop"
              onClick={() => setSidebarOpen(false)}
            ></div>
          )}
          <Sidebar
            conversations={conversations}
            onSelectConversation={(convo) => {
              setSelectedConversation(convo);
              setSidebarOpen(false); // Close sidebar on mobile after selecting
            }}
            onDeleteConversation={handleDeleteConversation}
            onClear={handleClear}
            onResetUserId={handleResetUsername}
            onTwitchAuth={handleTwitchAuth}
            activeView={activeView}
            setActiveView={setActiveView}
            conversationCount={conversations.length}
            className={sidebarOpen ? "sidebar open" : "sidebar"}
          />
          <div className="main-content flex-1">
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <Image
                src="/assets/video-game-wingman-logo.png"
                alt="Video Game Wingman Logo"
                className="logo"
                width={350}
                height={350}
                priority={true}
              />

              {/* Display conversation count in the UI */}
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

              {activeView === "forum" && (
                <ForumProvider>
                  <div className="w-full mt-4">
                    <ForumList />
                  </div>
                </ForumProvider>
              )}

              {loading && <div className="spinner mt-4"></div>}
              {error && <div className="mt-4 text-red-500">{error}</div>}
              {activeView === "chat" &&
                (response || selectedConversation?.response) && (
                  <div className="mt-8 w-full max-w-3xl">
                    <h2 className="text-2xl font-bold">Response</h2>
                    <div className="bg-gray-100 p-4 rounded response-box">
                      {formatResponse(
                        response || selectedConversation?.response || ""
                      )}
                    </div>

                    {/* Display metrics if available */}
                    {Object.keys(metrics).length > 0 && (
                      <div className="mt-4 text-xs text-gray-500">
                        <details>
                          <summary>Performance Metrics</summary>
                          <div className="mt-2 p-2 bg-gray-100 rounded">
                            {metrics.totalTime && (
                              <p>
                                Total time:{" "}
                                {Number(metrics.totalTime).toFixed(2)}
                                ms
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
                        onClick={handleResetUsername}
                        className="mt-2 p-2 bg-blue-500 text-white rounded"
                      >
                        Reset Username
                      </button>
                    </div>
                  </div>
                )}
              <button
                onClick={handleSignOut}
                className="absolute top-4 right-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
