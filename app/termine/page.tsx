export default function Termine() {
  const termine = [
    {
      datum: "Samstag, 30. Mai 2026",
      titel: "Vollmond-/Nachtflug",
      maxTeilnehmer: 6,
    },
    {
      datum: "Samstag, 27. Juni 2026",
      titel: "Vollmond-/Nachtflug",
      maxTeilnehmer: 6,
    },
    {
      datum: "Sonntag, 28. Juni 2026",
      titel: "Vollmond-/Nachtflug",
      maxTeilnehmer: 6,
    },
    {
      datum: "Freitag, 28. August 2026",
      titel: "Vollmond-/Nachtflug",
      maxTeilnehmer: 6,
    },
    {
      datum: "Sonntag, 25. Oktober 2026",
      titel: "Vollmond-/Nachtflug",
      maxTeilnehmer: 6,
    },
  ];

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Vollmond- & Nachtflüge 2026</h2>
      <div>
        {termine.map((t, i) => (
          <div key={i} style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "20px 24px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <p style={{ color: "#888", margin: "0 0 4px", fontSize: "14px" }}>🌕 {t.datum}</p>
              <h3 style={{ margin: "0 0 4px", fontSize: "18px" }}>{t.titel}</h3>
              <p style={{ margin: "0", color: "#aaa", fontSize: "14px" }}>📍 Ort wird noch bekanntgegeben</p>
            </div>
            <div style={{
              background: "#f0f4ff",
              borderRadius: "8px",
              padding: "10px 16px",
              textAlign: "center",
              minWidth: "80px",
            }}>
              <p style={{ margin: "0", fontSize: "22px", fontWeight: "bold", color: "#3355cc" }}>{t.maxTeilnehmer}</p>
              <p style={{ margin: "0", fontSize: "12px", color: "#666" }}>Plätze</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}