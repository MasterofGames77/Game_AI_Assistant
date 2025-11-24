"use client";

import React from "react";
import Image from "next/image";
import { AvatarProps } from "../types";

const Avatar: React.FC<AvatarProps> = ({
  src,
  username,
  size = 40,
  className = "",
  onClick,
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

  const sizeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${size * 0.4}px`,
  };

  if (src) {
    return (
      <div
        className={`rounded-full overflow-hidden flex-shrink-0 ${
          onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
        } ${className}`}
        style={sizeStyle}
        onClick={onClick}
      >
        <Image
          src={src}
          alt={username ? `${username}'s avatar` : "Avatar"}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  // Fallback to initials
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white ${
        onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      } ${className}`}
      style={{
        ...sizeStyle,
        backgroundColor: username ? getColor(username) : "#6B7280",
      }}
      onClick={onClick}
    >
      {username ? getInitials(username) : "?"}
    </div>
  );
};

export default Avatar;
