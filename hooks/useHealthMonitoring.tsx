import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { HealthMonitoringProps, HealthStatus } from "../types";

const useHealthMonitoring = ({
  username,
  isEnabled,
  checkInterval = 60000, // 1 minute
}: HealthMonitoringProps) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    shouldShowBreak: false,
    timeSinceLastBreak: 0,
    breakCount: 0,
    isMonitoring: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null); // For real-time countdown
  const lastReminderTimeRef = useRef<Date | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const lastActiveTimeRef = useRef<Date | null>(null);
  const isPageVisibleRef = useRef<boolean>(true);
  const accumulatedSessionTimeRef = useRef<number>(0); // Track accumulated session time
  const lastBreakTimeRef = useRef<Date | null>(null); // Track when last break was taken
  const sessionPausedTimeRef = useRef<Date | null>(null); // Track when session was paused
  const breakIntervalMinutesRef = useRef<number>(45); // Store break interval for local calculations

  // Function to start a new session
  const startSession = async () => {
    if (!username) return;

    const now = new Date();

    try {
      // Check if there's an existing session to resume
      const response = await fetch("/api/health/checkStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        const data = await response.json();

        // If user is on a break, don't start a new session
        if (data.isOnBreak) {
          sessionStartTimeRef.current = null;
          lastActiveTimeRef.current = null;
          accumulatedSessionTimeRef.current = 0;
          return;
        }

        // Check if we should resume from last break time
        if (data.lastBreakTime) {
          const lastBreakTime = new Date(data.lastBreakTime);
          const timeSinceLastBreak = now.getTime() - lastBreakTime.getTime();

          // If it's been less than 24 hours since last break, resume session
          if (timeSinceLastBreak < 24 * 60 * 60 * 1000) {
            lastBreakTimeRef.current = lastBreakTime;
            sessionStartTimeRef.current = lastBreakTime;
            lastActiveTimeRef.current = now;
            accumulatedSessionTimeRef.current = timeSinceLastBreak;

            console.log(
              "Resuming session from last break time:",
              lastBreakTime.toISOString()
            );
            console.log(
              "Time since last break:",
              Math.floor(timeSinceLastBreak / (1000 * 60)),
              "minutes"
            );
            return;
          }
        }
      }
    } catch (error) {
      console.error("Error checking existing session:", error);
    }

    // Start fresh session
    sessionStartTimeRef.current = now;
    lastActiveTimeRef.current = now;
    accumulatedSessionTimeRef.current = 0;
    lastBreakTimeRef.current = null;
    sessionPausedTimeRef.current = null;

    try {
      // Notify server that session started
      await fetch("/api/health/startSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, sessionStartTime: now.toISOString() }),
      });
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  // Function to pause session (when page becomes hidden)
  const pauseSession = () => {
    if (!sessionStartTimeRef.current || !lastActiveTimeRef.current) return;

    const now = new Date();
    const sessionDuration = now.getTime() - lastActiveTimeRef.current.getTime();
    accumulatedSessionTimeRef.current += sessionDuration;
    sessionPausedTimeRef.current = now;
    lastActiveTimeRef.current = null; // Mark as paused
  };

  // Function to resume session (when page becomes visible)
  const resumeSession = () => {
    if (!sessionStartTimeRef.current) return;

    // Only resume if we were actually paused (not just tab switching)
    if (sessionPausedTimeRef.current) {
      const pauseDuration =
        new Date().getTime() - sessionPausedTimeRef.current.getTime();

      // If paused for more than 5 minutes, consider it a real pause
      if (pauseDuration > 5 * 60 * 1000) {
        console.log(
          "Session was paused for",
          Math.floor(pauseDuration / (1000 * 60)),
          "minutes"
        );
      }
    }

    lastActiveTimeRef.current = new Date();
    sessionPausedTimeRef.current = null;
  };

  // Function to get current session time (only counting visible time)
  const getCurrentSessionTime = (): number => {
    if (!sessionStartTimeRef.current) return 0;

    const baseTime = accumulatedSessionTimeRef.current;
    if (lastActiveTimeRef.current && isPageVisibleRef.current) {
      const now = new Date();
      return baseTime + (now.getTime() - lastActiveTimeRef.current.getTime());
    }
    return baseTime;
  };

  // Function to end the current session
  const endSession = async () => {
    if (!username || !sessionStartTimeRef.current) return;

    // Calculate final session duration using accumulated time
    const finalSessionTime = getCurrentSessionTime();
    const sessionDurationMinutes = Math.floor(finalSessionTime / (1000 * 60));

    try {
      // Notify server that session ended
      await fetch("/api/health/endSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          sessionEndTime: new Date().toISOString(),
          sessionDuration: sessionDurationMinutes,
        }),
      });
    } catch (error) {
      console.error("Error ending session:", error);
    } finally {
      // Reset session tracking
      sessionStartTimeRef.current = null;
      lastActiveTimeRef.current = null;
      accumulatedSessionTimeRef.current = 0;
    }
  };

  // Function to update last active time
  const updateLastActiveTime = () => {
    lastActiveTimeRef.current = new Date();
  };

  // Function to update timer locally (real-time countdown)
  const updateTimerLocally = () => {
    if (!username || !isEnabled) return;

    // Calculate time since last break locally
    let timeSinceLastBreak = 0;
    if (lastBreakTimeRef.current) {
      const timeSinceBreak =
        new Date().getTime() - lastBreakTimeRef.current.getTime();
      timeSinceLastBreak = Math.floor(timeSinceBreak / (1000 * 60));
    } else if (sessionStartTimeRef.current) {
      const currentSessionTime = getCurrentSessionTime();
      timeSinceLastBreak = Math.floor(currentSessionTime / (1000 * 60));
    }

    const shouldShowBreak =
      timeSinceLastBreak >= breakIntervalMinutesRef.current;
    const nextBreakIn = shouldShowBreak
      ? 0
      : Math.max(0, breakIntervalMinutesRef.current - timeSinceLastBreak);

    // Debug logging
    console.log("Timer update:", {
      timeSinceLastBreak,
      breakInterval: breakIntervalMinutesRef.current,
      nextBreakIn,
      shouldShowBreak,
      lastBreakTime: lastBreakTimeRef.current?.toISOString(),
      sessionStart: sessionStartTimeRef.current?.toISOString(),
    });

    setHealthStatus((prev) => ({
      ...prev,
      shouldShowBreak: shouldShowBreak,
      timeSinceLastBreak: timeSinceLastBreak,
      nextBreakIn: nextBreakIn,
    }));
  };

  // Function to check health status
  const checkHealthStatus = async () => {
    if (!username || !isEnabled) return;

    try {
      const response = await fetch("/api/health/checkStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        console.warn("Failed to check health status:", response.statusText);
        return;
      }

      const data = await response.json();

      // Store break interval for local calculations
      breakIntervalMinutesRef.current = data.breakIntervalMinutes || 45;

      // Update break time references from server data
      if (data.lastBreakTime && !lastBreakTimeRef.current) {
        lastBreakTimeRef.current = new Date(data.lastBreakTime);
      }

      // Calculate session-based time instead of using server time
      const currentSessionTime = getCurrentSessionTime();
      const sessionTimeMinutes = Math.floor(currentSessionTime / (1000 * 60));

      // Calculate time since last break (either from session or server data)
      let timeSinceLastBreak = 0;
      if (data.isOnBreak) {
        timeSinceLastBreak = 0;
      } else if (lastBreakTimeRef.current) {
        // Use local break time if available
        const timeSinceBreak =
          new Date().getTime() - lastBreakTimeRef.current.getTime();
        timeSinceLastBreak = Math.floor(timeSinceBreak / (1000 * 60));
      } else if (data.lastBreakTime) {
        // Fall back to server data
        const timeSinceBreak =
          new Date().getTime() - new Date(data.lastBreakTime).getTime();
        timeSinceLastBreak = Math.floor(timeSinceBreak / (1000 * 60));
      } else {
        // Use session time if no break time available
        timeSinceLastBreak = sessionTimeMinutes;
      }

      const shouldShowBreak =
        !data.isOnBreak &&
        timeSinceLastBreak >= breakIntervalMinutesRef.current;

      setHealthStatus({
        shouldShowBreak: shouldShowBreak,
        timeSinceLastBreak: timeSinceLastBreak,
        nextBreakIn: shouldShowBreak
          ? 0
          : Math.max(0, breakIntervalMinutesRef.current - timeSinceLastBreak),
        breakCount: data.breakCount,
        isMonitoring: true,
        isOnBreak: data.isOnBreak,
        breakStartTime: data.breakStartTime,
      });

      // Show break reminder if needed
      if (shouldShowBreak && data.showReminder) {
        showBreakReminder(data.healthTips);
      }
    } catch (error) {
      console.error("Error checking health status:", error);
    }
  };

  // Function to show break reminder
  const showBreakReminder = (healthTips: string[] = []) => {
    const now = new Date();

    // Prevent spam - only show if it's been at least 5 minutes since last reminder
    if (lastReminderTimeRef.current) {
      const timeSinceLastReminder =
        now.getTime() - lastReminderTimeRef.current.getTime();
      if (timeSinceLastReminder < 5 * 60 * 1000) {
        // 5 minutes
        return;
      }
    }

    lastReminderTimeRef.current = now;

    // Show break reminder toast
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } w-auto max-w-md bg-gradient-to-r from-green-600 to-blue-600 shadow-xl rounded-lg pointer-events-auto flex flex-col p-4 border border-green-400`}
          style={{
            position: "fixed",
            top: "60px",
            right: "20px",
            zIndex: 9999,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-2xl mr-2">⏰</span>
              <div>
                <p className="text-sm font-bold text-white">
                  Time for a Break!
                </p>
                <p className="text-xs text-white opacity-90">
                  You've been gaming for a while. Take a quick break!
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                recordBreak();
              }}
              className="ml-2 text-white hover:text-gray-200 text-lg font-bold"
            >
              ×
            </button>
          </div>

          {healthTips.length > 0 && (
            <div className="mt-2 text-xs text-white opacity-90">
              <p className="font-semibold mb-1">💡 Health Tips:</p>
              {healthTips.map((tip, index) => (
                <p key={index} className="mb-1">
                  {tip}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                recordBreak();
              }}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded transition-colors"
            >
              I Took a Break
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                snoozeReminder();
              }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2 px-3 rounded transition-colors"
            >
              Remind Later
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000, // 10 seconds
        position: "top-center",
      }
    );
  };

  // Function to start a break
  const recordBreak = async () => {
    try {
      const response = await fetch("/api/health/recordBreak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        // Update break time but don't reset session timer
        lastBreakTimeRef.current = new Date();

        // Update local state to show break started
        setHealthStatus((prev) => ({
          ...prev,
          shouldShowBreak: false,
          isOnBreak: true,
          breakStartTime: new Date(),
        }));

        // Show confirmation
        toast.success(
          "Break started! Take your time and come back when you're ready! 🎮",
          {
            duration: 3000,
            position: "top-center",
          }
        );
      }
    } catch (error) {
      console.error("Error starting break:", error);
    }
  };

  // Function to end a break
  const endBreak = async () => {
    try {
      const response = await fetch("/api/health/endBreak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update break time but don't reset session timer
        lastBreakTimeRef.current = new Date();

        // Update local state
        setHealthStatus((prev) => ({
          ...prev,
          isOnBreak: false,
          breakStartTime: undefined,
          breakCount: data.breakCount,
          timeSinceLastBreak: 0,
        }));

        // Show confirmation
        toast.success("Welcome back! Break completed successfully! 🎮", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("Error ending break:", error);
    }
  };

  // Function to snooze reminder
  const snoozeReminder = async () => {
    try {
      const response = await fetch("/api/health/snoozeReminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        toast.success("Reminder snoozed for 15 minutes", {
          duration: 2000,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("Error snoozing reminder:", error);
    }
  };

  // Start monitoring when username is available and enabled
  useEffect(() => {
    if (!username || !isEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setHealthStatus((prev) => ({ ...prev, isMonitoring: false }));
      return;
    }

    // Start a new session
    startSession();

    // Start monitoring
    setHealthStatus((prev) => ({ ...prev, isMonitoring: true }));

    // Start API polling interval (every minute)
    intervalRef.current = setInterval(() => {
      checkHealthStatus();
    }, checkInterval);

    // Start local timer for real-time countdown (every second)
    timerIntervalRef.current = setInterval(() => {
      updateTimerLocally();
    }, 1000);

    // Check immediately on first load
    checkHealthStatus();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setHealthStatus((prev) => ({ ...prev, isMonitoring: false }));
      // End session when component unmounts
      endSession();
    };
  }, [username, isEnabled, checkInterval]);

  // Track page visibility changes (when user switches tabs or minimizes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - don't pause immediately, just track the time
        // Timer continues running even when user is in another tab
        isPageVisibleRef.current = false;
      } else {
        // Page is visible - resume if it was paused
        isPageVisibleRef.current = true;
        if (!lastActiveTimeRef.current) {
          resumeSession();
        }
      }
    };

    const handleBeforeUnload = () => {
      // Page is being unloaded - pause session but don't end it
      pauseSession();
    };

    const handleFocus = () => {
      // Page gained focus - ensure we're tracking time
      isPageVisibleRef.current = true;
      if (!lastActiveTimeRef.current) {
        resumeSession();
      }
    };

    const handleBlur = () => {
      // Page lost focus - don't pause, just mark as not visible
      isPageVisibleRef.current = false;
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      // Cleanup event listeners
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [username]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  return {
    healthStatus,
    recordBreak,
    endBreak,
    snoozeReminder,
    checkHealthStatus,
  };
};

export default useHealthMonitoring;
