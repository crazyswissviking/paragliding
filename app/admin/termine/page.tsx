"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import PasswortSchutz from "../passwort";
import ReactMarkdown from "react-markdown";

const CLOUD_NAME = "dnfnng4mm";
const UPLOAD_PRESET = "li5gwyqb";

async function cloudinaryUpload(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

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
  bilder: string[];
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
  bilder: string[];
};

const parseDate = (d: string) => {
  const [day, month, year] = d.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
};

const leerTermin = (): NeuerTermin => ({
  datum: "", wochentag: "", titel: "Vollmond-/Nachtflug",
  ort: "Wird noch bekanntgegeben", max_teilnehmer: 6,
  aktiv: true, details: "", bild_url: "", video_url: "", bilder: [],
});

const wochentage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const inputStyle = { width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" };

// ── MediaUpload ausserhalb ─────────────────────────────────────────────────
function MediaUpload({ bildUrl, videoUrl, bilder, onBildUrl, onVideoUrl, onBilder }: {
  bildUrl: string;
  videoUrl: string;
  bilder: string[];
  onBildUrl: (url: string) => void;
  onVideoUrl: (url: string) => void;
  onBilder: (bilder: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🖼 Bildergalerie</label>
        <label style={{ display: "inline-block", padding: "8px 14px", background: uploading ? "#aaa" : "#3355cc", color: "white", borderRadius: "6px", cursor: "pointer", fontSize: "13px", marginBottom: "8px" }}>
          {uploading ? "⏳ Wird hochgeladen..." : "📁 Bilder hochladen"}
          <input type="file" accept="image/*" multiple style={{ display: "none" }} disabled={uploading} onChange={async (e) => {
            if (!e.target.files) return;
            setUploading(true);
            const urls: string[] = [];
            for (const file of Array.from(e.target.files)) {
              const url = await cloudinaryUpload(file);
              urls.push(url);
            }
            onBilder([...bilder, ...urls]);
            setUploading(false);
          }} />
        </label>
        {bilder.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
            {bilder.map((url, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={url} style={{ width: "80px", height: "60px", objectFit: "cover", borderRadius: "6px" }} />
                <button onClick={() => onBilder(bilder.filter((_, j) => j !== i))} style={{ position: "absolute", top: "-6px", right: "-6px", background: "#e74c3c", color: "white", border: "none", borderRadius: "50%", width: "18px", height: "18px", cursor: "pointer", fontSize: "11px", lineHeight: "18px", textAlign: "center", padding: "0" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🎥 Video</label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input type="text" value={videoUrl} onChange={(e) => onVideoUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." style={{ ...inputStyle, flex: 1 }} />
          <label style={{ padding: "8px 14px", background: "#f0f4ff", color: "#3355cc", border: "1px solid #3355cc", borderRadius: "6px", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}>
            📁 Upload
            <input type="file" accept="video/*" style={{ display: "none" }} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              const url = await cloudinaryUpload(file);
              onVideoUrl(url);
              setUploading(false);
            }} />
          </label>
        </div>
        {videoUrl && (
          <video src={videoUrl} controls style={{ marginTop: "8px", width: "100%", maxHeight: "150px", borderRadius: "6px" }} />
        )}
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Hauptbild URL (optional, alternativ zu Galerie)</label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input type="text" value={bildUrl} onChange={(e) => onBildUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." style={{ ...inputStyle, flex: 1 }} />
          <label style={{ padding: "8px 14px", background: "#f0f4ff", color: "#3355cc", border: "1px solid #3355cc", borderRadius: "6px", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}>
            📁 Upload
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              const url = await cloudinaryUpload(file);
              onBildUrl(url);
              setUploading(false);
            }} />
          </label>
        </div>
        {bildUrl && <img src={bildUrl} style={{ marginTop: "8px", width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "6px" }} />}
      </div>
    </>
  );
}

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

  function terminAendern(index: number, feld: keyof NeuerTermin, wert: any) {
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
      datum: bearbeiten.datum, wochentag: bearbeiten.wochentag,
      titel: bearbeiten.titel, ort: bearbeiten.ort,
      max_teilnehmer: bearbeiten.max_teilnehmer, details: bearbeiten.details,
      bild_url: bearbeiten.bild_url, video_url: bearbeiten.video_url,
      bilder: bearbeiten.bilder,
    }).eq("id", bearbeiten.id);
    setBearbeitenGespeichert(true);
    setTimeout(() => { setBearbeitenGespeichert(false); setBearbeiten(null); }, 1500);
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
                    <textarea value={bearbeiten.details} onChange={(e) => setBearbeiten({ ...bearbeiten, details: e.target.value })} placeholder={"**Fett**\n- Aufzählung"} style={{ ...inputStyle, resize: "none", fontFamily: "monospace", height: "200px" }} />
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#888" }}>👁 Vorschau</p>
                    <div style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "6px", height: "200px", overflowY: "auto", fontSize: "14px", color: "#333" }}>
                      <ReactMarkdown components={{ p: ({ children }) => <p style={{ margin: "8px 0" }}>{children}</p>, strong: ({ children }) => <strong style={{ color: "#000" }}>{children}</strong>, ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>{children}</ul>, li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>, br: () => <br /> }}>
                        {bearbeiten.details || "*Noch kein Text...*"}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
              <MediaUpload
                bildUrl={bearbeiten.bild_url}
                videoUrl={bearbeiten.video_url}
                bilder={bearbeiten.bilder || []}
                onBildUrl={(url) => setBearbeiten({ ...bearbeiten, bild_url: url })}
                onVideoUrl={(url) => setBearbeiten({ ...bearbeiten, video_url: url })}
                onBilder={(b) => setBearbeiten({ ...bearbeiten, bilder: b })}
              />
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "20px" }}>
              <button onClick={bearbeitenSpeichern} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>💾 Speichern</button>
              <button onClick={() => setBearbeiten(null)} style={{ padding: "10px 24px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Abbrechen</button>
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
                <button onClick={() => terminEntfernen(index)} style={{ padding: "4px 10px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>✕ Entfernen</button>
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
              <MediaUpload
                bildUrl={neu.bild_url}
                videoUrl={neu.video_url}
                bilder={neu.bilder || []}
                onBildUrl={(url) => terminAendern(index, "bild_url", url)}
                onVideoUrl={(url) => terminAendern(index, "video_url", url)}
                onBilder={(b) => terminAendern(index, "bilder", b)}
              />
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={terminHinzufuegen} style={{ padding: "10px 20px", background: "#f0f4ff", color: "#3355cc", border: "1px solid #3355cc", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>➕ Weiterer Termin</button>
          <button onClick={alleSpeichern} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>💾 Alle speichern</button>
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
              <p style={{ margin: "0", fontSize: "13px", color: "#aaa" }}>📍 {t.ort} · Max. {t.max_teilnehmer} · {t.bilder?.length > 0 ? `${t.bilder.length} Bilder` : ""} {t.video_url ? "· Video ✓" : ""}</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setBearbeiten(t)} style={{ padding: "8px 14px", background: "#f0f4ff", color: "#3355cc", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>✏️ Bearbeiten</button>
              <button onClick={() => toggleAktiv(t)} style={{ padding: "8px 14px", background: t.aktiv ? "#e6f4ea" : "#f5f5f5", color: t.aktiv ? "#2d6a4f" : "#888", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>{t.aktiv ? "✅ Aktiv" : "⏸ Inaktiv"}</button>
              <button onClick={() => loeschen(t.id)} style={{ padding: "8px 14px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>🗑 Löschen</button>
            </div>
          </div>
        </div>
      ))}
    </main>
    </PasswortSchutz>
  );
}