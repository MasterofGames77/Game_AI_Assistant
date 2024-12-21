import React from "react";

const TermsOfService = () => {
  return (
    <div className="terms-container">
      <h1>Terms of Service</h1>
      <p>
        Welcome to <strong>Video Game Wingman</strong>! By using our services,
        you agree to the following terms.
      </p>
      <h2>Use of Services</h2>
      <ul>
        <li>Users must not upload copyrighted or illegal content.</li>
        <li>The service is provided "as is" without warranties of any kind.</li>
      </ul>
      <h2>Limitation of Liability</h2>
      <p>
        We are not responsible for any damages arising from the use of our
        services.
      </p>
      <h2>Termination</h2>
      <p>
        We reserve the right to terminate accounts or deny access to the service
        at any time for any reason.
      </p>
      <h2>Contact Us</h2>
      <p>
        If you have any questions about these Terms, please contact us at{" "}
        <a href="mailto:support@videogamewingman.com">
          support@videogamewingman.com
        </a>
        .
      </p>
    </div>
  );
};

export default TermsOfService;
