"use client";

import React, { useState } from "react";
import axios from "axios";
import Image from "next/image";
import { getPasswordStrength } from "../utils/passwordUtils";

interface EarlyAccessSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetup: (username: string, password?: string) => Promise<void>;
  userEmail: string;
  userId: string;
}

const EarlyAccessSetupModal: React.FC<EarlyAccessSetupModalProps> = ({
  isOpen,
  onClose,
  onSetup,
  userEmail,
  userId,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [message, setMessage] = useState("");
  const [skipPassword, setSkipPassword] = useState(false);

  // Get password strength for UI feedback
  const passwordStrength = getPasswordStrength(password);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Username validation
    if (!username) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters long";
    } else if (username.length > 32) {
      newErrors.username = "Username must be 32 characters or less";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username =
        "Username can only contain letters, numbers, underscores, and hyphens";
    }

    // Password validation (only if not skipping)
    if (!skipPassword) {
      if (!password) {
        newErrors.password = "Password is required";
      } else if (password.length < 8) {
        newErrors.password = "Password must be at least 8 characters long";
      } else if (password.length > 128) {
        newErrors.password = "Password must be less than 128 characters";
      } else if (!/[a-zA-Z]/.test(password)) {
        newErrors.password = "Password must contain at least one letter";
      } else if (!/\d/.test(password)) {
        newErrors.password = "Password must contain at least one number";
      }

      // Confirm password validation
      if (!confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrors({});

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      await onSetup(username, skipPassword ? undefined : password);
      setMessage(
        "Setup completed successfully! Welcome to Video Game Wingman!"
      );
      setTimeout(() => {
        onClose();
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setMessage("");
        setErrors({});
        setSkipPassword(false);
      }, 2000);
    } catch (error: any) {
      console.error("Early access setup error:", error);
      setMessage(
        error.response?.data?.message ||
          "Failed to complete setup. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setMessage("");
      setErrors({});
      setSkipPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/assets/video-game-wingman-logo.png"
            alt="Video Game Wingman Logo"
            width={100}
            height={100}
            className="mb-4"
            priority
          />
          <h2 className="text-2xl font-bold mb-2 text-center">
            Welcome to Early Access!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
            You&apos;ve been granted early access to Video Game Wingman!
            Let&apos;s set up your account.
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-center text-xs mt-2">
            Email: {userEmail}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Choose a Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.username
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              } dark:bg-gray-800 dark:text-white`}
              placeholder="Enter your username (3-32 characters)"
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_-]+"
              required
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username}</p>
            )}
          </div>

          {/* Password Section */}
          <div>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="skipPassword"
                checked={skipPassword}
                onChange={(e) => setSkipPassword(e.target.checked)}
                className="mr-2"
              />
              <label
                htmlFor="skipPassword"
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                Skip password setup for now (you can add one later)
              </label>
            </div>

            {!skipPassword && (
              <>
                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.password
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } dark:bg-gray-800 dark:text-white`}
                    placeholder="Enter your password"
                    required={!skipPassword}
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.password}
                    </p>
                  )}

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-2 w-8 rounded ${
                                level <= passwordStrength.score
                                  ? passwordStrength.score <= 2
                                    ? "bg-red-500"
                                    : passwordStrength.score === 3
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            passwordStrength.score <= 2
                              ? "text-red-600"
                              : passwordStrength.score === 3
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {passwordStrength.message}
                        </span>
                      </div>

                      {/* Password Requirements */}
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <div
                          className={`flex items-center ${
                            passwordStrength.requirements.length
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <span className="mr-1">
                            {passwordStrength.requirements.length ? "✓" : "○"}
                          </span>
                          At least 8 characters
                        </div>
                        <div
                          className={`flex items-center ${
                            passwordStrength.requirements.hasLetter
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <span className="mr-1">
                            {passwordStrength.requirements.hasLetter
                              ? "✓"
                              : "○"}
                          </span>
                          Contains letters
                        </div>
                        <div
                          className={`flex items-center ${
                            passwordStrength.requirements.hasNumber
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <span className="mr-1">
                            {passwordStrength.requirements.hasNumber
                              ? "✓"
                              : "○"}
                          </span>
                          Contains numbers
                        </div>
                        <div
                          className={`flex items-center ${
                            passwordStrength.requirements.hasSpecialChar
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <span className="mr-1">
                            {passwordStrength.requirements.hasSpecialChar
                              ? "✓"
                              : "○"}
                          </span>
                          Contains special characters
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="mt-4">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmPassword
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } dark:bg-gray-800 dark:text-white`}
                    placeholder="Confirm your password"
                    required={!skipPassword}
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Setting Up Account...
              </div>
            ) : (
              "Complete Setup"
            )}
          </button>
        </form>

        {/* Message Display */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes("successfully")
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-200 text-center">
            <strong>Early Access Benefits:</strong> You have unlimited access to
            all features during your early access period.
            {skipPassword &&
              " You can add a password later for additional security."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EarlyAccessSetupModal;
