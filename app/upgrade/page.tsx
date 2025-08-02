"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SubscriptionStatus } from "@/types";

const ProFeatures = [
  {
    title: "Real-time Notifications",
    description:
      "Get instant updates about achievements, forum responses, and community activity.",
    icon: "🔔",
  },
  {
    title: "Forum Access",
    description: "Participate in exclusive Pro-only forums and discussions.",
    icon: "💬",
  },
  {
    title: "Advanced Analytics",
    description: "Track your gaming progress and get personalized insights.",
    icon: "📊",
  },
  {
    title: "Priority Support",
    description: "Get faster responses to your questions and issues.",
    icon: "⭐",
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<{
    hasProAccess: boolean;
    subscriptionStatus: SubscriptionStatus | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        setLoading(true);
        const username = localStorage.getItem("username");

        if (!username) {
          setUserStatus({
            hasProAccess: false,
            subscriptionStatus: null,
          });
          return;
        }

        const response = await fetch("/api/checkProAccess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user status");
        }

        const data = await response.json();
        setUserStatus({
          hasProAccess: data.hasProAccess,
          subscriptionStatus: data.subscriptionStatus || null,
        });
      } catch (err) {
        console.error("Error fetching user status:", err);
        setError("Failed to load user status");
        setUserStatus({
          hasProAccess: false,
          subscriptionStatus: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserStatus();
  }, []);

  const handleUpgradeClick = async () => {
    // TODO: Implement Stripe checkout flow
    console.log("Upgrade clicked");
  };

  const handleContinueFreePeriod = () => {
    // Navigate back to main app
    router.push("/");
  };

  const handleManageSubscription = () => {
    // TODO: Navigate to subscription management
    console.log("Manage subscription clicked");
  };

  const handleReactivateSubscription = () => {
    // TODO: Implement reactivation flow
    console.log("Reactivate subscription clicked");
  };

  const getPageContent = () => {
    if (loading) {
      return (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ffff] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your subscription status...</p>
        </div>
      );
    }

    if (error) {
      return (
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
      );
    }

    const subscriptionType = userStatus?.subscriptionStatus?.type;

    // Early Access User (Free Period)
    if (subscriptionType === "free_period") {
      const daysLeft = userStatus?.subscriptionStatus?.daysUntilExpiration;
      const showWarning = userStatus?.subscriptionStatus?.showWarning;

      return (
        <>
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">
              Your Free Pro Access
              <div className="w-48 h-1 bg-gradient-to-r from-[#00ffff] via-[#ff69b4] to-[#00ffff] mx-auto mt-4"></div>
            </h1>
            <p className="text-xl text-gray-300 mb-4">
              You&apos;re currently enjoying free Pro access until December 31,
              2026
            </p>
            {daysLeft && (
              <div
                className={`text-lg font-semibold ${
                  showWarning ? "text-orange-400" : "text-green-400"
                }`}
              >
                {daysLeft} days remaining
              </div>
            )}
            {showWarning && (
              <div className="mt-4 p-4 bg-orange-500/20 border border-orange-500/40 rounded-lg">
                <p className="text-orange-300">
                  ⚠️ Your free access expires soon! Consider upgrading to
                  continue enjoying Pro features.
                </p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {ProFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-[#00ffff]">
                  {feature.title}
                </h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            {showWarning ? (
              <button
                onClick={handleUpgradeClick}
                className="px-8 py-4 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white text-xl font-bold rounded-lg hover:from-[#00e6e6] hover:to-[#ff4da6] transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Upgrade Now - $0.99/month
              </button>
            ) : (
              <button
                onClick={handleContinueFreePeriod}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xl font-bold rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Continue Using Pro Features
              </button>
            )}
          </div>
        </>
      );
    }

    // Paid Active Subscription
    if (subscriptionType === "paid_active") {
      return (
        <>
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">
              You&apos;re Already a Pro Member!
              <div className="w-48 h-1 bg-gradient-to-r from-[#00ffff] via-[#ff69b4] to-[#00ffff] mx-auto mt-4"></div>
            </h1>
            <p className="text-xl text-gray-300">
              Enjoy all Pro features and exclusive content
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {ProFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-[#00ffff]">
                  {feature.title}
                </h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={handleManageSubscription}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Manage Subscription
            </button>
          </div>
        </>
      );
    }

    // Canceled but Still Active
    if (subscriptionType === "canceled_active") {
      return (
        <>
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">
              Subscription Canceled
              <div className="w-48 h-1 bg-gradient-to-r from-[#00ffff] via-[#ff69b4] to-[#00ffff] mx-auto mt-4"></div>
            </h1>
            <p className="text-xl text-gray-300 mb-4">
              Your Pro access will remain active until the end of your current
              billing period
            </p>
            <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
              <p className="text-yellow-300">
                ⚠️ Your subscription will expire soon. Reactivate to keep your
                Pro access.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {ProFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-[#00ffff]">
                  {feature.title}
                </h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={handleReactivateSubscription}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xl font-bold rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Reactivate Subscription
            </button>
          </div>
        </>
      );
    }

    // Expired Free Period or No Subscription
    if (
      subscriptionType === "expired_free" ||
      subscriptionType === "no_subscription" ||
      !userStatus?.hasProAccess
    ) {
      return (
        <>
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">
              Upgrade to Video Game Wingman Pro
              <div className="w-48 h-1 bg-gradient-to-r from-[#00ffff] via-[#ff69b4] to-[#00ffff] mx-auto mt-4"></div>
            </h1>
            <p className="text-xl text-gray-300">
              Get exclusive features and enhance your gaming experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {ProFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-[#00ffff]">
                  {feature.title}
                </h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4">Special Offer</h2>
              <p className="text-xl text-gray-300">
                Sign up before December 31st, 2025 and get 1 year of Pro access
                for free!
              </p>
            </div>

            <button
              onClick={handleUpgradeClick}
              className="px-8 py-4 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white text-xl font-bold rounded-lg hover:from-[#00e6e6] hover:to-[#ff4da6] transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Upgrade Now - $0.99/month
            </button>
          </div>
        </>
      );
    }

    // Fallback for unknown states
    return (
      <>
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Upgrade to Video Game Wingman Pro
            <div className="w-48 h-1 bg-gradient-to-r from-[#00ffff] via-[#ff69b4] to-[#00ffff] mx-auto mt-4"></div>
          </h1>
          <p className="text-xl text-gray-300">
            Get exclusive features and enhance your gaming experience
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {ProFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-[#00ffff]">
                {feature.title}
              </h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4">Special Offer</h2>
            <p className="text-xl text-gray-300">
              Sign up before December 31st, 2025 and get 1 year of Pro access
              for free!
            </p>
          </div>

          <button
            onClick={handleUpgradeClick}
            className="px-8 py-4 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white text-xl font-bold rounded-lg hover:from-[#00e6e6] hover:to-[#ff4da6] transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Upgrade Now - $0.99/month
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#1a1b2e] text-white py-12 px-4">
      <div className="container mx-auto max-w-4xl">{getPageContent()}</div>
    </div>
  );
}
