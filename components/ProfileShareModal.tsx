"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import ProfileShareCard from "./ProfileShareCard";
import { ProfileShareModalProps, ProfileShareData } from "../types";
import { toPng, toBlob } from "html-to-image";

const ProfileShareModal: React.FC<ProfileShareModalProps> = ({
  isOpen,
  onClose,
  username,
}) => {
  const [profileData, setProfileData] = useState<ProfileShareData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const fetchProfileData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile-share-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile data");
      }

      const data = await response.json();
      setProfileData(data);
    } catch (err) {
      console.error("Error fetching profile data:", err);
      setError("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (isOpen && username) {
      fetchProfileData();
    }
  }, [isOpen, username, fetchProfileData]);

  const generatePreview = useCallback(async () => {
    if (!profileData) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Wait for React to render the card
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Retry logic to find the card element
      let cardElement: HTMLElement | null = null;
      let attempts = 0;
      const maxAttempts = 10;

      while (!cardElement && attempts < maxAttempts) {
        if (!cardRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
          continue;
        }

        cardElement = cardRef.current.querySelector(
          "#profile-share-card"
        ) as HTMLElement;

        if (!cardElement) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }
      }

      if (!cardRef.current || !cardElement) {
        throw new Error("Card element not found in DOM after waiting");
      }

      // Final wait to ensure everything is rendered
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify card element is still valid
      if (!cardElement || !cardElement.parentElement) {
        throw new Error("Card element became invalid during generation");
      }

      // Generate preview from the card element directly
      const dataUrl = await toPng(cardElement, {
        width: 1200,
        height: 800,
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: "#1a1b2e",
        cacheBust: true,
      });

      setPreviewUrl(dataUrl);
    } catch (err) {
      console.error("Error generating preview:", err);
      setError("Failed to generate card preview. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [profileData]);

  useEffect(() => {
    if (isOpen && profileData && !previewUrl) {
      generatePreview();
    }
  }, [isOpen, profileData, previewUrl, generatePreview]);

  const handleDownload = async () => {
    if (!profileData) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Wait for React to render
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Retry logic to find the card element
      let cardElement: HTMLElement | null = null;
      let attempts = 0;
      const maxAttempts = 10;

      while (!cardElement && attempts < maxAttempts) {
        if (!cardRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
          continue;
        }

        cardElement = cardRef.current.querySelector(
          "#profile-share-card"
        ) as HTMLElement;

        if (!cardElement) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }
      }

      if (!cardRef.current || !cardElement) {
        throw new Error("Card element not found in DOM after waiting");
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Generate blob from the card element directly
      const blob = await toBlob(cardElement, {
        width: 1200,
        height: 800,
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: "#1a1b2e",
        cacheBust: true,
      });

      if (!blob) {
        throw new Error("Failed to generate image");
      }

      const filename = `${profileData.username.replace(
        /[^a-z0-9]/gi,
        "_"
      )}_profile_${Date.now()}.png`;

      // Download the image
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Profile card downloaded!", {
        duration: 3000,
      });
    } catch (err) {
      console.error("Error downloading card:", err);
      setError("Failed to download card. Please try again.");
      toast.error("Failed to download card");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareToDiscord = async () => {
    if (!profileData) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Wait for React to render
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Retry logic to find the card element
      let cardElement: HTMLElement | null = null;
      let attempts = 0;
      const maxAttempts = 10;

      while (!cardElement && attempts < maxAttempts) {
        if (!cardRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
          continue;
        }

        cardElement = cardRef.current.querySelector(
          "#profile-share-card"
        ) as HTMLElement;

        if (!cardElement) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }
      }

      if (!cardRef.current || !cardElement) {
        throw new Error("Card element not found in DOM after waiting");
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Generate blob from the card element directly
      const blob = await toBlob(cardElement, {
        width: 1200,
        height: 800,
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: "#1a1b2e",
        cacheBust: true,
      });

      if (!blob) {
        throw new Error("Failed to generate image");
      }

      // For Discord, we need to copy the image to clipboard or provide download
      if (navigator.clipboard && navigator.clipboard.write) {
        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          toast.success(
            "Card copied to clipboard! You can now paste it in Discord.",
            {
              duration: 4000,
            }
          );
        } catch (clipboardErr) {
          // Fallback to download
          const filename = `${profileData.username.replace(
            /[^a-z0-9]/gi,
            "_"
          )}_profile_${Date.now()}.png`;

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success("Card downloaded! You can now upload it to Discord.", {
            duration: 4000,
          });
        }
      } else {
        // Fallback to download
        const filename = `${profileData.username.replace(
          /[^a-z0-9]/gi,
          "_"
        )}_profile_${Date.now()}.png`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Card downloaded! You can now upload it to Discord.", {
          duration: 4000,
        });
      }
    } catch (err) {
      console.error("Error sharing to Discord:", err);
      setError("Failed to share card. Please try again.");
      toast.error("Failed to share card");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Share My Profile
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="spinner"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">
                Loading profile data...
              </span>
            </div>
          )}

          {isGenerating && !previewUrl && !isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="spinner"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">
                Generating card...
              </span>
            </div>
          )}

          {/* Hidden card for generation - must be in DOM for html-to-image to work */}
          {profileData && (
            <div
              ref={cardRef}
              style={{
                position: "fixed",
                left: "-2000px",
                top: "0",
                width: "1200px",
                height: "800px",
                zIndex: -1,
              }}
            >
              <ProfileShareCard
                username={profileData.username}
                avatarUrl={profileData.avatarUrl}
                favoriteGenres={profileData.favoriteGenres}
                achievements={profileData.achievements}
                streak={profileData.streak}
                currentChallenge={profileData.currentChallenge}
              />
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Preview
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                <Image
                  src={previewUrl}
                  alt="Profile card preview"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Actions */}
          {previewUrl && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </button>

              <button
                onClick={handleShareToDiscord}
                disabled={isGenerating}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Share to Discord
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileShareModal;
