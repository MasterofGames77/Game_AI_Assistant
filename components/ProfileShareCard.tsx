"use client";

import React from "react";
import { ProfileShareCardProps } from "../types";

/**
 * ProfileShareCard Component
 * Renders a beautiful profile card design for sharing user stats
 * Designed to be converted to an image using html-to-image
 * Uses inline styles for reliable rendering in isolated containers
 */
const ProfileShareCard: React.FC<ProfileShareCardProps> = ({
  username,
  avatarUrl,
  favoriteGenres = [],
  achievements = [],
  streak = 0,
  currentChallenge,
  gameTracking,
  className = "",
}) => {
  // Generate initials from username
  const getInitials = (name: string): string => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate a color based on username (consistent color for same username)
  const getColor = (name: string): string => {
    if (!name) return "#6B7280";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 50%)`;
  };
  // Sort achievements (most recent or most impressive)
  const sortedAchievements = achievements.sort((a, b) => {
    // Sort by date earned (most recent first), or by name if no date
    if (a.dateEarned && b.dateEarned) {
      return (
        new Date(b.dateEarned).getTime() - new Date(a.dateEarned).getTime()
      );
    }
    return a.name.localeCompare(b.name);
  });

  // Format genres for display
  const displayGenres = favoriteGenres.slice(0, 5);

  // Calculate dynamic height based on actual content
  // This will scale up for more content and down for less content
  let calculatedHeight = 0;
  
  // Base sections (always present)
  calculatedHeight += 200; // Header (logo + avatar + username)
  calculatedHeight += 120; // Stats section (streak + achievements)
  calculatedHeight += 48; // Top padding
  calculatedHeight += 48; // Bottom padding (will be adjusted)
  
  // Favorite genres section (only if present)
  if (displayGenres.length > 0) {
    calculatedHeight += 52; // Title height
    calculatedHeight += 12; // Title margin bottom
    calculatedHeight += 40; // Tags container (approximate)
    calculatedHeight += 24; // Section margin bottom
  }
  
  // Achievements section (only if present)
  if (sortedAchievements.length > 0) {
    calculatedHeight += 52; // Title height
    calculatedHeight += 12; // Title margin bottom
    // Each achievement: 12px top + 12px bottom padding = 24px, plus 8px gap = 32px per item
    // But actual rendered height is ~48px per achievement including content
    calculatedHeight += sortedAchievements.length * 48;
    calculatedHeight += 24; // Section margin bottom
  }
  
  // Current challenge section (only if present)
  if (currentChallenge) {
    calculatedHeight += 120; // Challenge box height
    calculatedHeight += 24; // Section margin bottom
  }
  
  // Game tracking section (only if present)
  if (gameTracking) {
    const hasCurrentlyPlaying = gameTracking.currentlyPlaying && gameTracking.currentlyPlaying.length > 0;
    const hasWishlist = gameTracking.wishlist && gameTracking.wishlist.length > 0;
    
    if (hasCurrentlyPlaying || hasWishlist) {
      // Title for currently playing
      if (hasCurrentlyPlaying) {
        calculatedHeight += 52; // Title height
        calculatedHeight += 12; // Title margin bottom
        // Each game tag: ~40px height, but they wrap, so estimate based on count
        const playingCount = gameTracking.currentlyPlaying.length;
        const playingRows = Math.ceil(playingCount / 3); // Assume ~3 tags per row
        calculatedHeight += playingRows * 50;
        if (hasWishlist) {
          calculatedHeight += 16; // Margin between sections
        }
      }
      
      // Title for wishlist
      if (hasWishlist) {
        calculatedHeight += 52; // Title height
        calculatedHeight += 12; // Title margin bottom
        // Each game tag: ~40px height, but they wrap
        const wishlistCount = gameTracking.wishlist.length;
        const wishlistRows = Math.ceil(wishlistCount / 3); // Assume ~3 tags per row
        calculatedHeight += wishlistRows * 50;
      }
      
      calculatedHeight += 24; // Section margin bottom
    }
  }
  
  // Footer gradient: 8px
  calculatedHeight += 8;
  
  // Add small buffer (reduced from 150 to 50) to prevent cut-off but minimize empty space
  // Ensure minimum height for very sparse profiles
  const finalHeight = Math.max(700, calculatedHeight + 50);

  return (
    <div
      style={{
        position: "relative",
        width: "1200px",
        height: `${finalHeight}px`,
        minHeight: `${finalHeight}px`,
        background:
          "linear-gradient(to bottom right, #1a1b2e, #16213e, #0f3460)",
        color: "#ffffff",
        overflow: "visible",
        boxSizing: "border-box",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      id="profile-share-card"
      className={className}
    >
      {/* Background Pattern */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background:
            "linear-gradient(to bottom right, rgba(6, 182, 212, 0.2), rgba(236, 72, 153, 0.2))",
        }}
      ></div>

      {/* Content Container */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "48px",
          paddingBottom: "60px", // Reduced padding to minimize empty space
        }}
      >
        {/* Header Section */}
        <div style={{ marginBottom: "32px", flexShrink: 0 }}>
          <div
            style={{
              fontSize: "12px",
              color: "#d1d5db",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "12px",
            }}
          >
            Video Game Wingman
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#9ca3af",
              marginBottom: "20px",
            }}
          >
            Player Profile
          </div>

          {/* Username with Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}
          >
            {/* Avatar */}
            {avatarUrl ? (
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid #22d3ee",
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt={`${username}'s avatar`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: getColor(username),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  fontWeight: "bold",
                  color: "#ffffff",
                  flexShrink: 0,
                  border: "3px solid #22d3ee",
                }}
              >
                {getInitials(username)}
              </div>
            )}

            {/* Username */}
            <h1
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                marginBottom: "0",
                color: "#22d3ee",
                lineHeight: "1.2",
                margin: "0",
              }}
            >
              {username}
            </h1>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            marginBottom: "32px",
            flexShrink: 0,
          }}
        >
          {/* Streak Card */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              borderRadius: "12px",
              padding: "24px",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "8px",
              }}
            >
              🔥 Current Streak
            </div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                color: "#ec4899",
              }}
            >
              {streak} {streak === 1 ? "day" : "days"}
            </div>
          </div>

          {/* Achievements Count */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              borderRadius: "12px",
              padding: "24px",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "8px",
              }}
            >
              💎 Achievements
            </div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                color: "#22d3ee",
              }}
            >
              {achievements.length}
            </div>
          </div>
        </div>

        {/* Favorite Genres Section */}
        {displayGenres.length > 0 && (
          <div
            style={{
              marginBottom: "24px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "12px",
              }}
            >
              ⭐ Favorite Genres
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {displayGenres.map((genre, index) => (
                <div
                  key={index}
                  style={{
                    background: "rgba(34, 211, 238, 0.2)",
                    border: "1px solid rgba(34, 211, 238, 0.4)",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    color: "#22d3ee",
                    fontWeight: "600",
                  }}
                >
                  {genre}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements List */}
        {sortedAchievements.length > 0 && (
          <div
            style={{
              marginBottom: "24px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "12px",
              }}
            >
              🏆 Recent Achievements
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {sortedAchievements.map((achievement, index) => (
                <div
                  key={index}
                  style={{
                    background: "rgba(0, 0, 0, 0.2)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "16px",
                    color: "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>💎</span>
                  <span style={{ fontWeight: "500" }}>{achievement.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Challenge Section */}
        {currentChallenge && (
          <div
            style={{
              background: "rgba(236, 72, 153, 0.15)",
              borderRadius: "12px",
              padding: "20px",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(236, 72, 153, 0.3)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#ec4899",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              🕹 Current Challenge
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#f3f4f6",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {currentChallenge.icon && (
                <span style={{ fontSize: "24px" }}>
                  {currentChallenge.icon}
                </span>
              )}
              {currentChallenge.title}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#d1d5db",
                marginBottom:
                  currentChallenge.progress !== undefined ? "8px" : "0",
              }}
            >
              {currentChallenge.description}
            </div>
            {currentChallenge.progress !== undefined &&
              currentChallenge.target !== undefined && (
                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: "8px",
                      background: "rgba(0, 0, 0, 0.3)",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(
                          (currentChallenge.progress /
                            currentChallenge.target) *
                            100,
                          100
                        )}%`,
                        background: currentChallenge.completed
                          ? "linear-gradient(to right, #22d3ee, #ec4899)"
                          : "linear-gradient(to right, #ec4899, #f472b6)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#9ca3af",
                      fontWeight: "600",
                      minWidth: "60px",
                    }}
                  >
                    {currentChallenge.progress}/{currentChallenge.target}
                  </div>
                </div>
              )}
            {currentChallenge.completed && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                  color: "#22d3ee",
                  fontWeight: "600",
                }}
              >
                ✓ Completed!
              </div>
            )}
          </div>
        )}

        {/* Game Tracking Section */}
        {gameTracking && (gameTracking.currentlyPlaying?.length > 0 || gameTracking.wishlist?.length > 0) && (
          <div
            style={{
              marginBottom: "24px",
              flexShrink: 0,
            }}
          >
            {/* Currently Playing */}
            {gameTracking.currentlyPlaying && gameTracking.currentlyPlaying.length > 0 && (
              <div
                style={{
                  marginBottom: gameTracking.wishlist?.length > 0 ? "16px" : "0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "12px",
                  }}
                >
                  🎮 Currently Playing
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {gameTracking.currentlyPlaying.slice(0, 5).map((game, index) => (
                    <div
                      key={index}
                      style={{
                        background: "rgba(34, 211, 238, 0.2)",
                        border: "1px solid rgba(34, 211, 238, 0.4)",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        color: "#22d3ee",
                        fontWeight: "600",
                      }}
                    >
                      {game.gameName}
                    </div>
                  ))}
                  {gameTracking.currentlyPlaying.length > 5 && (
                    <div
                      style={{
                        background: "rgba(34, 211, 238, 0.1)",
                        border: "1px solid rgba(34, 211, 238, 0.3)",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        color: "#22d3ee",
                        fontWeight: "600",
                      }}
                    >
                      +{gameTracking.currentlyPlaying.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wishlist */}
            {gameTracking.wishlist && gameTracking.wishlist.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "12px",
                  }}
                >
                  ⭐ Wishlist
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {gameTracking.wishlist.slice(0, 5).map((game, index) => (
                    <div
                      key={index}
                      style={{
                        background: "rgba(236, 72, 153, 0.2)",
                        border: "1px solid rgba(236, 72, 153, 0.4)",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        color: "#ec4899",
                        fontWeight: "600",
                      }}
                    >
                      {game.gameName}
                    </div>
                  ))}
                  {gameTracking.wishlist.length > 5 && (
                    <div
                      style={{
                        background: "rgba(236, 72, 153, 0.1)",
                        border: "1px solid rgba(236, 72, 153, 0.3)",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        color: "#ec4899",
                        fontWeight: "600",
                      }}
                    >
                      +{gameTracking.wishlist.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Gradient Accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "linear-gradient(to right, #06b6d4, #ec4899, #06b6d4)",
          }}
        ></div>
      </div>
    </div>
  );
};

export default ProfileShareCard;
