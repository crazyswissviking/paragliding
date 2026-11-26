"use client";
// Startseite VikingFly: Logo als Hintergrund (40 % Deckkraft), Titel, Schnellzugriff, Flugwetter, News, Blog.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";
import FlugWetter from "./components/FlugWetter";
import LogoHintergrund from "./components/LogoHintergrund";

const TEXT = "#1f3a5a";
const TEXT2 = "#5b7491";
const RAND = "#cfe0f2";
const GRUEN = "#2f8f5b";
const AMBER = "#b36b00";

type Blog = { id: number; titel: string; teaser: string | null; thumbnail_url: string | null; hauptbild_index: number | null; bilder: unknown; medien: unknown };
type News = { id: number; titel: string; teaser: string | null; text: string | null; thumbnail_url: string | null; medien: unknown; erstellt_am: string };

const liste = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.startsWith("http")) : []);
const istBild = (u: string) => !/\/video\/upload\//.test(u) && !/\.(mov|mp4|webm)(\?|$)/i.test(u);

// Cloudinary liefert kleinere Bilder, wenn man die Grösse in die URL schreibt (spart Ladezeit)
function klein(url: string, breite: number): string {
  return url.includes("res.cloudinary.com") && url.includes("/image/upload/") ? url.replace("/image/upload/", `/image/upload/c_fill,w_${breite},q_auto,f_auto/`) : url;
}

function blogBild(b: Blog): string | null {
  if (b.thumbnail_url) return b.thumbnail_url;
  for (const quelle of [liste(b.bilder), liste(b.medien)]) {
    const bilder = quelle.filter(istBild);
    if (bilder.length === 0) continue;
    const wahl = b.hauptbild_index != null ? quelle[b.hauptbild_index] : undefined;
    return wahl && istBild(wahl) ? wahl : bilder[0];
  }
  return null;
}

