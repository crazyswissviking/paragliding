"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import PasswortSchutz from "../passwort";
import { DASH_ELEMENTE, DASH_STANDARD, DASH_TABELLE, bereinigeAuswahl } from "../../lib/dashboard";

export default function AdminDashboard() {
  const [auswahl, setAuswahl] = useState<string[]>(DASH_STANDARD);
  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState<{ text: string; ok: boolean } | null>(null);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from(DASH_TABELLE).select("eintraege").eq("id", 1).maybeSingle();
      if (error) {
        setMeldung({ text: `Konfiguration konnte nicht geladen werden (${error.message}). Existiert die Tabelle "${DASH_TABELLE}"?`, ok: false });
      } else {
        const a = bereinigeAuswahl(data?.eintraege);
        if (a) setAuswahl(a);
      }
      setLoading(false);
    })();
  }, []);

  const label = (key: string) => DASH_ELEMENTE.find((e) => e.key === key)?.label ?? key;

  function verschieben(i: number, richtung: -1 | 1) {
    const j = i + richtung;
    if (j < 0 || j >= auswahl.length) return;
    const neu = [...auswahl];
    [neu[i], neu[j]] = [neu[j], neu[i]];
    setAuswahl(neu);
  }

  async function speichern() {
    setSpeichert(true);
    setMeldung(null);
    const { error } = await supabase
      .from(DASH_TABELLE)
      .upsert({ id: 1, eintraege: auswahl, aktualisiert: new Date().toISOString() });
    setSpeichert(false);
    setMeldung(error ? { text: `Speichern fehlgeschlagen: ${error.message}`, ok: false } : { text: "✅ Gespeichert – das Dashboard auf der Hauptseite ist aktualisiert.", ok: true });
  }

  const gruppen = Array.from(new Set(DASH_ELEMENTE.map((e) => e.gruppe)));
  const btn: React.CSSProperties = { padding: "6px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" };

  return (
    <PasswortSchutz>
      <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 VikingFly</h1>
        <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "10px" }}>Admin – Dashboard Messdaten</h2>
        <p style={{ color: "#555", fontSize: "14px", marginBottom: "24px", lineHeight: 1.5 }}>
          Diese Messwerte erscheinen sofort beim Öffnen der Hauptseite. Alle weiteren Messdaten sind dort per Klick auf „Alle Messdaten“ aufklappbar.
        </p>

        {loading ? (
          <p>Wird geladen…</p>
        ) : (
          <>
            <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "18px" }}>Im Dashboard angezeigt ({auswahl.length})</h3>
              {auswahl.length === 0 && <p style={{ color: "#888", margin: 0 }}>Nichts ausgewählt – das Dashboard zeigt dann nur den Aufklapp-Button.</p>}
              {auswahl.map((k, i) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <span style={{ flex: 1, fontSize: "15px" }}>{i + 1}. {label(k)}</span>
                  <button style={btn} onClick={() => verschieben(i, -1)} disabled={i === 0} aria-label="nach oben">▲</button>
                  <button style={btn} onClick={() => verschieben(i, 1)} disabled={i === auswahl.length - 1} aria-label="nach unten">▼</button>
                  <button style={{ ...btn, color: "#c33" }} onClick={() => setAuswahl(auswahl.filter((x) => x !== k))} aria-label="entfernen">✕</button>
                </div>
              ))}
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "18px" }}>Verfügbare Messdaten</h3>
              {gruppen.map((g) => {
                const frei = DASH_ELEMENTE.filter((e) => e.gruppe === g && !auswahl.includes(e.key));
                return (
                  <div key={g} style={{ marginBottom: "14px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "6px" }}>{g}</div>
                    {frei.length === 0 && <div style={{ color: "#888", fontSize: "13px" }}>Alle bereits im Dashboard.</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {frei.map((e) => (
                        <button key={e.key} style={btn} onClick={() => setAuswahl([...auswahl, e.key])}>+ {e.label}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={speichern}
                disabled={speichert}
                style={{ padding: "12px 24px", borderRadius: "8px", border: "none", background: "#3355cc", color: "#fff", fontSize: "15px", cursor: "pointer" }}
              >
                {speichert ? "Speichert…" : "Speichern"}
              </button>
              <button style={{ ...btn, padding: "12px 18px" }} onClick={() => setAuswahl(DASH_STANDARD)}>Standard wiederherstellen</button>
              <a href="/" style={{ fontSize: "14px", color: "#3355cc" }}>← zur Hauptseite</a>
            </div>
            {meldung && <p style={{ marginTop: "16px", color: meldung.ok ? "#2e7d32" : "#c33", fontSize: "14px" }}>{meldung.text}</p>}
          </>
        )}
      </main>
    </PasswortSchutz>
  );
}
