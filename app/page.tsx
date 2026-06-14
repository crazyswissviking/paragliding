"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

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
  max_teilnehmer: number;
  bild_url: string;
  bilder: string[];
  details: string;
  ort: string;
  hikeandfly_id: number | null;
};

type Anmeldung = {
  id: number;
  termin: string;
};

type BlogBeitrag = {
  id: number;
  titel: string;
  bilder: string[];
  medien: string[];
  thumbnail_url: string;
  erstellt_am: string;
};

const parseDate = (d: string) => {
  const [day, month, year] = d.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
};

export default function Home() {
  const [highlights, setHighlights] = useState<Termin[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);
  const [offen, setOffen] = useState<number | null>(null);
  const [blogBeitraege, setBlogBeitraege] = useState<BlogBeitrag[]>([]);

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
        .slice(0, 2);
      setHighlights(sortiert);

      const { data: anmeldungenData } = await supabase
        .from("anmeldungen")
        .select("id, termin");
      setAnmeldungen(anmeldungenData || []);

      const { data: blogData } = await supabase
        .from("blog")
        .select("id, titel, bilder, medien, thumbnail_url, erstellt_am")
        .eq("aktiv", true)
        .order("erstellt_am", { ascending: false })
        .limit(3);
      setBlogBeitraege(blogData || []);
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
      justifyContent: "flex-start",
      paddingTop: "16px",
      padding: "20px 40px 40px 40px",
      textAlign: "center",
      overflow: "hidden",
    }}>
      {/* Hintergrundvideo */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, overflow: "hidden" }}>
        <video autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }}>
          <source src="https://res.cloudinary.com/dnfnng4mm/video/upload/v1779590348/video_ve6erm.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)" }} />
      </div>

      {/* Inhalt */}
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "700px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "bold", color: "#ffffff", marginBottom: "20px", marginTop: "0" }}>
          🪂 Swissgliders
        </h1>

        {highlights.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", fontWeight: "bold", color: "#7799ff", letterSpacing: "1px", margin: "0" }}>⭐ NÄCHSTE EVENTS</p>
              <a href="/termine" style={{ fontSize: "12px", color: "#7799ff", textDecoration: "none" }}>(Alle Events ansehen)</a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
              {highlights.map((t) => {
                const label = `${t.wochentag}, ${t.datum}`;
                const belegt = anmeldungen.filter((a) => a.termin === label).length;
                const voll = belegt >= t.max_teilnehmer;
                const istOffen = offen === t.id;

                return (
                  <div key={t.id} style={{
                    border: "1px solid rgba(51,85,204,0.5)",
                    borderRadius: "12px",
                    background: "rgba(51,85,204,0.15)",
                    textAlign: "left",
                    overflow: "hidden",
                  }}>
                    <div style={{ padding: "16px" }}>
                      <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#7799ff" }}>🌕 {t.wochentag}, {t.datum}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                        <p style={{ margin: "0", fontSize: "14px", fontWeight: "bold", color: "#fff" }}>{t.titel}</p>
                        {t.hikeandfly_id && (
                          <a href={`/hikeandfly?open=${t.hikeandfly_id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: "11px", padding: "2px 6px", background: "rgba(51,85,204,0.3)", borderRadius: "4px", color: "#7799ff", textDecoration: "none" }}>
                            🥾 H&F
                          </a>
                        )}
                      </div>
                      <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#888" }}>📍 {t.ort}</p>
                      <div style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        background: voll ? "rgba(192,57,43,0.3)" : "rgba(51,85,204,0.3)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: voll ? "#e74c3c" : "#7799ff",
                        fontWeight: "bold",
                        marginBottom: "12px",
                      }}>
                        {voll ? "🔴 Voll" : `${t.max_teilnehmer - belegt} Plätze frei`}
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {!voll && (
                          <a href={`/termine/anmelden?termin=${encodeURIComponent(label)}`} style={{
                            display: "inline-block", padding: "6px 12px", background: "#3355cc",
                            color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: "bold",
                          }}>
                            ✍️ Anmelden
                          </a>
                        )}
                        {t.details && (
                          <button onClick={() => setOffen(istOffen ? null : t.id)} style={{
                            padding: "6px 12px", background: "rgba(255,255,255,0.1)", color: "white",
                            border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", fontSize: "12px",
                            fontWeight: "bold", cursor: "pointer",
                          }}>
                            {istOffen ? "▲ Schliessen" : "▼ Details"}
                          </button>
                        )}
                      </div>
                    </div>

                    {istOffen && t.details && (
                      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)", fontSize: "13px", color: "#ccc", textAlign: "left" }}>
                        {t.details.split("\n").map((zeile, i) => (
                          <p key={i} style={{ margin: "4px 0" }}>
                            <TextMitLinks text={zeile} style={{ color: "#ccc" }} />
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Blog */}
        {blogBeitraege.length > 0 && (
          <div style={{ width: "100%" }}>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginBottom: "16px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {blogBeitraege.map((b) => {
                const vorschaubild = b.thumbnail_url || (b.medien && b.medien.length > 0 ? b.medien[0] : null) || (b.bilder && b.bilder.length > 0 ? b.bilder[0] : null);
                return (
                  <a key={b.id} href="/blog" style={{ textDecoration: "none" }}>
                    <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", overflow: "hidden", display: "flex", background: "rgba(255,255,255,0.05)" }}>
                      {vorschaubild && (
                        <img src={vorschaubild} alt={b.titel} style={{ width: "100px", height: "80px", objectFit: "cover", flexShrink: 0 }} />
                      )}
                      <div style={{ padding: "12px" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#aaa" }}>{new Date(b.erstellt_am).toLocaleDateString("de-CH")}</p>
                        <p style={{ margin: "0", fontSize: "14px", fontWeight: "bold", color: "#fff" }}>{b.titel}</p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
            <a href="/blog" style={{ display: "block", marginTop: "12px", padding: "12px 24px", background: "rgba(255,255,255,0.05)", color: "#aaa", borderRadius: "12px", textDecoration: "none", fontSize: "14px", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
              📖 Alle Beiträge lesen
            </a>
          </div>
        )}
      </div>

      {/* Links unten links */}
      <div style={{ position: "absolute", bottom: "16px", left: "16px", zIndex: 10, display: "flex", gap: "16px" }}>
        <a href="/admin/termine" style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Admin</a>
        <a href="/admin/hikeandfly" style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>H&F Admin</a>
        <a href="/admin/blog" style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Blog Admin</a>
        <a href="/upload" style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Upload</a>
      </div>
    </main>
  );
}