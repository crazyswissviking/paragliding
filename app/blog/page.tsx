"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
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

function lv95zuWgs84(e: number, n: number): { lat: number; lng: number } {
  const e_ = (e - 2600000) / 1000000;
  const n_ = (n - 1200000) / 1000000;
  const lng = 2.6779094 + 4.728982 * e_ + 0.791484 * e_ * n_ + 0.1306 * e_ * n_ * n_ - 0.0436 * e_ * e_ * e_;
  const lat = 16.9023892 + 3.238272 * n_ - 0.270978 * e_ * e_ - 0.002528 * n_ * n_ - 0.0447 * e_ * e_ * n_ - 0.014 * n_ * n_ * n_;
  return { lat: (lat * 100) / 36, lng: (lng * 100) / 36 };
}

type Blog = {
  id: number;
  titel: string;
  text: string;
  tipps: string;
  bilder: string[];
  video_url: string;
  startpunkt_lv95: string;
  startpunkt_lat: number;
  startpunkt_lng: number;
  startpunkt_hoehe: number;
  landeplatz_lv95: string;
  landeplatz_lat: number;
  landeplatz_lng: number;
  landeplatz_hoehe: number;
  route_url: string;
  aktiv: boolean;
};

type BlogOhneId = Omit<Blog, "id">;

const leer = (): BlogOhneId => ({
  titel: "", text: "", tipps: "", bilder: [], video_url: "",
  startpunkt_lv95: "", startpunkt_lat: 0, startpunkt_lng: 0, startpunkt_hoehe: 0,
  landeplatz_lv95: "", landeplatz_lat: 0, landeplatz_lng: 0, landeplatz_hoehe: 0,
  route_url: "", aktiv: true,
});

