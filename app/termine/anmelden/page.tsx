"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const termine = [
  "Samstag, 30. Mai 2026",
  "Samstag, 27. Juni 2026",
  "Sonntag, 28. Juni 2026",
  "Freitag, 28. August 2026",
  "Sonntag, 25. Oktober 2026",
];

export default function Anmelden() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [termin, setTermin] = useState("");
  const [status, setStatus] = useState<"erfolg" | "fehler" | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const { error } = await supabase
      .from("anmeldungen")
      .insert([{ name, email, termin }]);

    if (error) {
      setStatus("fehler");
    } else {
      setStatus("erfolg");
      setName("");
      setEmail("");
      setTermin("");
    }
    setLoading(false);
  }

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Anmeldung Vollmond-/Nachtflug</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Dein Name"
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" }}
          />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>E-Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="deine@email.com"
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" }}
          />
        </div>
        <div style={{ marginBottom: "30px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>Termin wählen</label>
          <select
            value={termin}
            onChange={(e) => setTermin(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" }}
          >
            <option value="">-- Termin auswählen --</option>
            {termine.map((t, i) => (
              <option key={i} value={t}>🌕 {t}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: loading ? "#aaa" : "#3355cc",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Wird gesendet..." : "Jetzt anmelden"}
        </button>
      </form>
      {status === "erfolg" && (
        <div style={{ marginTop: "20px", padding: "16px", background: "#e6f4ea", borderRadius: "10px", color: "#2d6a4f" }}>
          ✅ Anmeldung erfolgreich! Wir freuen uns auf dich.
        </div>
      )}
      {status === "fehler" && (
        <div style={{ marginTop: "20px", padding: "16px", background: "#fdecea", borderRadius: "10px", color: "#c0392b" }}>
          ❌ Etwas ist schiefgelaufen. Bitte versuche es nochmals.
        </div>
      )}
    </main>
  );
}