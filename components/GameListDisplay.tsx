"use client";

import React from "react";
import { GameTracking } from "../types";

interface GameListDisplayProps {
  gameTracking?: GameTracking;
  className?: string;
}

const GameListDisplay: React.FC<GameListDisplayProps> = ({
  gameTracking,
  className = "",
}) => {
  if (!gameTracking) {
    return null;
  }

  const wishlist = gameTracking.wishlist || [];
  const currentlyPlaying = gameTracking.currentlyPlaying || [];

  if (wishlist.length === 0 && currentlyPlaying.length === 0) {
    return null;
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Currently Playing */}
      {currentlyPlaying.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[#00ffff] mb-2 flex items-center gap-2">
            <span>🎮</span>
            Currently Playing
          </h4>
          <div className="space-y-1">
            {currentlyPlaying.slice(0, 5).map((game, index) => (
              <div
                key={index}
                className="text-sm text-gray-300 flex items-center justify-between"
              >
                <span className="truncate flex-1">{game.gameName}</span>
                {game.startedAt && (
                  <span className="text-xs text-gray-500 ml-2">
                    {formatDate(game.startedAt)}
                  </span>
                )}
              </div>
            ))}
            {currentlyPlaying.length > 5 && (
              <p className="text-xs text-gray-500">
                +{currentlyPlaying.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Wishlist */}
      {wishlist.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[#00ffff] mb-2 flex items-center gap-2">
            <span>⭐</span>
            Wishlist
          </h4>
          <div className="space-y-1">
            {wishlist.slice(0, 5).map((game, index) => (
              <div
                key={index}
                className="text-sm text-gray-300 flex items-center justify-between"
              >
                <span className="truncate flex-1">{game.gameName}</span>
                {game.addedAt && (
                  <span className="text-xs text-gray-500 ml-2">
                    {formatDate(game.addedAt)}
                  </span>
                )}
              </div>
            ))}
            {wishlist.length > 5 && (
              <p className="text-xs text-gray-500">
                +{wishlist.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameListDisplay;

