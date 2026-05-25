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

const parseDate = (d: string) => {
  const datumPart = d.split(",")[1]?.trim();
  if (!datumPart) return 0;
  const [day, month, year] = datumPart.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
};

export default function AdminAnmeldungen() {
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);
  const [loading, setLoading] = useState(true);
  const [bearbeiten, setBearbeiten] = useState<Anmeldung | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  async function laden() {
    const { data } = await supabase.from("anmeldungen").select("*");
    const sortiert = (data || []).sort((a, b) => parseDate(a.termin) - parseDate(b.termin));
    setAnmeldungen(sortiert);
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
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Alle Anmeldungen</h2>

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

      {!loading && anmeldungen.length === 0 && (
        <p style={{ color: "#888" }}>Noch keine Anmeldungen vorhanden.</p>
      )}

      {!loading && anmeldungen.length > 0 && (
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
                    <button
                      onClick={() => setBearbeiten(a)}
                      style={{ padding: "6px 12px", background: "#f0f4ff", color: "#3355cc", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => loeschen(a.id)}
                      style={{ padding: "6px 12px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
                    >
                      🗑
                    </button>
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