const sauber = (s: string | null | undefined) => (s ?? "").replace(/[*_#>`]/g, "").trim();

const STIL = `
.vf-hero-link{display:inline-block;padding:10px 18px;border-radius:999px;background:rgba(255,255,255,.88);border:1px solid ${RAND};color:${TEXT};font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 2px 10px rgba(58,110,165,.14);transition:transform .15s,box-shadow .15s}
.vf-hero-link:hover,.vf-hero-link:focus-visible{transform:translateY(-2px);box-shadow:0 6px 16px rgba(58,110,165,.22)}
.vf-karte{transition:transform .15s,box-shadow .15s}
.vf-karte:hover,.vf-karte:focus-visible{transform:translateY(-2px);box-shadow:0 8px 20px rgba(58,110,165,.18)!important}
.vf-rich{font-size:14px;color:#33506f;line-height:1.7}
.vf-rich p{margin:4px 0}
.vf-rich ul,.vf-rich ol{margin:6px 0;padding-left:20px}
.vf-rich a{color:#3355cc;text-decoration:underline;word-break:break-all}
.vf-rich blockquote{border-left:3px solid #3355cc;margin:8px 0;padding-left:12px;color:${TEXT2}}
.vf-rich h3{margin:10px 0 4px;font-size:16px;color:${TEXT}}
.vf-rich img{max-width:100%;border-radius:10px}
@media (prefers-reduced-motion:reduce){.vf-hero-link,.vf-karte{transition:none}}
`;

function NewsKarte({ n }: { n: News }) {
  const [offen, setOffen] = useState(false);
  const bilder = liste(n.medien).filter(istBild);
  return (
    <div style={{ border: "1px solid #f1d9a8", borderRadius: 14, overflow: "hidden", background: "rgba(255,248,234,0.92)", textAlign: "left", boxShadow: "0 3px 12px rgba(179,107,0,0.08)" }}>
      <button
        onClick={() => setOffen((v) => !v)}
        aria-expanded={offen}
        style={{ all: "unset", display: "block", width: "100%", cursor: "pointer", boxSizing: "border-box" }}
      >
        <span style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <span style={{ margin: "10px 12px", fontSize: 16, fontWeight: "bold", color: TEXT, flex: 1 }}>{n.titel}</span>
          <span style={{ fontSize: 22, color: AMBER, display: "inline-block", transform: offen ? "rotate(45deg)" : "none", transition: "transform .2s", padding: "8px 12px", flexShrink: 0 }}>+</span>
        </span>
        {!offen && n.teaser && <span style={{ display: "block", padding: "0 12px 12px", fontSize: 13, color: TEXT2, lineHeight: 1.5 }}>{n.teaser}</span>}
      </button>
      {offen && (
        <div style={{ padding: "0 12px 14px" }}>
          {n.text && <div className="vf-rich" dangerouslySetInnerHTML={{ __html: n.text }} />}
          {bilder.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={klein(u, 900)} alt="" loading="lazy" style={{ width: "100%", borderRadius: 10, marginTop: 10, display: "block" }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Startseite() {
  const router = useRouter();
  const [blog, setBlog] = useState<Blog[] | null>(null);
  const [news, setNews] = useState<News[] | null>(null);
  const [newsFilter, setNewsFilter] = useState("");

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const [b, n] = await Promise.all([
        supabase.from("blog").select("id,titel,teaser,thumbnail_url,hauptbild_index,bilder,medien").eq("aktiv", true).order("erstellt_am", { ascending: false }),
        supabase.from("news").select("id,titel,teaser,text,thumbnail_url,medien,erstellt_am").eq("aktiv", true).order("erstellt_am", { ascending: false }),
      ]);
      if (abgebrochen) return;
      if (b.error) console.error("Blog:", b.error.message);
      if (n.error) console.error("News:", n.error.message);
      setBlog((b.data as Blog[] | null) ?? []);
      setNews((n.data as News[] | null) ?? []);
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  const sichtbareNews = (news ?? []).filter((n) => !newsFilter || String(n.id) === newsFilter);

  const auswahl: React.CSSProperties = { padding: 10, borderRadius: 8, border: `1px solid ${RAND}`, background: "#fff", color: TEXT, fontSize: 14, cursor: "pointer", maxWidth: "100%" };

  return (
    <main
      style={{
        position: "relative",
        isolation: "isolate",
        minHeight: "calc(100vh - 60px)",
        background: "linear-gradient(180deg, #dbeafb 0%, #e9f2fd 45%, #f4f9ff 100%)",
        color: TEXT,
        padding: "24px 16px 40px 16px",
        textAlign: "center",
      }}
    >
      <style>{STIL}</style>
      <LogoHintergrund />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 720, margin: "0 auto" }}>
        {/* Kopfbereich: das Logo steht dahinter */}
        <header style={{ padding: "6vh 0 5vh" }}>
          <h1
            style={{
              fontSize: "clamp(34px, 9vw, 56px)", fontWeight: 800, letterSpacing: 1, color: TEXT, margin: "0 0 8px",
              textShadow: "0 0 14px rgba(255,255,255,0.95), 0 2px 6px rgba(255,255,255,0.8)",
            }}
          >
            🪂 VikingFly
          </h1>
          <p style={{ fontSize: "clamp(15px, 3.6vw, 19px)", color: "#33506f", margin: "0 0 24px", fontStyle: "italic", textShadow: "0 0 10px rgba(255,255,255,0.95), 0 1px 4px rgba(255,255,255,0.8)" }}>
            Wo Berge zu Flügeln werden – Walhalla kann warten
          </p>
          <nav aria-label="Schnellzugriff" style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            <a className="vf-hero-link" href="#flugwetter">🌤 Flugwetter</a>
            <a className="vf-hero-link" href="/blog">📖 Blog</a>
            <a className="vf-hero-link" href="/hikeandfly">🥾 Hike &amp; Fly</a>
            <a className="vf-hero-link" href="/termine">📅 Termine</a>
          </nav>
        </header>

        <section id="flugwetter" style={{ scrollMarginTop: 12 }}>
          <FlugWetter />
        </section>

        {news && news.length > 0 && (
          <section style={{ marginBottom: 32, width: "100%" }} aria-label="News und Gedanken">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <h2 style={{ fontSize: 12, fontWeight: "bold", color: AMBER, letterSpacing: 1, margin: 0, textAlign: "left", textShadow: "0 0 8px rgba(255,255,255,0.9)" }}>📰 NEWS &amp; GEDANKEN</h2>
              {news.length > 1 && (
                <select value={newsFilter} onChange={(e) => setNewsFilter(e.target.value)} aria-label="News auswählen" style={{ ...auswahl, padding: "8px 10px", fontSize: 12, border: "1px solid #f1d9a8", color: AMBER }}>
                  <option value="">Alle Artikel</option>
                  {news.map((n) => (
                    <option key={n.id} value={n.id}>{n.titel}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sichtbareNews.map((n) => (
                <NewsKarte key={n.id} n={n} />
              ))}
            </div>
          </section>
        )}

        <section style={{ width: "100%" }} aria-label="Blog">
          <div style={{ borderTop: `1px solid ${RAND}`, marginBottom: 16 }} />
          <h2 style={{ fontSize: 12, fontWeight: "bold", color: GRUEN, letterSpacing: 1, margin: "0 0 14px", textAlign: "left", textShadow: "0 0 8px rgba(255,255,255,0.9)" }}>📖 BLOG</h2>
          {blog === null && <p style={{ fontSize: 13, color: TEXT2 }}>Lade Beiträge …</p>}
          {blog && blog.length > 1 && (
            <div style={{ marginBottom: 14 }}>
              <select defaultValue="" onChange={(e) => e.target.value && router.push(`/blog/${e.target.value}`)} aria-label="Blog auswählen" style={{ ...auswahl, width: "100%" }}>
                <option value="">📖 -- Blog auswählen --</option>
                {blog.map((b) => (
                  <option key={b.id} value={b.id}>{b.titel}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(blog ?? []).map((b) => {
              const bild = blogBild(b);
              const teaser = sauber(b.teaser);
              return (
                <a key={b.id} href={`/blog/${b.id}`} className="vf-karte" style={{ textDecoration: "none", border: `1px solid ${RAND}`, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.9)", display: "flex", boxShadow: "0 3px 12px rgba(58,110,165,0.08)" }}>
                  {bild && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={klein(bild, 240)} alt="" loading="lazy" style={{ width: 100, objectFit: "cover", flexShrink: 0, alignSelf: "stretch" }} />
                  )}
                  <div style={{ padding: 12, textAlign: "left", minWidth: 0 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: "bold", color: TEXT }}>{b.titel.trim()}</p>
                    {teaser && (
                      <p style={{ margin: 0, fontSize: 12, color: TEXT2, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{teaser}</p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <footer style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 40, justifyContent: "flex-start", background: "rgba(255,255,255,0.8)", borderRadius: 12, padding: "8px 12px" }}>
          {[
            ["Admin", "/admin/termine"], ["H&F Admin", "/admin/hikeandfly"], ["Blog Admin", "/admin/blog"], ["News Admin", "/admin/news"],
            ["Dashboard Admin", "/admin/dashboard"], ["Einstellungen", "/admin/einstellungen"], ["Upload", "/upload"],
          ].map(([name, href]) => (
            <a key={href} href={href} style={{ fontSize: 11, color: "rgba(31,58,90,0.65)", textDecoration: "none" }}>{name}</a>
          ))}
        </footer>
      </div>
    </main>
  );
}
