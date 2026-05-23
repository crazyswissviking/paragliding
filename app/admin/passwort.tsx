"use client";
import { useState, useEffect } from "react";

export default function PasswortSchutz({ children }: { children: React.ReactNode }) {
  const [eingabe, setEingabe] = useState("");
  const [berechtigt, setBerechtigt] = useState(false);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    const gespeichert = sessionStorage.getItem("admin_berechtigt");
    if (gespeichert === "ja") setBerechtigt(true);
  }, []);

  function pruefen() {
    alert("Eingabe: " + eingabe);
    if (eingabe === "SwissViking") {
      sessionStorage.setItem("admin_berechtigt", "ja");
      setBerechtigt(true);
      setFehler(false);
    } else {
      setFehler(true);
    }
  }

  if (berechtigt) return <>{children}</>;

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "400px", margin: "100px auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>🔒 Admin-Bereich</h1>
      <p style={{ color: "#888", marginBottom: "24px" }}>Bitte Passwort eingeben</p>
      <input
        type="password"
        value={eingabe}
        onChange={(e) => setEingabe(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && pruefen()}
        placeholder="Passwort"
        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px", marginBottom: "12px" }}
      />
      <button
        onClick={pruefen}
        style={{
          width: "100%",
          padding: "12px",
          background: "#3355cc",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Einloggen
      </button>
      {fehler && (
        <p style={{ color: "#c0392b", marginTop: "12px" }}>❌ Falsches Passwort</p>
      )}
    </main>
  );
}