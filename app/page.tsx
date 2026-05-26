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
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "400px" }}>
        <h1 style={{ fontSize: "48px", fontWeight: "bold", color: "#ffffff", marginBottom: "16px" }}>
          🪂 Swissgliders
        </h1>
        <p style={{ fontSize: "20px", color: "#aaa", marginBottom: "60px" }}>
          Unsere Events
        </p>

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
      </div>

      {/* Admin Link klein unten links */}
      <a href="/admin/termine" style={{
        position: "absolute",
        bottom: "16px",
        left: "16px",
        zIndex: 10,
        fontSize: "11px",
        color: "rgba(255,255,255,0.25)",
        textDecoration: "none",
      }}>
        Admin
      </a>
    </main>
  );
}