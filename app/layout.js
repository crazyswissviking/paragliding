export const metadata = {
  title: "Swissgliders Members",
  description: "Vollmond- & Nachtflüge",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ margin: "0", fontFamily: "sans-serif" }}>
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
        </nav>
        {children}
      </body>
    </html>
  );
}