"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  kategorie: string;
  max_teilnehmer: number;
  bild_url: string;
  bilder: string[];
  details: string;
  ort: string;
  hikeandfly_id: number | null;
  abgesagt: boolean;
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
  teaser: string;
};

const parseDate = (d: string) => {
  const [day, month, year] = d.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
};

function kategorieEmoji(kategorie: string): string {
  const map: Record<string, string> = {
    "Sunrise to work": "🌅",
    "Morgen": "☀️",
    "Mittag": "🌤",
    "Feierabend": "🌇",
    "Abendflug": "🌆",
    "Vollmond-/Nachtflug": "🌕",
  };
  return map[kategorie] || "🪂";
}

export default function Home() {
  const [highlights, setHighlights] = useState<Termin[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);
  const [offen, setOffen] = useState<number | null>(null);
  const [blogBeitraege, setBlogBeitraege] = useState<BlogBeitrag[]>([]);
  const router = useRouter();

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
      setHighlights(sortiert);

      const { data: anmeldungenData } = await supabase
        .from("anmeldungen")
        .select("id, termin");
      setAnmeldungen(anmeldungenData || []);

      const { data: blogData } = await supabase
        .from("blog")
        .select("id, titel, teaser, bilder, medien, thumbnail_url, erstellt_am")
        .eq("aktiv", true)
        .order("erstellt_am", { ascending: false });
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
        <h1 style={{ fontSize: "32px", fontWeight: "bold", color: "#ffffff", marginBottom: "8px", marginTop: "0" }}>
          🪂 VikingFly
        </h1>
        <p style={{ fontSize: "14px", color: "#aaa", marginBottom: "20px", fontStyle: "italic" }}>
          Wo Berge zu Flügeln werden 
        </p>

        {highlights.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", fontWeight: "bold", color: "#7799ff", letterSpacing: "1px", margin: "0" }}>⭐ NÄCHSTE EVENTS</p>
              <a href="/termine" style={{ fontSize: "12px", color: "#7799ff", textDecoration: "none" }}>(Alle Events ansehen)</a>
            </div>
            <div>
              {highlights.map((t) => {
                const label = `${t.wochentag}, ${t.datum}`;
                const belegt = anmeldungen.filter((a) => a.termin === label).length;
                const voll = belegt >= t.max_teilnehmer;
                const istOffen = offen === t.id;

                return (
                  <div key={t.id} style={{
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "12px",
                    marginBottom: "12px",
                    overflow: "hidden",
                    textAlign: "left",
                  }}>
                    <div
                      onClick={() => setOffen(istOffen ? null : t.id)}
                      style={{
                        padding: "16px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        background: istOffen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          margin: "0 0 2px",
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: voll ? "#e74c3c" : "#7799ff",
                        }}>
                          {t.wochentag}, {t.datum}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <h3 style={{
                            margin: "0",
                            fontSize: "16px",
                            fontWeight: "normal",
                            color: t.abgesagt ? "#888" : "#ddd",
                            textDecoration: t.abgesagt ? "line-through" : "none",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {kategorieEmoji(t.kategorie)} {t.titel}
                          </h3>
                          {t.abgesagt && (
                            <span style={{ fontSize: "11px", padding: "2px 6px", background: "rgba(192,57,43,0.3)", borderRadius: "6px", color: "#e74c3c", fontWeight: "bold", flexShrink: 0 }}>🚫</span>
                          )}
                          {voll && !t.abgesagt && (
                            <span style={{ fontSize: "11px", padding: "2px 6px", background: "rgba(192,57,43,0.3)", borderRadius: "6px", color: "#e74c3c", fontWeight: "bold", flexShrink: 0 }}>Voll</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOffen(istOffen ? null : t.id); }}
                        aria-label={istOffen ? "Details schliessen" : "Details öffnen"}
                        style={{
                          flexShrink: 0,
                          marginLeft: "12px",
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          border: "none",
                          background: "rgba(51,85,204,0.3)",
                          color: "#7799ff",
                          fontSize: "24px",
                          lineHeight: "1",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: istOffen ? "rotate(45deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                        }}
                      >
                        +
                      </button>
                    </div>

                    {istOffen && (
                      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                          <p style={{ margin: "0", color: "#888", fontSize: "14px" }}>📍 {t.ort} · {t.kategorie}</p>
                          <div style={{
                            background: voll ? "rgba(192,57,43,0.3)" : "rgba(51,85,204,0.3)",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            textAlign: "center",
                          }}>
                            <span style={{ fontSize: "14px", fontWeight: "bold", color: voll ? "#e74c3c" : "#7799ff" }}>
                              {t.max_teilnehmer - belegt} {voll ? "· Voll" : "frei"}
                            </span>
                          </div>
                        </div>

                        {t.hikeandfly_id && (
                          <div style={{ marginBottom: "16px" }}>
                            <a href={`/hikeandfly?open=${t.hikeandfly_id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: "12px", padding: "4px 10px", background: "rgba(51,85,204,0.3)", borderRadius: "6px", color: "#7799ff", textDecoration: "none" }}>
                              🥾 Hike & Fly
                            </a>
                          </div>
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

                        <div>
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

            <div style={{ marginBottom: "16px" }}>
              <select
                onChange={(e) => { if (e.target.value) router.push(`/blog/${e.target.value}`); }}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", cursor: "pointer" }}
              >
                <option value="" style={{ background: "#1a1a2e" }}>📖 -- Beitrag auswählen --</option>
                {blogBeitraege.map((b) => (
                  <option key={b.id} value={b.id} style={{ background: "#1a1a2e" }}>{b.titel}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {blogBeitraege.map((b) => {
                const vorschaubild = b.thumbnail_url || (b.medien && b.medien.length > 0 ? b.medien[0] : null) || (b.bilder && b.bilder.length > 0 ? b.bilder[0] : null);
                return (
                  <a key={b.id} href={`/blog/${b.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", overflow: "hidden", background: "rgba(255,255,255,0.05)", display: "flex" }}>
                      {vorschaubild && (
                        <img src={vorschaubild} alt={b.titel} style={{ width: "100px", objectFit: "cover", flexShrink: 0, alignSelf: "stretch" }} />
                      )}
                      <div style={{ padding: "12px" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#aaa", textAlign: "left" }}>{new Date(b.erstellt_am).toLocaleDateString("de-CH")}</p>
                        <p style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "bold", color: "#fff", textAlign: "left" }}>{b.titel}</p>
                        {b.teaser && (
                          <p style={{ margin: "0", fontSize: "12px", color: "#aaa", lineHeight: "1.5", textAlign: "left" }}>{b.teaser}</p>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
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
