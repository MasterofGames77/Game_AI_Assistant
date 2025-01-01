import React from "react";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-[#1a1b2e] text-white py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-5xl font-bold mb-12 text-center">
          Terms of Service
          <div className="w-48 h-1 bg-gradient-to-r from-[#00ffff] via-[#ff69b4] to-[#00ffff] mx-auto mt-4"></div>
        </h1>

        <div className="space-y-8 bg-[#252642]/50 backdrop-blur-sm rounded-2xl p-8 shadow-[0_0_15px_rgba(0,255,255,0.1)] border border-[#00ffff]/20">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing and using this website (&quot;Service&quot;), you
              accept and agree to be bound by the terms and provisions of this
              agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
              2. Use License
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Permission is granted to temporarily download one copy of the
              materials (information or software) on the Service for personal,
              non-commercial transitory viewing only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
              3. Disclaimer
            </h2>
            <p className="text-gray-300 leading-relaxed">
              The materials on the Service are provided on an &quot;as is&quot;
              basis. We make no warranties, expressed or implied, and hereby
              disclaim and negate all other warranties including, without
              limitation, implied warranties or conditions of merchantability,
              fitness for a particular purpose, or non-infringement of
              intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
              4. Limitations
            </h2>
            <p className="text-gray-300 leading-relaxed">
              In no event shall the Service or its suppliers be liable for any
              damages (including, without limitation, damages for loss of data
              or profit, or due to business interruption) arising out of the use
              or inability to use the materials on the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
              5. Revisions and Errata
            </h2>
            <p className="text-gray-300 leading-relaxed">
              The materials appearing on the Service could include technical,
              typographical, or photographic errors. We do not warrant that any
              of the materials on the Service are accurate, complete, or
              current.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">6. Links</h2>
            <p className="text-gray-300 leading-relaxed">
              We have not reviewed all of the sites linked to our Service and
              are not responsible for the contents of any such linked site. The
              inclusion of any link does not imply endorsement by us of the
              site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00ffff]">
              7. Terms of Use Modifications
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We may revise these terms of use at any time without notice. By
              using this Service you are agreeing to be bound by the then
              current version of these Terms and Conditions of use.
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

export default TermsOfService;
