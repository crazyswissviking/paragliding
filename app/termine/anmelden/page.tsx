"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

type Termin = {
  id: number;
  datum: string;
  wochentag: string;
  titel: string;
  max_teilnehmer: number;
};

const parseDate = (d: string) => {
  const [day, month, year] = d.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
};

export default function Anmelden() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [termin, setTermin] = useState("");
  const [status, setStatus] = useState<"erfolg" | "fehler" | null>(null);
  const [loading, setLoading] = useState(false);
  const [plaetze, setPlaetze] = useState<Record<string, number>>({});
  const [anmeldungId, setAnmeldungId] = useState<number | null>(null);

  useEffect(() => {
    async function laden() {
      const { data: termineData } = await supabase
        .from("termine")
        .select("*")
        .eq("aktiv", true);

      const sortiert = (termineData || []).sort((a, b) => parseDate(a.datum) - parseDate(b.datum));
      setTermine(sortiert);

      const { data: anmeldungenData } = await supabase
        .from("anmeldungen")
        .select("termin");

      const zaehler: Record<string, number> = {};
      sortiert.forEach((t) => (zaehler[`${t.wochentag}, ${t.datum}`] = 0));
      anmeldungenData?.forEach((a) => {
        if (zaehler[a.termin] !== undefined) zaehler[a.termin]++;
      });
      setPlaetze(zaehler);
    }
    laden();
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const { data, error } = await supabase
      .from("anmeldungen")
      .insert([{ name, email, termin }])
      .select();

    if (error) {
      setStatus("fehler");
    } else {
      setAnmeldungId(data?.[0]?.id || null);
      setStatus("erfolg");

      await fetch("/api/bestaetigung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, termin }),
      });
      setName("");
      setEmail("");
      setTermin("");
    }
    setLoading(false);
  }

  const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.2)",
    fontSize: "16px",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
  };

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px", color: "#ffffff" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#aaa", marginBottom: "30px" }}>Anmeldung Event</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", color: "#ccc" }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Dein Name"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", color: "#ccc" }}>E-Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="deine@email.com"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: "30px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", color: "#ccc" }}>Event wählen</label>
          <select
            value={termin}
            onChange={(e) => setTermin(e.target.value)}
            required
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="" style={{ background: "#1a1a2e" }}>-- Event auswählen --</option>
            {termine.map((t) => {
              const label = `${t.wochentag}, ${t.datum}`;
              const belegt = plaetze[label] || 0;
              const voll = belegt >= t.max_teilnehmer;
              return (
                <option key={t.id} value={label} disabled={voll} style={{ background: "#1a1a2e" }}>
                  {voll ? "🔴" : "🟢"} {label} ({belegt}/{t.max_teilnehmer} Plätze)
                </option>
              );
            })}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || (termin !== "" && (plaetze[termin] || 0) >= (termine.find((t) => `${t.wochentag}, ${t.datum}` === termin)?.max_teilnehmer || 6))}
          style={{
            width: "100%",
            padding: "14px",
            background: loading ? "#555" : "#3355cc",
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
        <div style={{ marginTop: "20px", padding: "16px", background: "rgba(45,106,79,0.3)", borderRadius: "10px", color: "#6fcf97", border: "1px solid rgba(111,207,151,0.3)" }}>
          ✅ Anmeldung erfolgreich! Wir freuen uns auf dich.
          {anmeldungId && (
            <p style={{ marginTop: "10px", fontSize: "14px" }}>
              Möchtest du dich später abmelden?{" "}
              <a href={`/termine/abmelden?id=${anmeldungId}`} style={{ color: "#6fcf97", fontWeight: "bold" }}>
                Abmelde-Link speichern
              </a>
            </p>
          )}
        </div>
      )}
      {status === "fehler" && (
        <div style={{ marginTop: "20px", padding: "16px", background: "rgba(192,57,43,0.3)", borderRadius: "10px", color: "#e74c3c", border: "1px solid rgba(231,76,60,0.3)" }}>
          ❌ Etwas ist schiefgelaufen. Bitte versuche es nochmals.
        </div>
      )}
    </main>
  );
}