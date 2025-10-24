"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import Image from "next/image";
import { Conversation } from "../types";
import ForumList from "../components/ForumList";
import { ForumProvider } from "../context/ForumContext";
import PasswordSetupModal from "../components/PasswordSetupModal";
import EarlyAccessSetupModal from "../components/EarlyAccessSetupModal";
import FeedbackForm from "../components/FeedbackForm";
import MyFeedbackList from "../components/MyFeedbackList";
import AdminFeedbackDashboard from "../components/AdminFeedbackDashboard";
import FeedbackList from "../components/FeedbackList";
import FeedbackDetail from "../components/FeedbackDetail";
import FeedbackStats from "../components/FeedbackStats";
// import useSocket from "../hooks/useSocket"; // DISABLED due to 404 errors
import useAchievementPolling from "../hooks/useAchievementPolling";
import useHealthMonitoring from "../hooks/useHealthMonitoring";
import HealthStatusWidget from "../components/HealthStatusWidget";
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
  const [usageStatus, setUsageStatus] = useState<any>(null);

  const [activeView, setActiveView] = useState<"chat" | "forum" | "feedback">(
    "chat"
  );

  // Comment out image state variables
  // const [image, setImage] = useState<File | null>(null);
  // const [imageUrl, setImageUrl] = useState<string | null>(null);

  //const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordSetupModal, setShowPasswordSetupModal] = useState(false);
  const [isLegacyUser, setIsLegacyUser] = useState(false);
  const [showEarlyAccessSetupModal, setShowEarlyAccessSetupModal] =
    useState(false);
  const [isEarlyAccessUser, setIsEarlyAccessUser] = useState(false);
  const [earlyAccessUserData, setEarlyAccessUserData] = useState<any>(null);

  // Feedback system state
  const [userType, setUserType] = useState<"free" | "pro">("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [feedbackView, setFeedbackView] = useState<
    "form" | "my-feedback" | "admin-dashboard" | "admin-list"
  >("form");

  // Achievement polling system - replaces Socket.IO for notifications
  const { isPolling, lastChecked } = useAchievementPolling({
    username: username,
    isEnabled: !!username, // Only poll when user is logged in
    pollingInterval: 30000, // Check every 30 seconds
  });

  // Health monitoring system for break reminders
  const { healthStatus, recordBreak, endBreak, snoozeReminder } =
    useHealthMonitoring({
      username: username,
      isEnabled: !!username, // Only monitor when user is logged in
      checkInterval: 60000, // Check every minute
    });

  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    const initializeUser = async () => {
      setLoading(true);
      try {
        // Robust URL parameter parsing to handle malformed URLs
        const parseEarlyAccessParams = (searchString: string) => {
          const urlParams = new URLSearchParams(searchString);
          let userId = urlParams.get("userId");
          let email = urlParams.get("email");
          let earlyAccess = urlParams.get("earlyAccess");
          let isEarlyAccess = earlyAccess === "true";

          // Debug logging
          console.log("URL Search Params:", searchString);
          console.log("Initial parsed parameters:", {
            userId,
            email,
            earlyAccess,
            isEarlyAccess,
          });

          // Handle malformed URLs where parameters might be incorrectly appended to email
          if (email && email.includes("?")) {
            console.log("Detected malformed email with URL parameters:", email);

            // Extract the actual email (everything before the first ?)
            const actualEmail = email.split("?")[0];
            const malformedPart = email.split("?")[1];

            console.log("Extracted email:", actualEmail);
            console.log("Malformed part:", malformedPart);

            // Check if the malformed part contains earlyAccess=true
            if (malformedPart && malformedPart.includes("earlyAccess=true")) {
              isEarlyAccess = true;
              console.log(
                "Found earlyAccess=true in malformed part, setting isEarlyAccess to true"
              );
            }

            email = actualEmail;
          }

          // Additional cleanup for any remaining malformed parameters
          if (email && email.includes("?earlyAccess=true")) {
            email = email.replace("?earlyAccess=true", "");
            console.log("Cleaned remaining malformed parameters from email");
          }

          console.log("Final parsed parameters:", {
            userId,
            email,
            earlyAccess,
            isEarlyAccess,
          });
          return { userId, email, isEarlyAccess };
        };

        const {
          userId: earlyAccessUserId,
          email: earlyAccessEmail,
          isEarlyAccess,
        } = parseEarlyAccessParams(window.location.search);

        if (isEarlyAccess && earlyAccessUserId) {
          // Handle early access user
          try {
            const res = await axios.post("/api/auth/splash-login", {
              userId: earlyAccessUserId,
              email: earlyAccessEmail,
            });

            if (res.data && res.data.user) {
              const userData = res.data.user;

              // Store user data
              localStorage.setItem(
                "username",
                userData.username || earlyAccessUserId
              );
              localStorage.setItem("userId", userData.userId);
              localStorage.setItem("userEmail", userData.email);

              setUserId(userData.userId);
              setUsername(userData.username || earlyAccessUserId);

              // Check if user needs setup
              if (
                userData.requiresUsernameSetup ||
                userData.requiresPasswordSetup
              ) {
                setEarlyAccessUserData(userData);
                setShowEarlyAccessSetupModal(true);
                setIsEarlyAccessUser(true);
              } else {
                // User is fully set up, proceed normally
                setShowUsernameModal(false);
                fetchConversations();
              }

              setLoading(false);
              return;
            }
          } catch (err: any) {
            console.error("Error authenticating early access user:", err);
            // Fall through to normal flow
          }
        }

        // Normal user flow
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
  }, [fetchConversations]);

  // function to get usage status
  const fetchUsageStatus = useCallback(async () => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) return;

    try {
      const res = await axios.post("/api/usageStatus", {
        username: storedUsername,
      });
      setUsageStatus(res.data.usageStatus);
    } catch (error) {
      console.error("Error fetching usage status:", error);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchConversations();
      fetchUsageStatus();
    }
  }, [userId, fetchConversations, fetchUsageStatus]);

  // Check user type and admin status
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!username) return;

      try {
        // Lightweight admin check - uses dedicated endpoint that doesn't trigger errors
        const adminCheckResponse = await fetch(
          `/api/feedback/admin/check?username=${encodeURIComponent(username)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (adminCheckResponse.ok) {
          const checkResult = await adminCheckResponse.json();
          if (checkResult.isAdmin) {
            setIsAdmin(true);
            // Set default view to admin dashboard for admins
            setFeedbackView("admin-dashboard");
          } else {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }

        // Check user type (pro vs free)
        const usageResponse = await fetch("/api/usageStatus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        if (usageResponse.ok) {
          const usageData = await usageResponse.json();
          setUserType(usageData.usageStatus?.isProUser ? "pro" : "free");
        }
      } catch (error) {
        console.error("Error checking user status:", error);
        setIsAdmin(false);
        setUserType("free");
      }
    };

    checkUserStatus();
  }, [username]);

  useEffect(() => {
    if (selectedConversation) {
      setQuestion(selectedConversation.question);
      setResponse(selectedConversation.response);
    }
  }, [selectedConversation]);

  // Achievement polling status logging
  useEffect(() => {
    if (username && isPolling) {
      // console.log("✅ Achievement polling active for user:", username); // Commented out for production
    } else if (username && !isPolling) {
      // console.log("⏸️ Achievement polling paused for user:", username); // Commented out for production
    }
  }, [username, isPolling]);

  // Display conversation and forum count in the UI
  const conversationCount = conversations.length;

  // function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const startTime = performance.now();

    try {
      // console.log("Submitting question:", {
      //   userId,
      //   question,
      //   timestamp: new Date().toISOString(),
      // }); // Commented out for production
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
      // console.log(
      //   `Total frontend latency: ${(endTime - startTime).toFixed(2)}ms`
      // ); // Commented out for production
      // console.log("Response:", res.data); // Commented out for production

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

      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        const rateLimitData = error.response.data;
        setError(
          `${rateLimitData.message} ${
            rateLimitData.cooldownUntil
              ? `Next question available at ${new Date(
                  rateLimitData.cooldownUntil
                ).toLocaleTimeString()}`
              : ""
          }`
        );
      } else {
        setError(
          error.response?.data?.message ||
            "There was an error processing your request. Please try again."
        );
      }
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
  //     console.error("Error during Discord authentication:", error); // Already commented out
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
      setUsernameError("Username or email is required");
      return;
    }

    // Check if input is an email address
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usernameInput.trim());

    // Basic validation before API call
    if (isEmail) {
      // Email validation
      if (usernameInput.trim().length < 5) {
        setUsernameError("Please enter a valid email address.");
        return;
      }
      if (usernameInput.trim().length > 254) {
        setUsernameError("Email address is too long.");
        return;
      }
    } else {
      // Username validation
      if (usernameInput.trim().length < 3) {
        setUsernameError("Username must be at least 3 characters long.");
        return;
      }

      if (usernameInput.trim().length > 32) {
        setUsernameError("Username must be 32 characters or less.");
        return;
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(usernameInput.trim())) {
        setUsernameError(
          "Username can only contain letters, numbers, underscores, and hyphens."
        );
        return;
      }
    }

    try {
      setIsSigningIn(true);
      // Use new authentication system
      const res = await axios.post("/api/auth/signin", {
        identifier: usernameInput.trim(),
        password: passwordInput,
      });

      if (res.data && res.data.user) {
        setUsername(res.data.user.username);
        localStorage.setItem("username", res.data.user.username);
        localStorage.setItem("userId", res.data.user.userId);
        localStorage.setItem("userEmail", res.data.user.email);
        setShowUsernameModal(false);
        setConversations([]); // Clear old conversations
        fetchConversations(); // Fetch new user's conversations

        // Check if user needs to set up password (legacy user)
        if (res.data.requiresPasswordSetup && res.data.isLegacyUser) {
          setIsLegacyUser(true);
          setShowPasswordSetupModal(true);
        }
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setUsernameError(err.response.data.message);
      } else {
        setUsernameError("Failed to sign in. Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePasswordSetup = async (password: string) => {
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");

    if (!userId || !username) {
      throw new Error("User information not found");
    }

    const res = await axios.post("/api/auth/setup-password", {
      userId,
      username,
      newPassword: password,
    });

    if (res.data && res.data.user) {
      // Update local storage with updated user data
      localStorage.setItem("userId", res.data.user.userId);
      localStorage.setItem("userEmail", res.data.user.email);
    }
  };

  const handleEarlyAccessSetup = async (
    username: string,
    password?: string
  ) => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      throw new Error("User information not found");
    }

    const res = await axios.post("/api/auth/setup-early-access", {
      userId,
      username,
      password,
    });

    if (res.data && res.data.user) {
      // Update local storage with updated user data
      localStorage.setItem("username", res.data.user.username);
      localStorage.setItem("userId", res.data.user.userId);
      localStorage.setItem("userEmail", res.data.user.email);

      // Update state
      setUsername(res.data.user.username);
      setUserId(res.data.user.userId);

      // Fetch conversations for the newly set up user
      fetchConversations();
    }
  };

  const handleSignOut = () => {
    setIsSigningOut(true);

    // Clear state immediately for better UX
    setUsername(null);
    setUserId(null);
    setQuestion("");
    setResponse("");
    setSelectedConversation(null);
    setError("");
    setPasswordInput("");
    setShowPasswordSetupModal(false);
    setIsLegacyUser(false);
    setShowEarlyAccessSetupModal(false);
    setIsEarlyAccessUser(false);
    setEarlyAccessUserData(null);
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    setShowUsernameModal(true);

    // Reset signing out state after a brief delay
    setTimeout(() => {
      setIsSigningOut(false);
    }, 100);
  };

  const handleNavigateToAccount = () => {
    window.location.href = "/account";
  };

  // Used for debugging
  // if (typeof window !== "undefined") {
  //   console.log("Current username:", localStorage.getItem("username")); // Already commented out
  // }

  return (
    <div className="flex min-h-screen">
      {/* Sign In Modal */}
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
              <div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Username or email"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  minLength={3}
                  maxLength={32}
                  required
                  autoFocus
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password (optional for legacy users)"
                  className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {usernameError && (
                <p className="text-red-500 text-sm">{usernameError}</p>
              )}
              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <button
                onClick={() => (window.location.href = "/forgot-password")}
                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 text-sm"
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="mt-4 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => (window.location.href = "/signup")}
                  className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 font-medium"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Password Setup Modal for Legacy Users */}
      <PasswordSetupModal
        isOpen={showPasswordSetupModal}
        onClose={() => setShowPasswordSetupModal(false)}
        onSetup={handlePasswordSetup}
        username={username || ""}
        userId={userId || ""}
      />

      {/* Early Access Setup Modal */}
      <EarlyAccessSetupModal
        isOpen={showEarlyAccessSetupModal}
        onClose={() => setShowEarlyAccessSetupModal(false)}
        onSetup={handleEarlyAccessSetup}
        userEmail={earlyAccessUserData?.email || ""}
        userId={earlyAccessUserData?.userId || ""}
      />
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
            onTwitchAuth={handleTwitchAuth}
            onNavigateToAccount={handleNavigateToAccount}
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

              {/* Display usage status for free users */}
              {usageStatus && !usageStatus.isProUser && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-semibold">
                      {usageStatus.questionsRemaining === -1
                        ? "Unlimited"
                        : `${usageStatus.questionsRemaining}/${usageStatus.questionsLimit}`}
                    </span>
                    <span className="ml-1">
                      {usageStatus.questionsRemaining === -1
                        ? "questions"
                        : "questions remaining"}
                    </span>
                    {usageStatus.isInCooldown && usageStatus.cooldownUntil && (
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Next question available at{" "}
                        {new Date(
                          usageStatus.cooldownUntil
                        ).toLocaleTimeString()}
                      </div>
                    )}
                    {usageStatus.questionsRemaining === 0 &&
                      !usageStatus.isInCooldown && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          You&apos;ve reached your limit! Upgrade to Pro for
                          unlimited access.
                        </div>
                      )}
                  </div>
                </div>
              )}

              <ul className="mt-4 text-lg text-center">
                <li>Discover a game&apos;s hidden secrets.</li>
                <li>Get personalized game recommendations.</li>
                <li>Analyze gameplay data to improve your strategies.</li>
                <li>Access detailed game guides.</li>
              </ul>

              {activeView === "chat" && (
                <>
                  {/* Health Status Widget */}
                  <HealthStatusWidget
                    healthStatus={healthStatus}
                    onRecordBreak={recordBreak}
                    onEndBreak={endBreak}
                    onSnoozeReminder={snoozeReminder}
                  />

                  <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-md mt-2"
                  >
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
                </>
              )}

              {activeView === "forum" && (
                <ForumProvider>
                  <div className="w-full mt-4">
                    <ForumList />
                  </div>
                </ForumProvider>
              )}

              {activeView === "feedback" && (
                <div className="w-full mt-4">
                  {/* Feedback Navigation */}
                  <div className="mb-6">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {!isAdmin && (
                        <>
                          <button
                            onClick={() => setFeedbackView("form")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              feedbackView === "form"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            Submit Feedback
                          </button>
                          <button
                            onClick={() => setFeedbackView("my-feedback")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              feedbackView === "my-feedback"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            My Feedback
                          </button>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => setFeedbackView("admin-dashboard")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              feedbackView === "admin-dashboard"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            Dashboard
                          </button>
                          <button
                            onClick={() => setFeedbackView("admin-list")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              feedbackView === "admin-list"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            All Feedback
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Feedback Content */}
                  {feedbackView === "form" && (
                    <FeedbackForm
                      username={username}
                      userType={userType}
                      onFeedbackSubmitted={() => setFeedbackView("my-feedback")}
                    />
                  )}

                  {feedbackView === "my-feedback" && (
                    <MyFeedbackList username={username} />
                  )}

                  {isAdmin && feedbackView === "admin-dashboard" && (
                    <AdminFeedbackDashboard username={username} />
                  )}

                  {isAdmin && feedbackView === "admin-list" && (
                    <FeedbackList
                      username={username}
                      onFeedbackSelect={setSelectedFeedback}
                    />
                  )}
                </div>
              )}

              {/* Feedback Detail Modal */}
              {selectedFeedback && (
                <FeedbackDetail
                  feedback={selectedFeedback}
                  username={username}
                  onClose={() => setSelectedFeedback(null)}
                  onStatusUpdate={() => {
                    // Refresh the current view if it's an admin view
                    if (
                      isAdmin &&
                      (feedbackView === "admin-list" ||
                        feedbackView === "admin-dashboard")
                    ) {
                      // The components will handle their own refresh
                    }
                  }}
                  onResponseSubmit={() => {
                    // Refresh the current view if it's an admin view
                    if (
                      isAdmin &&
                      (feedbackView === "admin-list" ||
                        feedbackView === "admin-dashboard")
                    ) {
                      // The components will handle their own refresh
                    }
                  }}
                />
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
                    </div>
                  </div>
                )}
              {username && (
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="absolute top-4 right-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-300 mr-2"></div>
                      Signing Out...
                    </div>
                  ) : (
                    "Sign Out"
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
