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
  const monate: Record<string, number> = {
    "Januar": 0, "Februar": 1, "März": 2, "April": 3,
    "Mai": 4, "Juni": 5, "Juli": 6, "August": 7,
    "September": 8, "Oktober": 9, "November": 10, "Dezember": 11
  };
  const parts = d.split(",")[1]?.trim().split(" ");
  if (!parts || parts.length < 3) return 0;
  const day = parseInt(parts[0]);
  const month = monate[parts[1]] ?? 0;
  const year = parseInt(parts[2]);
  return new Date(year, month, day).getTime();
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
      const sortiert = (data || []).sort((a, b) => parseDate(a.termin) - parseDate(b.termin));
      setAnmeldungen(sortiert);
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