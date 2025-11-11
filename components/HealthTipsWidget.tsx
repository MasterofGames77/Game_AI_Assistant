import React from "react";
import { HealthTipsWidgetProps } from "../types";

const HealthTipsWidget: React.FC<HealthTipsWidgetProps> = ({
  tips,
  onDismiss,
}) => {
  if (!tips || tips.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed w-auto max-w-md bg-[#1a1a2e]/95 backdrop-blur-sm shadow-xl rounded-lg pointer-events-auto flex flex-col p-4 border border-[#00ffff]/30 z-50"
      style={{
        top: "15%",
        right: "40px",
        maxHeight: "calc(85vh - 15%)", // Ensure it doesn't extend too far down
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className="text-2xl mr-2">💡</span>
          <div>
            <p className="text-sm font-bold text-[#00ffff]">Health Tips</p>
            <p className="text-xs text-gray-300">
              Quick tips for healthy gaming
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="ml-2 text-gray-400 hover:text-white text-lg font-bold transition-colors"
        >
          ×
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-200 space-y-1">
        {tips.map((tip, index) => (
          <p key={index} className="leading-relaxed">
            {tip}
          </p>
        ))}
      </div>
    </div>
  );
};

export default HealthTipsWidget;
