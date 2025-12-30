import Link from "next/link";

export const dynamic = "force-dynamic";

export default function TermsOfServicePage() {
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
              Terms of Service
            </h1>

            <Link
              href="/"
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-semibold"
            >
              ← Back to Home
            </Link>
          </div>

          <p className="text-gray-700 mt-3">
            By accessing and using Video Game Wingman, you agree to these terms.
          </p>
        </div>

        {/* Content */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700">
              By accessing and using Video Game Wingman (&quot;Service&quot;,
              &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you accept
              and agree to be bound by these Terms of Service. If you do not
              agree to these terms, you may not use the Service. These terms
              apply to all users of the Service, including visitors, registered
              users, and users who access the Service through third-party
              platforms such as Discord or Twitch.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              2. Description of Service
            </h2>
            <p className="text-gray-700 mb-2">
              Video Game Wingman is an AI-powered gaming assistant that
              provides:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>AI-powered game assistance, walkthroughs, and strategies</li>
              <li>Personalized game recommendations</li>
              <li>Image analysis for game-related questions</li>
              <li>
                Community forums (all users can post; Pro users can create and
                manage forums)
              </li>
              <li>Discord bot integration for gaming discussions</li>
              <li>Twitch bot integration for streamers and viewers</li>
              <li>Progress tracking and achievement systems</li>
              <li>Game tracking features (wishlist, currently playing)</li>
              <li>Health monitoring and ergonomics reminders</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              3. Account Registration and Requirements
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                To use certain features of the Service, you must create an
                account. When registering, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your account information</li>
                <li>Maintain the security of your password</li>
                <li>
                  Accept responsibility for all activities under your account
                </li>
                <li>
                  Be at least 13 years of age (or the age of majority in your
                  jurisdiction)
                </li>
              </ul>
              <p className="mt-2">
                You are responsible for maintaining the confidentiality of your
                account credentials and for all activities that occur under your
                account. You must immediately notify us of any unauthorized use
                of your account.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              4. Free and Pro Access
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Free Access:</strong> Free users have access to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Unlimited questions (no rate limits)</li>
                <li>AI-powered gaming assistance</li>
                <li>Game recommendations and personalized tips</li>
                <li>Game tracking (wishlist and currently playing lists)</li>
                <li>Progress tracking and achievements</li>
                <li>Post and reply in forums (cannot create forums)</li>
              </ul>
              <p className="mt-2">
                <strong>Pro Access:</strong> Pro users receive enhanced access,
                including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Create, and edit your own forums (free users can post in
                  forums but cannot create them)
                </li>
                <li>
                  Twitch Bot integration - use Video Game Wingman in Twitch chat
                </li>
                <li>
                  Discord Bot integration - add Video Game Wingman to your
                  Discord server
                </li>
                <li>
                  Real-time notifications about achievements and forum activity
                </li>
                <li>Priority support</li>
              </ul>
              <p className="mt-2">
                Pro access may be granted through free periods, paid
                subscriptions, or other promotional offers at our discretion. We
                reserve the right to modify, suspend, or discontinue any
                features at any time.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              5. Subscriptions and Payments
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Paid Subscriptions:</strong> Pro subscriptions are
                billed monthly through our payment processor (Stripe). By
                subscribing, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Pay all fees associated with your subscription</li>
                <li>Automatic renewal of your subscription unless canceled</li>
                <li>Price changes with 30 days&apos; notice</li>
                <li>
                  No refunds for partial subscription periods (except as
                  required by law)
                </li>
              </ul>
              <p className="mt-2">
                <strong>Cancellation:</strong> You may cancel your subscription
                at any time through your account settings. Cancellation takes
                effect at the end of your current billing period. You will
                continue to have Pro access until the end of the paid period.
              </p>
              <p className="mt-2">
                <strong>Free Periods:</strong> Early access or promotional free
                periods may be granted at our discretion. Free periods do not
                require payment and will automatically transition to paid
                subscriptions only if you explicitly choose to upgrade.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              6. User-Generated Content
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                You retain ownership of content you create, including questions,
                forum posts, images, and other materials you submit to the
                Service. By submitting content, you grant us a worldwide,
                non-exclusive, royalty-free license to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Use, reproduce, and display your content to provide the
                  Service
                </li>
                <li>
                  Modify and adapt your content as necessary for the Service
                </li>
                <li>Analyze your content to improve our AI and services</li>
                <li>Store your content in our systems</li>
              </ul>
              <p className="mt-2">
                You are solely responsible for your content and represent that
                you have all necessary rights to grant us this license. You
                agree not to submit content that violates any third-party rights
                or applicable laws.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              7. Content Moderation and Acceptable Use
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                You agree to use the Service only for lawful purposes and in
                accordance with these Terms. Prohibited activities include:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Offensive Content:</strong> No derogatory language,
                  racism, sexism, homophobia, hate speech, or inappropriate
                  language
                </li>
                <li>
                  <strong>NSFW Content:</strong> No explicit, pornographic, or
                  adult content in images, questions, or forum posts
                </li>
                <li>
                  <strong>Spam and Abuse:</strong> No spamming, automated
                  queries, or abuse of rate limits
                </li>
                <li>
                  <strong>Violence and Harm:</strong> No content promoting
                  violence, self-harm, or illegal activities
                </li>
                <li>
                  <strong>Intellectual Property:</strong> No infringement of
                  copyrights, trademarks, or other intellectual property rights
                </li>
              </ul>
              <p className="mt-2">
                We use automated and manual content moderation to enforce these
                rules. Violations may result in warnings, temporary
                restrictions, or permanent bans. We reserve the right to remove
                any content that violates these terms without notice.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              8. Third-Party Integrations
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Discord Integration:</strong> Our Discord bot allows you
                to interact with Video Game Wingman through Discord servers or
                direct messages. By using the Discord bot, you agree to
                Discord&apos;s Terms of Service and Privacy Policy in addition
                to these Terms.
              </p>
              <p>
                <strong>Twitch Integration:</strong> Our Twitch bot allows
                streamers to add Video Game Wingman to their channels and
                viewers to link their Twitch accounts. By using Twitch
                integration, you agree to Twitch&apos;s Terms of Service and
                Privacy Policy.
              </p>
              <p>
                <strong>OAuth and Account Linking:</strong> When you link your
                Discord or Twitch account, we collect and store necessary
                information (such as user IDs and usernames) to provide the
                integration. You can unlink these accounts at any time through
                your account settings.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              9. AI Responses and Accuracy
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                The Service uses artificial intelligence to generate responses
                to your questions. You acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  AI responses are generated automatically and may contain
                  errors
                </li>
                <li>
                  We do not guarantee the accuracy, completeness, or reliability
                  of AI responses
                </li>
                <li>
                  AI responses should be used as guidance, not as definitive
                  answers
                </li>
                <li>
                  You are responsible for verifying any information provided by
                  the Service
                </li>
                <li>
                  We are not liable for any decisions or actions taken based on
                  AI responses
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              10. Intellectual Property
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                The Service, including its original content, features, and
                functionality, is owned by Video Game Wingman and is protected
                by international copyright, trademark, patent, trade secret, and
                other intellectual property laws. You may not:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Copy, modify, or create derivative works of the Service</li>
                <li>Reverse engineer, decompile, or disassemble the Service</li>
                <li>Remove any copyright or proprietary notices</li>
                <li>
                  Use the Service for any commercial purpose without our written
                  consent
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              11. Privacy and Data
            </h2>
            <p className="text-gray-700">
              Your use of the Service is also governed by our Privacy Policy,
              which explains how we collect, use, and protect your information.
              By using the Service, you consent to the collection and use of
              information as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              12. Service Availability and Modifications
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>We reserve the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Modify, suspend, or discontinue any part of the Service at any
                  time
                </li>
                <li>
                  Change features, functionality, or pricing with reasonable
                  notice
                </li>
                <li>
                  Perform maintenance that may temporarily interrupt service
                </li>
                <li>
                  Limit access to certain features based on subscription status
                </li>
              </ul>
              <p className="mt-2">
                We do not guarantee that the Service will be available at all
                times or that it will be error-free. We are not liable for any
                loss or damage resulting from service interruptions or
                modifications.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              13. Termination
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                We may terminate or suspend your account and access to the
                Service immediately, without prior notice, for conduct that we
                believe violates these Terms or is harmful to other users, us,
                or third parties. You may also terminate your account at any
                time by contacting us through the feedback system.
              </p>
              <p>
                Upon termination, your right to use the Service will immediately
                cease. We may delete your account and data, subject to our
                Privacy Policy and applicable law. Provisions of these Terms
                that by their nature should survive termination will survive.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              14. Disclaimer of Warranties
            </h2>
            <p className="text-gray-700">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
              IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO
              IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE
              WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT DEFECTS WILL
              BE CORRECTED.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              15. Limitation of Liability
            </h2>
            <p className="text-gray-700">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL VIDEO
              GAME WINGMAN, ITS AFFILIATES, OR THEIR RESPECTIVE OFFICERS,
              DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
              LOSS OF PROFITS, DATA, USE, OR OTHER INTANGIBLE LOSSES, RESULTING
              FROM YOUR USE OR INABILITY TO USE THE SERVICE, EVEN IF WE HAVE
              BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              16. Indemnification
            </h2>
            <p className="text-gray-700">
              You agree to indemnify, defend, and hold harmless Video Game
              Wingman and its affiliates from any claims, damages, losses,
              liabilities, and expenses (including legal fees) arising out of or
              relating to your use of the Service, your content, your violation
              of these Terms, or your violation of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              17. Changes to Terms
            </h2>
            <p className="text-gray-700">
              We reserve the right to modify these Terms at any time. We will
              notify users of material changes by posting the updated Terms on
              this page and updating the &quot;Last Updated&quot; date. Your
              continued use of the Service after such changes constitutes
              acceptance of the new Terms. If you do not agree to the modified
              Terms, you must stop using the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              18. Governing Law and Dispute Resolution
            </h2>
            <p className="text-gray-700">
              These Terms shall be governed by and construed in accordance with
              the laws of the jurisdiction in which Video Game Wingman operates,
              without regard to its conflict of law provisions. Any disputes
              arising from these Terms or your use of the Service shall be
              resolved through binding arbitration or in the appropriate courts
              of that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              19. Contact Information
            </h2>
            <p className="text-gray-700">
              If you have questions about these Terms of Service, please use the
              feedback system built into the application. Navigate to the
              feedback form and select the appropriate category for your
              inquiry. For legal matters or formal notices, please use the
              feedback system and clearly indicate the nature of your request.
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
