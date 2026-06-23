"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

type BlogBeitrag = {
  id: number;
  titel: string;
  teaser: string;
  bilder: string[];
  medien: string[];
  thumbnail_url: string;
  erstellt_am: string;
};

export default function BlogListPage() {
  const [beitraege, setBeitraege] = useState<BlogBeitrag[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function laden() {
      const { data } = await supabase
        .from("blog")
        .select("id, titel, teaser, bilder, medien, thumbnail_url, erstellt_am")
        .eq("aktiv", true)
        .order("erstellt_am", { ascending: false });
      setBeitraege(data || []);
    }
    laden();
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>📖 Blog</h1>
      <h2 style={{ fontWeight: "normal", color: "#aaa", marginBottom: "20px" }}>Berichte & Erlebnisse</h2>

      {beitraege.length > 0 && (
        <div style={{ marginBottom: "30px" }}>
          <select
            onChange={(e) => { if (e.target.value) router.push(`/blog/${e.target.value}`); }}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "14px", cursor: "pointer" }}
          >
            <option value="" style={{ background: "#1a1a2e" }}>-- Beitrag auswählen --</option>
            {beitraege.map((b) => (
              <option key={b.id} value={b.id} style={{ background: "#1a1a2e" }}>📖 {b.titel}</option>
            ))}
          </select>
        </div>
      )}

      {beitraege.length === 0 && (
        <p style={{ color: "#666", textAlign: "center", marginTop: "40px" }}>Noch keine Beiträge.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {beitraege.map((b) => {
          const vorschaubild = b.thumbnail_url || (b.medien && b.medien.length > 0 ? b.medien[0] : null) || (b.bilder && b.bilder.length > 0 ? b.bilder[0] : null);
          return (
            <a key={b.id} href={`/blog/${b.id}`} style={{ textDecoration: "none" }}>
              <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", overflow: "hidden", background: "rgba(255,255,255,0.05)", display: "flex" }}>
                {vorschaubild && (
                  <img src={vorschaubild} alt={b.titel} style={{ width: "120px", objectFit: "cover", flexShrink: 0, alignSelf: "stretch" }} />
                )}
                <div style={{ padding: "16px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#aaa", textAlign: "left" }}>{new Date(b.erstellt_am).toLocaleDateString("de-CH")}</p>
                  <p style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "bold", color: "#fff", textAlign: "left" }}>{b.titel}</p>
                  {b.teaser && (
                    <p style={{ margin: "0", fontSize: "13px", color: "#aaa", lineHeight: "1.5", textAlign: "left" }}>{b.teaser}</p>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </main>
  );
}