"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import PasswortSchutz from "../passwort";
import ReactMarkdown from "react-markdown";


type Termin = {
  id: number;
  datum: string;
  wochentag: string;
  titel: string;
  ort: string;
  max_teilnehmer: number;
  aktiv: boolean;
  details: string;
  bild_url: string;
  video_url: string;
};

type NeuerTermin = {
  datum: string;
  wochentag: string;
  titel: string;
  ort: string;
  max_teilnehmer: number;
  aktiv: boolean;
  details: string;
  bild_url: string;
  video_url: string;
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
  bild_url: "",
  video_url: "",
});

const wochentage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const inputStyle = { width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" };

export default function AdminTermine() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [loading, setLoading] = useState(true);
  const [neueTermine, setNeueTermine] = useState<NeuerTermin[]>([leerTermin()]);
  const [gespeichert, setGespeichert] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<Termin | null>(null);
  const [bearbeitenGespeichert, setBearbeitenGespeichert] = useState(false);

  async function laden() {
    const { data } = await supabase.from("termine").select("*");
    const sortiert = (data || []).sort((a, b) => parseDate(a.datum) - parseDate(b.datum));
    setTermine(sortiert);
    setLoading(false);
  }

  useEffect(() => { laden(); }, []);

  function terminAendern(index: number, feld: keyof NeuerTermin, wert: string | number | boolean) {
    const updated = [...neueTermine];
    updated[index] = { ...updated[index], [feld]: wert };
    setNeueTermine(updated);
  }

  function terminHinzufuegen() { setNeueTermine([...neueTermine, leerTermin()]); }
  function terminEntfernen(index: number) { setNeueTermine(neueTermine.filter((_, i) => i !== index)); }

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

  async function bearbeitenSpeichern() {
    if (!bearbeiten) return;
    await supabase.from("termine").update({
      datum: bearbeiten.datum,
      wochentag: bearbeiten.wochentag,
      titel: bearbeiten.titel,
      ort: bearbeiten.ort,
      max_teilnehmer: bearbeiten.max_teilnehmer,
      details: bearbeiten.details,
      bild_url: bearbeiten.bild_url,
      video_url: bearbeiten.video_url,
    }).eq("id", bearbeiten.id);
    setBearbeitenGespeichert(true);
    setTimeout(() => {
      setBearbeitenGespeichert(false);
      setBearbeiten(null);
    }, 1500);
    laden();
  }

  return (
    <PasswortSchutz>
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Admin – Termine verwalten</h2>

      {/* Bearbeiten Modal */}
      {bearbeiten && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", maxWidth: "600px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "20px" }}>Termin bearbeiten</h3>
              <button onClick={() => setBearbeiten(null)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Datum (dd.mm.yyyy)</label>
                <input type="text" value={bearbeiten.datum} onChange={(e) => setBearbeiten({ ...bearbeiten, datum: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Wochentag</label>
                <select value={bearbeiten.wochentag} onChange={(e) => setBearbeiten({ ...bearbeiten, wochentag: e.target.value })} style={inputStyle}>
                  {wochentage.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Titel</label>
                <input type="text" value={bearbeiten.titel} onChange={(e) => setBearbeiten({ ...bearbeiten, titel: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Ort</label>
                <input type="text" value={bearbeiten.ort} onChange={(e) => setBearbeiten({ ...bearbeiten, ort: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Max. Teilnehmer</label>
                <input type="number" value={bearbeiten.max_teilnehmer} onChange={(e) => setBearbeiten({ ...bearbeiten, max_teilnehmer: parseInt(e.target.value) })} style={inputStyle} />
              </div>
             <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Details</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#888" }}>✏️ Bearbeiten</p>
                    <textarea
                      value={bearbeiten.details}
                      onChange={(e) => setBearbeiten({ ...bearbeiten, details: e.target.value })}
                      placeholder={"**Fett**\n- Aufzählung 1\n- Aufzählung 2\n\nNeuer Absatz"}
                      style={{ ...inputStyle, resize: "none", fontFamily: "monospace", height: "200px" }}
                    />
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#888" }}>👁 Vorschau</p>
                    <div style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "6px", height: "200px", overflowY: "auto", fontSize: "14px", color: "#333" }}>
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p style={{ margin: "8px 0" }}>{children}</p>,
                          strong: ({ children }) => <strong style={{ color: "#000" }}>{children}</strong>,
                          ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>{children}</ul>,
                          li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
                          br: () => <br />,
                        }}
                      >
                        {bearbeiten.details || "*Noch kein Text...*"}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Bild URL (von Cloudinary)</label>
                <input type="text" value={bearbeiten.bild_url} onChange={(e) => setBearbeiten({ ...bearbeiten, bild_url: e.target.value })} placeholder="https://res.cloudinary.com/..." style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Video URL (von Cloudinary)</label>
                <input type="text" value={bearbeiten.video_url} onChange={(e) => setBearbeiten({ ...bearbeiten, video_url: e.target.value })} placeholder="https://res.cloudinary.com/..." style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "20px" }}>
              <button onClick={bearbeitenSpeichern} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>
                💾 Speichern
              </button>
              <button onClick={() => setBearbeiten(null)} style={{ padding: "10px 24px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>
                Abbrechen
              </button>
              {bearbeitenGespeichert && <span style={{ color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>}
            </div>
          </div>
        </div>
      )}

      {/* Neue Termine */}
      <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>Neue Termine</h3>
        {neueTermine.map((neu, index) => (
          <div key={index} style={{ border: "1px solid #eee", borderRadius: "8px", padding: "16px", marginBottom: "16px", background: "#fafafa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <p style={{ margin: "0", fontWeight: "bold", fontSize: "14px" }}>Termin {index + 1}</p>
              {neueTermine.length > 1 && (
                <button onClick={() => terminEntfernen(index)} style={{ padding: "4px 10px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
                  ✕ Entfernen
                </button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Datum (dd.mm.yyyy)</label>
                <input type="text" placeholder="z.B. 30.05.2026" value={neu.datum} onChange={(e) => terminAendern(index, "datum", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Wochentag</label>
                <select value={neu.wochentag} onChange={(e) => terminAendern(index, "wochentag", e.target.value)} style={inputStyle}>
                  <option value="">-- Wochentag --</option>
                  {wochentage.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Titel</label>
                <input type="text" value={neu.titel} onChange={(e) => terminAendern(index, "titel", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Ort</label>
                <input type="text" value={neu.ort} onChange={(e) => terminAendern(index, "ort", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Max. Teilnehmer</label>
                <input type="number" value={neu.max_teilnehmer} onChange={(e) => terminAendern(index, "max_teilnehmer", parseInt(e.target.value))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Details (optional)</label>
                <textarea value={neu.details} onChange={(e) => terminAendern(index, "details", e.target.value)} placeholder="**Fett**, - Aufzählung" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Bild URL (optional)</label>
                <input type="text" value={neu.bild_url} onChange={(e) => terminAendern(index, "bild_url", e.target.value)} placeholder="https://res.cloudinary.com/..." style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Video URL (optional)</label>
                <input type="text" value={neu.video_url} onChange={(e) => terminAendern(index, "video_url", e.target.value)} placeholder="https://res.cloudinary.com/..." style={inputStyle} />
              </div>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={terminHinzufuegen} style={{ padding: "10px 20px", background: "#f0f4ff", color: "#3355cc", border: "1px solid #3355cc", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>
            ➕ Weiterer Termin
          </button>
          <button onClick={alleSpeichern} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>
            💾 Alle speichern
          </button>
          {gespeichert && <span style={{ color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>}
        </div>
      </div>

      {/* Bestehende Termine */}
      <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Bestehende Termine</h3>
      {loading && <p>Wird geladen...</p>}
      {!loading && termine.map((t) => (
        <div key={t.id} style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "16px 24px", marginBottom: "12px", opacity: t.aktiv ? 1 : 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>{t.wochentag}, {t.datum}</p>
              <p style={{ margin: "0 0 2px", fontSize: "14px", color: "#555" }}>{t.titel}</p>
              <p style={{ margin: "0", fontSize: "13px", color: "#aaa" }}>📍 {t.ort} · Max. {t.max_teilnehmer} Teilnehmer</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setBearbeiten(t)} style={{ padding: "8px 14px", background: "#f0f4ff", color: "#3355cc", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                ✏️ Bearbeiten
              </button>
              <button onClick={() => toggleAktiv(t)} style={{ padding: "8px 14px", background: t.aktiv ? "#e6f4ea" : "#f5f5f5", color: t.aktiv ? "#2d6a4f" : "#888", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                {t.aktiv ? "✅ Aktiv" : "⏸ Inaktiv"}
              </button>
              <button onClick={() => loeschen(t.id)} style={{ padding: "8px 14px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                🗑 Löschen
              </button>
            </div>
          </div>
          {t.details && (
            <div style={{ marginTop: "12px", padding: "12px", background: "#f9f9f9", borderRadius: "8px", fontSize: "14px", color: "#555" }}>
              📝 <strong>Details:</strong>
              <div style={{ marginTop: "8px" }}>
                <ReactMarkdown components={{
                  p: ({ children }) => <p style={{ margin: "4px 0", color: "#555" }}>{children}</p>,
                  strong: ({ children }) => <strong style={{ color: "#333" }}>{children}</strong>,
                  ul: ({ children }) => <ul style={{ margin: "4px 0", paddingLeft: "20px", color: "#555" }}>{children}</ul>,
                  li: ({ children }) => <li style={{ marginBottom: "2px" }}>{children}</li>,
                }}>
                  {t.details}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ))}
    </main>
    </PasswortSchutz>
  );
}