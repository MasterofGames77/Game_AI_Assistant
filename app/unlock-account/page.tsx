"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "../../utils/axiosConfig";
import Image from "next/image";

const UnlockAccountContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [message, setMessage] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = useCallback(async (unlockToken: string) => {
    if (!unlockToken) {
      setStatus("error");
      setMessage("Invalid unlock token.");
      return;
    }

    setIsUnlocking(true);
    setStatus("loading");
    setMessage("Unlocking your account...");

    try {
      const res = await axios.post("/api/auth/unlock-account", {
        token: unlockToken,
      });

      if (res.data && res.data.success) {
        setStatus("success");
        setMessage(res.data.message || "Your account has been unlocked successfully! You can now sign in.");
        
        // Redirect to signin page after 3 seconds
        setTimeout(() => {
          router.push("/signin");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(res.data?.message || "Failed to unlock account. Please try again.");
      }
    } catch (err: any) {
      setStatus("error");
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Failed to unlock account. The token may be invalid or expired. Please request a new unlock link.");
      }
    } finally {
      setIsUnlocking(false);
    }
  }, [router]);

  useEffect(() => {
    // Get token from URL query parameter
    if (!searchParams) return;
    
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      // Automatically attempt unlock if token is present
      handleUnlock(tokenParam);
    } else {
      setStatus("error");
      setMessage("No unlock token provided. Please check your email for the unlock link.");
    }
  }, [searchParams, handleUnlock]);

  const handleRetry = () => {
    if (token) {
      handleUnlock(token);
    }
  };

  const handleGoToSignIn = () => {
    router.push("/signin");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-10 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-white/20">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/assets/video-game-wingman-logo.png"
            alt="Video Game Wingman Logo"
            width={120}
            height={120}
            className="mb-6 drop-shadow-lg"
            priority
          />
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Unlock Account
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
            Restore access to your account
          </p>
        </div>

        {/* Status Messages */}
        {status === "loading" && (
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-700 rounded-lg mb-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {message}
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-lg mb-4">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-green-700 dark:text-green-300 text-sm font-medium mb-1">
                  Account Unlocked!
                </p>
                <p className="text-green-600 dark:text-green-400 text-sm">
                  {message}
                </p>
                <p className="text-green-600 dark:text-green-400 text-xs mt-2">
                  Redirecting to sign in page...
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-lg mb-4">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-1">
                  Unlock Failed
                </p>
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {status === "error" && (
          <div className="space-y-3">
            {token && (
              <button
                onClick={handleRetry}
                disabled={isUnlocking}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isUnlocking ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Retrying...
                  </div>
                ) : (
                  "Try Again"
                )}
              </button>
            )}
            <button
              onClick={handleGoToSignIn}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 px-6 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 font-semibold"
            >
              Go to Sign In
            </button>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 text-xs text-center mb-2">
            <strong>Need help?</strong>
          </p>
          <ul className="text-gray-600 dark:text-gray-400 text-xs space-y-1">
            <li>• Unlock tokens expire after 24 hours</li>
            <li>• Check your email for the unlock link</li>
            <li>• If the token is expired, contact support</li>
            <li>• Make sure you&apos;re using the full link from your email</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const UnlockAccountPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-10 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-white/20">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <UnlockAccountContent />
    </Suspense>
  );
};

export default UnlockAccountPage;

