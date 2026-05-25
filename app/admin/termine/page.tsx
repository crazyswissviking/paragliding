"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import PasswortSchutz from "../passwort";

type Termin = {
  id: number;
  datum: string;
  wochentag: string;
  titel: string;
  ort: string;
  max_teilnehmer: number;
  aktiv: boolean;
  details: string;
};

type NeuerTermin = {
  datum: string;
  wochentag: string;
  titel: string;
  ort: string;
  max_teilnehmer: number;
  aktiv: boolean;
  details: string;
};

const parseDate = (d: string) => {
  const [day, month, year] = d.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
};

const leerTermin = (): NeuerTermin => ({
  datum: "",
  wochentag: "",
  titel: "Vollmond-/Nachtflug",
  ort: "Wird noch bekanntgegeben",
  max_teilnehmer: 6,
  aktiv: true,
  details: "",
});

const wochentage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export default function AdminTermine() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [loading, setLoading] = useState(true);
  const [neueTermine, setNeueTermine] = useState<NeuerTermin[]>([leerTermin()]);
  const [gespeichert, setGespeichert] = useState(false);

  async function laden() {
    const { data } = await supabase.from("termine").select("*");
    const sortiert = (data || []).sort((a, b) => parseDate(a.datum) - parseDate(b.datum));
    setTermine(sortiert);
    setLoading(false);
  }

  useEffect(() => {
    laden();
  }, []);

  function terminAendern(index: number, feld: keyof NeuerTermin, wert: string | number | boolean) {
    const updated = [...neueTermine];
    updated[index] = { ...updated[index], [feld]: wert };
    setNeueTermine(updated);
  }

  function terminHinzufuegen() {
    setNeueTermine([...neueTermine, leerTermin()]);
  }

  function terminEntfernen(index: number) {
    setNeueTermine(neueTermine.filter((_, i) => i !== index));
  }

  async function alleSpeichern() {
    const gueltig = neueTermine.filter((t) => t.datum && t.wochentag && t.titel);
    if (gueltig.length === 0) return;
    await supabase.from("termine").insert(gueltig);
    setNeueTermine([leerTermin()]);
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
    laden();
  }

  async function toggleAktiv(t: Termin) {
    await supabase.from("termine").update({ aktiv: !t.aktiv }).eq("id", t.id);
    laden();
  }

  async function loeschen(id: number) {
    await supabase.from("termine").delete().eq("id", id);
    laden();
  }

  return (
    <PasswortSchutz>
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Admin – Termine verwalten</h2>

      {/* Neue Termine */}
      <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>Neue Termine</h3>

        {neueTermine.map((neu, index) => (
          <div key={index} style={{ border: "1px solid #eee", borderRadius: "8px", padding: "16px", marginBottom: "16px", background: "#fafafa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <p style={{ margin: "0", fontWeight: "bold", fontSize: "14px" }}>Termin {index + 1}</p>
              {neueTermine.length > 1 && (
                <button
                  onClick={() => terminEntfernen(index)}
                  style={{ padding: "4px 10px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                >
                  ✕ Entfernen
                </button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Datum (dd.mm.yyyy)</label>
                <input
                  type="text"
                  placeholder="z.B. 30.05.2026"
                  value={neu.datum}
                  onChange={(e) => terminAendern(index, "datum", e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Wochentag</label>
                <select
                  value={neu.wochentag}
                  onChange={(e) => terminAendern(index, "wochentag", e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" }}
                >
                  <option value="">-- Wochentag --</option>
                  {wochentage.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Titel</label>
                <input
                  type="text"
                  value={neu.titel}
                  onChange={(e) => terminAendern(index, "titel", e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Ort</label>
                <input
                  type="text"
                  value={neu.ort}
                  onChange={(e) => terminAendern(index, "ort", e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Max. Teilnehmer</label>
                <input
                  type="number"
                  value={neu.max_teilnehmer}
                  onChange={(e) => terminAendern(index, "max_teilnehmer", parseInt(e.target.value))}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Details (optional)</label>
                <textarea
                  value={neu.details}
                  onChange={(e) => terminAendern(index, "details", e.target.value)}
                  placeholder="z.B. Treffpunkt, Ausrüstung..."
                  rows={2}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" }}
                />
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={terminHinzufuegen}
            style={{ padding: "10px 20px", background: "#f0f4ff", color: "#3355cc", border: "1px solid #3355cc", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}
          >
            ➕ Weiterer Termin
          </button>
          <button
            onClick={alleSpeichern}
            style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}
          >
            💾 Alle speichern
          </button>
          {gespeichert && (
            <span style={{ color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>
          )}
        </div>
      </div>

      {/* Bestehende Termine */}
      <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Bestehende Termine</h3>
      {loading && <p>Wird geladen...</p>}
      {!loading && termine.map((t) => (
        <div key={t.id} style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "16px 24px",
          marginBottom: "12px",
          opacity: t.aktiv ? 1 : 0.5,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>{t.wochentag}, {t.datum}</p>
              <p style={{ margin: "0 0 2px", fontSize: "14px", color: "#555" }}>{t.titel}</p>
              <p style={{ margin: "0", fontSize: "13px", color: "#aaa" }}>📍 {t.ort} · Max. {t.max_teilnehmer} Teilnehmer</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => toggleAktiv(t)}
                style={{
                  padding: "8px 14px",
                  background: t.aktiv ? "#e6f4ea" : "#f5f5f5",
                  color: t.aktiv ? "#2d6a4f" : "#888",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                {t.aktiv ? "✅ Aktiv" : "⏸ Inaktiv"}
              </button>
              <button
                onClick={() => loeschen(t.id)}
                style={{
                  padding: "8px 14px",
                  background: "#fdecea",
                  color: "#c0392b",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                🗑 Löschen
              </button>
            </div>
          </div>
          {t.details && (
            <div style={{ marginTop: "12px", padding: "12px", background: "#f9f9f9", borderRadius: "8px", fontSize: "14px", color: "#555" }}>
              📝 {t.details}
            </div>
          )}
        </div>
      ))}
    </main>
    </PasswortSchutz>
  );
}