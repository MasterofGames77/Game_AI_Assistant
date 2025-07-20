import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProStatusProps, SubscriptionStatus } from "@/types";

const ProStatus: React.FC<ProStatusProps> = ({ hasProAccess, username }) => {
  const router = useRouter();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!username) return;

      setLoading(true);
      try {
        const response = await fetch("/api/checkProAccess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await response.json();

        if (data.subscriptionStatus) {
          setSubscriptionStatus(data.subscriptionStatus);
        }
      } catch (error) {
        console.error("Error fetching subscription status:", error);
      } finally {
        setLoading(false);
      }
    };

    if (hasProAccess && username) {
      fetchSubscriptionStatus();
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
        <>
          <span
            className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
            style={{ minWidth: "90px" }}
          >
            Pro Member
          </span>
          {username && (
            <span
              className="text-sm font-bold text-white dark:text-white ml-1 drop-shadow-sm"
              style={{ textShadow: "0 1px 4px rgba(80,0,80,0.15)" }}
            >
              {username}
            </span>
          )}
        </>
      );
    }

    // Enhanced display based on subscription type
    switch (subscriptionStatus.type) {
      case "free_period":
        return (
          <div className="flex items-center space-x-2">
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
            {subscriptionStatus.daysUntilExpiration && (
              <span className="text-xs text-gray-300">
                {subscriptionStatus.daysUntilExpiration} days left
              </span>
            )}
            {username && (
              <span
                className="text-sm font-bold text-white dark:text-white ml-1 drop-shadow-sm"
                style={{ textShadow: "0 1px 4px rgba(80,0,80,0.15)" }}
              >
                {username}
              </span>
            )}
            {subscriptionStatus.canUpgrade && (
              <button
                onClick={handleUpgradeClick}
                className="ml-2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
              >
                Continue
              </button>
            )}
          </div>
        );

      case "paid_active":
        return (
          <div className="flex items-center space-x-2">
            <span
              className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
              style={{ minWidth: "90px" }}
            >
              Pro Member
            </span>
            {username && (
              <span
                className="text-sm font-bold text-white dark:text-white ml-1 drop-shadow-sm"
                style={{ textShadow: "0 1px 4px rgba(80,0,80,0.15)" }}
              >
                {username}
              </span>
            )}
            {subscriptionStatus.canCancel && (
              <button
                onClick={handleManageSubscription}
                className="ml-2 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-all duration-200"
              >
                Manage
              </button>
            )}
          </div>
        );

      case "canceled_active":
        return (
          <div className="flex items-center space-x-2">
            <span
              className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
              style={{ minWidth: "90px" }}
            >
              Expires Soon
            </span>
            {username && (
              <span
                className="text-sm font-bold text-white dark:text-white ml-1 drop-shadow-sm"
                style={{ textShadow: "0 1px 4px rgba(80,0,80,0.15)" }}
              >
                {username}
              </span>
            )}
            {subscriptionStatus.canReactivate && (
              <button
                onClick={handleManageSubscription}
                className="ml-2 px-2 py-1 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs rounded hover:from-green-600 hover:to-blue-600 transition-all duration-200"
              >
                Reactivate
              </button>
            )}
          </div>
        );

      case "expired_free":
        return (
          <div className="flex items-center space-x-2">
            <span
              className="px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
              style={{ minWidth: "90px" }}
            >
              Expired
            </span>
            {username && (
              <span
                className="text-sm font-bold text-white dark:text-white ml-1 drop-shadow-sm"
                style={{ textShadow: "0 1px 4px rgba(80,0,80,0.15)" }}
              >
                {username}
              </span>
            )}
            {subscriptionStatus.canUpgrade && (
              <button
                onClick={handleUpgradeClick}
                className="ml-2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
              >
                Upgrade
              </button>
            )}
          </div>
        );

      default:
        // Fallback to original display
        return (
          <>
            <span
              className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full whitespace-nowrap flex items-center justify-center"
              style={{ minWidth: "90px" }}
            >
              Pro Member
            </span>
            {username && (
              <span
                className="text-sm font-bold text-white dark:text-white ml-1 drop-shadow-sm"
                style={{ textShadow: "0 1px 4px rgba(80,0,80,0.15)" }}
              >
                {username}
              </span>
            )}
          </>
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
    <div className="flex items-center space-x-4">
      {hasProAccess ? (
        getStatusDisplay()
      ) : (
        <button
          onClick={handleUpgradeClick}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Upgrade to Pro
        </button>
      )}
    </div>
  );
};

export default ProStatus;
