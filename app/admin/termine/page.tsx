"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import PasswortSchutz from "../passwort";
import RichTextEditor from "../../components/RichTextEditor";

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
  kategorie: string;
  ort: string;
  max_teilnehmer: number;
  aktiv: boolean;
  details: string;
  bild_url: string;
  video_url: string;
  bilder: string[];
  hikeandfly_id: number | null;
  abgesagt: boolean;
  abgesagt_begruendung: string;
};

type NeuerTermin = {
  datum: string;
  wochentag: string;
  titel: string;
  kategorie: string;
  ort: string;
  max_teilnehmer: number;
  aktiv: boolean;
  details: string;
  bild_url: string;
  video_url: string;
  bilder: string[];
  hikeandfly_id: number | null;
  abgesagt: boolean;
  abgesagt_begruendung: string;
};

type HikeAndFlyOption = {
  id: number;
  titel: string;
};

const parseDate = (d: string) => {
  const [day, month, year] = d.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
};

const wochentagAusDatum = (datum: string): string => {
  const [day, month, year] = datum.split(".").map(Number);
  if (!day || !month || !year) return "";
  const date = new Date(year, month - 1, day);
  const tage = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  return tage[date.getDay()];
};

const leerTermin = (): NeuerTermin => ({
  datum: "", wochentag: "", titel: "",
  kategorie: "Vollmond-/Nachtflug",
  ort: "Wird noch bekanntgegeben", max_teilnehmer: 6,
  aktiv: true, details: "", bild_url: "", video_url: "", bilder: [],
  hikeandfly_id: null, abgesagt: false, abgesagt_begruendung: "",
});

