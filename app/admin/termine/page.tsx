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

export default function AdminTermine() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [loading, setLoading] = useState(true);
  const [neu, setNeu] = useState({
    datum: "",
    wochentag: "",
    titel: "Vollmond-/Nachtflug",
    ort: "Wird noch bekanntgegeben",
    max_teilnehmer: 6,
    aktiv: true,
    details: "",
  });
  const [gespeichert, setGespeichert] = useState(false);

  async function laden() {
    const { data } = await supabase
      .from("termine")
      .select("*")
      .order("id", { ascending: true });
    setTermine(data || []);
    setLoading(false);
  }

  useEffect(() => {
    laden();
  }, []);

  async function hinzufuegen() {
    if (!neu.datum || !neu.wochentag || !neu.titel) return;
    await supabase.from("termine").insert([neu]);
    setNeu({
      datum: "",
      wochentag: "",
      titel: "Vollmond-/Nachtflug",
      ort: "Wird noch bekanntgegeben",
      max_teilnehmer: 6,
      aktiv: true,
      details: "",
    });
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
    laden();
  }

  async function toggleAktiv(t: Termin) {
    await supabase
      .from("termine")
      .update({ aktiv: !t.aktiv })
      .eq("id", t.id);
    laden();
  }

  async function loeschen(id: number) {
    await supabase.from("termine").delete().eq("id", id);
    laden();
  }

  const wochentage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

  return (
    <PasswortSchutz>
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Admin – Termine verwalten</h2>

      {/* Neuer Termin */}
      <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>Neuer Termin</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>Datum</label>
            <input
              type="text"
              placeholder="z.B. 30. Mai 2026"
              value={neu.datum}
              onChange={(e) => setNeu({ ...neu, datum: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>Wochentag</label>
            <select
              value={neu.wochentag}
              onChange={(e) => setNeu({ ...neu, wochentag: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px" }}
            >
              <option value="">-- Wochentag --</option>
              {wochentage.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>Titel</label>
            <input
              type="text"
              value={neu.titel}
              onChange={(e) => setNeu({ ...neu, titel: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>Ort</label>
            <input
              type="text"
              value={neu.ort}
              onChange={(e) => setNeu({ ...neu, ort: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>Max. Teilnehmer</label>
            <input
              type="number"
              value={neu.max_teilnehmer}
              onChange={(e) => setNeu({ ...neu, max_teilnehmer: parseInt(e.target.value) })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>Details (optional)</label>
            <textarea
              value={neu.details}
              onChange={(e) => setNeu({ ...neu, details: e.target.value })}
              placeholder="z.B. Treffpunkt, Ausrüstung, Hinweise..."
              rows={3}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px" }}
            />
          </div>
        </div>
        <button
          onClick={hinzufuegen}
          style={{
            padding: "12px 24px",
            background: "#3355cc",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ➕ Termin hinzufügen
        </button>
        {gespeichert && (
          <span style={{ marginLeft: "16px", color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>
        )}
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