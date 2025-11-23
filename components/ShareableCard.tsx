"use client";

import React from "react";
import { ShareableCardProps } from "../types";

/**
 * ShareableCard Component
 * Renders a beautiful card design for sharing Q&As
 * Designed to be converted to an image using html-to-image
 * Uses inline styles for reliable rendering in isolated containers
 */
const ShareableCard: React.FC<ShareableCardProps> = ({
  gameTitle,
  question,
  answerSnippet,
  imageUrl,
  className = "",
}) => {
  return (
    <div
      style={{
        position: "relative",
        width: "1200px",
        height: "800px",
        background:
          "linear-gradient(to bottom right, #1a1b2e, #16213e, #0f3460)",
        color: "#ffffff",
        overflow: "visible",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      id="shareable-card"
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
        }}
      >
        {/* Header Section */}
        <div style={{ marginBottom: "16px", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                background:
                  "linear-gradient(to bottom right, #22d3ee, #ec4899)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "20px", fontWeight: "bold" }}>🎮</span>
            </div>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#d1d5db",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Video Game Wingman
              </div>
            </div>
          </div>

          {/* Game Title */}
          <h1
            style={{
              fontSize: "40px",
              fontWeight: "bold",
              marginBottom: "0",
              color: "#22d3ee",
              lineHeight: "1.2",
              margin: "0",
            }}
          >
            {gameTitle}
          </h1>
        </div>

        {/* Question Section */}
        <div style={{ marginBottom: "16px", flexShrink: 0 }}>
          <div style={{ marginBottom: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Question
            </span>
          </div>
          <p
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#f3f4f6",
              lineHeight: "1.3",
              margin: 0,
            }}
          >
            {question}
          </p>
        </div>

        {/* Answer Snippet Section - Takes remaining space */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            padding: "20px",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            flex: 1,
            minHeight: 0,
            overflow: "visible",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "8px", flexShrink: 0 }}>
            <span
              style={{
                fontSize: "12px",
                color: "#22d3ee",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: "600",
              }}
            >
              Answer
            </span>
          </div>
          <p
            style={{
              fontSize: "16px",
              color: "#e5e7eb",
              lineHeight: "1.5",
              margin: 0,
              flex: 1,
              overflow: "visible",
              wordWrap: "break-word",
            }}
          >
            {answerSnippet}
          </p>
        </div>

        {/* Optional Image - Centered below response */}
        {imageUrl && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "16px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "200px",
                height: "150px",
                borderRadius: "8px",
                overflow: "hidden",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Game screenshot"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
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

export default ShareableCard;
