import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import AvatarSelector from "./AvatarSelector";
import { ProStatusProps, SubscriptionStatus } from "@/types";

const ProStatus: React.FC<ProStatusProps> = ({ hasProAccess, username }) => {
  const router = useRouter();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [usageStatus, setUsageStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;

      setLoading(true);
      try {
        // Fetch subscription status for Pro users
        if (hasProAccess) {
          const response = await fetch("/api/checkProAccess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          });
          const data = await response.json();

          if (data.subscriptionStatus) {
            setSubscriptionStatus(data.subscriptionStatus);
          }
        }

        // Fetch usage status for all users
        const usageResponse = await fetch("/api/usageStatus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const usageData = await usageResponse.json();

        if (usageData.usageStatus) {
          setUsageStatus(usageData.usageStatus);
        }

        // Fetch avatar
        const avatarResponse = await fetch("/api/avatar/recent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        if (avatarResponse.ok) {
          const avatarData = await avatarResponse.json();
          setAvatarUrl(avatarData.currentAvatar);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchData();
    }
  }, [hasProAccess, username]);

  const handleUpgradeClick = () => {
    // Navigate to the upgrade page
    router.push("/upgrade");
  };

  const handleManageSubscription = () => {
    // TODO: Navigate to subscription management page
    router.push("/account");
  };

  const getStatusDisplay = () => {
    if (!subscriptionStatus) {
      // Fallback to original display
      return (
        <div className="flex flex-col space-y-1">
          {username && (
            <div className="flex items-center space-x-2">
              <Avatar
                src={avatarUrl}
                username={username}
                size={32}
                onClick={() => setShowAvatarSelector(true)}
              />
              <span
                className="text-sm font-bold text-white dark:text-white drop-shadow-sm whitespace-nowrap"
                style={{ textShadow: "0 1px 4px rgba(80,0,80,0.15)" }}
              >
                {username}
              </span>
            </div>
          )}
          <span
            className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
            style={{ minWidth: "90px" }}
          >
            Pro Member
          </span>
        </div>
      );
    }

    // Enhanced display based on subscription type
    switch (subscriptionStatus.type) {
      case "free_period":
        return (
          <div className="flex flex-col space-y-1">
            {username && (
              <div className="flex items-center space-x-2">
                <Avatar
                  src={avatarUrl}
                  username={username}
                  size={32}
                  onClick={() => setShowAvatarSelector(true)}
                />
                <span
                  className="text-sm font-bold text-white dark:text-white drop-shadow-sm whitespace-nowrap"
                  style={{
                    textShadow: "0 1px 4px rgba(80,0,80,0.15)",
                  }}
                >
                  {username}
                </span>
              </div>
            )}
            <span
              className={`px-2 py-1 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center ${
                subscriptionStatus.showWarning
                  ? "bg-gradient-to-r from-orange-500 to-red-500"
                  : "bg-gradient-to-r from-green-500 to-blue-500"
              }`}
              style={{ minWidth: "90px" }}
            >
              {subscriptionStatus.showWarning ? "Expires Soon" : "Free Pro"}
            </span>
          </div>
        );

      case "paid_active":
        return (
          <div className="flex flex-col space-y-1">
            {username && (
              <div className="flex items-center space-x-2">
                <Avatar
                  src={avatarUrl}
                  username={username}
                  size={32}
                  onClick={() => setShowAvatarSelector(true)}
                />
                <span
                  className="text-sm font-bold text-white dark:text-white drop-shadow-sm whitespace-nowrap"
                  style={{
                    textShadow: "0 1px 4px rgba(80,0,80,0.15)",
                  }}
                >
                  {username}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <span
                className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
                style={{ minWidth: "90px" }}
              >
                Pro Member
              </span>
              {subscriptionStatus.canCancel && (
                <button
                  onClick={handleManageSubscription}
                  className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-all duration-200 flex-shrink-0"
                >
                  Manage
                </button>
              )}
            </div>
          </div>
        );

      case "canceled_active":
        return (
          <div className="flex flex-col space-y-1">
            {username && (
              <div className="flex items-center space-x-2">
                <Avatar
                  src={avatarUrl}
                  username={username}
                  size={32}
                  onClick={() => setShowAvatarSelector(true)}
                />
                <span
                  className="text-sm font-bold text-white dark:text-white drop-shadow-sm whitespace-nowrap"
                  style={{
                    textShadow: "0 1px 4px rgba(80,0,80,0.15)",
                  }}
                >
                  {username}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <span
                className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
                style={{ minWidth: "90px" }}
              >
                Expires Soon
              </span>
              {subscriptionStatus.canReactivate && (
                <button
                  onClick={handleManageSubscription}
                  className="px-2 py-1 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs rounded hover:from-green-600 hover:to-blue-600 transition-all duration-200 flex-shrink-0"
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
        );

      case "expired_free":
        return (
          <div className="flex flex-col space-y-1">
            {username && (
              <div className="flex items-center space-x-2">
                <Avatar
                  src={avatarUrl}
                  username={username}
                  size={32}
                  onClick={() => setShowAvatarSelector(true)}
                />
                <span
                  className="text-sm font-bold text-white dark:text-white drop-shadow-sm whitespace-nowrap"
                  style={{
                    textShadow: "0 1px 4px rgba(80,0,80,0.15)",
                  }}
                >
                  {username}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <span
                className="px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
                style={{ minWidth: "90px" }}
              >
                Expired
              </span>
              {subscriptionStatus.canUpgrade && (
                <button
                  onClick={handleUpgradeClick}
                  className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex-shrink-0"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>
        );

      default:
        // Fallback to original display
        return (
          <div className="flex flex-col space-y-1">
            {username && (
              <div className="flex items-center space-x-2">
                <Avatar
                  src={avatarUrl}
                  username={username}
                  size={32}
                  onClick={() => setShowAvatarSelector(true)}
                />
                <span
                  className="text-sm font-bold text-white dark:text-white drop-shadow-sm whitespace-nowrap"
                  style={{
                    textShadow: "0 1px 4px rgba(80,0,80,0.15)",
                  }}
                >
                  {username}
                </span>
              </div>
            )}
            <span
              className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
              style={{ minWidth: "90px" }}
            >
              Pro Member
            </span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-4">
        <div
          className="animate-pulse px-2 py-1 bg-gray-600 text-white text-sm rounded-full"
          style={{ minWidth: "90px" }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {hasProAccess ? (
        getStatusDisplay()
      ) : (
        <div className="flex items-center space-x-3">
          {/* Username with Avatar for Free Users */}
          {username && (
            <div className="flex items-center space-x-2">
              <Avatar
                src={avatarUrl}
                username={username}
                size={32}
                onClick={() => setShowAvatarSelector(true)}
              />
              <span className="text-sm font-bold text-white drop-shadow-sm whitespace-nowrap">
                {username}
              </span>
            </div>
          )}
          {/* Usage Status for Free Users */}
          {usageStatus && !usageStatus.isProUser && (
            <div className="text-sm text-gray-300">
              <span className="font-semibold">
                {usageStatus.questionsRemaining === -1
                  ? "Unlimited"
                  : `${usageStatus.questionsRemaining}/${usageStatus.questionsLimit}`}
              </span>
              <span className="text-gray-400 ml-1">
                {usageStatus.questionsRemaining === -1
                  ? "questions"
                  : "questions left"}
              </span>
              {usageStatus.isInCooldown && usageStatus.cooldownUntil && (
                <div className="text-xs text-orange-400 mt-1">
                  Next question:{" "}
                  {new Date(usageStatus.cooldownUntil).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleUpgradeClick}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Upgrade to Pro
          </button>
        </div>
      )}
      {/* Avatar Selector Modal */}
      {username && (
        <AvatarSelector
          isOpen={showAvatarSelector}
          onClose={() => setShowAvatarSelector(false)}
          username={username}
          onAvatarChange={(newAvatarUrl) => {
            setAvatarUrl(newAvatarUrl);
          }}
        />
      )}
    </div>
  );
};

export default ProStatus;
