import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#1a1b2e] text-white py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-5xl font-bold mb-12 text-center">
          Privacy Policy
          <div className="w-48 h-1 bg-gradient-to-r from-[#00ffff] via-[#ff69b4] to-[#00ffff] mx-auto mt-4"></div>
        </h1>

        <div className="space-y-8 bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-8 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20">
          <p className="text-gray-300 leading-relaxed">
            At <span className="text-[#00ffff]">Video Game Wingman</span>, we
            value your privacy. This policy explains how we collect, use, and
            protect your information.
          </p>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
              Information We Collect
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-300 marker:text-[#00ffff]">
              <li>Uploaded images for analysis purposes</li>
              <li>Questions submitted to our system</li>
              <li>Basic user data (e.g., email) for authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-300 marker:text-[#00ffff]">
              <li>To analyze images and questions</li>
              <li>To improve our services</li>
              <li>To communicate with you about updates or support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
              Data Security
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We implement security measures to protect your data. However, no
              system is completely secure, and we cannot guarantee the absolute
              security of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
              Contact Us
            </h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about this Privacy Policy, please
              contact us at{" "}
              <a
                href="mailto:support@videogamewingman.com"
                className="text-[#00ffff] hover:text-[#ff69b4] transition-colors duration-300"
              >
                support@videogamewingman.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-[#00ffff] to-[#ff69b4] text-white font-bold hover:opacity-90 transition-opacity"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
