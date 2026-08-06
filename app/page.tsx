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
  abgesagt_begruendung: string;
};

type Anmeldung = {
  id: number;
  name: string;
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

type NewsBeitrag = {
  id: number;
  titel: string;
  teaser: string;
  text: string;
  medien: string[];
  thumbnail_url: string;
  erstellt_am: string;
};

type HafDaten = {
  strecke_km: number;
  hoehenmeter: number;
  tempo_wanderweg: string;
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
  const [teilnehmerOffen, setTeilnehmerOffen] = useState<number | null>(null);
  const [hafDaten, setHafDaten] = useState<Record<number, HafDaten>>({});
  const [blogBeitraege, setBlogBeitraege] = useState<BlogBeitrag[]>([]);
  const [newsBeitraege, setNewsBeitraege] = useState<NewsBeitrag[]>([]);
  const [newsOffen, setNewsOffen] = useState<number | null>(null);
  const [newsMedienIndex, setNewsMedienIndex] = useState<Record<number, number>>({});
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
        .sort((a, b) => parseDate(a.datum) - parseDate(b.datum));
      setHighlights(sortiert);

      const { data: anmeldungenData } = await supabase
        .from("anmeldungen")
        .select("id, name, termin");
      setAnmeldungen(anmeldungenData || []);

      const { data: blogData } = await supabase
        .from("blog")
        .select("id, titel, teaser, bilder, medien, thumbnail_url, erstellt_am")
        .eq("aktiv", true)
        .order("erstellt_am", { ascending: false });
      setBlogBeitraege(blogData || []);

      const { data: newsData } = await supabase
        .from("news")
        .select("*")
        .eq("aktiv", true)
        .order("erstellt_am", { ascending: false });
      setNewsBeitraege(newsData || []);
    }
    laden();
  }, []);

  useEffect(() => {
    if (!offen) return;
    const termin = highlights.find((t) => t.id === offen);
    if (!termin?.hikeandfly_id || hafDaten[termin.hikeandfly_id]) return;
    supabase
      .from("hikeandfly")
      .select("id, strecke_km, hoehenmeter, tempo_wanderweg")
      .eq("id", termin.hikeandfly_id)
      .single()
      .then(({ data }) => {
        if (data) setHafDaten((prev) => ({ ...prev, [data.id]: data }));
      });
  }, [offen]);

  const isVideo = (url: string) => url.includes("/video/") || url.endsWith(".mp4") || url.endsWith(".mov");

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
          Wo Berge zu Flügeln werden – Walhalla kann warten
        </p>

        {/* News & Gedanken */}
        {newsBeitraege.length > 0 && (
          <div style={{ marginBottom: "32px", width: "100%" }}>
            <p style={{ fontSize: "12px", fontWeight: "bold", color: "#ffaa44", letterSpacing: "1px", margin: "0 0 16px", textAlign: "left" }}>📰 NEWS & GEDANKEN</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {newsBeitraege.map((n) => {
                const istOffen = newsOffen === n.id;
                const aktuellerIndex = newsMedienIndex[n.id] || 0;
                const vorschaubild = n.thumbnail_url || (n.medien && n.medien.length > 0 && !isVideo(n.medien[0]) ? n.medien[0] : null);

                return (
                  <div key={n.id} style={{ border: "1px solid rgba(255,165,0,0.3)", borderRadius: "12px", overflow: "hidden", background: "rgba(255,165,0,0.05)", textAlign: "left" }}>
                    <div onClick={() => setNewsOffen(istOffen ? null : n.id)} style={{ cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                            <p style={{ margin: "8px 12px 8px 12px", fontSize: "16px", fontWeight: "bold", color: "#fff", flex: 1 }}>{n.titel}</p>
                            <div style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
                              {vorschaubild && (
                                <img src={vorschaubild} alt={n.titel} style={{ width: "64px", height: "64px", objectFit: "cover" }} />
                              )}
                              <span style={{ fontSize: "22px", color: "#ffaa44", display: "inline-block", transform: istOffen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s", padding: "8px 12px" }}>+</span>
                            </div>
                          </div>
                          {n.teaser && !istOffen && (
                            <p style={{ margin: "0", padding: "0 12px 10px 12px", fontSize: "12px", color: "#aaa", lineHeight: "1.5" }}>{n.teaser}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {istOffen && (
                      <div style={{ borderTop: "1px solid rgba(255,165,0,0.2)", background: "rgba(0,0,0,0.2)" }}>
                        {n.medien && n.medien.length > 0 && (
                          <div style={{ position: "relative" }}>
                            {isVideo(n.medien[aktuellerIndex]) ? (
                              <video controls style={{ width: "100%", maxHeight: "300px", objectFit: "contain", background: "#000" }}>
                                <source src={n.medien[aktuellerIndex]} type="video/mp4" />
                              </video>
                            ) : (
                              <img src={n.medien[aktuellerIndex]} alt={n.titel} style={{ width: "100%", maxHeight: "300px", objectFit: "contain", background: "#111" }} />
                            )}
                            {n.medien.length > 1 && (
                              <>
                                <button onClick={() => setNewsMedienIndex((prev) => ({ ...prev, [n.id]: Math.max(0, aktuellerIndex - 1) }))} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "16px", display: aktuellerIndex === 0 ? "none" : "flex", alignItems: "center", justifyContent: "center" }}>&#8249;</button>
                                <button onClick={() => setNewsMedienIndex((prev) => ({ ...prev, [n.id]: Math.min(n.medien.length - 1, aktuellerIndex + 1) }))} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "16px", display: aktuellerIndex === n.medien.length - 1 ? "none" : "flex", alignItems: "center", justifyContent: "center" }}>&#8250;</button>
                                <div style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.5)", color: "white", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" }}>{aktuellerIndex + 1} / {n.medien.length}</div>
                              </>
                            )}
                          </div>
                        )}
                        <div style={{ padding: "16px" }}>
                          {n.teaser && (
                            <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#ddd", fontStyle: "italic", borderLeft: "3px solid #ffaa44", paddingLeft: "10px" }}>{n.teaser}</p>
                          )}
                          {n.text && (
                            <div style={{ fontSize: "14px", color: "#ccc", lineHeight: "1.7" }} dangerouslySetInnerHTML={{ __html: n.text }} />
                          )}
                          <p style={{ margin: "12px 0 0", fontSize: "11px", color: "#666" }}>{new Date(n.erstellt_am).toLocaleDateString("de-CH")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Events */}
        {highlights.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "12px", fontWeight: "bold", color: "#7799ff", letterSpacing: "1px", margin: "0 0 16px", textAlign: "left" }}>⭐ NÄCHSTE EVENTS</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {highlights.map((t) => {
                const label = `${t.wochentag}, ${t.datum}`;
                const teilnehmerListe = anmeldungen.filter((a) => a.termin === label);
                const belegt = teilnehmerListe.length;
                const voll = belegt >= t.max_teilnehmer;
                const istOffen = offen === t.id;

                return (
                  <div key={t.id} style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", overflow: "hidden", textAlign: "left" }}>
                    <div onClick={() => setOffen(istOffen ? null : t.id)} style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: istOffen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)" }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: "bold", color: t.abgesagt ? "#888" : "#fff", textDecoration: t.abgesagt ? "line-through" : "none" }}>
                          {kategorieEmoji(t.kategorie)} {t.titel}
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <p style={{ margin: "0", fontSize: "12px", color: "#aaa" }}>
                            {t.wochentag}, {t.datum} · ({belegt}/{t.max_teilnehmer}){!voll && !t.abgesagt ? " · bitte anmelden" : ""}
                          </p>
                          {t.abgesagt && <span style={{ fontSize: "11px", padding: "2px 6px", background: "rgba(192,57,43,0.3)", borderRadius: "6px", color: "#e74c3c", fontWeight: "bold" }}>🚫 Abgesagt</span>}
                          {voll && !t.abgesagt && <span style={{ fontSize: "11px", padding: "2px 6px", background: "rgba(192,57,43,0.3)", borderRadius: "6px", color: "#e74c3c", fontWeight: "bold" }}>Voll</span>}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setOffen(istOffen ? null : t.id); }} style={{ flexShrink: 0, marginLeft: "12px", width: "40px", height: "40px", borderRadius: "50%", border: "none", background: "rgba(51,85,204,0.3)", color: "#7799ff", fontSize: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transform: istOffen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>+</button>
                    </div>

                    {istOffen && (
                      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#aaa", fontWeight: "bold", letterSpacing: "0.5px" }}>📍 TREFFPUNKT</p>
                          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#fff" }}>{t.ort}</p>
                        </div>

                        {t.hikeandfly_id && hafDaten[t.hikeandfly_id] && (
                          <div style={{ padding: "10px 12px", background: "rgba(51,85,204,0.15)", borderRadius: "8px" }}>
                            <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#7799ff", fontWeight: "bold", letterSpacing: "0.5px" }}>🥾 HIKE & FLY</p>
                            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "8px" }}>
                              {hafDaten[t.hikeandfly_id].strecke_km > 0 && <span style={{ fontSize: "13px", color: "#ccc" }}>🗺 {hafDaten[t.hikeandfly_id].strecke_km} km</span>}
                              {hafDaten[t.hikeandfly_id].hoehenmeter > 0 && <span style={{ fontSize: "13px", color: "#ccc" }}>⛰ {hafDaten[t.hikeandfly_id].hoehenmeter} hm</span>}
                              {hafDaten[t.hikeandfly_id].tempo_wanderweg && <span style={{ fontSize: "13px", color: "#ccc" }}>⏱ ca. {hafDaten[t.hikeandfly_id].tempo_wanderweg}</span>}
                            </div>
                            <a href={`/hikeandfly?open=${t.hikeandfly_id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: "12px", color: "#7799ff", textDecoration: "none" }}>Details ansehen →</a>
                          </div>
                        )}

                        {t.details && (
                          <div>
                            <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#aaa", fontWeight: "bold", letterSpacing: "0.5px" }}>ℹ️ INFOS</p>
                            <div style={{ fontSize: "14px", color: "#ccc", lineHeight: "1.7" }} dangerouslySetInnerHTML={{ __html: t.details }} />
                          </div>
                        )}

                        <div>
                          <button onClick={(e) => { e.stopPropagation(); setTeilnehmerOffen(teilnehmerOffen === t.id ? null : t.id); }} style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#aaa", cursor: "pointer", fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>👥 Teilnehmer ({belegt}/{t.max_teilnehmer})</span>
                            <span>{teilnehmerOffen === t.id ? "▲" : "▼"}</span>
                          </button>
                          {teilnehmerOffen === t.id && (
                            <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderTop: "none", borderRadius: "0 0 8px 8px" }}>
                              {belegt === 0 ? (
                                <p style={{ margin: "0", fontSize: "13px", color: "#666" }}>Noch keine Anmeldungen.</p>
                              ) : (
                                <ul style={{ margin: "0", padding: "0 0 0 16px" }}>
                                  {teilnehmerListe.map((a) => (
                                    <li key={a.id} style={{ fontSize: "13px", color: "#ccc", marginBottom: "4px" }}>{a.name}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          {t.abgesagt ? (
                            <div>
                              <span style={{ display: "inline-block", padding: "10px 20px", background: "rgba(192,57,43,0.3)", color: "#e74c3c", borderRadius: "8px", fontSize: "14px", fontWeight: "bold" }}>🚫 Abgesagt</span>
                              {t.abgesagt_begruendung && <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#e74c3c" }}>{t.abgesagt_begruendung}</p>}
                            </div>
                          ) : voll ? (
                            <span style={{ display: "inline-block", padding: "10px 20px", background: "#555", color: "white", borderRadius: "8px", fontSize: "14px", fontWeight: "bold" }}>🔴 Ausgebucht</span>
                          ) : (
                            <a href={`/termine/anmelden?termin=${encodeURIComponent(label)}`} onClick={(e) => e.stopPropagation()} style={{ display: "inline-block", padding: "10px 20px", background: "#3355cc", color: "white", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>✍️ Jetzt anmelden</a>
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
              <select onChange={(e) => { if (e.target.value) router.push(`/blog/${e.target.value}`); }} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", cursor: "pointer" }}>
                <option value="" style={{ background: "#1a1a2e" }}>📖 -- Beitrag auswählen --</option>
                {blogBeitraege.map((b) => <option key={b.id} value={b.id} style={{ background: "#1a1a2e" }}>{b.titel}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {blogBeitraege.map((b) => {
                const vorschaubild = b.thumbnail_url || (b.medien && b.medien.length > 0 ? b.medien[0] : null) || (b.bilder && b.bilder.length > 0 ? b.bilder[0] : null);
                return (
                  <a key={b.id} href={`/blog/${b.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", overflow: "hidden", background: "rgba(255,255,255,0.05)", display: "flex" }}>
                      {vorschaubild && <img src={vorschaubild} alt={b.titel} style={{ width: "100px", objectFit: "cover", flexShrink: 0, alignSelf: "stretch" }} />}
                      <div style={{ padding: "12px" }}>
                        <p style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "bold", color: "#fff", textAlign: "left" }}>{b.titel}</p>
                        {b.teaser && <p style={{ margin: "0", fontSize: "12px", color: "#aaa", lineHeight: "1.5", textAlign: "left" }}>{b.teaser}</p>}
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
        <a href="/admin/news" style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>News Admin</a>
        <a href="/upload" style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>Upload</a>
      </div>
    </main>
  );
}