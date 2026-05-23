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

export default function AdminAnmeldungen() {
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function laden() {
      const { data } = await supabase
        .from("anmeldungen")
        .select("*")
        .order("erstellt_am", { ascending: false });
      setAnmeldungen(data || []);
      setLoading(false);
    }
    laden();
  }, []);

 return (
    <PasswortSchutz>
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Alle Anmeldungen</h2>

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