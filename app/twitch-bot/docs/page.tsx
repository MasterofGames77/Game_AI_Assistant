"use client";

import { useRouter } from "next/navigation";
import { botConfig } from "@/config/botConfig";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default function TwitchBotDocumentation() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      <div className="relative container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/twitch-bot")}
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex items-center gap-4">
              <Image
                src="/assets/video-game-wingman-logo.png"
                alt="Hero Game Wingman Logo"
                width={60}
                height={60}
                className="rounded-full"
              />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {botConfig.name} Documentation
                </h1>
                <p className="text-gray-800 text-sm mt-1">
                  Complete guide for streamers
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-8 border border-white/20">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Table of Contents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <a
              href="#getting-started"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              1. Getting Started
            </a>
            <a
              href="#commands"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              2. Commands & Usage
            </a>
            <a
              href="#channel-settings"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              3. Channel Settings
            </a>
            <a
              href="#moderation"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              4. Moderation Features
            </a>
            <a
              href="#analytics"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              5. Analytics Dashboard
            </a>
            <a
              href="#pro-access"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              6. Pro Access
            </a>
            <a
              href="#troubleshooting"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              7. Troubleshooting
            </a>
            <a
              href="#faq"
              className="text-purple-600 hover:text-purple-700 hover:underline"
            >
              8. FAQ
            </a>
          </div>
        </div>

        {/* Getting Started */}
        <section
          id="getting-started"
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            1. Getting Started
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Adding the Bot to Your Channel
              </h3>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <p className="text-gray-800">
                      Visit the{" "}
                      <button
                        onClick={() => router.push("/twitch-bot")}
                        className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
                      >
                        Bot Profile Page
                      </button>{" "}
                      or{" "}
                      <button
                        onClick={() => router.push("/twitch-landing")}
                        className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
                      >
                        Landing Page
                      </button>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <p className="text-gray-800">
                      Click &quot;Add Bot to Your Channel&quot; button
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <p className="text-gray-800">
                      Authorize the bot with your Twitch account (you must be
                      logged in to Video Game Wingman)
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    4
                  </div>
                  <div>
                    <p className="text-gray-800">
                      The bot will automatically join your channel and be ready
                      to use!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-gray-800">
                <strong className="text-gray-900">Note:</strong> You must have a
                Video Game Wingman account and be logged in to add the bot. The
                bot requires Pro access to function.
              </p>
            </div>
          </div>
        </section>

        {/* Commands & Usage */}
        <section
          id="commands"
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            2. Commands & Usage
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                How Viewers Interact with the Bot
              </h3>
              <p className="text-gray-800 mb-4">
                Viewers can interact with {botConfig.name} in several ways:
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Command Prefixes
                  </h4>
                  <p className="text-gray-800 mb-2">
                    Default commands (can be customized per channel):
                  </p>
                  <ul className="list-disc list-outside pl-5 space-y-2 text-gray-800 text-left">
                    <li>
                      <code className="inline-block bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                        !wingman &lt;question&gt;
                      </code>
                    </li>
                    <li>
                      <code className="inline-block bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                        !hgwm &lt;question&gt;
                      </code>
                    </li>
                  </ul>
                  <p className="text-gray-800 text-sm mt-2">
                    Example:{" "}
                    <code className="bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                      !wingman How do I beat the final boss in Elden Ring?
                    </code>
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Bot Mentions
                  </h4>
                  <p className="text-gray-800 mb-2">
                    Viewers can mention the bot directly:
                  </p>
                  <ul className="list-disc list-outside pl-5 space-y-2 text-gray-800 text-left">
                    <li>
                      <code className="inline-block bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                        @HeroGameWingman &lt;question&gt;
                      </code>
                    </li>
                  </ul>
                  <p className="text-gray-800 text-sm mt-2">
                    Example:{" "}
                    <code className="bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                      @HeroGameWingman What are the best RPGs for beginners?
                    </code>
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Help Commands
                  </h4>
                  <ul className="list-disc list-outside pl-5 space-y-2 text-gray-800 text-left">
                    <li>
                      <code className="inline-block bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                        !help
                      </code>{" "}
                      <span className="text-gray-800">
                        - Shows help information
                      </span>
                    </li>
                    <li>
                      <code className="inline-block bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                        !commands
                      </code>{" "}
                      <span className="text-gray-800">
                        - Lists all available commands
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                What Viewers Can Ask
              </h3>
              <p className="text-gray-800 mb-3">
                {botConfig.name} can help with a wide variety of gaming topics:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {botConfig.knowledge.map((topic, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-purple-100 border border-purple-300 px-3 py-2 rounded"
                  >
                    <span className="text-purple-700 font-bold">✓</span>
                    <span className="text-gray-900 text-sm font-medium">
                      {topic}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <p className="text-sm text-gray-800">
                <strong className="text-gray-900">Tip:</strong> Viewers need to
                link their Twitch account to their Video Game Wingman account to
                use Pro features. They can do this from their account page.
              </p>
            </div>
          </div>
        </section>

        {/* Channel Settings */}
        <section
          id="channel-settings"
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            3. Channel Settings
          </h2>

          <div className="space-y-6">
            <p className="text-gray-800">
              Customize how the bot behaves in your channel. Access settings
              from your{" "}
              <button
                onClick={() => router.push("/account")}
                className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
              >
                Account Page
              </button>
              .
            </p>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Command Prefixes
              </h3>
              <p className="text-gray-800 mb-3">
                Customize the commands viewers use to interact with the bot.
                Default:{" "}
                <code className="bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                  !wingman
                </code>{" "}
                and{" "}
                <code className="bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                  !hgwm
                </code>
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                <li>
                  Add custom prefixes like{" "}
                  <code className="bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                    !gaming
                  </code>{" "}
                  or{" "}
                  <code className="bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                    !ask
                  </code>
                </li>
                <li>Remove default prefixes if you prefer</li>
                <li>
                  Each prefix must start with{" "}
                  <code className="bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                    !
                  </code>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Bot Mentions
              </h3>
              <p className="text-gray-800 mb-3">
                Control whether viewers can mention the bot directly:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                <li>
                  <strong className="text-gray-900">Enabled:</strong> Viewers
                  can use{" "}
                  <code className="bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                    @HeroGameWingman
                  </code>{" "}
                  to interact
                </li>
                <li>
                  <strong className="text-gray-900">Disabled:</strong> Only
                  command prefixes work
                </li>
                <li>
                  <strong className="text-gray-900">Custom Name:</strong> Change
                  the mention name (default:{" "}
                  <code className="bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm border border-gray-700">
                    herogamewingman
                  </code>
                  )
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Rate Limiting
              </h3>
              <p className="text-gray-800 mb-3">
                Control how often viewers can use the bot:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                <li>
                  <strong className="text-gray-900">Window:</strong> Time period
                  for rate limit (default: 1 minute)
                </li>
                <li>
                  <strong className="text-gray-900">Max Messages:</strong>{" "}
                  Maximum messages per window (default: 10)
                </li>
                <li>Prevents spam and ensures fair usage across all viewers</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Response Style
              </h3>
              <p className="text-gray-800 mb-3">
                Choose how the bot formats its responses:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                <li>
                  <strong className="text-gray-900">Mention:</strong> Always
                  mentions the user (default)
                </li>
                <li>
                  <strong className="text-gray-900">No-Mention:</strong> Never
                  mentions the user
                </li>
                <li>
                  <strong className="text-gray-900">Compact:</strong> Minimal
                  formatting, mentions only in first message
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Message Length
              </h3>
              <p className="text-gray-800 mb-3">
                Set maximum response length (Twitch limit: 500 characters):
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                <li>
                  Longer responses are automatically split into multiple
                  messages
                </li>
                <li>Bot tries to split at sentence boundaries when possible</li>
                <li>Default: 500 characters (Twitch maximum)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Response Caching
              </h3>
              <p className="text-gray-800 mb-3">
                Enable caching to speed up responses for common questions:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                <li>
                  <strong className="text-gray-900">Enabled:</strong> Identical
                  questions get instant cached responses (default: enabled)
                </li>
                <li>
                  <strong className="text-gray-900">Cache TTL:</strong> How long
                  responses are cached (default: 5 minutes)
                </li>
                <li>Improves response time and reduces API usage</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Custom System Message
              </h3>
              <p className="text-gray-800 mb-3">
                Override the default AI system message to customize bot
                behavior:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                <li>Define how the bot should respond in your channel</li>
                <li>Set tone, style, or specific instructions</li>
                <li>Leave empty to use default system message</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Moderation */}
        <section
          id="moderation"
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            4. Moderation Features
          </h2>

          <div className="space-y-6">
            <p className="text-gray-800">
              {botConfig.name} includes built-in content moderation to keep your
              chat safe and appropriate.
            </p>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                How Moderation Works
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Pre-Processing Filter
                  </h4>
                  <p className="text-gray-800 text-sm">
                    Messages are checked for offensive content before being sent
                    to the AI. Inappropriate messages are rejected and
                    moderation actions are taken.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Post-Processing Filter
                  </h4>
                  <p className="text-gray-800 text-sm">
                    AI responses are also checked. If the AI generates
                    inappropriate content, it&apos;s replaced with a safe
                    fallback message.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Progressive Moderation System
              </h3>
              <p className="text-gray-800 mb-3">
                The bot uses a progressive system that escalates with repeated
                violations:
              </p>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="text-gray-800">
                      <strong className="text-gray-900">
                        First Violation:
                      </strong>{" "}
                      Warning message (no timeout)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="text-gray-800">
                      <strong className="text-gray-900">
                        Second Violation:
                      </strong>{" "}
                      Timeout (default: 5 minutes)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="text-gray-800">
                      <strong className="text-gray-900">
                        Third Violation:
                      </strong>{" "}
                      Longer timeout (default: 30 minutes)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-700 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    4+
                  </div>
                  <div>
                    <p className="text-gray-800">
                      <strong className="text-gray-900">
                        Fourth+ Violation:
                      </strong>{" "}
                      Extended timeout (default: 1 hour)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm">
                    B
                  </div>
                  <div>
                    <p className="text-gray-800">
                      <strong className="text-gray-900">Max Violations:</strong>{" "}
                      Permanent ban (default: after 5 violations)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Moderation Settings
              </h3>
              <p className="text-gray-800 mb-3">
                Configure moderation from your{" "}
                <button
                  onClick={() => router.push("/account")}
                  className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
                >
                  Account Page
                </button>
                :
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                <li>
                  <strong className="text-gray-900">Enable/Disable:</strong>{" "}
                  Turn moderation on or off
                </li>
                <li>
                  <strong className="text-gray-900">Strict Mode:</strong> More
                  aggressive filtering
                </li>
                <li>
                  <strong className="text-gray-900">Timeout Durations:</strong>{" "}
                  Customize timeout length for each violation level
                </li>
                <li>
                  <strong className="text-gray-900">
                    Max Violations Before Ban:
                  </strong>{" "}
                  Set how many violations trigger a ban
                </li>
                <li>
                  <strong className="text-gray-900">Check AI Responses:</strong>{" "}
                  Enable/disable filtering of AI-generated content
                </li>
                <li>
                  <strong className="text-gray-900">Log All Actions:</strong>{" "}
                  Keep audit trail of all moderation actions
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-gray-800">
                <strong className="text-gray-900">Note:</strong> Banned users
                are silently rejected - the bot won&apos;t respond to their
                messages at all. You can unban users from the moderation
                settings.
              </p>
            </div>
          </div>
        </section>

        {/* Analytics */}
        <section
          id="analytics"
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            5. Analytics Dashboard
          </h2>

          <div className="space-y-6">
            <p className="text-gray-800">
              Track bot usage, performance, and engagement with the
              comprehensive analytics dashboard. Access it from your{" "}
              <button
                onClick={() => router.push("/account")}
                className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
              >
                Account Page
              </button>
              .
            </p>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Available Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Message Statistics
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-800 text-sm">
                    <li>Total messages processed</li>
                    <li>Successful vs failed messages</li>
                    <li>Message volume over time</li>
                    <li>Success/error rates</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Performance Metrics
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-800 text-sm">
                    <li>Average response times</li>
                    <li>Processing time breakdown</li>
                    <li>Cache hit rates</li>
                    <li>AI response generation time</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    User Engagement
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-800 text-sm">
                    <li>Unique users</li>
                    <li>New vs returning users</li>
                    <li>User activity trends</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Command Usage
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-800 text-sm">
                    <li>Help command usage</li>
                    <li>Commands command usage</li>
                    <li>Question frequency</li>
                    <li>Error breakdown</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Dashboard Features
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                <li>
                  <strong className="text-gray-900">
                    Time Range Selection:
                  </strong>{" "}
                  View data for last 7 days, 30 days, or custom range
                </li>
                <li>
                  <strong className="text-gray-900">Channel Selector:</strong>{" "}
                  View analytics for specific channels
                </li>
                <li>
                  <strong className="text-gray-900">Interactive Charts:</strong>{" "}
                  Visualize trends with line, bar, and pie charts
                </li>
                <li>
                  <strong className="text-gray-900">Real-time Updates:</strong>{" "}
                  Enable auto-refresh for live statistics
                </li>
                <li>
                  <strong className="text-gray-900">Export Data:</strong>{" "}
                  Download analytics as JSON for external analysis
                </li>
                <li>
                  <strong className="text-gray-900">
                    Collapsible Sections:
                  </strong>{" "}
                  Customize your view by collapsing charts
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Pro Access */}
        <section
          id="pro-access"
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            6. Pro Access
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Pro Access Requirements
              </h3>
              <p className="text-gray-800 mb-3">
                {botConfig.name} requires Video Game Wingman Pro access to
                function. Here&apos;s what you need to know:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-800">
                <li>
                  <strong className="text-gray-900">Streamers:</strong> As a
                  channel owner, you automatically get Pro access for your
                  channel
                </li>
                <li>
                  <strong className="text-gray-900">Viewers:</strong> Must link
                  their Twitch account to their Video Game Wingman account and
                  have Pro access
                </li>
                <li>
                  <strong className="text-gray-900">Account Linking:</strong>{" "}
                  Viewers can link their account from the{" "}
                  <button
                    onClick={() => router.push("/account")}
                    className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
                  >
                    Account Page
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                What Happens Without Pro Access
              </h3>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p className="text-sm text-gray-800 mb-2">
                  If a viewer tries to use the bot without Pro access:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-800">
                  <li>
                    Bot responds with a message explaining Pro access is
                    required
                  </li>
                  <li>
                    If account is not linked, bot suggests linking their Twitch
                    account
                  </li>
                  <li>No AI response is generated (saves API costs)</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Getting Pro Access
              </h3>
              <p className="text-gray-800 mb-3">
                Viewers can get Pro access by:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                <li>Subscribing to Video Game Wingman Pro</li>
                <li>Using a promotional code</li>
                <li>Participating in special events</li>
              </ul>
              <p className="text-gray-800 text-sm mt-3">
                Learn more about Pro features on the{" "}
                <button
                  onClick={() => router.push("/upgrade")}
                  className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
                >
                  Upgrade Page
                </button>
              </p>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section
          id="troubleshooting"
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            7. Troubleshooting
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Bot Not Responding
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-800">
                <li>
                  <strong className="text-gray-900">Check Bot Status:</strong>{" "}
                  Visit the{" "}
                  <button
                    onClick={() => router.push("/twitch-bot")}
                    className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
                  >
                    Bot Profile Page
                  </button>{" "}
                  to see if the bot is online
                </li>
                <li>
                  <strong className="text-gray-900">Verify Channel:</strong>{" "}
                  Make sure the bot is enabled for your channel in your account
                  settings
                </li>
                <li>
                  <strong className="text-gray-900">Check Commands:</strong>{" "}
                  Ensure you&apos;re using the correct command prefix (check
                  channel settings)
                </li>
                <li>
                  <strong className="text-gray-900">Rate Limits:</strong> Wait a
                  moment if you&apos;ve sent multiple messages quickly
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Bot Not Joining Channel
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-800">
                <li>
                  <strong className="text-gray-900">Re-authorize:</strong> Try
                  removing and re-adding the bot to your channel
                </li>
                <li>
                  <strong className="text-gray-900">Check Permissions:</strong>{" "}
                  Ensure the bot has permission to join your channel
                </li>
                <li>
                  <strong className="text-gray-900">Wait a Moment:</strong> It
                  may take a few seconds for the bot to join after authorization
                </li>
                <li>
                  <strong className="text-gray-900">Contact Support:</strong> If
                  issues persist, check the bot status page
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Settings Not Saving
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-800">
                <li>
                  <strong className="text-gray-900">Refresh Page:</strong> Try
                  refreshing your account page
                </li>
                <li>
                  <strong className="text-gray-900">Check Internet:</strong>{" "}
                  Ensure you have a stable connection
                </li>
                <li>
                  <strong className="text-gray-900">Clear Cache:</strong> Clear
                  browser cache and try again
                </li>
                <li>
                  <strong className="text-gray-900">Log Out/In:</strong> Try
                  logging out and back in
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Viewers Can&apos;t Use Bot
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-800">
                <li>
                  <strong className="text-gray-900">Pro Access:</strong> Remind
                  viewers they need Pro access and to link their Twitch account
                </li>
                <li>
                  <strong className="text-gray-900">Command Format:</strong>{" "}
                  Make sure they&apos;re using the correct command format
                </li>
                <li>
                  <strong className="text-gray-900">Account Linking:</strong>{" "}
                  Viewers must link their Twitch account on the Video Game
                  Wingman website
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            8. Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Q: Is the bot free to use?
              </h3>
              <p className="text-gray-800">
                A: Yes! Adding the bot to your channel is completely free.
                However, viewers need Video Game Wingman Pro access to interact
                with the bot.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Q: Can I customize the bot&apos;s responses?
              </h3>
              <p className="text-gray-800">
                A: Yes! You can customize the bot&apos;s system message in
                channel settings to change how it responds, its tone, or add
                specific instructions.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Q: How do I remove the bot from my channel?
              </h3>
              <p className="text-gray-800">
                A: Go to your Account Page, find your channel in the Twitch Bot
                Channel Manager, and click &quot;Remove Channel&quot;. The bot
                will leave your channel immediately.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Q: Can the bot be in multiple channels?
              </h3>
              <p className="text-gray-800">
                A: Yes! You can add the bot to multiple channels. Each channel
                can have its own settings and configuration.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Q: Does the bot work offline?
              </h3>
              <p className="text-gray-800">
                A: The bot works 24/7 as long as it&apos;s online. Check the Bot
                Profile Page to see the current status. The bot will
                automatically reconnect if it disconnects.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Q: Can I see who&apos;s using the bot?
              </h3>
              <p className="text-gray-800">
                A: Yes! The Analytics Dashboard shows unique users, message
                counts, and engagement metrics. You can see which users are most
                active.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Q: What happens if the bot gets a question it can&apos;t answer?
              </h3>
              <p className="text-gray-800">
                A: The bot will do its best to provide a helpful response. If it
                truly can&apos;t answer, it will let the viewer know and suggest
                rephrasing the question.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Q: Can I disable moderation?
              </h3>
              <p className="text-gray-800">
                A: Yes, you can disable moderation features in your channel
                settings. However, we recommend keeping it enabled to maintain a
                safe chat environment.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-8 border border-white/20 text-center">
          <p className="text-gray-800 mb-4">
            Need more help? Visit the{" "}
            <button
              onClick={() => router.push("/twitch-bot")}
              className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
            >
              Bot Profile Page
            </button>{" "}
            or{" "}
            <button
              onClick={() => router.push("/account")}
              className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
            >
              Account Page
            </button>
          </p>
          <button
            onClick={() => router.push("/twitch-bot")}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold"
          >
            Back to Bot Profile
          </button>
        </div>
      </div>
    </div>
  );
}
