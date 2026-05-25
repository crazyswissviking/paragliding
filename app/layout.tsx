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
      <body style={{ margin: "0", fontFamily: "sans-serif", background: "#1a1a2e", color: "#ffffff", minHeight: "100vh" }}>
        <nav style={{
          background: "rgba(0,0,0,0.8)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          position: "relative",
          zIndex: 20,
        }}>
          <a href="https://www.vikingfly.ch" style={{ color: "white", fontWeight: "bold", fontSize: "18px", textDecoration: "none" }}>
            🪂 Vikingfly
          </a>

          {/* Desktop Links */}
          <div style={{ display: "flex", gap: "24px" }} className="desktop-nav">
            <a href="/termine" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "15px" }}>Termine</a>
            <a href="/termine/anmelden" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "15px" }}>Anmelden</a>
          </div>

          {/* Mobile Hamburger */}
          <details style={{ position: "relative" }} className="mobile-nav">
            <summary style={{ cursor: "pointer", color: "white", fontSize: "24px", listStyle: "none", padding: "4px 8px" }}>☰</summary>
            <div style={{
              position: "absolute",
              right: 0,
              top: "40px",
              background: "rgba(0,0,0,0.95)",
              borderRadius: "12px",
              padding: "12px",
              minWidth: "160px",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}>
              <a href="/termine" style={{ color: "white", textDecoration: "none", fontSize: "15px", padding: "8px 12px", borderRadius: "8px" }}>📅 Termine</a>
              <a href="/termine/anmelden" style={{ color: "white", textDecoration: "none", fontSize: "15px", padding: "8px 12px", borderRadius: "8px" }}>✍️ Anmelden</a>
            </div>
          </details>
        </nav>

        <style>{`
          .desktop-nav { display: flex; }
          .mobile-nav { display: none; }
          @media (max-width: 600px) {
            .desktop-nav { display: none; }
            .mobile-nav { display: block; }
          }
          details summary::-webkit-details-marker { display: none; }
        `}</style>

        <div>
          {children}
        </div>
      </body>
    </html>
  );
}