const inputStyle = { width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" };

// ── KoordBlock ausserhalb ──────────────────────────────────────────────────
function KoordBlock({ lv95Label, lat, lng, hoehe, onKoord }: {
  lv95Label: string;
  lat: number; lng: number; hoehe: number;
  onKoord: (lat: number, lng: number, lv95: string) => void;
}) {
  const [eingabe, setEingabe] = useState("");

  const umrechnen = (wert: string) => {
    const clean = wert.replace(/'/g, "").replace(/\s/g, "");
    const parts = clean.split(",");
    if (parts.length === 2) {
      const e = parseFloat(parts[0]);
      const n = parseFloat(parts[1]);
      if (e && n) {
        const { lat: newLat, lng: newLng } = lv95zuWgs84(e, n);
        onKoord(Math.round(newLat * 100000) / 100000, Math.round(newLng * 100000) / 100000, wert);
      }
    }
  };

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🗺 {lv95Label} LV95</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input type="text" placeholder="z.B. 2'607'997, 1'172'283" value={eingabe} onChange={(e) => setEingabe(e.target.value)} onKeyDown={(e) => e.key === "Enter" && umrechnen(eingabe)} style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={() => umrechnen(eingabe)} style={{ padding: "8px 14px", background: "#3355cc", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}>🔄 Umrechnen</button>
      </div>
      {lat !== 0 && lng !== 0 && <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#2d6a4f" }}>✅ WGS84: {lat}, {lng}</p>}
      {hoehe > 0 && <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#2d6a4f" }}>⛰ Höhe: {hoehe} m</p>}
      <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#888" }}>💡 Koordinaten von map.geo.admin.ch kopieren</p>
    </div>
  );
}

// ── BlogFormular ausserhalb ────────────────────────────────────────────────
function BlogFormular({ data, set, uploadLoading, onBilderHochladen }: {
  data: BlogOhneId | Blog;
  set: (v: any) => void;
  uploadLoading: boolean;
  onBilderHochladen: (files: FileList | null) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Titel</label>
        <input type="text" value={data.titel} onChange={(e) => set({ ...data, titel: e.target.value })} placeholder="Blog Titel" style={inputStyle} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Blog Text (Markdown)</label>
        <textarea value={data.text} onChange={(e) => set({ ...data, text: e.target.value })} rows={6} placeholder="Beschreibe dein Abenteuer..." style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace" }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>💡 Tipps & Tricks (eine Zeile pro Tipp)</label>
        <textarea value={data.tipps} onChange={(e) => set({ ...data, tipps: e.target.value })} rows={4} placeholder={"Tipp 1\nTipp 2\nTipp 3"} style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace" }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🖼 Bildergalerie</label>
        <label style={{ display: "inline-block", padding: "8px 14px", background: uploadLoading ? "#aaa" : "#3355cc", color: "white", borderRadius: "6px", cursor: "pointer", fontSize: "13px", marginBottom: "8px" }}>
          {uploadLoading ? "⏳ Wird hochgeladen..." : "📁 Bilder hochladen"}
          <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => onBilderHochladen(e.target.files)} disabled={uploadLoading} />
        </label>
        {data.bilder && data.bilder.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
            {data.bilder.map((url: string, i: number) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={url} style={{ width: "80px", height: "60px", objectFit: "cover", borderRadius: "6px" }} />
                <button onClick={() => set({ ...data, bilder: data.bilder.filter((_: string, j: number) => j !== i) })} style={{ position: "absolute", top: "-6px", right: "-6px", background: "#e74c3c", color: "white", border: "none", borderRadius: "50%", width: "18px", height: "18px", cursor: "pointer", fontSize: "11px", lineHeight: "18px", textAlign: "center", padding: "0" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🎥 Video URL</label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input type="text" value={data.video_url} onChange={(e) => set({ ...data, video_url: e.target.value })} placeholder="https://res.cloudinary.com/..." style={{ ...inputStyle, flex: 1 }} />
          <label style={{ padding: "8px 14px", background: "#f0f4ff", color: "#3355cc", border: "1px solid #3355cc", borderRadius: "6px", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}>
            📁 Upload
            <input type="file" accept="video/*" style={{ display: "none" }} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await cloudinaryUpload(file);
              set({ ...data, video_url: url });
            }} />
          </label>
        </div>
      </div>
      <KoordBlock
        lv95Label="Startplatz Koordinaten"
        lat={data.startpunkt_lat}
        lng={data.startpunkt_lng}
        hoehe={data.startpunkt_hoehe}
        onKoord={(lat, lng, lv95) => set({ ...data, startpunkt_lat: lat, startpunkt_lng: lng, startpunkt_lv95: lv95 })}
      />
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🏔 Startplatz Höhe (m)</label>
        <input type="number" value={data.startpunkt_hoehe} onChange={(e) => set({ ...data, startpunkt_hoehe: parseInt(e.target.value) })} style={inputStyle} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🟢 Landeplatz Name</label>
        <input type="text" value={data.landeplatz_lv95} onChange={(e) => set({ ...data, landeplatz_lv95: e.target.value })} placeholder="z.B. Engelberg Dorf" style={inputStyle} />
      </div>
      <KoordBlock
        lv95Label="Landeplatz Koordinaten"
        lat={data.landeplatz_lat}
        lng={data.landeplatz_lng}
        hoehe={data.landeplatz_hoehe}
        onKoord={(lat, lng, lv95) => set({ ...data, landeplatz_lat: lat, landeplatz_lng: lng, landeplatz_lv95: lv95 })}
      />
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🟢 Landeplatz Höhe (m)</label>
        <input type="number" value={data.landeplatz_hoehe} onChange={(e) => set({ ...data, landeplatz_hoehe: parseInt(e.target.value) })} style={inputStyle} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🗺 Route URL</label>
        <input type="text" value={data.route_url} onChange={(e) => set({ ...data, route_url: e.target.value })} placeholder="https://..." style={inputStyle} />
      </div>
    </div>
  );
}

// ── Hauptkomponente ────────────────────────────────────────────────────────
export default function AdminBlog() {
  const [beitraege, setBeitraege] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [neu, setNeu] = useState<BlogOhneId>(leer());
  const [gespeichert, setGespeichert] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<Blog | null>(null);
  const [bearbeitenGespeichert, setBearbeitenGespeichert] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  async function laden() {
    const { data } = await supabase.from("blog").select("*").order("erstellt_am", { ascending: false });
    setBeitraege(data || []);
    setLoading(false);
  }

  useEffect(() => { laden(); }, []);

  async function hinzufuegen() {
    if (!neu.titel) return;
    await supabase.from("blog").insert([neu]);
    setNeu(leer());
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
    laden();
  }

  async function speichern() {
    if (!bearbeiten) return;
    await supabase.from("blog").update({
      titel: bearbeiten.titel, text: bearbeiten.text, tipps: bearbeiten.tipps,
      bilder: bearbeiten.bilder, video_url: bearbeiten.video_url,
      startpunkt_lv95: bearbeiten.startpunkt_lv95, startpunkt_lat: bearbeiten.startpunkt_lat,
      startpunkt_lng: bearbeiten.startpunkt_lng, startpunkt_hoehe: bearbeiten.startpunkt_hoehe,
      landeplatz_lv95: bearbeiten.landeplatz_lv95, landeplatz_lat: bearbeiten.landeplatz_lat,
      landeplatz_lng: bearbeiten.landeplatz_lng, landeplatz_hoehe: bearbeiten.landeplatz_hoehe,
      route_url: bearbeiten.route_url,
    }).eq("id", bearbeiten.id);
    setBearbeitenGespeichert(true);
    setTimeout(() => { setBearbeitenGespeichert(false); setBearbeiten(null); }, 1500);
    laden();
  }

  async function toggleAktiv(b: Blog) {
    await supabase.from("blog").update({ aktiv: !b.aktiv }).eq("id", b.id);
    laden();
  }

  async function loeschen(id: number) {
    if (!confirm("Beitrag wirklich löschen?")) return;
    await supabase.from("blog").delete().eq("id", id);
    laden();
  }

  async function bilderHochladen(files: FileList | null, data: BlogOhneId | Blog, set: (v: any) => void) {
    if (!files) return;
    setUploadLoading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await cloudinaryUpload(file);
      urls.push(url);
    }
    set({ ...data, bilder: [...(data.bilder || []), ...urls] });
    setUploadLoading(false);
  }

  return (
    <PasswortSchutz>
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>📖 Blog</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Admin – Beiträge verwalten</h2>

      {bearbeiten && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", maxWidth: "650px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "20px" }}>Beitrag bearbeiten</h3>
              <button onClick={() => setBearbeiten(null)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <BlogFormular
              data={bearbeiten}
              set={(v) => setBearbeiten({ ...bearbeiten, ...v })}
              uploadLoading={uploadLoading}
              onBilderHochladen={(files) => bilderHochladen(files, bearbeiten, (v) => setBearbeiten({ ...bearbeiten, ...v }))}
            />
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "20px" }}>
              <button onClick={speichern} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>💾 Speichern</button>
              <button onClick={() => setBearbeiten(null)} style={{ padding: "10px 24px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Abbrechen</button>
              {bearbeitenGespeichert && <span style={{ color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>}
            </div>
          </div>
        </div>
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>Neuer Beitrag</h3>
        <BlogFormular
          data={neu}
          set={setNeu}
          uploadLoading={uploadLoading}
          onBilderHochladen={(files) => bilderHochladen(files, neu, setNeu)}
        />
        <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={hinzufuegen} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>
            ➕ Beitrag hinzufügen
          </button>
          {gespeichert && <span style={{ color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>}
        </div>
      </div>

      <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Bestehende Beiträge</h3>
      {loading && <p>Wird geladen...</p>}
      {!loading && beitraege.map((b) => (
        <div key={b.id} style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "16px 24px", marginBottom: "12px", opacity: b.aktiv ? 1 : 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>{b.titel}</p>
              <p style={{ margin: "0", fontSize: "13px", color: "#aaa" }}>
                {b.bilder?.length || 0} Bilder · {b.video_url ? "Video ✓" : "Kein Video"} · {b.tipps ? "Tipps ✓" : "Keine Tipps"}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setBearbeiten(b)} style={{ padding: "8px 14px", background: "#f0f4ff", color: "#3355cc", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>✏️ Bearbeiten</button>
              <button onClick={() => toggleAktiv(b)} style={{ padding: "8px 14px", background: b.aktiv ? "#e6f4ea" : "#f5f5f5", color: b.aktiv ? "#2d6a4f" : "#888", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>{b.aktiv ? "✅ Aktiv" : "⏸ Inaktiv"}</button>
              <button onClick={() => loeschen(b.id)} style={{ padding: "8px 14px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>🗑 Löschen</button>
            </div>
          </div>
        </div>
      ))}
    </main>
    </PasswortSchutz>
  );
}