"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SubscriptionStatus, HealthMonitoring } from "@/types";
import axios from "axios";

interface AccountData {
  username: string;
  email: string;
  hasProAccess: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  conversationCount: number;
  achievements: Array<{ name: string; dateEarned: Date }>;
  progress: {
    totalQuestions: number;
    [key: string]: number;
  };
  hasPassword?: boolean;
  healthMonitoring?: HealthMonitoring;
}

export default function AccountPage() {
  const router = useRouter();
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password management state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Health settings state
  const [healthSettings, setHealthSettings] = useState<HealthMonitoring>({
    breakReminderEnabled: true,
    breakIntervalMinutes: 45,
    totalSessionTime: 0,
    breakCount: 0,
    healthTipsEnabled: true,
    ergonomicsReminders: true,
  });
  const [healthSettingsLoading, setHealthSettingsLoading] = useState(false);
  const [healthSettingsError, setHealthSettingsError] = useState("");
  const [healthSettingsSuccess, setHealthSettingsSuccess] = useState("");

  // Username reset state
  const [usernameResetLoading, setUsernameResetLoading] = useState(false);
  const [usernameResetError, setUsernameResetError] = useState("");
  const [usernameResetSuccess, setUsernameResetSuccess] = useState("");

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        setLoading(true);
        const username = localStorage.getItem("username");

        if (!username) {
          setError("No user found. Please sign in.");
          return;
        }

        // Fetch user data
        const userResponse = await fetch("/api/accountData", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user data");
        }

        const userData = await userResponse.json();

        // Fetch subscription status
        const subscriptionResponse = await fetch("/api/checkProAccess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        if (!subscriptionResponse.ok) {
          throw new Error("Failed to fetch subscription data");
        }

        const subscriptionData = await subscriptionResponse.json();

        // Debug logging
        console.log(
          "Account page - subscription data received:",
          subscriptionData
        );

        setAccountData({
          username: userData.user.username,
          email: userData.user.email,
          hasProAccess: subscriptionData.hasProAccess,
          subscriptionStatus: subscriptionData.subscriptionStatus,
          conversationCount: userData.user.conversationCount || 0,
          achievements: userData.user.achievements || [],
          progress: userData.user.progress || { totalQuestions: 0 },
          hasPassword: !!userData.user.password,
          healthMonitoring: userData.user.healthMonitoring,
        });

        // Initialize health settings if available
        if (userData.user.healthMonitoring) {
          setHealthSettings(userData.user.healthMonitoring);
        }
      } catch (err) {
        console.error("Error fetching account data:", err);
        setError("Failed to load account data");
      } finally {
        setLoading(false);
      }
    };

    fetchAccountData();
  }, []);

  const handleUpgradeClick = () => {
    router.push("/upgrade");
  };

  const handleManageSubscription = () => {
    // Redirect to dedicated subscription management page
    router.push("/manage-subscription");
  };

  const handleReactivateSubscription = () => {
    // TODO: Implement reactivation flow
    console.log("Reactivate subscription clicked");
  };

  const handlePasswordSetup = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    // Validate passwords
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("Please fill in all password fields");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    try {
      const userId = localStorage.getItem("userId");
      const username = localStorage.getItem("username");

      if (!userId || !username) {
        setPasswordError("User information not found. Please sign in again.");
        return;
      }

      // Check if user has existing password
      if (accountData?.hasPassword) {
        // User has password, require current password for change
        if (!passwordData.currentPassword) {
          setPasswordError("Current password is required to change password");
          return;
        }

        // Verify current password first
        const verifyResponse = await axios.post("/api/auth/signin", {
          identifier: username,
          password: passwordData.currentPassword,
        });

        if (!verifyResponse.data.user) {
          setPasswordError("Current password is incorrect");
          return;
        }
      }

      // Set up or change password
      const response = await axios.post("/api/auth/setup-password", {
        userId,
        username,
        newPassword: passwordData.newPassword,
      });

      if (response.data) {
        setPasswordSuccess("Password updated successfully!");
        setAccountData((prev) =>
          prev ? { ...prev, hasPassword: true } : null
        );

        // Clear form
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });

        // Close modal after 2 seconds
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess("");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Password setup error:", error);
      setPasswordError(
        error.response?.data?.message ||
          "Failed to update password. Please try again."
      );
    }
  };

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError("");
    setPasswordSuccess("");
  };

  // Health settings handlers
  const handleHealthSettingsChange = (
    field: keyof HealthMonitoring,
    value: any
  ) => {
    setHealthSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveHealthSettings = async () => {
    setHealthSettingsLoading(true);
    setHealthSettingsError("");
    setHealthSettingsSuccess("");

    try {
      const username = localStorage.getItem("username");
      if (!username) {
        setHealthSettingsError("User not found. Please sign in again.");
        return;
      }

      const response = await axios.post("/api/health/updateSettings", {
        username,
        settings: healthSettings,
      });

      if (response.data.success) {
        setHealthSettingsSuccess("Health settings updated successfully!");
        setAccountData((prev) =>
          prev
            ? {
                ...prev,
                healthMonitoring: healthSettings,
              }
            : null
        );

        // Clear success message after 3 seconds
        setTimeout(() => {
          setHealthSettingsSuccess("");
        }, 3000);
      }
    } catch (error: any) {
      console.error("Error updating health settings:", error);
      setHealthSettingsError(
        error.response?.data?.message ||
          "Failed to update health settings. Please try again."
      );
    } finally {
      setHealthSettingsLoading(false);
    }
  };

  const handleResetUsername = async () => {
    const newUsername = prompt("Enter your new username:");

    if (newUsername && newUsername.trim().length > 0) {
      setUsernameResetLoading(true);
      setUsernameResetError("");
      setUsernameResetSuccess("");

      try {
        // Get current user info
        const userId = localStorage.getItem("userId");
        const email = localStorage.getItem("userEmail");

        if (!userId || !email) {
          setUsernameResetError(
            "User information not found. Please sign in again."
          );
          return;
        }

        // Use the syncUser API to update username with content moderation
        const res = await axios.post("/api/syncUser", {
          userId,
          email,
          username: newUsername.trim(),
        });

        if (res.data && res.data.user) {
          // Update local storage
          localStorage.setItem("username", newUsername.trim());
          localStorage.setItem("userId", res.data.user.userId);
          localStorage.setItem("userEmail", res.data.user.email);

          // Update account data
          setAccountData((prev) =>
            prev
              ? {
                  ...prev,
                  username: newUsername.trim(),
                }
              : null
          );

          setUsernameResetSuccess(
            `Username updated successfully to: ${newUsername.trim()}`
          );

          // Clear success message after 5 seconds
          setTimeout(() => {
            setUsernameResetSuccess("");
          }, 5000);
        }
      } catch (err: any) {
        console.error("Error resetting username:", err);

        if (err.response?.data?.message) {
          // Handle content violation specifically
          if (
            err.response.data.offendingWords &&
            err.response.data.violationResult
          ) {
            const violationResult = err.response.data.violationResult;
            let violationMessage = err.response.data.message;

            // Add specific violation details based on action
            if (violationResult.action === "warning") {
              violationMessage += ` Warning ${violationResult.count}/3. Please choose a different username.`;
            } else if (violationResult.action === "banned") {
              const banDate = new Date(
                violationResult.expiresAt
              ).toLocaleDateString();
              violationMessage += ` You are temporarily banned until ${banDate}. Please try again later.`;
            } else if (violationResult.action === "permanent_ban") {
              violationMessage += ` You are permanently banned from using this application.`;
            }

            setUsernameResetError(violationMessage);
          } else {
            setUsernameResetError(err.response.data.message);
          }
        } else {
          setUsernameResetError("Failed to update username. Please try again.");
        }
      } finally {
        setUsernameResetLoading(false);
      }
    } else {
      setUsernameResetError("Username reset canceled.");
      setTimeout(() => {
        setUsernameResetError("");
      }, 3000);
    }
  };

  const getSubscriptionStatusDisplay = () => {
    // If we have detailed subscription status, use it
    if (accountData?.subscriptionStatus) {
      const status = accountData.subscriptionStatus;

      switch (status.type) {
        case "free_period":
          return {
            status: status.showWarning
              ? "Free Period (Expiring Soon)"
              : "Free Period Active",
            color: status.showWarning ? "text-orange-400" : "text-green-400",
            bgColor: status.showWarning
              ? "bg-orange-500/20"
              : "bg-green-500/20",
            borderColor: status.showWarning
              ? "border-orange-500/40"
              : "border-green-500/40",
            action: status.showWarning ? "Upgrade Now" : "Upgrade Now",
            actionHandler: handleUpgradeClick,
            actionColor: "from-[#00ffff] to-[#ff69b4]",
            details: {
              type: "FREE PERIOD",
              status: status.showWarning
                ? "Free Period (Expiring Soon)"
                : "Free Period Active",
              canUpgrade: true,
            },
          };

        case "paid_active":
          return {
            status: "Paid Subscription Active",
            color: "text-blue-400",
            bgColor: "bg-blue-500/20",
            borderColor: "border-blue-500/40",
            action: "Manage Subscription",
            actionHandler: handleManageSubscription,
            actionColor: "from-purple-500 to-pink-500",
            details: {
              type: "PAID SUBSCRIPTION",
              status: "Paid Subscription Active",
              canUpgrade: false,
            },
          };

        case "canceled_active":
          return {
            status: "Pro Member (Canceled)",
            color: "text-yellow-400",
            bgColor: "bg-yellow-500/20",
            borderColor: "border-yellow-500/40",
            action: "Reactivate Subscription",
            actionHandler: handleReactivateSubscription,
            actionColor: "from-green-500 to-blue-500",
            details: {
              type: "CANCELED ACTIVE",
              status: "Subscription Canceled (Active Until Period End)",
              canUpgrade: false,
              expiresAt: status.expiresAt,
            },
          };

        case "expired_free":
          return {
            status: "Free Period Expired",
            color: "text-red-400",
            bgColor: "bg-red-500/20",
            borderColor: "border-red-500/40",
            action: "Upgrade Now",
            actionHandler: handleUpgradeClick,
            actionColor: "from-[#00ffff] to-[#ff69b4]",
            details: {
              type: "EXPIRED FREE",
              status: "Free Period Expired",
              canUpgrade: true,
            },
          };

        case "no_subscription":
          return {
            status: "No Subscription",
            color: "text-gray-400",
            bgColor: "bg-gray-500/20",
            borderColor: "border-gray-500/40",
            action: "Upgrade Now",
            actionHandler: handleUpgradeClick,
            actionColor: "from-[#00ffff] to-[#ff69b4]",
            details: {
              type: "NO SUBSCRIPTION",
              status: "No Active Subscription",
              canUpgrade: true,
              canCancel: false,
            },
          };

        default:
          // Fallback for unknown status types
          break;
      }
    }

    // Fallback: If user has Pro access but no detailed subscription status, show as active
    if (accountData?.hasProAccess) {
      return {
        status: "Paid Subscription Active",
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        borderColor: "border-blue-500/40",
        action: "Manage Subscription",
        actionHandler: handleManageSubscription,
        actionColor: "from-purple-500 to-pink-500",
        details: {
          type: "PAID SUBSCRIPTION",
          status: "Paid Subscription Active",
          canUpgrade: false,
          canCancel: true,
        },
      };
    }

    // Final fallback: No subscription data
    return {
      status: "No Subscription",
      color: "text-gray-400",
      bgColor: "bg-gray-500/20",
      borderColor: "border-gray-500/40",
      action: "Upgrade Now",
      actionHandler: handleUpgradeClick,
      actionColor: "from-[#00ffff] to-[#ff69b4]",
      details: {
        type: "NO SUBSCRIPTION",
        status: "No Active Subscription",
        canUpgrade: true,
        canCancel: false,
      },
    };
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1b2e] text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ffff] mx-auto mb-4"></div>
            <p className="text-gray-300">Loading your account information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1b2e] text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <div className="text-red-400 mb-4">⚠️</div>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white rounded-lg hover:from-[#00e6e6] hover:to-[#ff4da6] transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!accountData) {
    return (
      <div className="min-h-screen bg-[#1a1b2e] text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-gray-300 mb-4">No account data available</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white rounded-lg hover:from-[#00e6e6] hover:to-[#ff4da6] transition-all duration-200"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusDisplay = getSubscriptionStatusDisplay();

  return (
    <div className="min-h-screen bg-[#1a1b2e] text-white py-12 px-4">
      <style jsx>{`
        .slider {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 4px;
          outline: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00ffff;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00ffff;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Account Dashboard
            <div className="w-48 h-1 bg-gradient-to-r from-[#00ffff] via-[#ff69b4] to-[#00ffff] mx-auto mt-4"></div>
          </h1>
          <p className="text-xl text-gray-300">
            Manage your account and subscription settings
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg flex items-center space-x-2"
            aria-label="Back to main page"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to Wingman</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Account Information */}
          <div className="lg:col-span-1">
            <div className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20">
              <h2 className="text-2xl font-bold mb-6 text-[#00ffff]">
                Account Info
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Username</label>
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold">
                      {accountData.username}
                    </p>
                    <button
                      onClick={handleResetUsername}
                      disabled={usernameResetLoading}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors duration-200"
                    >
                      {usernameResetLoading ? "Updating..." : "Change"}
                    </button>
                  </div>

                  {/* Username reset messages */}
                  {usernameResetError && (
                    <p className="text-red-400 text-sm mt-2">
                      {usernameResetError}
                    </p>
                  )}
                  {usernameResetSuccess && (
                    <p className="text-green-400 text-sm mt-2">
                      {usernameResetSuccess}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Email</label>
                  <p className="text-white font-semibold">
                    {accountData.email}
                  </p>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Conversations</label>
                  <p className="text-white font-semibold">
                    {accountData.conversationCount}
                  </p>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">
                    Total Questions
                  </label>
                  <p className="text-white font-semibold">
                    {accountData.progress.totalQuestions || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20 mt-6">
              <h2 className="text-2xl font-bold mb-6 text-[#00ffff]">
                Security Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">
                    Password Status
                  </label>
                  <p className="text-white font-semibold">
                    {accountData.hasPassword ? (
                      <span className="text-green-400">✓ Password Set</span>
                    ) : (
                      <span className="text-yellow-400">⚠ No Password</span>
                    )}
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white rounded-lg hover:opacity-90 transition-all duration-200 text-sm font-semibold"
                  >
                    {accountData.hasPassword
                      ? "Change Password"
                      : "Set Password"}
                  </button>
                </div>

                {!accountData.hasPassword && (
                  <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-3">
                    <p className="text-yellow-200 text-xs">
                      <strong>Security Notice:</strong> Your account
                      doesn&apos;t have a password set. We recommend setting one
                      for better security.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subscription Status */}
          <div className="lg:col-span-2">
            <div className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20">
              {/* Subscription Details */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-[#1a1b2e]/50 rounded-lg p-6 md:col-span-2">
                  <h4 className="text-lg font-semibold mb-3 text-[#00ffff]">
                    Subscription Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white">
                        {statusDisplay.details?.type ||
                          (accountData.subscriptionStatus?.type
                            ? accountData.subscriptionStatus.type
                                .replace(/_/g, " ")
                                .toUpperCase()
                            : "NO SUBSCRIPTION")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:&nbsp;</span>
                      <span className="text-white whitespace-nowrap">
                        {statusDisplay.details?.status ||
                          accountData.subscriptionStatus?.status ||
                          "No Active Subscription"}
                      </span>
                    </div>
                    {(statusDisplay.details?.canUpgrade ||
                      accountData.subscriptionStatus?.canUpgrade) && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Can Upgrade:</span>
                        <span className="text-green-400">Yes</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#1a1b2e]/50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-3 text-[#00ffff]">
                    Quick Actions
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={statusDisplay.actionHandler}
                      className="w-full px-4 py-2 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white rounded-lg hover:opacity-90 transition-all duration-200 text-sm"
                    >
                      {statusDisplay.action}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Health & Wellness Settings */}
            <div className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20 mt-6">
              <h2 className="text-2xl font-bold mb-6 text-[#00ffff]">
                Health & Wellness
              </h2>

              <div className="space-y-6">
                {/* Break Reminders */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-white font-semibold">
                        Break Reminders
                      </label>
                      <p className="text-gray-400 text-sm">
                        Get reminders to take breaks while gaming
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleHealthSettingsChange(
                          "breakReminderEnabled",
                          !healthSettings.breakReminderEnabled
                        )
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        healthSettings.breakReminderEnabled
                          ? "bg-[#00ffff]"
                          : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          healthSettings.breakReminderEnabled
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Break Interval */}
                  {healthSettings.breakReminderEnabled && (
                    <div className="ml-4 space-y-2">
                      <label className="text-gray-300 text-sm">
                        Break Interval: {healthSettings.breakIntervalMinutes}{" "}
                        minutes
                      </label>
                      <div className="relative max-w-md mx-auto">
                        <input
                          type="range"
                          min="15"
                          max="90"
                          step="15"
                          value={healthSettings.breakIntervalMinutes}
                          onChange={(e) => {
                            const actualValue = parseInt(e.target.value);
                            handleHealthSettingsChange(
                              "breakIntervalMinutes",
                              actualValue
                            );
                          }}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #00ffff 0%, #00ffff ${
                              ((healthSettings.breakIntervalMinutes - 15) /
                                (90 - 15)) *
                              100
                            }%, #374151 ${
                              ((healthSettings.breakIntervalMinutes - 15) /
                                (90 - 15)) *
                              100
                            }%, #374151 100%)`,
                          }}
                        />
                        <div className="relative text-xs text-gray-400 mt-2 w-full">
                          <span
                            className="absolute"
                            style={{
                              left: "0%",
                              transform: "translateX(-50%)",
                            }}
                          >
                            15m
                          </span>
                          <span
                            className="absolute"
                            style={{
                              left: "20%",
                              transform: "translateX(-50%)",
                            }}
                          >
                            30m
                          </span>
                          <span
                            className="absolute"
                            style={{
                              left: "40%",
                              transform: "translateX(-50%)",
                            }}
                          >
                            45m
                          </span>
                          <span
                            className="absolute"
                            style={{
                              left: "60%",
                              transform: "translateX(-50%)",
                            }}
                          >
                            60m
                          </span>
                          <span
                            className="absolute"
                            style={{
                              left: "80%",
                              transform: "translateX(-50%)",
                            }}
                          >
                            75m
                          </span>
                          <span
                            className="absolute"
                            style={{
                              left: "100%",
                              transform: "translateX(-50%)",
                            }}
                          >
                            90m
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Health Tips */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-semibold">
                      Health Tips
                    </label>
                    <p className="text-gray-400 text-sm">
                      Show health and ergonomics tips with reminders
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleHealthSettingsChange(
                        "healthTipsEnabled",
                        !healthSettings.healthTipsEnabled
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      healthSettings.healthTipsEnabled
                        ? "bg-[#00ffff]"
                        : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        healthSettings.healthTipsEnabled
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Ergonomics Reminders */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-semibold">
                      Ergonomics Reminders
                    </label>
                    <p className="text-gray-400 text-sm">
                      Get posture and setup reminders
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleHealthSettingsChange(
                        "ergonomicsReminders",
                        !healthSettings.ergonomicsReminders
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      healthSettings.ergonomicsReminders
                        ? "bg-[#00ffff]"
                        : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        healthSettings.ergonomicsReminders
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Error/Success Messages */}
                {healthSettingsError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                    <p className="text-red-200 text-sm">
                      {healthSettingsError}
                    </p>
                  </div>
                )}

                {healthSettingsSuccess && (
                  <div className="p-3 bg-green-500/20 border border-green-500/40 rounded-lg">
                    <p className="text-green-200 text-sm">
                      {healthSettingsSuccess}
                    </p>
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSaveHealthSettings}
                  disabled={healthSettingsLoading}
                  className="w-full px-4 py-2 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white rounded-lg hover:opacity-90 transition-all duration-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {healthSettingsLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    "Save Health Settings"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        {accountData.achievements.length > 0 && (
          <div className="mt-8">
            <div className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20">
              <h2 className="text-2xl font-bold mb-6 text-[#00ffff]">
                Recent Achievements
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accountData.achievements
                  .slice(0, 6)
                  .map((achievement, index) => (
                    <div key={index} className="bg-[#1a1b2e]/50 rounded-lg p-4">
                      <div className="text-2xl mb-2">🏆</div>
                      <h3 className="font-semibold text-white">
                        {achievement.name}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Earned: {formatDate(achievement.dateEarned)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Password Setup/Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#252642] p-8 rounded-lg shadow-lg w-full max-w-md mx-4 border border-[#00ffff]/20">
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-2xl font-bold mb-2 text-center text-[#00ffff]">
                {accountData?.hasPassword ? "Change Password" : "Set Password"}
              </h2>
              <p className="text-gray-300 text-center text-sm">
                {accountData?.hasPassword
                  ? "Enter your current password and choose a new one"
                  : "Set a password to secure your account"}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePasswordSetup();
              }}
              className="space-y-4"
            >
              {/* Current Password (only if user has password) */}
              {accountData?.hasPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-[#00ffff] focus:border-transparent bg-gray-800 text-white"
                    placeholder="Enter your current password"
                    required
                  />
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-[#00ffff] focus:border-transparent bg-gray-800 text-white"
                  placeholder="Enter your new password"
                  minLength={8}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Password must be at least 8 characters long
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-[#00ffff] focus:border-transparent bg-gray-800 text-white"
                  placeholder="Confirm your new password"
                  required
                />
              </div>

              {/* Error/Success Messages */}
              {passwordError && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                  <p className="text-red-200 text-sm">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-500/20 border border-green-500/40 rounded-lg">
                  <p className="text-green-200 text-sm">{passwordSuccess}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handlePasswordModalClose}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white rounded-lg hover:opacity-90 transition-all duration-200 font-semibold"
                >
                  {accountData?.hasPassword
                    ? "Update Password"
                    : "Set Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
