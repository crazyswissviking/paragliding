"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";

const termine = [
  { datum: "Samstag, 30. Mai 2026", titel: "Vollmond-/Nachtflug" },
  { datum: "Samstag, 27. Juni 2026", titel: "Vollmond-/Nachtflug" },
  { datum: "Sonntag, 28. Juni 2026", titel: "Vollmond-/Nachtflug" },
  { datum: "Freitag, 28. August 2026", titel: "Vollmond-/Nachtflug" },
  { datum: "Sonntag, 25. Oktober 2026", titel: "Vollmond-/Nachtflug" },
];

const MAX_TEILNEHMER = 6;

type Anmeldung = {
  id: number;
  name: string;
  termin: string;
};

export default function Termine() {
  const [offen, setOffen] = useState<string | null>(null);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);

  useEffect(() => {
    async function laden() {
      const { data } = await supabase
        .from("anmeldungen")
        .select("id, name, termin");
      setAnmeldungen(data || []);
    }
    laden();
  }, []);

  function toggleOffen(datum: string) {
    setOffen(offen === datum ? null : datum);
  }

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Vollmond- & Nachtflüge 2026</h2>
      <div>
        {termine.map((t, i) => {
          const teilnehmer = anmeldungen.filter((a) => a.termin === t.datum);
          const belegt = teilnehmer.length;
          const voll = belegt >= MAX_TEILNEHMER;
          const istOffen = offen === t.datum;

          return (
            <div key={i} style={{
              border: "1px solid #ddd",
              borderRadius: "12px",
              marginBottom: "16px",
              overflow: "hidden",
            }}>
              <div
                onClick={() => toggleOffen(t.datum)}
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  background: istOffen ? "#f5f8ff" : "white",
                }}
              >
                <div>
                  <p style={{ color: "#888", margin: "0 0 4px", fontSize: "14px" }}>🌕 {t.datum}</p>
                  <h3 style={{ margin: "0 0 4px", fontSize: "18px" }}>{t.titel}</h3>
                  <p style={{ margin: "0", color: "#aaa", fontSize: "14px" }}>📍 Ort wird noch bekanntgegeben</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    background: voll ? "#fdecea" : "#f0f4ff",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    textAlign: "center",
                    minWidth: "80px",
                  }}>
                    <p style={{ margin: "0", fontSize: "22px", fontWeight: "bold", color: voll ? "#c0392b" : "#3355cc" }}>
                      {MAX_TEILNEHMER - belegt}
                    </p>
                    <p style={{ margin: "0", fontSize: "12px", color: "#666" }}>
                      {voll ? "Voll" : "Frei"}
                    </p>
                  </div>
                  <span style={{ fontSize: "20px", color: "#aaa" }}>
                    {istOffen ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {istOffen && (
                <div style={{ padding: "16px 24px", borderTop: "1px solid #eee", background: "#fafafa" }}>
                  <p style={{ margin: "0 0 10px", fontWeight: "bold", fontSize: "14px", color: "#555" }}>
                    Angemeldete Teilnehmer ({belegt}/{MAX_TEILNEHMER}):
                  </p>
                  {belegt === 0 ? (
                    <p style={{ color: "#aaa", fontSize: "14px", margin: "0" }}>Noch keine Anmeldungen.</p>
                  ) : (
                    <ul style={{ margin: "0", padding: "0 0 0 20px" }}>
                      {teilnehmer.map((a) => (
                        <li key={a.id} style={{ fontSize: "15px", marginBottom: "4px" }}>
                          {a.name}
                        </li>
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