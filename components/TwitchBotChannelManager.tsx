"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { TwitchBotChannelManagerProps, TwitchChannel } from "../types";
import TwitchChannelSettings from "./TwitchChannelSettings";

const TwitchBotChannelManager: React.FC<TwitchBotChannelManagerProps> = ({
  className = "",
}) => {
  const [channels, setChannels] = useState<TwitchChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingChannel, setUpdatingChannel] = useState<string | null>(null);
  const [settingsChannel, setSettingsChannel] = useState<string | null>(null);

  // Check URL params for success/error messages
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("twitchBot") === "added") {
        setSuccess(
          `Bot successfully added to channel: ${
            params.get("channel") || "your channel"
          }`
        );
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname);
        // Refresh channels list
        fetchChannels();
      } else if (params.get("twitchBot") === "error") {
        setError("Failed to add bot to channel. Please try again.");
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/twitchBot/channels");
      setChannels(response.data.channels || []);
    } catch (err: any) {
      console.error("Error fetching channels:", err);
      setError(err.response?.data?.message || "Failed to load channels");
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = () => {
    // Redirect to OAuth flow
    window.location.href = "/api/twitchBotLogin";
  };

  const handleToggleChannel = async (
    channelName: string,
    currentState: boolean
  ) => {
    try {
      setUpdatingChannel(channelName);
      setError(null);
      setSuccess(null);

      const response = await axios.patch("/api/twitchBot/channels", {
        channelName,
        isActive: !currentState,
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        await fetchChannels();
      }
    } catch (err: any) {
      console.error("Error updating channel:", err);
      setError(err.response?.data?.message || "Failed to update channel");
    } finally {
      setUpdatingChannel(null);
    }
  };

  const handleRemoveChannel = async (channelName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove the bot from ${channelName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setUpdatingChannel(channelName);
      setError(null);
      setSuccess(null);

      const response = await axios.delete("/api/twitchBot/channels", {
        params: { channelName },
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        await fetchChannels();
      }
    } catch (err: any) {
      console.error("Error removing channel:", err);
      setError(err.response?.data?.message || "Failed to remove channel");
    } finally {
      setUpdatingChannel(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428H12l-3 3v-3H4.714V1.714h15.143Z" />
          </svg>
          Twitch Bot Channels
        </h2>
        <button
          onClick={handleAddChannel}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Channel
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="mt-2 text-gray-400">Loading channels...</p>
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">No channels added yet.</p>
          <button
            onClick={handleAddChannel}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Add Your First Channel
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {channels.map((channel) => (
            <div
              key={channel.channelName}
              className="bg-gray-900 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      #{channel.channelName}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        channel.isActive
                          ? "bg-green-900/30 text-green-300 border border-green-700"
                          : "bg-gray-700 text-gray-400 border border-gray-600"
                      }`}
                    >
                      {channel.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>Added: {formatDate(channel.addedAt)}</p>
                    <p>Messages processed: {channel.messageCount}</p>
                    {channel.lastJoinedAt && (
                      <p>Last joined: {formatDate(channel.lastJoinedAt)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setSettingsChannel(channel.channelName)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                    title="Channel Settings"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() =>
                      handleToggleChannel(channel.channelName, channel.isActive)
                    }
                    disabled={updatingChannel === channel.channelName}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      channel.isActive
                        ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {updatingChannel === channel.channelName ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : channel.isActive ? (
                      "Disable"
                    ) : (
                      "Enable"
                    )}
                  </button>
                  <button
                    onClick={() => handleRemoveChannel(channel.channelName)}
                    disabled={updatingChannel === channel.channelName}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {channels.length > 0 && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg text-sm text-blue-300">
          <p className="font-semibold mb-1">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Use <code className="bg-gray-800 px-1 rounded">!wingman</code> or{" "}
              <code className="bg-gray-800 px-1 rounded">@HeroGameWingman</code>{" "}
              in your chat to interact with the bot
            </li>
            <li>
              Disabling a channel will stop the bot from responding, but it will
              remain in your list
            </li>
            <li>
              Removing a channel will permanently delete it from your account
            </li>
          </ul>
        </div>
      )}

      {/* Settings Modal */}
      {settingsChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <TwitchChannelSettings
              channelName={settingsChannel}
              onClose={() => setSettingsChannel(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TwitchBotChannelManager;