const inputStyle = { width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" };

// ── MediaUpload ────────────────────────────────────────────────────────────
function MediaUpload({ bildUrl, videoUrl, bilder, onBildUrl, onVideoUrl, onBilder }: {
  bildUrl: string; videoUrl: string; bilder: string[];
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
              urls.push(await cloudinaryUpload(file));
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
        <label style={{ display: "inline-block", padding: "8px 14px", background: uploading ? "#aaa" : "#f0f4ff", color: "#3355cc", border: "1px solid #3355cc", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
          📁 Video hochladen
          <input type="file" accept="video/*" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            const url = await cloudinaryUpload(file);
            onVideoUrl(url);
            setUploading(false);
          }} />
        </label>
        {videoUrl && <video src={videoUrl} controls style={{ marginTop: "8px", width: "100%", maxHeight: "150px", borderRadius: "6px" }} />}
      </div>
    </>
  );
}

// ── TerminFormular ausserhalb ──────────────────────────────────────────────
function TerminFormular({ data, set, uploadLoading, hikeAndFlyOptionen, kategorienListe }: {
  data: NeuerTermin | Termin;
  set: (v: any) => void;
  uploadLoading?: boolean;
  hikeAndFlyOptionen: HikeAndFlyOption[];
  kategorienListe: string[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Datum */}
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>📅 Datum (dd.mm.yyyy)</label>
        <input
          type="text"
          placeholder="z.B. 30.05.2026"
          value={data.datum}
          onChange={(e) => set({ ...data, datum: e.target.value, wochentag: wochentagAusDatum(e.target.value) })}
          style={inputStyle}
        />
        {data.wochentag && <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#888" }}>📅 {data.wochentag}</p>}
      </div>

      {/* Titel */}
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>✏️ Titel</label>
        <input type="text" value={data.titel} onChange={(e) => set({ ...data, titel: e.target.value })} placeholder="z.B. Vollmond-Nachtflug Niederhorn" style={inputStyle} />
      </div>

      {/* Art des Events */}
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🪂 Art des Events</label>
        <select value={data.kategorie} onChange={(e) => set({ ...data, kategorie: e.target.value })} style={inputStyle}>
          {kategorienListe.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {/* Treffpunkt */}
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>📍 Treffpunkt</label>
        <input type="text" value={data.ort} onChange={(e) => set({ ...data, ort: e.target.value })} placeholder="z.B. Parkplatz Niederhorn" style={inputStyle} />
      </div>

      {/* Hike & Fly */}
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🥾 Hike & Fly Abenteuer (optional)</label>
        <select value={data.hikeandfly_id || ""} onChange={(e) => set({ ...data, hikeandfly_id: e.target.value ? parseInt(e.target.value) : null })} style={inputStyle}>
          <option value="">-- Kein Hike & Fly --</option>
          {hikeAndFlyOptionen.map((h) => <option key={h.id} value={h.id}>{h.titel}</option>)}
        </select>
      </div>

      {/* Max Teilnehmer */}
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>👥 Max. Teilnehmer</label>
        <input type="number" value={data.max_teilnehmer} onChange={(e) => set({ ...data, max_teilnehmer: parseInt(e.target.value) })} style={inputStyle} />
      </div>

      {/* Infos */}
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>ℹ️ Infos</label>
        <RichTextEditor value={data.details} onChange={(val) => set({ ...data, details: val })} />
      </div>

      {/* Checkliste */}
      <div style={{ padding: "16px", background: "#f9f9f9", borderRadius: "10px", border: "1px solid #eee" }}>
        <p style={{ margin: "0 0 12px", fontWeight: "bold", fontSize: "13px" }}>📋 Status</p>
        <div style={{ display: "flex", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
            <input
              type="radio"
              name={`status-${data.datum}`}
              checked={!data.abgesagt}
              onChange={() => set({ ...data, abgesagt: false, abgesagt_begruendung: "" })}
            />
            ✅ Findet statt
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
            <input
              type="radio"
              name={`status-${data.datum}`}
              checked={data.abgesagt}
              onChange={() => set({ ...data, abgesagt: true })}
            />
            🚫 Abgesagt
          </label>
        </div>
        {data.abgesagt && (
          <div style={{ marginTop: "12px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px", color: "#c0392b" }}>Begründung</label>
            <textarea
              value={data.abgesagt_begruendung}
              onChange={(e) => set({ ...data, abgesagt_begruendung: e.target.value })}
              placeholder="z.B. Wetterverschlechterung, zu wenig Anmeldungen..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical", border: "1px solid #e74c3c" }}
            />
          </div>
        )}
      </div>

      {/* Medien */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <MediaUpload
          bildUrl={data.bild_url}
          videoUrl={data.video_url}
          bilder={data.bilder || []}
          onBildUrl={(url) => set({ ...data, bild_url: url })}
          onVideoUrl={(url) => set({ ...data, video_url: url })}
          onBilder={(b) => set({ ...data, bilder: b })}
        />
      </div>
    </div>
  );
}

// ── Hauptkomponente ────────────────────────────────────────────────────────
export default function AdminTermine() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [loading, setLoading] = useState(true);
  const [neueTermine, setNeueTermine] = useState<NeuerTermin[]>([leerTermin()]);
  const [gespeichert, setGespeichert] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<Termin | null>(null);
  const [bearbeitenGespeichert, setBearbeitenGespeichert] = useState(false);
  const [hikeAndFlyOptionen, setHikeAndFlyOptionen] = useState<HikeAndFlyOption[]>([]);
  const [kategorienListe, setKategorienListe] = useState<string[]>([]);

  async function laden() {
    const { data } = await supabase.from("termine").select("*");
    const sortiert = (data || []).sort((a, b) => parseDate(a.datum) - parseDate(b.datum));
    setTermine(sortiert);
    setLoading(false);
  }

  useEffect(() => {
    laden();
    supabase.from("hikeandfly").select("id, titel").eq("aktiv", true).order("titel").then(({ data }) => {
      setHikeAndFlyOptionen(data || []);
    });
    supabase.from("kategorien").select("name").order("reihenfolge").then(({ data }) => {
      setKategorienListe((data || []).map((k) => k.name));
    });
  }, []);

  function terminAendern(index: number, feld: keyof NeuerTermin, wert: any) {
    const updated = [...neueTermine];
    updated[index] = { ...updated[index], [feld]: wert };
    if (feld === "datum") updated[index].wochentag = wochentagAusDatum(wert);
    setNeueTermine(updated);
  }

  function terminHinzufuegen() { setNeueTermine([...neueTermine, leerTermin()]); }
  function terminEntfernen(index: number) { setNeueTermine(neueTermine.filter((_, i) => i !== index)); }

  async function alleSpeichern() {
    const gueltig = neueTermine.filter((t) => t.datum && t.titel);
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
      titel: bearbeiten.titel, ort: bearbeiten.ort, kategorie: bearbeiten.kategorie,
      max_teilnehmer: bearbeiten.max_teilnehmer, details: bearbeiten.details,
      bild_url: bearbeiten.bild_url, video_url: bearbeiten.video_url,
      bilder: bearbeiten.bilder, hikeandfly_id: bearbeiten.hikeandfly_id,
      abgesagt: bearbeiten.abgesagt, abgesagt_begruendung: bearbeiten.abgesagt_begruendung,
    }).eq("id", bearbeiten.id);
    setBearbeitenGespeichert(true);
    setTimeout(() => { setBearbeitenGespeichert(false); setBearbeiten(null); }, 1500);
    laden();
  }

  return (
    <PasswortSchutz>
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 VikingFly</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Admin – Termine verwalten</h2>

      {/* Bearbeiten Modal */}
      {bearbeiten && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", maxWidth: "600px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "20px" }}>Termin bearbeiten</h3>
              <button onClick={() => setBearbeiten(null)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <TerminFormular
              data={bearbeiten}
              set={(v) => setBearbeiten({ ...bearbeiten, ...v })}
              hikeAndFlyOptionen={hikeAndFlyOptionen}
              kategorienListe={kategorienListe}
            />
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
            <TerminFormular
              data={neu}
              set={(v) => {
                const updated = [...neueTermine];
                updated[index] = v;
                setNeueTermine(updated);
              }}
              hikeAndFlyOptionen={hikeAndFlyOptionen}
              kategorienListe={kategorienListe}
            />
          </div>
        ))}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
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
              <p style={{ margin: "0 0 2px", fontSize: "13px", color: "#aaa" }}>
                📍 {t.ort} · Max. {t.max_teilnehmer}
                {t.bilder?.length > 0 ? ` · ${t.bilder.length} Bilder` : ""}
                {t.video_url ? " · Video ✓" : ""}
              </p>
              {t.hikeandfly_id && <p style={{ margin: "0 0 2px", fontSize: "13px", color: "#7799ff" }}>🥾 Hike & Fly verknüpft</p>}
              {t.abgesagt && <p style={{ margin: "0", fontSize: "13px", color: "#e74c3c" }}>🚫 Abgesagt{t.abgesagt_begruendung ? `: ${t.abgesagt_begruendung}` : ""}</p>}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
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