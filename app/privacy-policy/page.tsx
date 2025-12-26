import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Privacy Policy
            </h1>

            <Link
              href="/"
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-semibold"
            >
              ← Back to Home
            </Link>
          </div>

          <p className="text-gray-700 mt-3">
            At <span className="font-semibold">Video Game Wingman</span>, we
            value your privacy. This policy explains how we collect, use, and
            protect your information.
          </p>
        </div>

        {/* Content */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Information We Collect
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Account Information
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    Username (3-32 characters, alphanumeric with underscores and
                    hyphens)
                  </li>
                  <li>
                    Email address (required for account creation and
                    authentication)
                  </li>
                  <li>
                    Password (stored as a secure hash, never in plain text)
                  </li>
                  <li>Account creation and activity timestamps</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Questions and Interactions
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Questions you submit about video games</li>
                  <li>AI-generated responses to your questions</li>
                  <li>Images uploaded for game analysis (stored securely)</li>
                  <li>Detected game titles and genres from your questions</li>
                  <li>Question categories and interaction types</li>
                  <li>Timestamps of all interactions</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  User Profile Data
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    Profile avatar images (current and history of last 6
                    avatars)
                  </li>
                  <li>
                    Game tracking information (wishlist, currently playing
                    games)
                  </li>
                  <li>Saved guides and responses</li>
                  <li>Achievements and progress tracking</li>
                  <li>Daily activity streaks</li>
                  <li>Challenge progress and rewards</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Third-Party Account Linking
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    <strong>Discord:</strong> Discord user ID and email (if you
                    choose to link your Discord account)
                  </li>
                  <li>
                    <strong>Twitch:</strong> Twitch username and user ID (if you
                    choose to link your Twitch account for bot usage)
                  </li>
                  <li>
                    OAuth tokens for authenticated third-party services (stored
                    securely)
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Forum Activity
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Forum posts and messages</li>
                  <li>Likes and reactions on your posts</li>
                  <li>Game titles discussed in forums</li>
                  <li>Forum participation timestamps</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Subscription and Usage Data
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    Pro subscription status and billing information (if
                    applicable)
                  </li>
                  <li>Usage limits and question counts</li>
                  <li>Health monitoring data for service optimization</li>
                  <li>Weekly digest email preferences</li>
                  <li>Previously recommended games (to avoid repeats)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Twitch Bot Data (Streamers Only)
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Twitch channel information</li>
                  <li>OAuth tokens for bot functionality</li>
                  <li>Channel analytics and message statistics</li>
                  <li>Moderation settings and logs</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Service Delivery:</strong> To provide AI-powered game
                assistance, answer your questions, analyze uploaded images, and
                generate personalized game recommendations
              </li>
              <li>
                <strong>Account Management:</strong> To authenticate your
                account, manage your profile, track achievements, and maintain
                your game tracking lists
              </li>
              <li>
                <strong>Communication:</strong> To send you welcome emails,
                password reset emails, weekly digest emails (if enabled),
                account security alerts, and support communications
              </li>
              <li>
                <strong>Service Improvement:</strong> To analyze usage patterns,
                improve our AI responses, enhance game detection accuracy, and
                optimize service performance
              </li>
              <li>
                <strong>Personalization:</strong> To provide personalized game
                recommendations based on your questions, forum activity, and
                gaming preferences
              </li>
              <li>
                <strong>Forum Features:</strong> To enable forum participation,
                display your posts, track likes and engagement, and facilitate
                community interactions
              </li>
              <li>
                <strong>Twitch Bot Integration:</strong> To enable bot
                functionality in your Twitch channel (if you&apos;re a streamer)
                and link viewer accounts for bot usage
              </li>
              <li>
                <strong>Security:</strong> To detect and prevent fraud, abuse,
                and unauthorized access to your account
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Data Sharing and Disclosure
            </h2>
            <p className="text-gray-700 mb-2">
              We do not sell your personal information. We may share your
              information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Service Providers:</strong> With trusted third-party
                service providers who assist us in operating our service (e.g.,
                email delivery, cloud storage, payment processing)
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, court
                order, or government regulation
              </li>
              <li>
                <strong>Protection of Rights:</strong> To protect our rights,
                property, or safety, or that of our users
              </li>
              <li>
                <strong>Third-Party Integrations:</strong> When you choose to
                link your Discord or Twitch account, we share necessary
                information with those platforms to enable integration
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Your Rights and Choices
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Account Access:</strong> You can access and update your
                account information, email preferences, and profile settings at
                any time
              </li>
              <li>
                <strong>Email Preferences:</strong> You can opt out of weekly
                digest emails through your account settings
              </li>
              <li>
                <strong>Third-Party Linking:</strong> You can link or unlink
                your Discord and Twitch accounts at any time through your
                account settings
              </li>
              <li>
                <strong>Data Deletion:</strong> You can request deletion of your
                account and associated data by using the feedback system built
                into the application. Navigate to the feedback form and select
                the appropriate category for your privacy-related request.
              </li>
              <li>
                <strong>Image Removal:</strong> You can delete uploaded images
                and saved guides through your account interface
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Data Security
            </h2>
            <p className="text-gray-700 mb-2">
              We implement industry-standard security measures to protect your
              data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                Passwords are hashed using secure algorithms and never stored in
                plain text
              </li>
              <li>OAuth tokens are encrypted and stored securely</li>
              <li>
                Images are stored securely in cloud storage with access controls
              </li>
              <li>Database connections use encryption</li>
              <li>
                Account lockout mechanisms protect against unauthorized access
                attempts
              </li>
            </ul>
            <p className="text-gray-700 mt-3">
              However, no system is completely secure, and we cannot guarantee
              the absolute security of your information. We recommend using a
              strong, unique password and enabling two-factor authentication
              where available.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Data Retention
            </h2>
            <p className="text-gray-700">
              We retain your account information and data for as long as your
              account is active or as needed to provide our services. If you
              delete your account, we will delete or anonymize your personal
              information, except where we are required to retain it for legal
              or legitimate business purposes. Questions and responses may be
              retained in anonymized form for service improvement purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Children&apos;s Privacy
            </h2>
            <p className="text-gray-700">
              Our service is not intended for children under the age of 13. We
              do not knowingly collect personal information from children under
              13. If you believe we have collected information from a child
              under 13, please contact us immediately using the feedback system
              built into the application and select the appropriate category for
              your privacy-related concern.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Changes to This Privacy Policy
            </h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will
              notify you of any material changes by posting the new Privacy
              Policy on this page and updating the &quot;Last Updated&quot;
              date. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about this Privacy Policy, your data, or
              wish to exercise your rights, please use the feedback system built
              into the application. The feedback form is accessible from the
              main application interface and allows you to submit
              privacy-related inquiries, data deletion requests, and other
              concerns. Simply select the appropriate category (such as
              &quot;Privacy Inquiry&quot; or &quot;Data Request&quot;) when
              submitting your feedback.
            </p>
            <p className="text-gray-700 mt-2 text-sm">
              Last Updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
