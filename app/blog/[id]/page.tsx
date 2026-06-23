"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../supabase";
import ReactMarkdown from "react-markdown";

type Blog = {
  id: number;
  titel: string;
  teaser: string;
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
  hauptbild_index: number;
};

export default function BlogDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [b, setB] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tippOffen, setTippOffen] = useState(false);
  const [medienIndex, setMedienIndex] = useState<number | null>(null);
  const [thumbnailsOffen, setThumbnailsOffen] = useState(false);
  const [textOffen, setTextOffen] = useState(false);

  useEffect(() => {
    async function laden() {
      const { data } = await supabase.from("blog").select("*").eq("id", id).single();
      setB(data);
      setLoading(false);
    }
    if (id) laden();
  }, [id]);

  function swisstopoUrl(lat: number, lng: number): string {
    return `https://map.geo.admin.ch/?lang=de&topic=ech&bgLayer=ch.swisstopo.pixelkarte-farbe&crosshair=marker&swisssearch=${lat},${lng}`;
  }

  function osmUrl(lat: number, lng: number): string {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=14`;
  }

  if (loading) {
    return <main style={{ padding: "40px", fontFamily: "sans-serif", color: "#fff" }}>Wird geladen...</main>;
  }

  if (!b) {
    return (
      <main style={{ padding: "40px", fontFamily: "sans-serif", color: "#fff" }}>
        <p>Beitrag nicht gefunden.</p>
        <a href="/blog" style={{ color: "#7799ff" }}>← Zurück zur Übersicht</a>
      </main>
    );
  }

  const tipps = b.tipps ? b.tipps.split("\n").filter((t) => t.trim()) : [];
  const alleMedian = [
    ...(b.medien || []),
    ...(b.bilder || []),
    ...(b.video_url ? [b.video_url] : []),
  ];
  const isVideo = (url: string) => url.includes("/video/") || url.endsWith(".mp4") || url.endsWith(".mov");
  const aktuellerIndex = medienIndex !== null ? medienIndex : (b.hauptbild_index || 0);

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <a href="/blog" style={{ display: "inline-block", marginBottom: "20px", color: "#7799ff", textDecoration: "none", fontSize: "14px" }}>← Zurück zur Übersicht</a>

      <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", overflow: "hidden" }}>

        {/* Medien Galerie */}
        {alleMedian.length > 0 && (
          <div>
            <div style={{ position: "relative" }}>
              {isVideo(alleMedian[aktuellerIndex]) ? (
                <video controls style={{ width: "100%", maxHeight: "500px", objectFit: "contain", background: "#000" }}>
                  <source src={alleMedian[aktuellerIndex]} type="video/mp4" />
                </video>
              ) : (
                <img src={alleMedian[aktuellerIndex]} alt={b.titel} style={{ width: "100%", maxHeight: "500px", objectFit: "contain", background: "#111" }} />
              )}
              {alleMedian.length > 1 && (
                <>
                  <button onClick={() => setMedienIndex(Math.max(0, aktuellerIndex - 1))} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "18px", display: aktuellerIndex === 0 ? "none" : "block" }}>&#8249;</button>
                  <button onClick={() => setMedienIndex(Math.min(alleMedian.length - 1, aktuellerIndex + 1))} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "18px", display: aktuellerIndex === alleMedian.length - 1 ? "none" : "block" }}>&#8250;</button>
                  <div style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(0,0,0,0.5)", color: "white", padding: "2px 8px", borderRadius: "10px", fontSize: "12px" }}>
                    {aktuellerIndex + 1} / {alleMedian.length} {isVideo(alleMedian[aktuellerIndex]) ? "🎥" : "📸"}
                  </div>
                </>
              )}
            </div>

            {alleMedian.length > 1 && (
              <div style={{ marginTop: "4px" }}>
                <button
                  onClick={() => setThumbnailsOffen(!thumbnailsOffen)}
                  style={{ width: "100%", padding: "6px", background: "rgba(255,255,255,0.05)", border: "none", color: "#aaa", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  {thumbnailsOffen ? "▲ Weniger anzeigen" : `▼ Alle ${alleMedian.length} Medien anzeigen`}
                </button>
                {thumbnailsOffen && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", marginTop: "4px" }}>
                    {alleMedian.map((url, i) => (
                      <div key={i} onClick={() => setMedienIndex(i)} style={{ position: "relative", cursor: "pointer", aspectRatio: "1", overflow: "hidden", border: i === aktuellerIndex ? "2px solid #7799ff" : "2px solid transparent", borderRadius: "4px" }}>
                        {isVideo(url) ? (
                          <div style={{ position: "relative", width: "100%", height: "100%" }}>
                            <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: "20px", background: "rgba(0,0,0,0.5)", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>▶</div>
                          </div>
                        ) : (
                          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: i === aktuellerIndex ? 1 : 0.6 }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ padding: "24px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#aaa" }}>
            {new Date(b.erstellt_am).toLocaleDateString("de-CH")}
          </p>
          <h1 style={{ margin: "0 0 16px", fontSize: "24px", color: "#fff" }}>{b.titel}</h1>

          {b.teaser && (
            <p style={{ marginBottom: "16px", fontSize: "16px", color: "#ddd", lineHeight: "1.6", fontStyle: "italic", borderLeft: "3px solid #3355cc", paddingLeft: "12px" }}>{b.teaser}</p>
          )}

          {b.text && (
            <div style={{ marginBottom: "20px" }}>
              <button
                onClick={() => setTextOffen(!textOffen)}
                style={{ width: "100%", padding: "10px 16px", background: "rgba(51,85,204,0.2)", border: "1px solid rgba(51,85,204,0.3)", borderRadius: "10px", color: "#7799ff", cursor: "pointer", fontSize: "14px", fontWeight: "bold", textAlign: "left", display: "flex", justifyContent: "space-between" }}
              >
                <span>📖 Bericht lesen</span>
                <span>{textOffen ? "▲" : "▼"}</span>
              </button>
              {textOffen && (
                <div style={{ marginTop: "12px", fontSize: "15px", color: "#ccc", lineHeight: "1.7" }}>
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
            </div>
          )}

          {tipps.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <button onClick={() => setTippOffen(!tippOffen)} style={{ width: "100%", padding: "12px 16px", background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.3)", borderRadius: "10px", color: "#ffaa44", cursor: "pointer", fontSize: "14px", fontWeight: "bold", textAlign: "left", display: "flex", justifyContent: "space-between" }}>
                <span>💡 Tipps & Tricks ({tipps.length})</span>
                <span>{tippOffen ? "▲" : "▼"}</span>
              </button>
              {tippOffen && (
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
            <a href={b.route_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginRight: "12px", padding: "10px 20px", background: "#3355cc", color: "white", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>
              🗺 Wanderroute ansehen
            </a>
          )}
          {b.strava_url && (
            <a href={b.strava_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "#fc4c02", color: "white", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>
              🚴 Auf Strava ansehen
            </a>
          )}
        </div>
      </div>
    </main>
  );
}