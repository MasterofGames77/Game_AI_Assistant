"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getPasswordStrength } from "../utils/passwordUtils";

interface PasswordSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetup: (password: string) => Promise<void>;
  username: string;
  userId: string;
}

const PasswordSetupModal: React.FC<PasswordSetupModalProps> = ({
  isOpen,
  onClose,
  onSetup,
  username,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [message, setMessage] = useState("");

  // Get password strength for UI feedback
  const passwordStrength = getPasswordStrength(newPassword);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Password validation
    if (!newPassword) {
      newErrors.newPassword = "Password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters long";
    } else if (newPassword.length > 128) {
      newErrors.newPassword = "Password must be less than 128 characters";
    } else if (!/[a-zA-Z]/.test(newPassword)) {
      newErrors.newPassword = "Password must contain at least one letter";
    } else if (!/\d/.test(newPassword)) {
      newErrors.newPassword = "Password must contain at least one number";
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      await onSetup(newPassword);
      setMessage("Password set up successfully! Your account is now secured.");
      setTimeout(() => {
        onClose();
        setNewPassword("");
        setConfirmPassword("");
        setMessage("");
        setErrors({});
      }, 2000);
    } catch (error: any) {
      console.error("Password setup error:", error);
      setMessage(
        error.message || "Failed to set up password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setNewPassword("");
      setConfirmPassword("");
      setMessage("");
      setErrors({});
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
            Secure Your Account
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
            Hello {username}! Please set up a password to secure your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password Field */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.newPassword
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              } dark:bg-gray-800 dark:text-white`}
              placeholder="Enter your new password"
              required
            />
            {errors.newPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
            )}

            {/* Password Strength Indicator */}
            {newPassword && (
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
                      {passwordStrength.requirements.hasLetter ? "✓" : "○"}
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
                      {passwordStrength.requirements.hasNumber ? "✓" : "○"}
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
                      {passwordStrength.requirements.hasSpecialChar ? "✓" : "○"}
                    </span>
                    Contains special characters
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
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
              placeholder="Confirm your new password"
              required
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword}
              </p>
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
                Setting Up Password...
              </div>
            ) : (
              "Set Up Password"
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

        {/* Remind Me Later Button */}
        <div className="mt-4 text-center">
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm disabled:opacity-50"
          >
            Remind me later
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
            <strong>Security Notice:</strong> Setting up a password helps
            protect your account. You can set it up now or later, but it&apos;s
            recommended for account security.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordSetupModal;
