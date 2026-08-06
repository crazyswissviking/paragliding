"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import PasswortSchutz from "../passwort";
import RichTextEditor from "../../components/RichTextEditor";

const CLOUD_NAME = "dnfnng4mm";
const UPLOAD_PRESET = "li5gwyqb";

async function cloudinaryUpload(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

type News = {
  id: number;
  titel: string;
  teaser: string;
  text: string;
  medien: string[];
  thumbnail_url: string;
  aktiv: boolean;
  erstellt_am: string;
};

type NewsOhneId = Omit<News, "id" | "erstellt_am">;

const leer = (): NewsOhneId => ({
  titel: "", teaser: "", text: "", medien: [], thumbnail_url: "", aktiv: true,
});

const inputStyle = { width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" };

function NewsFormular({ data, set, uploadLoading, onMedienHochladen }: {
  data: NewsOhneId | News;
  set: (v: any) => void;
  uploadLoading: boolean;
  onMedienHochladen: (files: FileList | null) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>✏️ Titel</label>
        <input type="text" value={data.titel} onChange={(e) => set({ ...data, titel: e.target.value })} placeholder="Titel der News" style={inputStyle} />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>📝 Teaser (kurze Zusammenfassung)</label>
        <textarea value={data.teaser} onChange={(e) => set({ ...data, teaser: e.target.value })} rows={2} placeholder="Kurze Beschreibung..." style={{ ...inputStyle, resize: "vertical" }} />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>📄 Text</label>
        <RichTextEditor value={data.text} onChange={(val) => set({ ...data, text: val })} />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>📸 Bilder & Videos</label>
        <label style={{ display: "inline-block", padding: "8px 14px", background: uploadLoading ? "#aaa" : "#3355cc", color: "white", borderRadius: "6px", cursor: "pointer", fontSize: "13px", marginBottom: "8px" }}>
          {uploadLoading ? "⏳ Wird hochgeladen..." : "📁 Bilder & Videos hochladen"}
          <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} disabled={uploadLoading} onChange={(e) => onMedienHochladen(e.target.files)} />
        </label>
        {(data.medien || []).length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
            {(data.medien || []).map((url: string, i: number) => (
              <div key={i} style={{ position: "relative" }}>
                {url.includes("/video/") ? (
                  <video src={url} style={{ width: "80px", height: "60px", objectFit: "cover", borderRadius: "6px" }} />
                ) : (
                  <img src={url} style={{ width: "80px", height: "60px", objectFit: "cover", borderRadius: "6px" }} />
                )}
                <button onClick={() => set({ ...data, medien: (data.medien || []).filter((_: string, j: number) => j !== i) })} style={{ position: "absolute", top: "-6px", right: "-6px", background: "#e74c3c", color: "white", border: "none", borderRadius: "50%", width: "18px", height: "18px", cursor: "pointer", fontSize: "11px", lineHeight: "18px", textAlign: "center", padding: "0" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>🖼 Thumbnail</label>
        <label style={{ display: "inline-block", padding: "8px 14px", background: uploadLoading ? "#aaa" : "#f0f4ff", color: "#3355cc", border: "1px solid #3355cc", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
          📁 Thumbnail hochladen
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = await cloudinaryUpload(file);
            set({ ...data, thumbnail_url: url });
          }} />
        </label>
        {data.thumbnail_url && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
            <img src={data.thumbnail_url} style={{ width: "100px", height: "70px", objectFit: "cover", borderRadius: "6px" }} />
            <button onClick={() => set({ ...data, thumbnail_url: "" })} style={{ padding: "4px 10px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>✕ Entfernen</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminNews() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [neu, setNeu] = useState<NewsOhneId>(leer());
  const [gespeichert, setGespeichert] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<News | null>(null);
  const [bearbeitenGespeichert, setBearbeitenGespeichert] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  async function laden() {
    const { data } = await supabase.from("news").select("*").order("erstellt_am", { ascending: false });
    setNews(data || []);
    setLoading(false);
  }

  useEffect(() => { laden(); }, []);

  async function hinzufuegen() {
    if (!neu.titel) return;
    await supabase.from("news").insert([neu]);
    setNeu(leer());
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
    laden();
  }

  async function speichern() {
    if (!bearbeiten) return;
    await supabase.from("news").update({
      titel: bearbeiten.titel, teaser: bearbeiten.teaser, text: bearbeiten.text,
      medien: bearbeiten.medien, thumbnail_url: bearbeiten.thumbnail_url,
    }).eq("id", bearbeiten.id);
    setBearbeitenGespeichert(true);
    setTimeout(() => { setBearbeitenGespeichert(false); setBearbeiten(null); }, 1500);
    laden();
  }

  async function toggleAktiv(n: News) {
    await supabase.from("news").update({ aktiv: !n.aktiv }).eq("id", n.id);
    laden();
  }

  async function loeschen(id: number) {
    if (!confirm("News wirklich löschen?")) return;
    await supabase.from("news").delete().eq("id", id);
    laden();
  }

  async function medienHochladen(files: FileList | null, data: NewsOhneId | News, set: (v: any) => void) {
    if (!files) return;
    setUploadLoading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      urls.push(await cloudinaryUpload(file));
    }
    set({ ...data, medien: [...(data.medien || []), ...urls] });
    setUploadLoading(false);
  }

  return (
    <PasswortSchutz>
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>📰 News & Gedanken</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Admin – News verwalten</h2>

      {bearbeiten && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", maxWidth: "650px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "20px" }}>News bearbeiten</h3>
              <button onClick={() => setBearbeiten(null)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <NewsFormular
              data={bearbeiten}
              set={(v) => setBearbeiten({ ...bearbeiten, ...v })}
              uploadLoading={uploadLoading}
              onMedienHochladen={(files) => medienHochladen(files, bearbeiten, (v) => setBearbeiten({ ...bearbeiten, ...v }))}
            />
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "20px" }}>
              <button onClick={speichern} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>💾 Speichern</button>
              <button onClick={() => setBearbeiten(null)} style={{ padding: "10px 24px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Abbrechen</button>
              {bearbeitenGespeichert && <span style={{ color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>}
            </div>
          </div>
        </div>
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>Neue News</h3>
        <NewsFormular
          data={neu}
          set={setNeu}
          uploadLoading={uploadLoading}
          onMedienHochladen={(files) => medienHochladen(files, neu, setNeu)}
        />
        <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={hinzufuegen} style={{ padding: "10px 24px", background: "#3355cc", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "bold" }}>➕ News hinzufügen</button>
          {gespeichert && <span style={{ color: "#2d6a4f", fontWeight: "bold" }}>✅ Gespeichert!</span>}
        </div>
      </div>

      <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Bestehende News</h3>
      {loading && <p>Wird geladen...</p>}
      {!loading && news.map((n) => (
        <div key={n.id} style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "16px 24px", marginBottom: "12px", opacity: n.aktiv ? 1 : 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>{n.titel}</p>
              <p style={{ margin: "0", fontSize: "13px", color: "#aaa" }}>
                {new Date(n.erstellt_am).toLocaleDateString("de-CH")} · {n.medien?.length || 0} Medien
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setBearbeiten(n)} style={{ padding: "8px 14px", background: "#f0f4ff", color: "#3355cc", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>✏️ Bearbeiten</button>
              <button onClick={() => toggleAktiv(n)} style={{ padding: "8px 14px", background: n.aktiv ? "#e6f4ea" : "#f5f5f5", color: n.aktiv ? "#2d6a4f" : "#888", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>{n.aktiv ? "✅ Aktiv" : "⏸ Inaktiv"}</button>
              <button onClick={() => loeschen(n.id)} style={{ padding: "8px 14px", background: "#fdecea", color: "#c0392b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>🗑 Löschen</button>
            </div>
          </div>
        </div>
      ))}
    </main>
    </PasswortSchutz>
  );
}