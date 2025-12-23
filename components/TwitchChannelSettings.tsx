"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  TwitchChannelSettingsProps,
  type TwitchChannelSettings,
} from "../types";

const TwitchChannelSettings: React.FC<TwitchChannelSettingsProps> = ({
  channelName,
  onClose,
}) => {
  const [settings, setSettings] = useState<Partial<TwitchChannelSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newPrefix, setNewPrefix] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get("/api/twitchBot/channelSettings", {
          params: { channelName },
        });

        if (response.data.success && response.data.settings) {
          setSettings(response.data.settings);
        } else {
          // Use defaults if no settings exist
          setSettings({
            commandPrefixes: ["!wingman", "!hgwm"],
            botMentionEnabled: true,
            botMentionName: "herogamewingman",
            rateLimitWindowMs: 60000,
            maxMessagesPerWindow: 10,
            responseStyle: "mention",
            mentionUserInFirstMessage: true,
            maxMessageLength: 500,
            cacheEnabled: true,
            cacheTTLMs: 300000,
          });
        }
      } catch (err: any) {
        console.error("Error fetching settings:", err);
        setError(err.response?.data?.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [channelName]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await axios.put("/api/twitchBot/channelSettings", {
        channelName,
        settings,
      });

      if (response.data.success) {
        setSuccess("Settings saved successfully!");
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setError(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrefix = () => {
    if (newPrefix.trim() && !newPrefix.startsWith("!")) {
      const prefix = `!${newPrefix.trim()}`;
      if (!settings.commandPrefixes?.includes(prefix)) {
        setSettings({
          ...settings,
          commandPrefixes: [...(settings.commandPrefixes || []), prefix],
        });
        setNewPrefix("");
      }
    } else if (newPrefix.trim().startsWith("!")) {
      const prefix = newPrefix.trim();
      if (!settings.commandPrefixes?.includes(prefix)) {
        setSettings({
          ...settings,
          commandPrefixes: [...(settings.commandPrefixes || []), prefix],
        });
        setNewPrefix("");
      }
    }
  };

  const handleRemovePrefix = (prefix: string) => {
    setSettings({
      ...settings,
      commandPrefixes:
        settings.commandPrefixes?.filter((p) => p !== prefix) || [],
    });
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${ms / 1000}s`;
    return `${ms / 60000}min`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="mt-2 text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          Channel Settings: #{channelName}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
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
        )}
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

      <div className="space-y-6">
        {/* Command Prefixes */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">
            Command Prefixes
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            Commands users can use to interact with the bot (must start with !)
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {settings.commandPrefixes?.map((prefix) => (
              <span
                key={prefix}
                className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-lg flex items-center gap-2"
              >
                {prefix}
                <button
                  onClick={() => handleRemovePrefix(prefix)}
                  className="text-purple-300 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPrefix}
              onChange={(e) => setNewPrefix(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPrefix()}
              placeholder="!customcommand"
              className=" px-6 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
            <button
              onClick={handleAddPrefix}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Bot Mention */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Bot Mention</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.botMentionEnabled || false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    botMentionEnabled: e.target.checked,
                  })
                }
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-white">Enable bot mentions (@botname)</span>
            </label>
            {settings.botMentionEnabled && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Bot Mention Name
                </label>
                <input
                  type="text"
                  value={settings.botMentionName || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      botMentionName: e.target.value.toLowerCase(),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-600"
                  placeholder="herogamewingman"
                />
              </div>
            )}
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">
            Rate Limiting
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Rate Limit Window:{" "}
                {formatTime(settings.rateLimitWindowMs || 60000)}
              </label>
              <input
                type="range"
                min="10000"
                max="300000"
                step="10000"
                value={settings.rateLimitWindowMs || 60000}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateLimitWindowMs: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10s</span>
                <span>5min</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Max Messages Per Window: {settings.maxMessagesPerWindow || 10}
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={settings.maxMessagesPerWindow || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxMessagesPerWindow: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Response Style */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">
            Response Style
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Response Format
              </label>
              <select
                value={settings.responseStyle || "mention"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    responseStyle: e.target.value as
                      | "mention"
                      | "no-mention"
                      | "compact",
                  })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-600"
              >
                <option value="mention">Always mention user</option>
                <option value="no-mention">Never mention user</option>
                <option value="compact">Compact (minimal formatting)</option>
              </select>
            </div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.mentionUserInFirstMessage !== false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    mentionUserInFirstMessage: e.target.checked,
                  })
                }
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-white">
                Mention user in first message of multi-part responses
              </span>
            </label>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Max Message Length: {settings.maxMessageLength || 500}{" "}
                characters
              </label>
              <input
                type="range"
                min="100"
                max="500"
                step="50"
                value={settings.maxMessageLength || 500}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxMessageLength: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>100</span>
                <span>500 (Twitch limit)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cache Settings */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">
            Cache Settings
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.cacheEnabled !== false}
                onChange={(e) =>
                  setSettings({ ...settings, cacheEnabled: e.target.checked })
                }
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-white">Enable response caching</span>
            </label>
            {settings.cacheEnabled !== false && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Cache TTL: {formatTime(settings.cacheTTLMs || 300000)}
                </label>
                <input
                  type="range"
                  min="60000"
                  max="3600000"
                  step="60000"
                  value={settings.cacheTTLMs || 300000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cacheTTLMs: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1min</span>
                  <span>1hr</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Custom System Message */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">
            Custom System Message (Advanced)
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            Override the default AI system message. Leave empty to use default.
          </p>
          <textarea
            value={settings.customSystemMessage || ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                customSystemMessage: e.target.value || undefined,
              })
            }
            rows={4}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 resize-none"
            placeholder="You are Hero Game Wingman, a helpful AI assistant..."
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default TwitchChannelSettings;
