import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swissgliders Members",
  description: "Events",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body style={{ margin: "0", fontFamily: "sans-serif", minHeight: "100vh", color: "#ffffff" }}>
        {/* Hintergrundvideo */}
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, overflow: "hidden" }}>
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }}
          >
            <source src="/video.mp4" type="video/mp4" />
          </video>
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.55)" }} />
        </div>

        {/* Navigation */}
        <nav style={{
          position: "relative",
          zIndex: 10,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(10px)",
          padding: "14px 40px",
          display: "flex",
          alignItems: "center",
          gap: "30px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}>
          <span style={{ color: "white", fontWeight: "bold", fontSize: "18px" }}>
            🪂 Swissgliders Members
          </span>
          <a href="/termine" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "15px" }}>
            Termine
          </a>
          <a href="/termine/anmelden" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "15px" }}>
            Anmelden
          </a>
          <a href="/admin/termine" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "15px" }}>
            Admin Termine
          </a>
          <a href="/admin/anmeldungen" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "15px" }}>
            Admin Anmeldungen
          </a>
        </nav>

        {/* Inhalt */}
        <div style={{ position: "relative", zIndex: 10 }}>
          {children}
        </div>
      </body>
    </html>
  );
}