export default function Home() {
  return (
    <main style={{
      minHeight: "calc(100vh - 60px)",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
      textAlign: "center",
      overflow: "hidden",
    }}>
      {/* Hintergrundvideo */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, overflow: "hidden" }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }}
        >
          <source src="https://res.cloudinary.com/dnfnng4mm/video/upload/v1779590348/video_ve6erm.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)" }} />
      </div>

      {/* Inhalt */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <h1 style={{ fontSize: "48px", fontWeight: "bold", color: "#ffffff", marginBottom: "16px" }}>
          🪂 Swissgliders Members
        </h1>
        <p style={{ fontSize: "20px", color: "#aaa", marginBottom: "60px" }}>
          Dein Club für Vollmond- & Nachtflüge
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", maxWidth: "400px", margin: "0 auto" }}>
          <a href="/termine" style={{
            display: "block",
            padding: "18px 24px",
            background: "#3355cc",
            color: "white",
            borderRadius: "12px",
            textDecoration: "none",
            fontSize: "18px",
            fontWeight: "bold",
          }}>
            📅 Events ansehen
          </a>
          <a href="/termine/anmelden" style={{
            display: "block",
            padding: "18px 24px",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            borderRadius: "12px",
            textDecoration: "none",
            fontSize: "18px",
            fontWeight: "bold",
            border: "1px solid rgba(255,255,255,0.2)",
          }}>
            ✍️ Jetzt anmelden
          </a>
          <a href="/admin/termine" style={{
            display: "block",
            padding: "18px 24px",
            background: "rgba(255,255,255,0.05)",
            color: "#aaa",
            borderRadius: "12px",
            textDecoration: "none",
            fontSize: "16px",
            fontWeight: "bold",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            🔒 Admin
          </a>
        </div>
      </div>
    </main>
  );
}