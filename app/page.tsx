"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

type Termin = {
  id: number;
  datum: string;
  wochentag: string;
  titel: string;
  max_teilnehmer: number;
  bild_url: string;
};

type Anmeldung = {
  id: number;
  termin: string;
};

const parseDate = (d: string) => {
  const [day, month, year] = d.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
};

export default function Home() {
  const [highlights, setHighlights] = useState<Termin[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);

  useEffect(() => {
    async function laden() {
      const { data: termineData } = await supabase
        .from("termine")
        .select("*")
        .eq("aktiv", true);

      const heute = new Date();
      heute.setHours(0, 0, 0, 0);

      const sortiert = (termineData || [])
        .filter((t) => parseDate(t.datum) >= heute.getTime())
        .sort((a, b) => parseDate(a.datum) - parseDate(b.datum))
        .slice(0, 3);
      setHighlights(sortiert);

      const { data: anmeldungenData } = await supabase
        .from("anmeldungen")
        .select("id, termin");
      setAnmeldungen(anmeldungenData || []);
    }
    laden();
  }, []);

  return (
    <main style={{
      minHeight: "calc(100vh - 60px)",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px",
      textAlign: "center",
      overflow: "hidden",
    }}>
      {/* Hintergrundvideo */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, overflow: "hidden" }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }}
        >
          <source src="https://res.cloudinary.com/dnfnng4mm/video/upload/v1779590348/video_ve6erm.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)" }} />
      </div>

      {/* Inhalt */}
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "700px" }}>
        <h1 style={{ fontSize: "48px", fontWeight: "bold", color: "#ffffff", marginBottom: "8px" }}>
          🪂 Swissgliders
        </h1>
        <p style={{ fontSize: "20px", color: "#aaa", marginBottom: "40px" }}>
          Unsere Events
        </p>

        {/* Nächste 3 Events */}
        {highlights.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "12px", fontWeight: "bold", color: "#7799ff", letterSpacing: "1px", marginBottom: "16px" }}>⭐ NÄCHSTE EVENTS</p>
            <div style={{ display: "grid", gridTemplateColumns: highlights.length === 1 ? "1fr" : highlights.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: "12px" }}>
              {highlights.map((t) => {
                const label = `${t.wochentag}, ${t.datum}`;
                const belegt = anmeldungen.filter((a) => a.termin === label).length;
                const voll = belegt >= t.max_teilnehmer;
                return (
                  <a key={t.id} href={`/termine/anmelden?termin=${encodeURIComponent(label)}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      border: "1px solid rgba(51,85,204,0.5)",
                      borderRadius: "12px",
                      padding: "16px",
                      background: "rgba(51,85,204,0.15)",
                      textAlign: "left",
                    }}>
                      {t.bild_url && (
                        <img src={t.bild_url} alt={t.titel} style={{ width: "100%", borderRadius: "8px", marginBottom: "12px", height: "80px", objectFit: "cover" }} />
                      )}
                      <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#7799ff" }}>🌕 {t.wochentag}, {t.datum}</p>
                      <p style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: "bold", color: "#fff" }}>{t.titel}</p>
                      <div style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        background: voll ? "rgba(192,57,43,0.3)" : "rgba(51,85,204,0.3)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: voll ? "#e74c3c" : "#7799ff",
                        fontWeight: "bold",
                      }}>
                        {voll ? "🔴 Voll" : `${t.max_teilnehmer - belegt} Plätze frei`}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <a href="/termine" style={{
          display: "block",
          padding: "16px 24px",
          background: "#3355cc",
          color: "white",
          borderRadius: "12px",
          textDecoration: "none",
          fontSize: "16px",
          fontWeight: "bold",
        }}>
          📅 Alle Events ansehen
        </a>
      </div>

      {/* Admin Link klein unten links */}
      <a href="/admin/termine" style={{
        position: "absolute",
        bottom: "16px",
        left: "16px",
        zIndex: 10,
        fontSize: "11px",
        color: "rgba(255,255,255,0.25)",
        textDecoration: "none",
      }}>
        Admin
      </a>
    </main>
  );
}