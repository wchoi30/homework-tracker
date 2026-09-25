import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", padding: "20px", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "16px" }}>
        <Link href="/" style={{ textDecoration: "none", color: "#2563eb", fontWeight: 500 }}>
          ← Back to Home
        </Link>
      </div>

      <iframe
        src="https://www.privacypolicies.com/live/03a8d09b-605b-4acd-927e-5ee3a2186e07"
        style={{
          width: "100%",
          height: "85vh",
          border: "none",
          borderRadius: "8px",
          backgroundColor: "#ffffff",
        }}
        title="Privacy Policy"
      />
    </div>
  );
}
