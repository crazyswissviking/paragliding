"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import PasswortSchutz from "../passwort";
import ReactMarkdown from "react-markdown";

function lv95zuWgs84(e: number, n: number): { lat: number; lng: number } {
  const e_ = (e - 2600000) / 1000000;
  const n_ = (n - 1200000) / 1000000;
  const lng = 2.6779094 + 4.728982 * e_ + 0.791484 * e_ * n_ + 0.1306 * e_ * n_ * n_ - 0.0436 * e_ * e_ * e_;
  const lat = 16.9023892 + 3.238272 * n_ - 0.270978 * e_ * e_ - 0.002528 * n_ * n_ - 0.0447 * e_ * e_ * n_ - 0.014 * n_ * n_ * n_;
  return { lat: (lat * 100) / 36, lng: (lng * 100) / 36 };
}

type HikeAndFly = {
  id: number;
  titel: string;
  beschreibung: string;
  startpunkt: string;
  via: string;
  ziel: string;
  schwierigkeit: string;
  strecke_km: number;
  hoehenmeter: number;
  tempo_wanderweg: string;
  tempo_sportlich: string;
  tempo_pb: string;
  route_url: string;
  bild_url: string;
  video_url: string;
  aktiv: boolean;
  lat: number;
  lng: number;
};

const leer = (): Omit<HikeAndFly, "id"> => ({
  titel: "", beschreibung: "", startpunkt: "", via: "", ziel: "",
  schwierigkeit: "", strecke_km: 0, hoehenmeter: 0, tempo_wanderweg: "",
  tempo_sportlich: "", tempo_pb: "", route_url: "", bild_url: "",
  video_url: "", aktiv: true, lat: 0, lng: 0,
});

