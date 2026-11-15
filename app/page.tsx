"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";
import FlugWetter from "./components/FlugWetter";

// ── Farben (helles Pastellblau) ───────────────────────────────────────────
const TEXT = "#1f3a5a";
const TEXT2 = "#5b7491";
const TEXT3 = "#8aa0b8";
const RAND = "#cfe0f2";
const KARTE = "rgba(255,255,255,0.82)";
const BRAND = "#3355cc";

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

function kalenderDatei(t: Termin): void {
  const [day, month, year] = t.datum.split(".").map(Number);
  const datum = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VikingFly//VikingFly//DE",
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${datum}`,
    `DTEND;VALUE=DATE:${datum}`,
    `SUMMARY:🪂 ${t.titel}`,
    `DESCRIPTION:${t.kategorie}\\nTreffpunkt: ${t.ort}`,
    `LOCATION:${t.ort}`,
    `URL:https://vikingfly.ch/termine?id=${t.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vikingfly-${t.titel.replace(/\s+/g, "-")}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

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

const sektionTitel = (farbe: string): React.CSSProperties => ({
  fontSize: "12px",
  fontWeight: "bold",
  color: farbe,
  letterSpacing: "1px",
  margin: "0",
  textAlign: "left",
});

const dropdownStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: `1px solid ${RAND}`,
  background: "#fff",
  color: TEXT,
  fontSize: "13px",
  cursor: "pointer",
  maxWidth: "100%",
};

const kleinerButton: React.CSSProperties = {
  padding: "10px 16px",
  background: "#fff",
  color: TEXT2,
  border: `1px solid ${RAND}`,
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "bold",
  cursor: "pointer",
};

