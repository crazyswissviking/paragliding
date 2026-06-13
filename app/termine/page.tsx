"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";

function TextMitLinks({ text, style }: { text: string; style?: React.CSSProperties }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <span style={style}>
      {parts.map((part, i) =>
        part.match(/^https?:\/\//) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#7799ff", textDecoration: "underline", wordBreak: "break-all" }}>{part}</a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

type Termin = {
  id: number;
  datum: string;
  wochentag: string;
  titel: string;
  ort: string;
  max_teilnehmer: number;
  details: string;
  bild_url: string;
  video_url: string;
  bilder: string[];
  hikeandfly_id: number | null;
};

type Anmeldung = {
  id: number;
  name: string;
  termin: string;
};

const parseDate = (d: string) => {
  const [day, month, year] = d.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
};

export default function Termine() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [offen, setOffen] = useState<string | null>(null);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);
  const [bildIndex, setBildIndex] = useState<Record<number, number>>({});

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
        .sort((a, b) => parseDate(a.datum) - parseDate(b.datum));
      setTermine(sortiert);

      const { data: anmeldungenData } = await supabase
        .from("anmeldungen")
        .select("id, name, termin");
      setAnmeldungen(anmeldungenData || []);
    }
    laden();
  }, []);

  function toggleOffen(label: string) {
    setOffen(offen === label ? null : label);
  }

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#aaa", marginBottom: "30px" }}>Events</h2>
      <div>
        {termine.map((t) => {
          const label = `${t.wochentag}, ${t.datum}`;
          const teilnehmer = anmeldungen.filter((a) => a.termin === label);
          const belegt = teilnehmer.length;
          const voll = belegt >= t.max_teilnehmer;
          const istOffen = offen === label;
          const aktuellesBild = bildIndex[t.id] || 0;
          const bilder = t.bilder || [];

          return (
            <div key={t.id} style={{
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px",
              marginBottom: "16px",
              overflow: "hidden",
            }}>
              <div
                onClick={() => toggleOffen(label)}
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
                  <p style={{ color: "#aaa", margin: "0 0 4px", fontSize: "14px" }}>🌕 {t.wochentag}, {t.datum}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h3 style={{ margin: "0", fontSize: "18px", color: "#fff" }}>{t.titel}</h3>
                    {t.hikeandfly_id && (
                        
                         <a href={`/hikeandfly?open=${t.hikeandfly_id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: "12px", padding: "2px 8px", background: "rgba(51,85,204,0.3)", borderRadius: "6px", color: "#7799ff", textDecoration: "none" }}
                        >
                          🥾 Hike & Fly
                        </a>
                      )}
                  </div>
                  <p style={{ margin: "4px 0 0", color: "#888", fontSize: "14px" }}>📍 {t.ort}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    background: voll ? "rgba(192,57,43,0.3)" : "rgba(51,85,204,0.3)",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    textAlign: "center",
                    minWidth: "80px",
                  }}>
                    <p style={{ margin: "0", fontSize: "22px", fontWeight: "bold", color: voll ? "#e74c3c" : "#7799ff" }}>
                      {t.max_teilnehmer - belegt}
                    </p>
                    <p style={{ margin: "0", fontSize: "12px", color: "#aaa" }}>
                      {voll ? "Voll" : "Frei"}
                    </p>
                  </div>
                  <span style={{ fontSize: "14px", color: "#aaa" }}>
                    {istOffen ? "Details schliessen ▲" : "Details ▼"}
                  </span>
                </div>
              </div>

              {istOffen && (
                <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>

                  {/* Bildergalerie */}
                  {bilder.length > 0 && (
                    <div style={{ position: "relative", marginBottom: "16px" }}>
                      <img src={bilder[aktuellesBild]} alt={t.titel} style={{ width: "100%", borderRadius: "8px", maxHeight: "300px", objectFit: "cover" }} />
                      {bilder.length > 1 && (
                        <>
                          <button onClick={() => setBildIndex((prev) => ({ ...prev, [t.id]: Math.max(0, aktuellesBild - 1) }))} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "18px", display: aktuellesBild === 0 ? "none" : "block" }}>&#8249;</button>
                          <button onClick={() => setBildIndex((prev) => ({ ...prev, [t.id]: Math.min(bilder.length - 1, aktuellesBild + 1) }))} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "18px", display: aktuellesBild === bilder.length - 1 ? "none" : "block" }}>&#8250;</button>
                          <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
                            {bilder.map((_, i) => (
                              <div key={i} onClick={() => setBildIndex((prev) => ({ ...prev, [t.id]: i }))} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i === aktuellesBild ? "white" : "rgba(255,255,255,0.5)", cursor: "pointer" }} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Hauptbild falls keine Galerie */}
                  {bilder.length === 0 && t.bild_url && (
                    <img src={t.bild_url} alt={t.titel} style={{ width: "100%", borderRadius: "8px", marginBottom: "16px", maxHeight: "300px", objectFit: "cover" }} />
                  )}

                  {t.video_url && (
                    <video controls style={{ width: "100%", borderRadius: "8px", marginBottom: "16px", maxHeight: "300px" }}>
                      <source src={t.video_url} type="video/mp4" />
                    </video>
                  )}

                  {t.details && (
                    <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(51,85,204,0.2)", borderRadius: "8px", fontSize: "14px", color: "#ccc" }}>
                      📝 <strong>Details:</strong>
                      <div style={{ marginTop: "8px", lineHeight: "1.7" }}>
                        {t.details.split("\n").map((zeile, i) => (
                          <p key={i} style={{ margin: "4px 0" }}>
                            <TextMitLinks text={zeile} style={{ color: "#ccc" }} />
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: "16px" }}>
                    {voll ? (
                      <span style={{ display: "inline-block", padding: "10px 20px", background: "#555", color: "white", borderRadius: "8px", fontSize: "14px", fontWeight: "bold" }}>
                        🔴 Ausgebucht
                      </span>
                    ) : (
                      <a href={`/termine/anmelden?termin=${encodeURIComponent(label)}`} onClick={(e) => e.stopPropagation()} style={{ display: "inline-block", padding: "10px 20px", background: "#3355cc", color: "white", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>
                        ✍️ Jetzt anmelden
                      </a>
                    )}
                  </div>

                  <p style={{ margin: "0 0 10px", fontWeight: "bold", fontSize: "14px", color: "#aaa" }}>
                    Angemeldete Teilnehmer ({belegt}/{t.max_teilnehmer}):
                  </p>
                  {belegt === 0 ? (
                    <p style={{ color: "#666", fontSize: "14px", margin: "0" }}>Noch keine Anmeldungen.</p>
                  ) : (
                    <ul style={{ margin: "0", padding: "0 0 0 20px" }}>
                      {teilnehmer.map((a) => (
                        <li key={a.id} style={{ fontSize: "15px", marginBottom: "4px", color: "#ddd" }}>{a.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}