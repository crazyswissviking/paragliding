"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import ReactMarkdown from "react-markdown";

type HikeAndFly = {
  id: number;
  titel: string;
  beschreibung: string;
  ort: string;
  schwierigkeit: string;
  strecke_km: number;
  hoehenmeter: number;
  tempo_wanderweg: string;
  tempo_sportlich: string;
  tempo_pb: string;
  route_url: string;
  bild_url: string;
  video_url: string;
};

export default function HikeAndFlyPage() {
  const [abenteuer, setAbenteuer] = useState<HikeAndFly[]>([]);
  const [offen, setOffen] = useState<number | null>(null);

  useEffect(() => {
    async function laden() {
      const { data } = await supabase
        .from("hikeandfly")
        .select("*")
        .eq("aktiv", true)
        .order("id", { ascending: true });
      setAbenteuer(data || []);
    }
    laden();
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🥾 Hike & Fly</h1>
      <h2 style={{ fontWeight: "normal", color: "#aaa", marginBottom: "30px" }}>Unsere Abenteuer</h2>

      {abenteuer.length === 0 && (
        <p style={{ color: "#666", textAlign: "center", marginTop: "40px" }}>Noch keine Abenteuer erfasst.</p>
      )}

      {abenteuer.map((a) => {
        const istOffen = offen === a.id;
        return (
          <div key={a.id} style={{
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px",
            marginBottom: "16px",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div
              onClick={() => setOffen(istOffen ? null : a.id)}
              style={{
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                background: istOffen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: "#fff" }}>{a.titel}</h3>
                <p style={{ margin: "0 0 4px", color: "#888", fontSize: "14px" }}>📍 {a.ort}</p>
                <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                  {a.strecke_km > 0 && (
                    <span style={{ fontSize: "12px", color: "#aaa" }}>🗺 {a.strecke_km} km</span>
                  )}
                  {a.hoehenmeter > 0 && (
                    <span style={{ fontSize: "12px", color: "#aaa" }}>⛰ {a.hoehenmeter} hm</span>
                  )}
                  {a.schwierigkeit && (
                    <span style={{ fontSize: "12px", padding: "2px 8px", background: "rgba(51,85,204,0.3)", borderRadius: "4px", color: "#7799ff" }}>{a.schwierigkeit}</span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: "14px", color: "#aaa", whiteSpace: "nowrap", marginLeft: "12px" }}>
                {istOffen ? "Details schliessen ▲" : "Details ▼"}
              </span>
            </div>

            {/* Details */}
            {istOffen && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>

                {/* Bild */}
                {a.bild_url && (
                  <img src={a.bild_url} alt={a.titel} style={{ width: "100%", borderRadius: "8px", marginBottom: "16px", maxHeight: "300px", objectFit: "cover" }} />
                )}

                {/* Video */}
                {a.video_url && (
                  <video controls style={{ width: "100%", borderRadius: "8px", marginBottom: "16px", maxHeight: "300px" }}>
                    <source src={a.video_url} type="video/mp4" />
                  </video>
                )}

                {/* Beschreibung */}
                {a.beschreibung && (
                  <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(51,85,204,0.2)", borderRadius: "8px", fontSize: "14px", color: "#ccc" }}>
                    📝 <strong>Beschreibung:</strong>
                    <div style={{ marginTop: "8px" }}>
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p style={{ margin: "8px 0", color: "#ccc" }}>{children}</p>,
                          strong: ({ children }) => <strong style={{ color: "#fff" }}>{children}</strong>,
                          ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: "20px", color: "#ccc" }}>{children}</ul>,
                          li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
                          br: () => <br />,
                        }}
                      >
                        {a.beschreibung}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Tempi */}
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 10px", fontWeight: "bold", fontSize: "14px", color: "#aaa" }}>⏱ Zeiten:</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#aaa" }}>🚶 Wanderwegweiser</p>
                      <p style={{ margin: "0", fontSize: "16px", fontWeight: "bold", color: "#fff" }}>{a.tempo_wanderweg || "–"}</p>
                    </div>
                    <div style={{ padding: "12px", background: "rgba(51,85,204,0.2)", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#7799ff" }}>🏃 H&F Sportlich</p>
                      <p style={{ margin: "0", fontSize: "16px", fontWeight: "bold", color: "#fff" }}>{a.tempo_sportlich || "–"}</p>
                    </div>
                    <div style={{ padding: "12px", background: "rgba(255,165,0,0.15)", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#ffaa44" }}>🏆 H&F PB</p>
                      <p style={{ margin: "0", fontSize: "16px", fontWeight: "bold", color: "#fff" }}>{a.tempo_pb || "–"}</p>
                    </div>
                  </div>
                </div>

                {/* Route Link */}
                {a.route_url && (
                  
                  <a  href={a.route_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "10px 20px",
                      background: "#3355cc",
                      color: "white",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    🗺 Wanderroute ansehen
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </main>
  );
}