export default function Home() {
  const [highlights, setHighlights] = useState<Termin[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([]);
  const [offen, setOffen] = useState<number | null>(null);
  const [teilnehmerOffen, setTeilnehmerOffen] = useState<number | null>(null);
  const [hafDaten, setHafDaten] = useState<Record<number, HafDaten>>({});
  const [blogBeitraege, setBlogBeitraege] = useState<BlogBeitrag[]>([]);
  const [newsBeitraege, setNewsBeitraege] = useState<NewsBeitrag[]>([]);
  const [newsOffen, setNewsOffen] = useState<number | null>(null);
  const [newsKopiert, setNewsKopiert] = useState<number | null>(null);
  const [newsMedienIndex, setNewsMedienIndex] = useState<Record<number, number>>({});
  const [kopiert, setKopiert] = useState<number | null>(null);
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
        .filter((t: Termin) => parseDate(t.datum) >= heute.getTime())
        .sort((a: Termin, b: Termin) => parseDate(a.datum) - parseDate(b.datum));
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
      let news: NewsBeitrag[] = newsData || [];

      // Direktlink ?news=ID: gewünschten Artikel nach vorne holen und öffnen
      const newsId = new URLSearchParams(window.location.search).get("news");
      if (newsId) {
        const id = parseInt(newsId);
        const treffer = news.find((n) => n.id === id);
        if (treffer) {
          news = [treffer, ...news.filter((n) => n.id !== id)];
          setNewsOffen(id);
        }
      }
      setNewsBeitraege(news);
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
      .then(({ data }: { data: (HafDaten & { id: number }) | null }) => {
        if (data) setHafDaten((prev) => ({ ...prev, [data.id]: data }));
      });
  }, [offen]);

  const isVideo = (url: string) => url.includes("/video/") || url.endsWith(".mp4") || url.endsWith(".mov");

  return (
    <main style={{
      minHeight: "calc(100vh - 60px)",
      background: "linear-gradient(180deg, #dbeafb 0%, #e9f2fd 45%, #f4f9ff 100%)",
      color: TEXT,
      padding: "24px 16px 40px 16px",
      textAlign: "center",
    }}>
      <style>{`
        .rich { font-size: 14px; color: #33506f; line-height: 1.7; }
        .rich p { margin: 4px 0; }
        .rich ul, .rich ol { margin: 6px 0; padding-left: 20px; }
        .rich a { color: #3355cc; text-decoration: underline; word-break: break-all; }
        .rich blockquote { border-left: 3px solid #3355cc; margin: 8px 0; padding-left: 12px; color: #5b7491; }
        .rich h3 { margin: 10px 0 4px; font-size: 16px; color: #1f3a5a; }
      `}</style>

      <div style={{ width: "100%", maxWidth: "720px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "bold", color: TEXT, margin: "0 0 6px" }}>
          🪂 VikingFly
        </h1>
        <p style={{ fontSize: "14px", color: TEXT2, margin: "0 0 20px", fontStyle: "italic" }}>
          Wo Berge zu Flügeln werden – Walhalla kann warten
        </p>

        {/* Flugwetter */}
        <FlugWetter />

        {/* News & Gedanken */}
        {newsBeitraege.length > 0 && (
          <div style={{ marginBottom: "32px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <p style={sektionTitel("#b36b00")}>📰 NEWS & GEDANKEN</p>
              {newsBeitraege.length > 1 && (
                <select
                  onChange={(e) => {
                    setNewsOffen(null);
                    if (!e.target.value) {
                      supabase.from("news").select("*").eq("aktiv", true).order("erstellt_am", { ascending: false }).then(({ data }: { data: NewsBeitrag[] | null }) => setNewsBeitraege(data || []));
                    } else {
                      setNewsBeitraege((prev) => {
                        const selected = prev.find((n) => n.id === parseInt(e.target.value));
                        const rest = prev.filter((n) => n.id !== parseInt(e.target.value));
                        return selected ? [selected, ...rest] : prev;
                      });
                    }
                  }}
                  style={{ ...dropdownStyle, fontSize: "12px", color: "#b36b00", border: "1px solid #f1d9a8" }}
                >
                  <option value="">Alle Artikel</option>
                  {newsBeitraege.map((n) => (
                    <option key={n.id} value={n.id}>{n.titel}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {newsBeitraege.slice(0, 1).map((n) => {
                const istOffen = newsOffen === n.id;
                const aktuellerIndex = newsMedienIndex[n.id] || 0;

                return (
                  <div key={n.id} style={{ border: "1px solid #f1d9a8", borderRadius: "14px", overflow: "hidden", background: "#fff8ea", textAlign: "left", boxShadow: "0 3px 12px rgba(179,107,0,0.08)" }}>
                    <div onClick={() => setNewsOffen(istOffen ? null : n.id)} style={{ cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <p style={{ margin: "10px 12px", fontSize: "16px", fontWeight: "bold", color: TEXT, flex: 1 }}>{n.titel}</p>
                        <span style={{ fontSize: "22px", color: "#b36b00", display: "inline-block", transform: istOffen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s", padding: "8px 12px", flexShrink: 0 }}>+</span>
                      </div>
                      {n.teaser && !istOffen && (
                        <p style={{ margin: "0", padding: "0 12px 12px 12px", fontSize: "13px", color: TEXT2, lineHeight: "1.5" }}>{n.teaser}</p>
                      )}
                    </div>

                    {istOffen && (
                      <div style={{ borderTop: "1px solid #f1d9a8", background: "#fffdf7" }}>
                        {n.medien && n.medien.length > 0 && (
                          <div style={{ position: "relative" }}>
                            {isVideo(n.medien[aktuellerIndex]) ? (
                              <video controls style={{ width: "100%", maxHeight: "300px", objectFit: "contain", background: "#000" }}>
                                <source src={n.medien[aktuellerIndex]} type="video/mp4" />
                              </video>
                            ) : (
                              <img src={n.medien[aktuellerIndex]} alt={n.titel} style={{ width: "100%", maxHeight: "300px", objectFit: "contain", background: "#eef4fb" }} />
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
                            <p style={{ margin: "0 0 12px", fontSize: "14px", color: TEXT2, fontStyle: "italic", borderLeft: "3px solid #e0a100", paddingLeft: "10px" }}>{n.teaser}</p>
                          )}
                          {n.text && <div className="rich" dangerouslySetInnerHTML={{ __html: n.text }} />}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                            <p style={{ margin: "0", fontSize: "11px", color: TEXT3 }}>{new Date(n.erstellt_am).toLocaleDateString("de-CH")}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `${window.location.origin}/?news=${n.id}`;
                                navigator.clipboard.writeText(url);
                                setNewsKopiert(n.id);
                                setTimeout(() => setNewsKopiert(null), 2000);
                              }}
                              style={{ padding: "6px 12px", background: "#fff", color: TEXT2, border: `1px solid ${RAND}`, borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
                            >
                              {newsKopiert === n.id ? "✅ Link kopiert!" : "🔗 Link"}
                            </button>
                          </div>
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
            <p style={{ ...sektionTitel(BRAND), marginBottom: "14px" }}>⭐ NÄCHSTE EVENTS</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {highlights.map((t) => {
                const label = `${t.wochentag}, ${t.datum}`;
                const teilnehmerListe = anmeldungen.filter((a) => a.termin === label);
                const belegt = teilnehmerListe.length;
                const voll = belegt >= t.max_teilnehmer;
                const istOffen = offen === t.id;

                return (
                  <div key={t.id} style={{ border: `1px solid ${RAND}`, borderRadius: "14px", overflow: "hidden", textAlign: "left", background: KARTE, boxShadow: "0 3px 12px rgba(58,110,165,0.08)" }}>
                    <div onClick={() => setOffen(istOffen ? null : t.id)} style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: istOffen ? "#eef5fd" : "transparent" }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: "bold", color: t.abgesagt ? TEXT3 : TEXT, textDecoration: t.abgesagt ? "line-through" : "none" }}>
                          {kategorieEmoji(t.kategorie)} {t.titel}
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <p style={{ margin: "0", fontSize: "12px", color: TEXT2 }}>
                            {t.wochentag}, {t.datum} · ({belegt}/{t.max_teilnehmer}){!voll && !t.abgesagt ? " · bitte anmelden" : ""}
                          </p>
                          {t.abgesagt && <span style={{ fontSize: "11px", padding: "2px 6px", background: "#fdecea", borderRadius: "6px", color: "#c0392b", fontWeight: "bold" }}>🚫 Abgesagt</span>}
                          {voll && !t.abgesagt && <span style={{ fontSize: "11px", padding: "2px 6px", background: "#fdecea", borderRadius: "6px", color: "#c0392b", fontWeight: "bold" }}>Voll</span>}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setOffen(istOffen ? null : t.id); }} style={{ flexShrink: 0, marginLeft: "12px", width: "40px", height: "40px", borderRadius: "50%", border: "none", background: "#dfe9fb", color: BRAND, fontSize: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transform: istOffen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>+</button>
                    </div>

                    {istOffen && (
                      <div style={{ padding: "16px 18px", borderTop: `1px solid ${RAND}`, background: "#f6faff", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "14px", color: TEXT2, fontWeight: "bold", letterSpacing: "0.5px" }}>📍 TREFFPUNKT</p>
                          <p style={{ margin: "8px 0 0", fontSize: "14px", color: TEXT }}>{t.ort}</p>
                        </div>

                        {t.hikeandfly_id && hafDaten[t.hikeandfly_id] && (
                          <div style={{ padding: "10px 12px", background: "#e6eefc", borderRadius: "8px" }}>
                            <p style={{ margin: "0 0 8px", fontSize: "11px", color: BRAND, fontWeight: "bold", letterSpacing: "0.5px" }}>🥾 HIKE & FLY</p>
                            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "8px" }}>
                              {hafDaten[t.hikeandfly_id].strecke_km > 0 && <span style={{ fontSize: "13px", color: TEXT }}>🗺 {hafDaten[t.hikeandfly_id].strecke_km} km</span>}
                              {hafDaten[t.hikeandfly_id].hoehenmeter > 0 && <span style={{ fontSize: "13px", color: TEXT }}>⛰ {hafDaten[t.hikeandfly_id].hoehenmeter} hm</span>}
                              {hafDaten[t.hikeandfly_id].tempo_wanderweg && <span style={{ fontSize: "13px", color: TEXT }}>⏱ ca. {hafDaten[t.hikeandfly_id].tempo_wanderweg}</span>}
                            </div>
                            <a href={`/hikeandfly?open=${t.hikeandfly_id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: "12px", color: BRAND, textDecoration: "none" }}>Details ansehen →</a>
                          </div>
                        )}

                        {t.details && (
                          <div>
                            <p style={{ margin: "0 0 4px", fontSize: "14px", color: TEXT2, fontWeight: "bold", letterSpacing: "0.5px" }}>ℹ️ INFOS</p>
                            <div className="rich" dangerouslySetInnerHTML={{ __html: t.details }} />
                          </div>
                        )}

                        <div>
                          <button onClick={(e) => { e.stopPropagation(); setTeilnehmerOffen(teilnehmerOffen === t.id ? null : t.id); }} style={{ width: "100%", padding: "8px 12px", background: "#fff", border: `1px solid ${RAND}`, borderRadius: "8px", color: TEXT2, cursor: "pointer", fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>👥 Teilnehmer ({belegt}/{t.max_teilnehmer})</span>
                            <span>{teilnehmerOffen === t.id ? "▲" : "▼"}</span>
                          </button>
                          {teilnehmerOffen === t.id && (
                            <div style={{ padding: "10px 12px", background: "#fff", border: `1px solid ${RAND}`, borderTop: "none", borderRadius: "0 0 8px 8px" }}>
                              {belegt === 0 ? (
                                <p style={{ margin: "0", fontSize: "13px", color: TEXT3 }}>Noch keine Anmeldungen.</p>
                              ) : (
                                <ul style={{ margin: "0", padding: "0 0 0 16px" }}>
                                  {teilnehmerListe.map((a) => (
                                    <li key={a.id} style={{ fontSize: "13px", color: TEXT, marginBottom: "4px" }}>{a.name}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                          {t.abgesagt ? (
                            <div>
                              <span style={{ display: "inline-block", padding: "10px 20px", background: "#fdecea", color: "#c0392b", borderRadius: "8px", fontSize: "14px", fontWeight: "bold" }}>🚫 Abgesagt</span>
                              {t.abgesagt_begruendung && <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#c0392b" }}>{t.abgesagt_begruendung}</p>}
                            </div>
                          ) : voll ? (
                            <span style={{ display: "inline-block", padding: "10px 20px", background: "#8aa0b8", color: "white", borderRadius: "8px", fontSize: "14px", fontWeight: "bold" }}>🔴 Ausgebucht</span>
                          ) : (
                            <a href={`/termine/anmelden?termin=${encodeURIComponent(label)}`} onClick={(e) => e.stopPropagation()} style={{ display: "inline-block", padding: "10px 20px", background: BRAND, color: "white", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold" }}>✍️ Jetzt anmelden</a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `${window.location.origin}/termine?id=${t.id}`;
                              navigator.clipboard.writeText(url);
                              setKopiert(t.id);
                              setTimeout(() => setKopiert(null), 2000);
                            }}
                            style={kleinerButton}
                          >
                            {kopiert === t.id ? "✅ Link kopiert!" : "🔗 Link"}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); kalenderDatei(t); }} style={kleinerButton}>
                            📅 Kalender
                          </button>
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
            <div style={{ borderTop: `1px solid ${RAND}`, marginBottom: "16px" }} />
            <p style={{ ...sektionTitel("#2f8f5b"), marginBottom: "14px" }}>📖 BLOG</p>
            <div style={{ marginBottom: "14px" }}>
              <select onChange={(e) => { if (e.target.value) router.push(`/blog/${e.target.value}`); }} style={{ ...dropdownStyle, width: "100%", padding: "10px", fontSize: "14px" }}>
                <option value="">📖 -- Blog auswählen --</option>
                {blogBeitraege.map((b) => <option key={b.id} value={b.id}>{b.titel}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {blogBeitraege.map((b) => {
                const vorschaubild = b.thumbnail_url || (b.medien && b.medien.length > 0 ? b.medien[0] : null) || (b.bilder && b.bilder.length > 0 ? b.bilder[0] : null);
                return (
                  <a key={b.id} href={`/blog/${b.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ border: `1px solid ${RAND}`, borderRadius: "14px", overflow: "hidden", background: KARTE, display: "flex", boxShadow: "0 3px 12px rgba(58,110,165,0.08)" }}>
                      {vorschaubild && <img src={vorschaubild} alt={b.titel} style={{ width: "100px", objectFit: "cover", flexShrink: 0, alignSelf: "stretch" }} />}
                      <div style={{ padding: "12px" }}>
                        <p style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "bold", color: TEXT, textAlign: "left" }}>{b.titel}</p>
                        {b.teaser && <p style={{ margin: "0", fontSize: "12px", color: TEXT2, lineHeight: "1.5", textAlign: "left" }}>{b.teaser}</p>}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin-Links */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "40px", justifyContent: "flex-start" }}>
          <a href="/admin/termine" style={{ fontSize: "11px", color: "rgba(31,58,90,0.35)", textDecoration: "none" }}>Admin</a>
          <a href="/admin/hikeandfly" style={{ fontSize: "11px", color: "rgba(31,58,90,0.35)", textDecoration: "none" }}>H&F Admin</a>
          <a href="/admin/blog" style={{ fontSize: "11px", color: "rgba(31,58,90,0.35)", textDecoration: "none" }}>Blog Admin</a>
          <a href="/admin/news" style={{ fontSize: "11px", color: "rgba(31,58,90,0.35)", textDecoration: "none" }}>News Admin</a>
          <a href="/admin/dashboard" style={{ fontSize: "11px", color: "rgba(31,58,90,0.35)", textDecoration: "none" }}>Dashboard Admin</a>
          <a href="/admin/einstellungen" style={{ fontSize: "11px", color: "rgba(31,58,90,0.35)", textDecoration: "none" }}>Einstellungen</a>
          <a href="/upload" style={{ fontSize: "11px", color: "rgba(31,58,90,0.35)", textDecoration: "none" }}>Upload</a>
        </div>
      </div>
    </main>
  );
}
