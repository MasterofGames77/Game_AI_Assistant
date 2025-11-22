"use client";

import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export default function DarkModeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);

    // Get saved theme preference from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme | null;

    if (
      savedTheme &&
      (savedTheme === "light" ||
        savedTheme === "dark" ||
        savedTheme === "system")
    ) {
      setTheme(savedTheme);

      // Apply theme based on saved preference
      if (savedTheme === "system") {
        const systemPrefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        applyTheme(systemPrefersDark ? "dark" : "light");
      } else {
        applyTheme(savedTheme);
      }
    } else {
      // No saved preference, use system preference
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      applyTheme(systemPrefersDark ? "dark" : "light");
    }
  }, []);

  // Listen for system theme changes when theme is set to "system"
  useEffect(() => {
    if (theme !== "system" || !mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? "dark" : "light");
    };

    // Set initial system preference
    applyTheme(mediaQuery.matches ? "dark" : "light");

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme, mounted]);

  const applyTheme = (themeToApply: "light" | "dark") => {
    const root = document.documentElement;
    if (themeToApply === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "system") {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      applyTheme(systemPrefersDark ? "dark" : "light");
    } else {
      applyTheme(newTheme);
    }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="w-full px-3 py-2 bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full mb-4">
      <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
        Theme
      </div>
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => handleThemeChange("light")}
          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            theme === "light"
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white hover:bg-gray-700"
          }`}
          title="Light mode"
        >
          ☀️ Light
        </button>
        <button
          onClick={() => handleThemeChange("dark")}
          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            theme === "dark"
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white hover:bg-gray-700"
          }`}
          title="Dark mode"
        >
          🌙 Dark
        </button>
        <button
          onClick={() => handleThemeChange("system")}
          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            theme === "system"
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white hover:bg-gray-700"
          }`}
          title="System preference"
        >
          💻 System
        </button>
      </div>
    </div>
  );
}
