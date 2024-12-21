import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="policy-container">
      <h1>Privacy Policy</h1>
      <p>
        At <strong>Video Game Wingman</strong>, we value your privacy. This
        policy explains how we collect, use, and protect your information.
      </p>
      <h2>Information We Collect</h2>
      <ul>
        <li>Uploaded images for analysis purposes.</li>
        <li>Questions submitted to our system.</li>
        <li>Basic user data (e.g., email) for authentication.</li>
      </ul>
      <h2>How We Use Your Information</h2>
      <ul>
        <li>To analyze images and questions.</li>
        <li>To improve our services.</li>
        <li>To communicate with you about updates or support.</li>
      </ul>
      <h2>Data Security</h2>
      <p>
        We implement security measures to protect your data. However, no system
        is completely secure, and we cannot guarantee the absolute security of
        your information.
      </p>
      <h2>Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us
        at{" "}
        <a href="mailto:support@videogamewingman.com">
          support@videogamewingman.com
        </a>
        .
      </p>
    </div>
  );
};

export default PrivacyPolicy;
