import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif", lineHeight: "1.6" }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: September 2026</p>

      <h2>1. Information We Collect</h2>
      <p>
        Homework Tracker accesses your Google profile information (such as your name and email address) when you log in using Google OAuth.
      </p>

      <h2>2. How We Use Your Information</h2>
      <p>
        We use your information solely to authenticate your account and manage your assignments and grades within the application.
      </p>

      <h2>3. Data Protection & Sharing</h2>
      <p>
        We do not sell, rent, or share your personal data with any third parties. All data is kept secure and used strictly for providing core app functionalities.
      </p>

      <h2>4. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us at your support email.
      </p>

      <div style={{ marginTop: "30px" }}>
        <Link href="/">← Back to Home</Link>
      </div>
    </div>
  );
}
