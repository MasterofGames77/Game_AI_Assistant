"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SubscriptionStatus } from "@/types";

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
}

export default function AccountPage() {
  const router = useRouter();
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        setAccountData({
          username: userData.user.username,
          email: userData.user.email,
          hasProAccess: subscriptionData.hasProAccess,
          subscriptionStatus: subscriptionData.subscriptionStatus,
          conversationCount: userData.user.conversationCount || 0,
          achievements: userData.user.achievements || [],
          progress: userData.user.progress || { totalQuestions: 0 },
        });
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
    // TODO: Implement subscription management
    console.log("Manage subscription clicked");
  };

  const handleReactivateSubscription = () => {
    // TODO: Implement reactivation flow
    console.log("Reactivate subscription clicked");
  };

  const getSubscriptionStatusDisplay = () => {
    if (!accountData?.subscriptionStatus) {
      return {
        status: "No Subscription",
        color: "text-gray-400",
        bgColor: "bg-gray-500/20",
        borderColor: "border-gray-500/40",
        action: "Upgrade Now",
        actionHandler: handleUpgradeClick,
        actionColor: "from-[#00ffff] to-[#ff69b4]",
      };
    }

    const status = accountData.subscriptionStatus;

    switch (status.type) {
      case "free_period":
        return {
          status: status.showWarning
            ? "Free Period (Expiring Soon)"
            : "Free Period Active",
          color: status.showWarning ? "text-orange-400" : "text-green-400",
          bgColor: status.showWarning ? "bg-orange-500/20" : "bg-green-500/20",
          borderColor: status.showWarning
            ? "border-orange-500/40"
            : "border-green-500/40",
          action: status.showWarning ? "Upgrade Now" : "Upgrade Now",
          actionHandler: handleUpgradeClick,
          actionColor: "from-[#00ffff] to-[#ff69b4]",
        };

      case "paid_active":
        return {
          status: "Pro Member (Active)",
          color: "text-blue-400",
          bgColor: "bg-blue-500/20",
          borderColor: "border-blue-500/40",
          action: "Manage Subscription",
          actionHandler: handleManageSubscription,
          actionColor: "from-purple-500 to-pink-500",
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
        };

      default:
        return {
          status: "No Active Subscription",
          color: "text-gray-400",
          bgColor: "bg-gray-500/20",
          borderColor: "border-gray-500/40",
          action: "Upgrade Now",
          actionHandler: handleUpgradeClick,
          actionColor: "from-[#00ffff] to-[#ff69b4]",
        };
    }
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
                  <p className="text-white font-semibold">
                    {accountData.username}
                  </p>
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
          </div>

          {/* Subscription Status */}
          <div className="lg:col-span-2">
            <div className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20">
              <h2 className="text-2xl font-bold mb-6 text-[#00ffff]">
                Subscription Status
              </h2>

              <div
                className={`p-4 rounded-lg ${statusDisplay.bgColor} border ${statusDisplay.borderColor} mb-6`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-xl font-bold ${statusDisplay.color}`}>
                      {statusDisplay.status}
                    </h3>
                    {accountData.subscriptionStatus?.daysUntilExpiration && (
                      <p className="text-gray-300 text-sm mt-1">
                        {accountData.subscriptionStatus.daysUntilExpiration}{" "}
                        days remaining
                      </p>
                    )}
                    {accountData.subscriptionStatus?.expiresAt && (
                      <p className="text-gray-300 text-sm">
                        Expires:{" "}
                        {formatDate(accountData.subscriptionStatus.expiresAt)}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <button
                      onClick={statusDisplay.actionHandler}
                      className={`px-6 py-3 bg-gradient-to-r ${statusDisplay.actionColor} text-white font-bold rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg`}
                    >
                      {statusDisplay.action}
                    </button>
                  </div>
                </div>
              </div>

              {/* Subscription Details */}
              {accountData.subscriptionStatus && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[#1a1b2e]/50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-3 text-[#00ffff]">
                      Subscription Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white">
                          {accountData.subscriptionStatus.type
                            .replace(/_/g, " ")
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-white">
                          {accountData.subscriptionStatus.status}
                        </span>
                      </div>
                      {accountData.subscriptionStatus.canUpgrade && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Can Upgrade:</span>
                          <span className="text-green-400">Yes</span>
                        </div>
                      )}
                      {accountData.subscriptionStatus.canCancel && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Can Cancel:</span>
                          <span className="text-yellow-400">Yes</span>
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
                        onClick={() => router.push("/upgrade")}
                        className="w-full px-4 py-2 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white rounded-lg hover:opacity-90 transition-all duration-200 text-sm"
                      >
                        Manage Subscription
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
    </div>
  );
}
