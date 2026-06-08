"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";

import type { ComponentProps } from "react";
import type KarteType from "./karte.tsx";

const Karte = dynamic<ComponentProps<typeof KarteType>>(
  () => import("./karte"),
  { ssr: false }
);

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
  lat: number;
  lng: number;
  landeplatz: string;
  landeplatz_lat: number;
  landeplatz_lng: number;
  startplatz_hoehe: number;
  landeplatz_hoehe: number;
};

export default function HikeAndFlyPage() {
  const [abenteuer, setAbenteuer] = useState<HikeAndFly[]>([]);
  const [offen, setOffen] = useState<number | null>(null);
  const [ausgewaehlt, setAusgewaehlt] = useState<number | null>(null);
  const [sortierung, setSortierung] = useState<"az" | "laenge" | "hoehe" | "schwierigkeit">("az");

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
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🥾 Hike & Fly</h1>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h2 style={{ fontWeight: "normal", color: "#aaa", margin: "0" }}>Unsere Abenteuer</h2>
        <select
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (!id) return;
            setOffen(id);
            setAusgewaehlt(id);
            setTimeout(() => {
              document.getElementById(`abenteuer-${id}`)?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", cursor: "pointer" }}
        >
          <option value="">-- Abenteuer wählen --</option>
          {[...abenteuer].sort((a, b) => a.titel.localeCompare(b.titel)).map((a) => (
            <option key={a.id} value={a.id} style={{ background: "#1a1a2e" }}>🥾 {a.titel}</option>
          ))}
        </select>
      </div>

      {/* Karte */}
      {abenteuer.filter((a) => a.lat && a.lng).length > 0 && (
        <div style={{ marginBottom: "32px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.15)" }}>
          <Karte
            abenteuer={abenteuer.filter((a) => a.lat && a.lng)}
            ausgewaehlt={ausgewaehlt}
            onAuswaehlen={(id) => {
              setAusgewaehlt(id);
              setOffen(id);
              setTimeout(() => {
                document.getElementById(`abenteuer-${id}`)?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
          />
        </div>
      )}

      {/* Sortierung */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <span style={{ fontSize: "14px", color: "#aaa" }}>Sortieren:</span>
        <select
          value={sortierung}
          onChange={(e) => setSortierung(e.target.value as "az" | "laenge" | "hoehe" | "schwierigkeit")}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", cursor: "pointer" }}
        >
          <option value="az" style={{ background: "#1a1a2e" }}>🔤 A-Z</option>
          <option value="laenge" style={{ background: "#1a1a2e" }}>🗺 Länge</option>
          <option value="hoehe" style={{ background: "#1a1a2e" }}>⛰ Höhenmeter</option>
          <option value="schwierigkeit" style={{ background: "#1a1a2e" }}>💪 Schwierigkeit</option>
        </select>
      </div>

      {abenteuer.length === 0 && (
        <p style={{ color: "#666", textAlign: "center", marginTop: "40px" }}>Noch keine Abenteuer erfasst.</p>
      )}

      {[...abenteuer].sort((a, b) => {
        if (sortierung === "az") return a.titel.localeCompare(b.titel);
        if (sortierung === "laenge") return b.strecke_km - a.strecke_km;
        if (sortierung === "hoehe") return b.hoehenmeter - a.hoehenmeter;
        if (sortierung === "schwierigkeit") return a.schwierigkeit.localeCompare(b.schwierigkeit);
        return 0;
      }).map((a) => {
        const istOffen = offen === a.id;

        return (
          <div key={a.id} id={`abenteuer-${a.id}`} style={{
            border: ausgewaehlt === a.id ? "1px solid rgba(51,85,204,0.8)" : "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px",
            marginBottom: "16px",
            overflow: "hidden",
          }}>
            <div
              onClick={() => { setOffen(istOffen ? null : a.id); setAusgewaehlt(a.id); }}
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
                <p style={{ margin: "0 0 4px", color: "#888", fontSize: "14px" }}>🚩 {a.startpunkt} → 📍 {a.via} → 🏔 {a.ziel}</p>
                <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                  {a.strecke_km > 0 && <span style={{ fontSize: "12px", color: "#aaa" }}>🗺 {a.strecke_km} km</span>}
                  {a.hoehenmeter > 0 && <span style={{ fontSize: "12px", color: "#aaa" }}>⛰ {a.hoehenmeter} hm</span>}
                  {a.schwierigkeit && <span style={{ fontSize: "12px", padding: "2px 8px", background: "rgba(51,85,204,0.3)", borderRadius: "4px", color: "#7799ff" }}>{a.schwierigkeit}</span>}
                </div>
              </div>
              <span style={{ fontSize: "14px", color: "#aaa", whiteSpace: "nowrap", marginLeft: "12px" }}>
                {istOffen ? "Details schliessen ▲" : "Details ▼"}
              </span>
            </div>

            {istOffen && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                {a.bild_url && (
                  <img src={a.bild_url} alt={a.titel} style={{ width: "100%", borderRadius: "8px", marginBottom: "16px", maxHeight: "300px", objectFit: "cover" }} />
                )}
                {a.video_url && (
                  <video controls style={{ width: "100%", borderRadius: "8px", marginBottom: "16px", maxHeight: "300px" }}>
                    <source src={a.video_url} type="video/mp4" />
                  </video>
                )}
                {a.beschreibung && (
                  <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(51,85,204,0.2)", borderRadius: "8px", fontSize: "14px", color: "#ccc" }}>
                    📝 <strong>Beschreibung:</strong>
                    <div style={{ marginTop: "8px" }}>
                      <ReactMarkdown components={{
                        p: ({ children }) => <p style={{ margin: "8px 0", color: "#ccc" }}>{children}</p>,
                        strong: ({ children }) => <strong style={{ color: "#fff" }}>{children}</strong>,
                        ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: "20px", color: "#ccc" }}>{children}</ul>,
                        li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
                        br: () => <br />,
                      }}>
                        {a.beschreibung}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {(a.startplatz_hoehe > 0 || a.landeplatz_hoehe > 0) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                    {a.startplatz_hoehe > 0 && (
                      <div style={{ padding: "10px", background: "rgba(51,85,204,0.2)", borderRadius: "8px", textAlign: "center" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#7799ff" }}>🏔 Startplatz Höhe</p>
                        <p style={{ margin: "0", fontSize: "16px", fontWeight: "bold", color: "#fff" }}>{a.startplatz_hoehe} m</p>
                      </div>
                    )}
                    {a.landeplatz_hoehe > 0 && (
                      <div style={{ padding: "10px", background: "rgba(0,200,100,0.1)", borderRadius: "8px", textAlign: "center" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#6fcf97" }}>🟢 Landeplatz Höhe</p>
                        <p style={{ margin: "0", fontSize: "16px", fontWeight: "bold", color: "#fff" }}>{a.landeplatz_hoehe} m</p>
                      </div>
                    )}
                  </div>
                )}

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

                {a.landeplatz && (
                  <div style={{ marginBottom: "16px", padding: "10px 14px", background: "rgba(0,200,100,0.1)", borderRadius: "8px", fontSize: "14px", color: "#6fcf97" }}>
                    🟢 <strong>Landeplatz:</strong> {a.landeplatz}
                  </div>
                )}
                {a.route_url && (
                  <a href={a.route_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 20px", background: "#3355cc", color: "white", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>
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