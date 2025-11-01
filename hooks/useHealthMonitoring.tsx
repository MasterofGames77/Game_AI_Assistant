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
  // Persisted remaining time across full page close/open
  const remainingSecondsOverrideRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number | null>(null);

  // Function to start a new session (only called for truly new sessions)
  const startSession = async () => {
    if (!username) return;

    const now = new Date();

    // If we already have a remaining seconds override from localStorage, preserve it
    // Don't recalculate based on lastBreakTime if we have a saved countdown
    if (remainingSecondsOverrideRef.current !== null) {
      console.log(
        "Resuming session with saved remaining time:",
        remainingSecondsOverrideRef.current,
        "seconds - skipping startSession API call"
      );
      // Just ensure we have basic session refs set
      if (!sessionStartTimeRef.current) {
        sessionStartTimeRef.current = now;
      }
      if (!lastActiveTimeRef.current) {
        lastActiveTimeRef.current = now;
      }
      return; // Don't call API - we're resuming, not starting fresh
    }

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
          return; // Don't call API - user is on break
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
              lastBreakTime.toISOString(),
              "- skipping startSession API call"
            );
            console.log(
              "Time since last break:",
              Math.floor(timeSinceLastBreak / (1000 * 60)),
              "minutes"
            );
            return; // Don't call API - we're resuming, not starting fresh
          }
        }

        // If there's an existing session start time on the server (within 24 hours), we're resuming
        if (data.lastSessionStart) {
          const lastSessionStart = new Date(data.lastSessionStart);
          const timeSinceSessionStart =
            now.getTime() - lastSessionStart.getTime();

          // If session is still active (less than 24 hours old), we're resuming
          if (timeSinceSessionStart < 24 * 60 * 60 * 1000) {
            console.log(
              "Resuming existing session from:",
              lastSessionStart.toISOString(),
              "- skipping startSession API call"
            );
            // Initialize local refs based on server data
            if (!sessionStartTimeRef.current) {
              sessionStartTimeRef.current = lastSessionStart;
            }
            if (!lastActiveTimeRef.current) {
              lastActiveTimeRef.current = now;
            }
            if (data.lastBreakTime && !lastBreakTimeRef.current) {
              lastBreakTimeRef.current = new Date(data.lastBreakTime);
            }
            return; // Don't call API - we're resuming, not starting fresh
          }
        }
      }
    } catch (error) {
      console.error("Error checking existing session:", error);
      // On error, proceed to start new session
    }

    // Only start a truly fresh session (no existing session data found)
    console.log("Starting fresh session - calling startSession API");
    sessionStartTimeRef.current = now;
    lastActiveTimeRef.current = now;
    accumulatedSessionTimeRef.current = 0;
    lastBreakTimeRef.current = null;
    sessionPausedTimeRef.current = null;

    try {
      // Only notify server for a truly new session
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
  // const updateLastActiveTime = () => {
  //   lastActiveTimeRef.current = new Date();
  // };

  // Function to update timer locally (real-time countdown)
  const updateTimerLocally = () => {
    if (!username || !isEnabled) return;

    // If we have an override (from a prior close), count down only while page is open
    if (remainingSecondsOverrideRef.current !== null) {
      const nowMs = Date.now();
      if (isPageVisibleRef.current) {
        if (lastTickAtRef.current === null) lastTickAtRef.current = nowMs;
        const deltaSec = Math.max(
          0,
          Math.floor((nowMs - lastTickAtRef.current) / 1000)
        );
        if (deltaSec > 0) {
          remainingSecondsOverrideRef.current = Math.max(
            0,
            remainingSecondsOverrideRef.current - deltaSec
          );
          lastTickAtRef.current = nowMs;
        }
      } else {
        // Not visible, don't change remaining seconds
        lastTickAtRef.current = nowMs;
      }

      const nextBreakIn = Math.ceil(remainingSecondsOverrideRef.current / 60);
      const shouldShowBreak = nextBreakIn === 0;

      setHealthStatus((prev) => ({
        ...prev,
        shouldShowBreak,
        timeSinceLastBreak: shouldShowBreak
          ? breakIntervalMinutesRef.current
          : breakIntervalMinutesRef.current - nextBreakIn,
        nextBreakIn,
      }));

      return;
    }

    // No override: Calculate time since last break locally
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

    // Store the calculated remaining time in override ref so it can be saved on unmount
    // Convert nextBreakIn (minutes) to seconds for consistency
    remainingSecondsOverrideRef.current = nextBreakIn * 60;

    // Debug logging
    // console.log("Timer update:", {
    //   timeSinceLastBreak,
    //   breakInterval: breakIntervalMinutesRef.current,
    //   nextBreakIn,
    //   shouldShowBreak,
    //   lastBreakTime: lastBreakTimeRef.current?.toISOString(),
    //   sessionStart: sessionStartTimeRef.current?.toISOString(),
    //   remainingSeconds: remainingSecondsOverrideRef.current,
    // });

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

      // If we have an override remaining time, don't overwrite countdown here
      if (remainingSecondsOverrideRef.current !== null) {
        // Keep breakCount / flags in sync though
        setHealthStatus((prev) => ({
          ...prev,
          breakCount: data.breakCount,
          isMonitoring: true,
          isOnBreak: data.isOnBreak,
          breakStartTime: data.breakStartTime,
        }));
      } else {
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
      }

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
        // Clear any persisted remaining time since a new break started
        remainingSecondsOverrideRef.current = null;
        try {
          if (username)
            localStorage.removeItem(`vgw_health_remaining_${username}`);
        } catch (e) {}

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
        // Clear persisted remaining time; countdown restarts after break
        remainingSecondsOverrideRef.current = null;
        try {
          if (username)
            localStorage.removeItem(`vgw_health_remaining_${username}`);
        } catch (e) {}

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

    // Restore remaining time override from previous close, if present
    try {
      const key = `vgw_health_remaining_${username}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const remainingSec = Math.max(0, parseInt(stored, 10));
        if (!Number.isNaN(remainingSec) && remainingSec > 0) {
          remainingSecondsOverrideRef.current = remainingSec;
          lastTickAtRef.current = Date.now();
          console.log(
            "Restored remaining time from localStorage:",
            remainingSec,
            "seconds"
          );
        }
      }
    } catch (e) {}

    // Start a new session (only informs server; our override governs countdown if present)
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

    // If we restored a remaining time override, update the timer IMMEDIATELY
    // before checkHealthStatus runs, so the state is correct when checkHealthStatus preserves it
    if (remainingSecondsOverrideRef.current !== null) {
      updateTimerLocally();
    }

    // Check immediately on first load (but only after we've set the override state if it exists)
    // Delay checkHealthStatus slightly if we have an override to ensure updateTimerLocally runs first
    if (remainingSecondsOverrideRef.current !== null) {
      // Use setTimeout to ensure updateTimerLocally state update has been applied
      setTimeout(() => {
        checkHealthStatus();
      }, 0);
    } else {
      checkHealthStatus();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // Persist remaining time override on navigation unmount as well
      try {
        if (username) {
          const key = `vgw_health_remaining_${username}`;
          let remainingSec = remainingSecondsOverrideRef.current;

          // If we don't have an override, calculate remaining time from current state
          if (remainingSec === null) {
            // Calculate based on current timer state using refs
            if (lastBreakTimeRef.current) {
              const timeSinceBreak =
                Date.now() - lastBreakTimeRef.current.getTime();
              const timeSinceBreakMinutes = Math.floor(
                timeSinceBreak / (1000 * 60)
              );
              const remainingMinutes = Math.max(
                0,
                breakIntervalMinutesRef.current - timeSinceBreakMinutes
              );
              remainingSec = remainingMinutes * 60;
            } else if (
              sessionStartTimeRef.current &&
              lastActiveTimeRef.current
            ) {
              // Calculate current session time
              const baseTime = accumulatedSessionTimeRef.current;
              let currentSessionTime = baseTime;
              if (lastActiveTimeRef.current && isPageVisibleRef.current) {
                const now = new Date();
                currentSessionTime =
                  baseTime +
                  (now.getTime() - lastActiveTimeRef.current.getTime());
              }
              const sessionTimeMinutes = Math.floor(
                currentSessionTime / (1000 * 60)
              );
              const remainingMinutes = Math.max(
                0,
                breakIntervalMinutesRef.current - sessionTimeMinutes
              );
              remainingSec = remainingMinutes * 60;
            }
          }

          // Only save if we have a valid remaining time > 0
          if (remainingSec !== null && remainingSec > 0) {
            localStorage.setItem(key, String(remainingSec));
            console.log(
              "Saving remaining time to localStorage:",
              remainingSec,
              "seconds (",
              Math.floor(remainingSec / 60),
              "minutes)"
            );
          } else {
            // Clear localStorage if no remaining time
            localStorage.removeItem(key);
            console.log("Clearing localStorage - no remaining time to save");
          }
        }
      } catch (e) {
        console.error("Error saving remaining time to localStorage:", e);
      }
      setHealthStatus((prev) => ({ ...prev, isMonitoring: false }));
      // Do not end the session on unmount due to in-app navigation.
      // Session end is handled on full unload or explicit logout.
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
      // Persist the current remaining time so we resume from exactly where it was
      try {
        if (username) {
          // Prefer override value if present; otherwise compute from current state
          let remainingSec = remainingSecondsOverrideRef.current;
          if (remainingSec === null) {
            const next =
              healthStatus.nextBreakIn ??
              Math.max(0, breakIntervalMinutesRef.current);
            remainingSec = Math.max(0, Math.round(next * 60));
          }
          localStorage.setItem(
            `vgw_health_remaining_${username}`,
            String(remainingSec)
          );
        }
      } catch (e) {}
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
