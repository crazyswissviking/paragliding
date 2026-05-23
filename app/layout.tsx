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
      <body style={{ margin: "0", fontFamily: "sans-serif", background: "#ffffff", color: "#000000", minHeight: "100vh" }}>
        <nav style={{
          background: "#3355cc",
          padding: "14px 40px",
          display: "flex",
          alignItems: "center",
          gap: "30px",
        }}>
          <span style={{ color: "white", fontWeight: "bold", fontSize: "18px" }}>
            🪂 Swissgliders Members
          </span>
          <a href="/termine" style={{ color: "white", textDecoration: "none", fontSize: "15px" }}>
            Termine
          </a>
          <a href="/termine/anmelden" style={{ color: "white", textDecoration: "none", fontSize: "15px" }}>
            Anmelden
          </a>
          <a href="/admin/termine" style={{ color: "white", textDecoration: "none", fontSize: "15px" }}>
            Admin Termine
          </a>
          <a href="/admin/anmeldungen" style={{ color: "white", textDecoration: "none", fontSize: "15px" }}>
            Admin Anmeldungen
          </a>
        </nav>
        <div>
          {children}
        </div>
      </body>
    </html>
  );
}