"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import ReactMarkdown from "react-markdown";

type Blog = {
  id: number;
  titel: string;
  text: string;
  tipps: string;
  bilder: string[];
  medien: string[];
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
  strava_url: string;
  erstellt_am: string;
};

export default function BlogPage() {
  const [beitraege, setBeitraege] = useState<Blog[]>([]);
  const [tippOffen, setTippOffen] = useState<number | null>(null);
  const [medienIndex, setMedienIndex] = useState<Record<number, number>>({});

  useEffect(() => {
    async function laden() {
      const { data } = await supabase
        .from("blog")
        .select("*")
        .eq("aktiv", true)
        .order("erstellt_am", { ascending: false });
      setBeitraege(data || []);
    }
    laden();
  }, []);

  function swisstopoUrl(lat: number, lng: number): string {
    return `https://map.geo.admin.ch/?lang=de&topic=ech&bgLayer=ch.swisstopo.pixelkarte-farbe&crosshair=marker&swisssearch=${lat},${lng}`;
  }

  function osmUrl(lat: number, lng: number): string {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=14`;
  }

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>📖 Blog</h1>
      <h2 style={{ fontWeight: "normal", color: "#aaa", marginBottom: "30px" }}>Berichte & Erlebnisse</h2>

      {beitraege.length === 0 && (
        <p style={{ color: "#666", textAlign: "center", marginTop: "40px" }}>Noch keine Beiträge.</p>
      )}

      {beitraege.map((b) => {
        const tippIstOffen = tippOffen === b.id;
        const aktuellerIndex = medienIndex[b.id] || 0;
        const tipps = b.tipps ? b.tipps.split("\n").filter((t) => t.trim()) : [];

        // Alle Medien kombinieren: neue medien[] + alte bilder[]
        const alleMedian = [
          ...(b.medien || []),
          ...(b.bilder || []),
          ...(b.video_url ? [b.video_url] : []),
        ];

        const isVideo = (url: string) => url.includes("/video/") || url.endsWith(".mp4") || url.endsWith(".mov");

        return (
          <div key={b.id} style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", marginBottom: "32px", overflow: "hidden" }}>

            {/* Medien Galerie */}
            {alleMedian.length > 0 && (
              <div style={{ position: "relative" }}>
                {isVideo(alleMedian[aktuellerIndex]) ? (
                  <video controls style={{ width: "100%", height: "300px", objectFit: "cover" }}>
                    <source src={alleMedian[aktuellerIndex]} type="video/mp4" />
                  </video>
                ) : (
                  <img src={alleMedian[aktuellerIndex]} alt={b.titel} style={{ width: "100%", height: "300px", objectFit: "cover" }} />
                )}
                {alleMedian.length > 1 && (
                  <>
                    <button
                      onClick={() => setMedienIndex((prev) => ({ ...prev, [b.id]: Math.max(0, aktuellerIndex - 1) }))}
                      style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "18px", display: aktuellerIndex === 0 ? "none" : "block" }}
                    >&#8249;</button>
                    <button
                      onClick={() => setMedienIndex((prev) => ({ ...prev, [b.id]: Math.min(alleMedian.length - 1, aktuellerIndex + 1) }))}
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "18px", display: aktuellerIndex === alleMedian.length - 1 ? "none" : "block" }}
                    >&#8250;</button>
                    <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
                      {alleMedian.map((url, i) => (
                        <div key={i} onClick={() => setMedienIndex((prev) => ({ ...prev, [b.id]: i }))} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i === aktuellerIndex ? "white" : "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6px" }}>
                          {isVideo(url) ? "▶" : ""}
                        </div>
                      ))}
                    </div>
                    <div style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(0,0,0,0.5)", color: "white", padding: "2px 8px", borderRadius: "10px", fontSize: "12px" }}>
                      {aktuellerIndex + 1} / {alleMedian.length} {isVideo(alleMedian[aktuellerIndex]) ? "🎥" : "📸"}
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ padding: "24px" }}>
              <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#aaa" }}>
                {new Date(b.erstellt_am).toLocaleDateString("de-CH")}
              </p>
              <h2 style={{ margin: "0 0 16px", fontSize: "24px", color: "#fff" }}>{b.titel}</h2>

              {b.text && (
                <div style={{ marginBottom: "20px", fontSize: "15px", color: "#ccc", lineHeight: "1.7" }}>
                  <ReactMarkdown components={{
                    p: ({ children }) => <p style={{ margin: "8px 0", color: "#ccc" }}>{children}</p>,
                    strong: ({ children }) => <strong style={{ color: "#fff" }}>{children}</strong>,
                    ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: "20px", color: "#ccc" }}>{children}</ul>,
                    li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
                    br: () => <br />,
                  }}>
                    {b.text}
                  </ReactMarkdown>
                </div>
              )}

              {tipps.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <button onClick={() => setTippOffen(tippIstOffen ? null : b.id)} style={{ width: "100%", padding: "12px 16px", background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.3)", borderRadius: "10px", color: "#ffaa44", cursor: "pointer", fontSize: "14px", fontWeight: "bold", textAlign: "left", display: "flex", justifyContent: "space-between" }}>
                    <span>💡 Tipps & Tricks ({tipps.length})</span>
                    <span>{tippIstOffen ? "▲" : "▼"}</span>
                  </button>
                  {tippIstOffen && (
                    <div style={{ padding: "16px", background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.2)", borderTop: "none", borderRadius: "0 0 10px 10px" }}>
                      <ul style={{ margin: "0", paddingLeft: "20px" }}>
                        {tipps.map((t, i) => (
                          <li key={i} style={{ color: "#ffcc88", fontSize: "14px", marginBottom: "8px" }}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {(b.startpunkt_lat !== 0 || b.landeplatz_lat !== 0) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                  {b.startpunkt_lat !== 0 && (
                    <div style={{ padding: "14px", background: "rgba(51,85,204,0.2)", borderRadius: "10px" }}>
                      <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#7799ff", fontWeight: "bold" }}>🚩 Startplatz</p>
                      {b.startpunkt_lv95 && <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#ccc" }}>{b.startpunkt_lv95}</p>}
                      {b.startpunkt_hoehe > 0 && <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#aaa" }}>⛰ {b.startpunkt_hoehe} m</p>}
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <a href={swisstopoUrl(b.startpunkt_lat, b.startpunkt_lng)} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#7799ff", textDecoration: "none", padding: "4px 8px", background: "rgba(51,85,204,0.2)", borderRadius: "6px" }}>🇨🇭 Swisstopo</a>
                        <a href={osmUrl(b.startpunkt_lat, b.startpunkt_lng)} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#7799ff", textDecoration: "none", padding: "4px 8px", background: "rgba(51,85,204,0.2)", borderRadius: "6px" }}>🗺 OpenStreetMap</a>
                      </div>
                    </div>
                  )}
                  {b.landeplatz_lat !== 0 && (
                    <div style={{ padding: "14px", background: "rgba(0,200,100,0.1)", borderRadius: "10px" }}>
                      <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6fcf97", fontWeight: "bold" }}>🟢 Landeplatz</p>
                      {b.landeplatz_lv95 && <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#ccc" }}>{b.landeplatz_lv95}</p>}
                      {b.landeplatz_hoehe > 0 && <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#aaa" }}>⛰ {b.landeplatz_hoehe} m</p>}
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <a href={swisstopoUrl(b.landeplatz_lat, b.landeplatz_lng)} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#6fcf97", textDecoration: "none", padding: "4px 8px", background: "rgba(0,200,100,0.15)", borderRadius: "6px" }}>🇨🇭 Swisstopo</a>
                        <a href={osmUrl(b.landeplatz_lat, b.landeplatz_lng)} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#6fcf97", textDecoration: "none", padding: "4px 8px", background: "rgba(0,200,100,0.15)", borderRadius: "6px" }}>🗺 OpenStreetMap</a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {b.route_url && (
                <a href={b.route_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 20px", background: "#3355cc", color: "white", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>
                  🗺 Wanderroute ansehen
                </a>
              )}
               {b.strava_url && (
                
                  href={`https://www.strava.com/activities/${b.strava_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "16px", padding: "10px 20px", background: "#fc4c02", color: "white", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}
                >
                  🚴 Auf Strava ansehen
                </a>
              )}
            </div>
          </div>
        );
      })}
    </main>
  );
}