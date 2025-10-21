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
  const lastReminderTimeRef = useRef<Date | null>(null);

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

      setHealthStatus({
        shouldShowBreak: data.shouldShowBreak,
        timeSinceLastBreak: data.timeSinceLastBreak,
        nextBreakIn: data.nextBreakIn,
        breakCount: data.breakCount,
        isMonitoring: true,
        isOnBreak: data.isOnBreak,
        breakStartTime: data.breakStartTime,
      });

      // Show break reminder if needed
      if (data.shouldShowBreak && data.showReminder) {
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
        setHealthStatus((prev) => ({ ...prev, isMonitoring: false }));
      }
      return;
    }

    // Start monitoring
    setHealthStatus((prev) => ({ ...prev, isMonitoring: true }));
    intervalRef.current = setInterval(checkHealthStatus, checkInterval);

    // Check immediately on first load
    checkHealthStatus();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setHealthStatus((prev) => ({ ...prev, isMonitoring: false }));
      }
    };
  }, [username, isEnabled, checkInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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