const inputStyle = { width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" };

export default function AdminHikeAndFly() {
  const [abenteuer, setAbenteuer] = useState<HikeAndFly[]>([]);
  const [loading, setLoading] = useState(true);
  const [neu, setNeu] = useState(leer());
  const [gespeichert, setGespeichert] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<HikeAndFly | null>(null);
  const [bearbeitenGespeichert, setBearbeitenGespeichert] = useState(false);
  const [lv95Neu, setLv95Neu] = useState({ e: 0, n: 0 });
  const [lv95Bearbeiten, setLv95Bearbeiten] = useState({ e: 0, n: 0 });

  async function laden() {
    const { data } = await supabase.from("hikeandfly").select("*").order("id", { ascending: true });
    setAbenteuer(data || []);
    setLoading(false);
  }

  useEffect(() => { laden(); }, []);

  async function hinzufuegen() {
    if (!neu.titel) return;
    await supabase.from("hikeandfly").insert([neu]);
    setNeu(leer());
    setLv95Neu({ e: 0, n: 0 });
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
    laden();
  }

  async function toggleAktiv(a: HikeAndFly) {
    await supabase.from("hikeandfly").update({ aktiv: !a.aktiv }).eq("id", a.id);
    laden();
  }

  async function loeschen(id: number) {
    if (!confirm("Abenteuer wirklich löschen?")) return;
    await supabase.from("hikeandfly").delete().eq("id", id);
    laden();
  }

  async function bearbeitenSpeichern() {
    if (!bearbeiten) return;
    await supabase.from("hikeandfly").update({
      titel: bearbeiten.titel, beschreibung: bearbeiten.beschreibung,
      startpunkt: bearbeiten.startpunkt, via: bearbeiten.via, ziel: bearbeiten.ziel,
      schwierigkeit: bearbeiten.schwierigkeit, strecke_km: bearbeiten.strecke_km,
      hoehenmeter: bearbeiten.hoehenmeter, tempo_wanderweg: bearbeiten.tempo_wanderweg,
      tempo_sportlich: bearbeiten.tempo_sportlich, tempo_pb: bearbeiten.tempo_pb,
      lat: bearbeiten.lat, lng: bearbeiten.lng, route_url: bearbeiten.route_url,
      bild_url: bearbeiten.bild_url, video_url: bearbeiten.video_url,
    }).eq("id", bearbeiten.id);
    setBearbeitenGespeichert(true);
    setTimeout(() => { setBearbeitenGespeichert(false); setBearbeiten(null); }, 1500);
    laden();
  }

  const KoordBlock = ({
    lv95, setLv95, lat, lng, setLatLng
  }: {
    lv95: { e: number; n: number };
    setLv95: (v: { e: number; n: number }) => void;
    lat: number; lng: number;
    setLatLng: (lat: number, lng: number) => void;
  }) => {
    const [eingabe, setEingabe] = useState("");

    const umrechnen = (wert: string) => {
      const clean = wert.replace(/'/g, "").replace(/\s/g, "");
      const parts = clean.split(",");
      if (parts.length === 2) {
        const e = parseFloat(parts[0]);
        const n = parseFloat(parts[1]);
        if (e && n) {
          setLv95({ e, n });
          const { lat: newLat, lng: newLng } = lv95zuWgs84(e, n);
          setLatLng(Math.round(newLat * 100000) / 100000, Math.round(newLng * 100000) / 100000);
        }
      }
    };

    return (
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🗺 Koordinaten LV95</label>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <input
            type="text"
            placeholder="z.B. 2'607'997, 1'172'283"
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && umrechnen(eingabe)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => umrechnen(eingabe)}
            style={{ padding: "8px 14px", background: "#3355cc", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}
          >
            🔄 Umrechnen
          </button>
        </div>
        {lat !== 0 && lng !== 0 && (
          <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#2d6a4f" }}>
            ✅ WGS84: {lat}, {lng}
          </p>
        )}
        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#888" }}>💡 Koordinaten von map.geo.admin.ch kopieren und direkt einfügen</p>
      </div>
    );
  };

  return (
    <PasswortSchutz>
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🥾 Hike & Fly</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Admin – Abenteuer verwalten</h2>

      {/* Bearbeiten Modal */}
      {bearbeiten && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", maxWidth: "650px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "20px" }}>Abenteuer bearbeiten</h3>
              <button onClick={() => setBearbeiten(null)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Titel</label>
                <input type="text" value={bearbeiten.titel} onChange={(e) => setBearbeiten({ ...bearbeiten, titel: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🚩 Startpunkt</label>
                <input type="text" value={bearbeiten.startpunkt} onChange={(e) => setBearbeiten({ ...bearbeiten, startpunkt: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>📍 Via</label>
                <input type="text" value={bearbeiten.via} onChange={(e) => setBearbeiten({ ...bearbeiten, via: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🏁 Ziel</label>
                <input type="text" value={bearbeiten.ziel} onChange={(e) => setBearbeiten({ ...bearbeiten, ziel: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Schwierigkeit</label>
                <select value={bearbeiten.schwierigkeit} onChange={(e) => setBearbeiten({ ...bearbeiten, schwierigkeit: e.target.value })} style={inputStyle}>
                  <option value="">-- Wählen --</option>
                  <option value="🛋️ Gemütlich">🛋️ Wanderwegweiser gemütlich – ich kann noch reden</option>
                  <option value="🥾 Moderat">🥾 Huiii – da geht der Puls schon hoch</option>
                  <option value="💪 Fordernd">💪 Wandern ist so schön haben sie gesagt</option>
                  <option value="🔥 Brutal">🔥 Ich meditiere mich hoch</option>
                  <option value="💀 Endgegner">💀 Warum nur – und wo ist das Sauerstoffzelt?</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Strecke (km)</label>
                <input type="number" value={bearbeiten.strecke_km} onChange={(e) => setBearbeiten({ ...bearbeiten, strecke_km: parseFloat(e.target.value) })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Höhenmeter</label>
                <input type="number" value={bearbeiten.hoehenmeter} onChange={(e) => setBearbeiten({ ...bearbeiten, hoehenmeter: parseInt(e.target.value) })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🚶 Tempo Wanderwegweiser</label>
                <input type="text" value={bearbeiten.tempo_wanderweg} onChange={(e) => setBearbeiten({ ...bearbeiten, tempo_wanderweg: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🏃 Tempo H&F Sportlich</label>
                <input type="text" value={bearbeiten.tempo_sportlich} onChange={(e) => setBearbeiten({ ...bearbeiten, tempo_sportlich: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🏆 Tempo H&F PB</label>
                <input type="text" value={bearbeiten.tempo_pb} onChange={(e) => setBearbeiten({ ...bearbeiten, tempo_pb: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Route URL</label>
                <input type="text" value={bearbeiten.route_url} onChange={(e) => setBearbeiten({ ...bearbeiten, route_url: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Bild URL</label>
                <input type="text" value={bearbeiten.bild_url} onChange={(e) => setBearbeiten({ ...bearbeiten, bild_url: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Video URL</label>
                <input type="text" value={bearbeiten.video_url} onChange={(e) => setBearbeiten({ ...bearbeiten, video_url: e.target.value })} style={inputStyle} />
              </div>
              <KoordBlock
                lv95={lv95Bearbeiten}
                setLv95={setLv95Bearbeiten}
                lat={bearbeiten.lat}
                lng={bearbeiten.lng}
                setLatLng={(lat, lng) => setBearbeiten({ ...bearbeiten, lat, lng })}
              />
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Beschreibung</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#888" }}>✏️ Bearbeiten</p>
                    <textarea value={bearbeiten.beschreibung} onChange={(e) => setBearbeiten({ ...bearbeiten, beschreibung: e.target.value })} placeholder={"**Fett**\n- Aufzählung"} style={{ ...inputStyle, resize: "none", fontFamily: "monospace", height: "200px" }} />
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#888" }}>👁 Vorschau</p>
                    <div style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "6px", height: "200px", overflowY: "auto", fontSize: "14px", color: "#333" }}>
                      <ReactMarkdown components={{ p: ({ children }) => <p style={{ margin: "8px 0" }}>{children}</p>, strong: ({ children }) => <strong style={{ color: "#000" }}>{children}</strong>, ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>{children}</ul>, li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>, br: () => <br /> }}>
                        {bearbeiten.beschreibung || "*Noch kein Text...*"}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "20px" }}>
              <button onClick={bearbeitenSpeichern} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>💾 Speichern</button>
              <button onClick={() => setBearbeiten(null)} style={{ padding: "10px 24px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Abbrechen</button>
              {bearbeitenGespeichert && <span style={{ color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>}
            </div>
          </div>
        </div>
      )}

      {/* Neues Abenteuer */}
      <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>Neues Abenteuer</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Titel</label>
            <input type="text" value={neu.titel} onChange={(e) => setNeu({ ...neu, titel: e.target.value })} placeholder="z.B. Möntschelen Runde" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🚩 Startpunkt</label>
            <input type="text" value={neu.startpunkt} onChange={(e) => setNeu({ ...neu, startpunkt: e.target.value })} placeholder="z.B. Engelberg Dorf" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>📍 Via</label>
            <input type="text" value={neu.via} onChange={(e) => setNeu({ ...neu, via: e.target.value })} placeholder="z.B. Möntschelen" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🏁 Ziel</label>
            <input type="text" value={neu.ziel} onChange={(e) => setNeu({ ...neu, ziel: e.target.value })} placeholder="z.B. Engelberg Dorf" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Schwierigkeit</label>
            <select value={neu.schwierigkeit} onChange={(e) => setNeu({ ...neu, schwierigkeit: e.target.value })} style={inputStyle}>
              <option value="">-- Wählen --</option>
              <option value="🛋️ Gemütlich">🛋️ Gemütlich – Sonntagsspaziergang</option>
              <option value="🥾 Moderat">🥾 Moderat – Für Fit-Gebliebene</option>
              <option value="💪 Fordernd">💪 Fordernd – Beine werden müde</option>
              <option value="🔥 Brutal">🔥 Brutal – Knie hassen dich danach</option>
              <option value="💀 Endgegner">💀 Endgegner – Nur für Wahnsinnige</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Strecke (km)</label>
            <input type="number" value={neu.strecke_km} onChange={(e) => setNeu({ ...neu, strecke_km: parseFloat(e.target.value) })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Höhenmeter</label>
            <input type="number" value={neu.hoehenmeter} onChange={(e) => setNeu({ ...neu, hoehenmeter: parseInt(e.target.value) })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🚶 Tempo Wanderwegweiser</label>
            <input type="text" value={neu.tempo_wanderweg} onChange={(e) => setNeu({ ...neu, tempo_wanderweg: e.target.value })} placeholder="z.B. 3h 30min" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🏃 Tempo H&F Sportlich</label>
            <input type="text" value={neu.tempo_sportlich} onChange={(e) => setNeu({ ...neu, tempo_sportlich: e.target.value })} placeholder="z.B. 2h 15min" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🏆 Tempo H&F PB</label>
            <input type="text" value={neu.tempo_pb} onChange={(e) => setNeu({ ...neu, tempo_pb: e.target.value })} placeholder="z.B. 1h 45min" style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Route URL</label>
            <input type="text" value={neu.route_url} onChange={(e) => setNeu({ ...neu, route_url: e.target.value })} placeholder="https://..." style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Bild URL</label>
            <input type="text" value={neu.bild_url} onChange={(e) => setNeu({ ...neu, bild_url: e.target.value })} placeholder="https://res.cloudinary.com/..." style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Video URL</label>
            <input type="text" value={neu.video_url} onChange={(e) => setNeu({ ...neu, video_url: e.target.value })} placeholder="https://res.cloudinary.com/..." style={inputStyle} />
          </div>
          <KoordBlock
            lv95={lv95Neu}
            setLv95={setLv95Neu}
            lat={neu.lat}
            lng={neu.lng}
            setLatLng={(lat, lng) => setNeu({ ...neu, lat, lng })}
          />
        </div>
        <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={hinzufuegen} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>
            ➕ Abenteuer hinzufügen
          </button>
          {gespeichert && <span style={{ color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>}
        </div>
      </div>

      {/* Bestehende Abenteuer */}
      <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Bestehende Abenteuer</h3>
      {loading && <p>Wird geladen...</p>}
      {!loading && abenteuer.map((a) => (
        <div key={a.id} style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "16px 24px", marginBottom: "12px", opacity: a.aktiv ? 1 : 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>{a.titel}</p>
              <p style={{ margin: "0 0 2px", fontSize: "14px", color: "#555" }}>🚩 {a.startpunkt} → 📍 {a.via} → 🏁 {a.ziel}</p>
              <p style={{ margin: "0", fontSize: "13px", color: "#aaa" }}>🗺 {a.strecke_km} km · ⛰ {a.hoehenmeter} hm · {a.schwierigkeit}</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { setBearbeiten(a); setLv95Bearbeiten({ e: 0, n: 0 }); }} style={{ padding: "8px 14px", background: "#f0f4ff", color: "#3355cc", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>✏️ Bearbeiten</button>
              <button onClick={() => toggleAktiv(a)} style={{ padding: "8px 14px", background: a.aktiv ? "#e6f4ea" : "#f5f5f5", color: a.aktiv ? "#2d6a4f" : "#888", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>{a.aktiv ? "✅ Aktiv" : "⏸ Inaktiv"}</button>
              <button onClick={() => loeschen(a.id)} style={{ padding: "8px 14px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>🗑 Löschen</button>
            </div>
          </div>
        </div>
      ))}
    </main>
    </PasswortSchutz>
  );
}