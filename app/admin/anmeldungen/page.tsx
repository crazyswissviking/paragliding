"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import PasswortSchutz from "../passwort";

type Anmeldung = {
  id: number;
  name: string;
  email: string;
  termin: string;
  erstellt_am: string;
};

type Termin = {
  id: number;
  datum: string;
  wochentag: string;
  titel: string;
  max_teilnehmer: number;
};

const parseDate = (d: string) => {
  const datumPart = d.split(",")[1]?.trim();
  if (!datumPart) return 0;
  const [day, month, year] = datumPart.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
};

export default function AdminAnmeldungen() {
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);
  const [termine, setTermine] = useState<Termin[]>([]);
  const [loading, setLoading] = useState(true);
  const [bearbeiten, setBearbeiten] = useState<Anmeldung | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [ansicht, setAnsicht] = useState<"liste" | "uebersicht">("uebersicht");

  async function laden() {
    const { data: anmeldungenData } = await supabase.from("anmeldungen").select("*");
    const sortiert = (anmeldungenData || []).sort((a, b) => parseDate(a.termin) - parseDate(b.termin));
    setAnmeldungen(sortiert);

    const { data: termineData } = await supabase.from("termine").select("*").eq("aktiv", true);
    const termineSort = (termineData || []).sort((a, b) => {
      const parseTerminDate = (d: string) => {
        const [day, month, year] = d.split(".").map(Number);
        return new Date(year, month - 1, day).getTime();
      };
      return parseTerminDate(a.datum) - parseTerminDate(b.datum);
    });
    setTermine(termineSort);
    setLoading(false);
  }

  useEffect(() => { laden(); }, []);

  async function loeschen(id: number) {
    if (!confirm("Anmeldung wirklich löschen?")) return;
    await supabase.from("anmeldungen").delete().eq("id", id);
    laden();
  }

  async function bearbeitenSpeichern() {
    if (!bearbeiten) return;
    await supabase.from("anmeldungen").update({
      name: bearbeiten.name,
      email: bearbeiten.email,
      termin: bearbeiten.termin,
    }).eq("id", bearbeiten.id);
    setGespeichert(true);
    setTimeout(() => {
      setGespeichert(false);
      setBearbeiten(null);
    }, 1500);
    laden();
  }

  const inputStyle = { width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" };

  return (
    <PasswortSchutz>
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "20px" }}>Alle Anmeldungen</h2>

      {/* Ansicht wechseln */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
        <button
          onClick={() => setAnsicht("uebersicht")}
          style={{ padding: "8px 20px", background: ansicht === "uebersicht" ? "#3355cc" : "#f5f5f5", color: ansicht === "uebersicht" ? "white" : "#555", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
        >
          📊 Übersicht
        </button>
        <button
          onClick={() => setAnsicht("liste")}
          style={{ padding: "8px 20px", background: ansicht === "liste" ? "#3355cc" : "#f5f5f5", color: ansicht === "liste" ? "white" : "#555", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
        >
          📋 Liste
        </button>
      </div>

      {/* Bearbeiten Modal */}
      {bearbeiten && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", maxWidth: "500px", width: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "20px" }}>Anmeldung bearbeiten</h3>
              <button onClick={() => setBearbeiten(null)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Name</label>
                <input type="text" value={bearbeiten.name} onChange={(e) => setBearbeiten({ ...bearbeiten, name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>E-Mail</label>
                <input type="email" value={bearbeiten.email} onChange={(e) => setBearbeiten({ ...bearbeiten, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Termin</label>
                <input type="text" value={bearbeiten.termin} onChange={(e) => setBearbeiten({ ...bearbeiten, termin: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "20px" }}>
              <button onClick={bearbeitenSpeichern} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>
                💾 Speichern
              </button>
              <button onClick={() => setBearbeiten(null)} style={{ padding: "10px 24px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>
                Abbrechen
              </button>
              {gespeichert && <span style={{ color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>}
            </div>
          </div>
        </div>
      )}

      {loading && <p>Wird geladen...</p>}

      {/* Übersicht */}
      {!loading && ansicht === "uebersicht" && (
        <div>
          {termine.map((t) => {
            const label = `${t.wochentag}, ${t.datum}`;
            const teilnehmer = anmeldungen.filter((a) => a.termin === label);
            const belegt = teilnehmer.length;
            const voll = belegt >= t.max_teilnehmer;
            return (
              <div key={t.id} style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "20px 24px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: belegt > 0 ? "12px" : "0" }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: "16px" }}>{t.wochentag}, {t.datum}</p>
                    <p style={{ margin: "0", fontSize: "13px", color: "#888" }}>{t.titel}</p>
                  </div>
                  <div style={{ background: voll ? "#fdecea" : "#e6f4ea", borderRadius: "8px", padding: "8px 16px", textAlign: "center" }}>
                    <p style={{ margin: "0", fontWeight: "bold", fontSize: "20px", color: voll ? "#c0392b" : "#2d6a4f" }}>{belegt}/{t.max_teilnehmer}</p>
                    <p style={{ margin: "0", fontSize: "11px", color: "#888" }}>{voll ? "Voll" : "Frei"}</p>
                  </div>
                </div>
                {belegt > 0 && (
                  <div style={{ borderTop: "1px solid #eee", paddingTop: "12px" }}>
                    {teilnehmer.map((a) => (
                      <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                        <div>
                          <span style={{ fontWeight: "bold", fontSize: "14px" }}>{a.name}</span>
                          <span style={{ color: "#888", fontSize: "13px", marginLeft: "12px" }}>{a.email}</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => setBearbeiten(a)} style={{ padding: "4px 10px", background: "#f0f4ff", color: "#3355cc", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>✏️</button>
                          <button onClick={() => loeschen(a.id)} style={{ padding: "4px 10px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {belegt === 0 && <p style={{ margin: "8px 0 0", color: "#aaa", fontSize: "13px" }}>Noch keine Anmeldungen.</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Liste */}
      {!loading && ansicht === "liste" && anmeldungen.length === 0 && (
        <p style={{ color: "#888" }}>Noch keine Anmeldungen vorhanden.</p>
      )}

      {!loading && ansicht === "liste" && anmeldungen.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={th}>Name</th>
              <th style={th}>E-Mail</th>
              <th style={th}>Termin</th>
              <th style={th}>Angemeldet am</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {anmeldungen.map((a) => (
              <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}>{a.name}</td>
                <td style={td}>{a.email}</td>
                <td style={td}>{a.termin}</td>
                <td style={td}>
                  {new Date(a.erstellt_am).toLocaleDateString("de-CH", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setBearbeiten(a)} style={{ padding: "6px 12px", background: "#f0f4ff", color: "#3355cc", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>✏️</button>
                    <button onClick={() => loeschen(a.id)} style={{ padding: "6px 12px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
    </PasswortSchutz>
  );
}

const th: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontWeight: "bold",
  fontSize: "14px",
  color: "#555",
};

const td: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "15px",
};