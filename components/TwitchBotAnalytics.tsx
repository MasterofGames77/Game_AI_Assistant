"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { TwitchChannel, TwitchBotAnalyticsProps, AggregatedAnalytics, ChannelStatistics } from "../types";
import { format, subDays, parseISO } from "date-fns";

type TimeRange = "7" | "30" | "custom";

const COLORS = {
  primary: "#00ffff",
  secondary: "#ff69b4",
  success: "#10b981",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};

const CHART_COLORS = ["#00ffff", "#ff69b4", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];

const TwitchBotAnalytics: React.FC<TwitchBotAnalyticsProps> = ({ className = "" }) => {
  const [channels, setChannels] = useState<TwitchChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>("7");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AggregatedAnalytics[]>([]);
  const [summaryData, setSummaryData] = useState<ChannelStatistics | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Initialize collapsed charts from localStorage if available
  const [collapsedCharts, setCollapsedCharts] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("twitchAnalyticsCollapsedCharts");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return new Set(parsed);
          }
        }
      } catch (e) {
        console.error("Error loading collapsed charts from localStorage:", e);
      }
    }
    return new Set();
  });


  // Fetch available channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await axios.get("/api/twitchBot/channels");
        const fetchedChannels = response.data.channels || [];
        setChannels(fetchedChannels);
        // Set initial channel if none is selected
        setSelectedChannel((prev) => {
          if (!prev && fetchedChannels.length > 0) {
            return fetchedChannels[0].channelName;
          }
          return prev;
        });
      } catch (err: any) {
        console.error("Error fetching channels:", err);
        setError(err.response?.data?.message || "Failed to load channels");
      }
    };
    fetchChannels();
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!selectedChannel) return;

    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      let days = 7;
      let startDate: Date;
      let endDate = new Date();

      if (timeRange === "custom") {
        if (!customStartDate || !customEndDate) {
          setError("Please select both start and end dates for custom range");
          setLoading(false);
          return;
        }
        startDate = parseISO(customStartDate);
        endDate = parseISO(customEndDate);
        days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        days = parseInt(timeRange);
        startDate = subDays(new Date(), days);
      }

      // Determine granularity based on time range
      const granularity = days <= 7 ? "hourly" : "daily";

      // Fetch channel analytics (time series data)
      const [channelResponse, summaryResponse] = await Promise.all([
        axios.get("/api/twitchBot/analytics", {
          params: {
            type: "channel",
            channelName: selectedChannel,
            days: days,
            granularity: granularity,
          },
        }),
        axios.get("/api/twitchBot/analytics", {
          params: {
            type: "summary",
            channelName: selectedChannel,
            days: days,
          },
        }),
      ]);

      if (channelResponse.data.success) {
        // Transform dates from strings to Date objects
        const transformedData = channelResponse.data.data.map((item: any) => ({
          ...item,
          date: new Date(item.date),
        }));
        setAnalyticsData(transformedData);
      }

      if (summaryResponse.data.success) {
        const summary = summaryResponse.data.summary.current;
        setSummaryData({
          ...summary,
          startDate: new Date(summary.startDate),
          endDate: new Date(summary.endDate),
        });
      }
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedChannel, timeRange, customStartDate, customEndDate]);

  // Fetch analytics when dependencies change
  useEffect(() => {
    if (selectedChannel) {
      fetchAnalytics();
    }
  }, [selectedChannel, timeRange, customStartDate, customEndDate, fetchAnalytics]);

  // Real-time updates polling
  useEffect(() => {
    if (!realTimeUpdates || !selectedChannel) return;

    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [realTimeUpdates, selectedChannel, fetchAnalytics]);

  // Handle export
  const handleExport = async () => {
    if (!selectedChannel) return;

    try {
      setExporting(true);
      
      let startDate: string | undefined;
      let endDate: string | undefined;
      
      if (timeRange === "custom") {
        if (!customStartDate || !customEndDate) {
          setError("Please select both start and end dates for custom range");
          setExporting(false);
          return;
        }
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        const days = parseInt(timeRange);
        const end = new Date();
        const start = subDays(end, days);
        startDate = format(start, "yyyy-MM-dd");
        endDate = format(end, "yyyy-MM-dd");
      }

      const response = await axios.get("/api/twitchBot/analytics", {
        params: {
          type: "export",
          channelName: selectedChannel,
          format: "json",
          startDate: startDate,
          endDate: endDate,
        },
      });

      // Create download link for JSON
      const jsonData = JSON.stringify(response.data, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `twitch-analytics-${selectedChannel}-${format(new Date(), "yyyy-MM-dd")}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error exporting analytics:", err);
      setError(err.response?.data?.message || "Failed to export analytics");
    } finally {
      setExporting(false);
    }
  };

  // Format chart data for message volume
  const messageVolumeData = analyticsData.map((item) => ({
    date: format(item.date, timeRange === "7" ? "MMM dd HH:mm" : "MMM dd"),
    hour: item.hour !== undefined ? `${item.hour}:00` : undefined,
    total: item.totalMessages,
    successful: item.successfulMessages,
    failed: item.failedMessages,
  }));

  // Format chart data for response times
  const responseTimeData = analyticsData.map((item) => ({
    date: format(item.date, timeRange === "7" ? "MMM dd HH:mm" : "MMM dd"),
    processing: item.avgProcessingTimeMs,
    aiResponse: item.avgResponseTimeMs,
    total: item.avgProcessingTimeMs + item.avgResponseTimeMs,
  }));

  // Format chart data for success/error rates
  const successErrorData = analyticsData.map((item) => ({
    date: format(item.date, timeRange === "7" ? "MMM dd HH:mm" : "MMM dd"),
    success: item.successfulMessages,
    error: item.failedMessages,
    successRate: item.totalMessages > 0 ? (item.successfulMessages / item.totalMessages) * 100 : 0,
  }));

  // Format chart data for cache hit rates
  const cacheHitData = analyticsData.map((item) => ({
    date: format(item.date, timeRange === "7" ? "MMM dd HH:mm" : "MMM dd"),
    cacheHitRate: item.cacheHitRate * 100,
  }));

  // Format chart data for user engagement
  const userEngagementData = analyticsData.map((item) => ({
    date: format(item.date, timeRange === "7" ? "MMM dd HH:mm" : "MMM dd"),
    uniqueUsers: item.uniqueUsers,
    newUsers: item.newUsers,
    returningUsers: item.returningUsers,
  }));

  // Toggle chart collapse
  const toggleChart = (chartId: string) => {
    setCollapsedCharts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chartId)) {
        newSet.delete(chartId);
      } else {
        newSet.add(chartId);
      }
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("twitchAnalyticsCollapsedCharts", JSON.stringify(Array.from(newSet)));
      }
      return newSet;
    });
  };

  // Format chart data for command usage
  const commandUsageData = summaryData
    ? [
        { name: "Help", value: summaryData.commandUsage.help, color: CHART_COLORS[0] },
        { name: "Commands", value: summaryData.commandUsage.commands, color: CHART_COLORS[1] },
        { name: "Questions", value: summaryData.commandUsage.questions, color: CHART_COLORS[2] },
      ].filter((item) => item.value > 0) // Only show slices with data
    : [];

  // Format chart data for error breakdown
  const errorBreakdownData = summaryData
    ? [
        { name: "Rate Limit", value: summaryData.errorBreakdown.rateLimit, color: "#ef4444" },
        { name: "API Error", value: summaryData.errorBreakdown.apiError, color: "#f59e0b" },
        { name: "Moderation", value: summaryData.errorBreakdown.moderation, color: "#8b5cf6" },
        { name: "Other", value: summaryData.errorBreakdown.other, color: "#6b7280" },
      ]
    : [];

  if (channels.length === 0) {
    return (
      <div className={`bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20 ${className}`}>
        <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">Twitch Bot Analytics</h2>
        <p className="text-gray-400">No channels available. Add a channel to view analytics.</p>
      </div>
    );
  }

  return (
    <div className={`bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#00ffff]">Twitch Bot Analytics</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={realTimeUpdates}
              onChange={(e) => setRealTimeUpdates(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#00ffff] focus:ring-[#00ffff]"
            />
            Real-time Updates
          </label>
          <button
            onClick={handleExport}
            disabled={exporting || !selectedChannel}
            className="px-4 py-2 bg-[#00ffff]/20 hover:bg-[#00ffff]/30 text-[#00ffff] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#00ffff] border-t-transparent rounded-full animate-spin"></div>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </>
            )}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Channel Selector */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-300 mb-2">Channel</label>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-full px-4 py-2 bg-[#1a1b2e]/50 border border-[#00ffff]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
          >
            {channels.map((channel) => (
              <option key={channel.channelName} value={channel.channelName}>
                #{channel.channelName}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range Selector */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="w-full px-4 py-2 bg-[#1a1b2e]/50 border border-[#00ffff]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Date Range */}
        {timeRange === "custom" && (
          <>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1b2e]/50 border border-[#00ffff]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
                className="w-full px-4 py-2 bg-[#1a1b2e]/50 border border-[#00ffff]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00ffff]"
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ffff]"></div>
          <p className="mt-4 text-gray-400">Loading analytics...</p>
        </div>
      ) : analyticsData.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No analytics data available for the selected time range.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summaryData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1a1b2e]/50 rounded-lg p-4 border border-[#00ffff]/20">
                <div className="text-sm text-gray-400 mb-1">Total Messages</div>
                <div className="text-2xl font-bold text-[#00ffff]">{summaryData.totalMessages.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {summaryData.successfulMessages} successful, {summaryData.failedMessages} failed
                </div>
              </div>
              <div className="bg-[#1a1b2e]/50 rounded-lg p-4 border border-[#00ffff]/20">
                <div className="text-sm text-gray-400 mb-1">Unique Users</div>
                <div className="text-2xl font-bold text-[#00ffff]">{summaryData.uniqueUsers.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {summaryData.newUsers} new, {summaryData.returningUsers} returning
                </div>
              </div>
              <div className="bg-[#1a1b2e]/50 rounded-lg p-4 border border-[#00ffff]/20">
                <div className="text-sm text-gray-400 mb-1">Avg Response Time</div>
                <div className="text-2xl font-bold text-[#00ffff]">{summaryData.avgResponseTimeMs}ms</div>
                <div className="text-xs text-gray-500 mt-1">
                  Processing: {summaryData.avgProcessingTimeMs}ms
                </div>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" style={{ gridAutoRows: 'min-content' }}>
            {/* Message Volume Over Time */}
            <div className={`bg-[#1a1b2e]/50 rounded-lg border border-[#00ffff]/20 transition-all ${collapsedCharts.has("messageVolume") ? "p-3 self-start h-fit" : "p-4"}`}>
              <div className={`flex items-center justify-between ${collapsedCharts.has("messageVolume") ? "mb-0" : "mb-4"}`}>
                <h3 className="text-lg font-semibold text-white">Message Volume Over Time</h3>
                <button
                  onClick={() => toggleChart("messageVolume")}
                  className="text-[#00ffff] hover:text-[#00ffff]/80 transition-colors"
                  aria-label={collapsedCharts.has("messageVolume") ? "Expand chart" : "Collapse chart"}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${collapsedCharts.has("messageVolume") ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {!collapsedCharts.has("messageVolume") && (
                <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={messageVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1b2e", border: "1px solid #00ffff", borderRadius: "8px" }}
                    labelStyle={{ color: "#00ffff" }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="total" stackId="1" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="successful" stackId="2" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="failed" stackId="2" stroke={COLORS.error} fill={COLORS.error} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>

            {/* Success/Error Rates */}
            <div className={`bg-[#1a1b2e]/50 rounded-lg border border-[#00ffff]/20 transition-all ${collapsedCharts.has("successError") ? "p-3 self-start h-fit" : "p-4"}`}>
              <div className={`flex items-center justify-between ${collapsedCharts.has("successError") ? "mb-0" : "mb-4"}`}>
                <h3 className="text-lg font-semibold text-white">Success/Error Rates</h3>
                <button
                  onClick={() => toggleChart("successError")}
                  className="text-[#00ffff] hover:text-[#00ffff]/80 transition-colors"
                  aria-label={collapsedCharts.has("successError") ? "Expand chart" : "Collapse chart"}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${collapsedCharts.has("successError") ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {!collapsedCharts.has("successError") && (
                <ResponsiveContainer width="100%" height={300}>
                <LineChart data={successErrorData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1b2e", border: "1px solid #00ffff", borderRadius: "8px" }}
                    labelStyle={{ color: "#00ffff" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="success" stroke={COLORS.success} strokeWidth={2} />
                  <Line type="monotone" dataKey="error" stroke={COLORS.error} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>

            {/* Average Response Times */}
            <div className={`bg-[#1a1b2e]/50 rounded-lg border border-[#00ffff]/20 transition-all ${collapsedCharts.has("responseTimes") ? "p-3 self-start h-fit" : "p-4"}`}>
              <div className={`flex items-center justify-between ${collapsedCharts.has("responseTimes") ? "mb-0" : "mb-4"}`}>
                <h3 className="text-lg font-semibold text-white">Average Response Times</h3>
                <button
                  onClick={() => toggleChart("responseTimes")}
                  className="text-[#00ffff] hover:text-[#00ffff]/80 transition-colors"
                  aria-label={collapsedCharts.has("responseTimes") ? "Expand chart" : "Collapse chart"}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${collapsedCharts.has("responseTimes") ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {!collapsedCharts.has("responseTimes") && (
                <ResponsiveContainer width="100%" height={300}>
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1b2e", border: "1px solid #00ffff", borderRadius: "8px" }}
                    labelStyle={{ color: "#00ffff" }}
                    formatter={(value: any) => {
                      const numValue = typeof value === 'number' ? value : undefined;
                      return numValue !== undefined ? `${numValue}ms` : "0ms";
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="processing" stroke={COLORS.warning} strokeWidth={2} name="Processing Time" />
                  <Line type="monotone" dataKey="aiResponse" stroke={COLORS.info} strokeWidth={2} name="AI Response Time" />
                  <Line type="monotone" dataKey="total" stroke={COLORS.primary} strokeWidth={2} name="Total Time" />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>

            {/* User Engagement */}
            <div className={`bg-[#1a1b2e]/50 rounded-lg border border-[#00ffff]/20 transition-all ${collapsedCharts.has("userEngagement") ? "p-3 self-start h-fit" : "p-4"}`}>
              <div className={`flex items-center justify-between ${collapsedCharts.has("userEngagement") ? "mb-0" : "mb-4"}`}>
                <h3 className="text-lg font-semibold text-white">User Engagement</h3>
                <button
                  onClick={() => toggleChart("userEngagement")}
                  className="text-[#00ffff] hover:text-[#00ffff]/80 transition-colors"
                  aria-label={collapsedCharts.has("userEngagement") ? "Expand chart" : "Collapse chart"}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${collapsedCharts.has("userEngagement") ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {!collapsedCharts.has("userEngagement") && (
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userEngagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1b2e", border: "1px solid #00ffff", borderRadius: "8px" }}
                    labelStyle={{ color: "#00ffff" }}
                  />
                  <Legend />
                  <Bar dataKey="uniqueUsers" fill={COLORS.primary} name="Unique Users" />
                  <Bar dataKey="newUsers" fill={COLORS.success} name="New Users" />
                  <Bar dataKey="returningUsers" fill={COLORS.info} name="Returning Users" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>

            {/* Command Usage */}
            <div className={`bg-[#1a1b2e]/50 rounded-lg border border-[#00ffff]/20 transition-all ${collapsedCharts.has("commandUsage") ? "p-3 self-start h-fit" : "p-4"}`}>
              <div className={`flex items-center justify-between ${collapsedCharts.has("commandUsage") ? "mb-0" : "mb-4"}`}>
                <h3 className="text-lg font-semibold text-white">Command Usage</h3>
                <button
                  onClick={() => toggleChart("commandUsage")}
                  className="text-[#00ffff] hover:text-[#00ffff]/80 transition-colors"
                  aria-label={collapsedCharts.has("commandUsage") ? "Expand chart" : "Collapse chart"}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${collapsedCharts.has("commandUsage") ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {!collapsedCharts.has("commandUsage") && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={commandUsageData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }: { name: string; percent: number }) => {
                        // Only show label if slice is significant (>5%) to avoid overlap
                        return percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : "";
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {commandUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1b2e", border: "1px solid #00ffff", borderRadius: "8px" }}
                      labelStyle={{ color: "#00ffff" }}
                      formatter={(value: any, name: any) => {
                        const val = typeof value === 'number' ? value : 0;
                        const label = typeof name === 'string' ? name : "";
                        const total = commandUsageData.reduce((sum, item) => sum + item.value, 0);
                        const percent = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
                        return [`${val} (${percent}%)`, label];
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => {
                        const item = commandUsageData.find((d) => d.name === value);
                        if (!item) return value;
                        const total = commandUsageData.reduce((sum, d) => sum + d.value, 0);
                        const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                        return `${value}: ${item.value} (${percent}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Cache Hit Rates */}
            <div className={`bg-[#1a1b2e]/50 rounded-lg border border-[#00ffff]/20 transition-all ${collapsedCharts.has("cacheHitRates") ? "p-3 self-start h-fit" : "p-4"}`}>
              <div className={`flex items-center justify-between ${collapsedCharts.has("cacheHitRates") ? "mb-0" : "mb-4"}`}>
                <h3 className="text-lg font-semibold text-white">Cache Hit Rates</h3>
                <button
                  onClick={() => toggleChart("cacheHitRates")}
                  className="text-[#00ffff] hover:text-[#00ffff]/80 transition-colors"
                  aria-label={collapsedCharts.has("cacheHitRates") ? "Expand chart" : "Collapse chart"}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${collapsedCharts.has("cacheHitRates") ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {!collapsedCharts.has("cacheHitRates") && (
                <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cacheHitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1b2e", border: "1px solid #00ffff", borderRadius: "8px" }}
                    labelStyle={{ color: "#00ffff" }}
                    formatter={(value: any) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return `${numValue.toFixed(1)}%`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cacheHitRate"
                    stroke={COLORS.secondary}
                    fill={COLORS.secondary}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Error Breakdown */}
          {summaryData && summaryData.errorBreakdown && (
            <div className={`mt-6 bg-[#1a1b2e]/50 rounded-lg border border-[#00ffff]/20 transition-all ${collapsedCharts.has("errorBreakdown") ? "p-3 self-start h-fit" : "p-4"}`}>
              <div className={`flex items-center justify-between ${collapsedCharts.has("errorBreakdown") ? "mb-0" : "mb-4"}`}>
                <h3 className="text-lg font-semibold text-white">Error Breakdown</h3>
                <button
                  onClick={() => toggleChart("errorBreakdown")}
                  className="text-[#00ffff] hover:text-[#00ffff]/80 transition-colors"
                  aria-label={collapsedCharts.has("errorBreakdown") ? "Expand chart" : "Collapse chart"}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${collapsedCharts.has("errorBreakdown") ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {!collapsedCharts.has("errorBreakdown") && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={errorBreakdownData.filter((item) => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value, percent }: { name: string; value: number; percent: number }) => {
                        // Only show label if slice is significant (>5%) to avoid overlap
                        return percent > 0.05 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : "";
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {errorBreakdownData.filter((item) => item.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1b2e", border: "1px solid #00ffff", borderRadius: "8px" }}
                      labelStyle={{ color: "#00ffff" }}
                      formatter={(value: any, name: any) => {
                        const val = typeof value === 'number' ? value : 0;
                        const label = typeof name === 'string' ? name : "";
                        const total = errorBreakdownData.reduce((sum, item) => sum + item.value, 0);
                        const percent = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
                        return [`${val} (${percent}%)`, label];
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => {
                        const item = errorBreakdownData.find((d) => d.name === value);
                        if (!item || item.value === 0) return value;
                        const total = errorBreakdownData.reduce((sum, d) => sum + d.value, 0);
                        const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                        return `${value}: ${item.value} (${percent}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TwitchBotAnalytics;

