"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "@/utils/axiosConfig";
import { toast } from "react-hot-toast";
import { TwitchModerationConfig } from "@/config/twitchModerationConfig";
import { TwitchChannel } from "@/types";

interface TwitchModerationSettingsProps {
  className?: string;
}

const TwitchModerationSettings: React.FC<TwitchModerationSettingsProps> = ({
  className = "",
}) => {
  const [channels, setChannels] = useState<TwitchChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<TwitchModerationConfig>({
    enabled: true,
    strictMode: false,
    timeoutDurations: {
      first: 0,
      second: 300,
      third: 1800,
      fourth: 3600,
    },
    maxViolationsBeforeBan: 5,
    checkAIResponses: true,
    logAllActions: true,
  });
  // Initialize collapsed state from localStorage if available
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("twitchModerationCollapsed");
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          return parsed === true;
        }
      } catch (e) {
        console.error("Error loading moderation collapsed state from localStorage:", e);
      }
    }
    return false;
  });

  // Sync with localStorage on mount (in case of SSR/hydration issues)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("twitchModerationCollapsed");
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          setIsCollapsed(parsed === true);
        }
      } catch (e) {
        console.error("Error syncing moderation collapsed state from localStorage:", e);
      }
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/twitchBot/channels");
      const channelsData = response.data.channels || [];
      setChannels(channelsData);

      // Auto-select first channel if available and no channel is currently selected
      if (channelsData.length > 0 && !selectedChannel) {
        setSelectedChannel(channelsData[0].channelName);
      }
    } catch (err: any) {
      console.error("Error fetching channels:", err);
      setError(err.response?.data?.message || "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [selectedChannel]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (selectedChannel) {
      fetchModerationConfig(selectedChannel);
    }
  }, [selectedChannel]);

  const fetchModerationConfig = async (channelName: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/twitchBot/moderation", {
        params: { channelName },
      });

      if (response.data.config) {
        setConfig(response.data.config);
      }
    } catch (err: any) {
      console.error("Error fetching moderation config:", err);
      // Don't show error if config doesn't exist yet (will use defaults)
      if (err.response?.status !== 404) {
        setError(
          err.response?.data?.message || "Failed to load moderation settings"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedChannel) {
      setError("Please select a channel");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await axios.post("/api/twitchBot/moderation", {
        channelName: selectedChannel,
        config,
      });

      if (response.data.success) {
        setSuccess("Moderation settings saved successfully!");
        setTimeout(() => setSuccess(null), 3000);

        // Show toast notification
        toast.success(
          `Twitch bot moderation settings saved for #${selectedChannel}!`,
          {
            duration: 4000,
            position: "top-right",
            style: {
              background: "#1a1b2e",
              color: "#fff",
              border: "1px solid #00ffff",
            },
            iconTheme: {
              primary: "#00ffff",
              secondary: "#1a1b2e",
            },
          }
        );
      }
    } catch (err: any) {
      console.error("Error saving moderation config:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to save moderation settings";
      setError(errorMessage);

      // Show error toast notification
      toast.error(errorMessage, {
        duration: 5000,
        position: "top-right",
        style: {
          background: "#1a1b2e",
          color: "#fff",
          border: "1px solid #ef4444",
        },
        iconTheme: {
          primary: "#ef4444",
          secondary: "#1a1b2e",
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("Are you sure you want to reset to default settings?")) {
      return;
    }
    setConfig({
      enabled: true,
      strictMode: false,
      timeoutDurations: {
        first: 0,
        second: 300,
        third: 1800,
        fourth: 3600,
      },
      maxViolationsBeforeBan: 5,
      checkAIResponses: true,
      logAllActions: true,
    });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "Warning only";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const formatDurationMinutes = (seconds: number): string => {
    if (seconds === 0) return "Warning only";
    return `${Math.floor(seconds / 60)}m`;
  };

  if (loading && channels.length === 0) {
    return (
      <div
        className={`bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20 ${className}`}
      >
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ffff]"></div>
          <p className="mt-2 text-gray-400">Loading moderation settings...</p>
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div
        className={`bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20 ${className}`}
      >
        <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
          Twitch Bot Moderation Settings
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">
            No channels found. Add a channel to configure moderation settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[#252642]/50 backdrop-blur-sm rounded-2xl shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20 transition-all ${className} ${isCollapsed ? "p-3" : "p-6"}`}
    >
      <div className={`flex items-center justify-between ${isCollapsed ? "mb-0" : "mb-6"}`}>
        <h2 className="text-2xl font-bold text-[#00ffff]">
          Twitch Bot Moderation Settings
        </h2>
        <button
          onClick={() => {
            const newState = !isCollapsed;
            setIsCollapsed(newState);
            // Save to localStorage immediately
            try {
              if (typeof window !== "undefined") {
                localStorage.setItem("twitchModerationCollapsed", JSON.stringify(newState));
              }
            } catch (e) {
              console.error("Error saving moderation collapsed state to localStorage:", e);
            }
          }}
          className="text-[#00ffff] hover:text-[#00ffff]/80 transition-colors"
          aria-label={isCollapsed ? "Expand section" : "Collapse section"}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/40 rounded-lg">
              <p className="text-green-200 text-sm">{success}</p>
            </div>
          )}

          {/* Channel Selector */}
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Select Channel
            </label>
            <select
              value={selectedChannel || ""}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full px-4 py-2 bg-[#1a1b2e]/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#00ffff] focus:border-transparent"
            >
              {channels.map((channel) => (
                <option key={channel.channelName} value={channel.channelName}>
                  #{channel.channelName}{" "}
                  {channel.isActive ? "(Active)" : "(Inactive)"}
                </option>
              ))}
            </select>
          </div>

          {selectedChannel && (
            <div className="space-y-6">
          {/* Enable Moderation */}
          <div className="flex items-center justify-between p-4 bg-[#1a1b2e]/50 rounded-lg">
            <div>
              <label className="text-white font-semibold">
                Enable Moderation
              </label>
              <p className="text-gray-400 text-sm">
                Enable content moderation for this channel
              </p>
            </div>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? "bg-[#00ffff]" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {config.enabled && (
            <>
              {/* Strict Mode */}
              <div className="flex items-center justify-between p-4 bg-[#1a1b2e]/50 rounded-lg">
                <div>
                  <label className="text-white font-semibold">
                    Strict Mode
                  </label>
                  <p className="text-gray-400 text-sm">
                    More aggressive content detection
                  </p>
                </div>
                <button
                  onClick={() =>
                    setConfig({ ...config, strictMode: !config.strictMode })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.strictMode ? "bg-[#00ffff]" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.strictMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Timeout Durations */}
              <div className="p-4 bg-[#1a1b2e]/50 rounded-lg">
                <label className="text-white font-semibold mb-4 block">
                  Timeout Durations (Progressive Moderation)
                </label>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm">
                      1st Violation:{" "}
                      {formatDuration(config.timeoutDurations.first)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="300"
                      step="60"
                      value={config.timeoutDurations.first}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          timeoutDurations: {
                            ...config.timeoutDurations,
                            first: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Warning</span>
                      <span>5m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm">
                      2nd Violation:{" "}
                      {formatDuration(config.timeoutDurations.second)}
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="600"
                      step="60"
                      value={config.timeoutDurations.second}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          timeoutDurations: {
                            ...config.timeoutDurations,
                            second: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1m</span>
                      <span>10m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm">
                      3rd Violation:{" "}
                      {formatDuration(config.timeoutDurations.third)}
                    </label>
                    <input
                      type="range"
                      min="300"
                      max="3600"
                      step="300"
                      value={config.timeoutDurations.third}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          timeoutDurations: {
                            ...config.timeoutDurations,
                            third: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>5m</span>
                      <span>1h</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm">
                      4th Violation:{" "}
                      {formatDurationMinutes(config.timeoutDurations.fourth)}
                    </label>
                    <input
                      type="range"
                      min="900"
                      max="7200"
                      step="900"
                      value={config.timeoutDurations.fourth}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          timeoutDurations: {
                            ...config.timeoutDurations,
                            fourth: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>15m</span>
                      <span>120m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Max Violations Before Ban */}
              <div className="p-4 bg-[#1a1b2e]/50 rounded-lg">
                <label className="text-white font-semibold mb-2 block">
                  Max Violations Before Ban: {config.maxViolationsBeforeBan}
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="1"
                  value={config.maxViolationsBeforeBan}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxViolationsBeforeBan: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>3</span>
                  <span>10</span>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  User will be permanently banned after this many violations
                </p>
              </div>

              {/* Check AI Responses */}
              <div className="flex items-center justify-between p-4 bg-[#1a1b2e]/50 rounded-lg">
                <div>
                  <label className="text-white font-semibold">
                    Check AI Responses
                  </label>
                  <p className="text-gray-400 text-sm">
                    Filter inappropriate AI-generated responses
                  </p>
                </div>
                <button
                  onClick={() =>
                    setConfig({
                      ...config,
                      checkAIResponses: !config.checkAIResponses,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.checkAIResponses ? "bg-[#00ffff]" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.checkAIResponses
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Log All Actions */}
              <div className="flex items-center justify-between p-4 bg-[#1a1b2e]/50 rounded-lg">
                <div>
                  <label className="text-white font-semibold">
                    Log All Actions
                  </label>
                  <p className="text-gray-400 text-sm">
                    Log all moderation actions to database for audit
                  </p>
                </div>
                <button
                  onClick={() =>
                    setConfig({
                      ...config,
                      logAllActions: !config.logAllActions,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.logAllActions ? "bg-[#00ffff]" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.logAllActions ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 items-stretch">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white rounded-lg hover:opacity-90 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            <button
              onClick={handleReset}
              className="px-2 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-semibold flex items-center"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default TwitchModerationSettings;
