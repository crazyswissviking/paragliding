"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";

type Termin = {
  id: number;
  datum: string;
  wochentag: string;
  titel: string;
  ort: string;
  max_teilnehmer: number;
  details: string;
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

  useEffect(() => {
    async function laden() {
      const { data: termineData } = await supabase
        .from("termine")
        .select("*")
        .eq("aktiv", true);

      const sortiert = (termineData || []).sort((a, b) => parseDate(a.datum) - parseDate(b.datum));
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
                  <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: "#fff" }}>{t.titel}</h3>
                  <p style={{ margin: "0", color: "#888", fontSize: "14px" }}>📍 {t.ort}</p>
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
                  <span style={{ fontSize: "14px", color: "#aaa", display: "flex", alignItems: "center", gap: "4px" }}>
                    {istOffen ? "Details schliessen ▲" : "Details ▼"}
                  </span>
                </div>
              </div>

              {istOffen && (
                <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                  {t.details && (
                    <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(51,85,204,0.2)", borderRadius: "8px", fontSize: "14px", color: "#ccc" }}>
                      📝 <strong>Details:</strong> {t.details}
                    </div>
                  )}
                  <div style={{ marginBottom: "16px" }}>
                    {voll ? (
                      <span style={{ display: "inline-block", padding: "10px 20px", background: "#555", color: "white", borderRadius: "8px", fontSize: "14px", fontWeight: "bold" }}>
                        🔴 Ausgebucht
                      </span>
                    ) : (
                      <a href="/termine/anmelden" onClick={(e) => e.stopPropagation()} style={{ display: "inline-block", padding: "10px 20px", background: "#3355cc", color: "white", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>
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
                        <li key={a.id} style={{ fontSize: "15px", marginBottom: "4px", color: "#ddd" }}>
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