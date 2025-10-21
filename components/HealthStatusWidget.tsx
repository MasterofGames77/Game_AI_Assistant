import React from "react";
import { HealthStatusWidgetProps } from "../types";

const HealthStatusWidget: React.FC<HealthStatusWidgetProps> = ({
  healthStatus,
  onRecordBreak,
  onEndBreak,
  onSnoozeReminder,
}) => {
  if (!healthStatus.isMonitoring) {
    return null;
  }

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // If user is on a break, show break state
  if (healthStatus.isOnBreak) {
    const breakDuration = healthStatus.breakStartTime
      ? Math.floor(
          (new Date().getTime() -
            new Date(healthStatus.breakStartTime).getTime()) /
            (1000 * 60)
        )
      : 0;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <span className="text-2xl">☕</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">On Break</h3>
              <p className="text-xs text-gray-600">
                Break duration: {formatTime(breakDuration)}
              </p>
              <p className="text-xs text-gray-500">
                Breaks taken today: {healthStatus.breakCount}
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onEndBreak}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded transition-colors"
            >
              End Break
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {healthStatus.shouldShowBreak ? (
              <span className="text-2xl">⏰</span>
            ) : (
              <span className="text-2xl">💚</span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              {healthStatus.shouldShowBreak
                ? "Time for a Break!"
                : "Gaming Health"}
            </h3>
            <p className="text-xs text-gray-600">
              {healthStatus.shouldShowBreak
                ? `You've been gaming for ${formatTime(
                    healthStatus.timeSinceLastBreak
                  )}`
                : healthStatus.nextBreakIn
                ? `Next break in ${formatTime(healthStatus.nextBreakIn)}`
                : "Take regular breaks to stay healthy!"}
            </p>
            <p className="text-xs text-gray-500">
              Breaks taken today: {healthStatus.breakCount}
            </p>
          </div>
        </div>

        {healthStatus.shouldShowBreak && (
          <div className="flex space-x-2">
            <button
              onClick={onRecordBreak}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 px-3 rounded transition-colors"
            >
              I Took a Break
            </button>
            <button
              onClick={onSnoozeReminder}
              className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-semibold py-2 px-3 rounded transition-colors"
            >
              Remind Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthStatusWidget;
