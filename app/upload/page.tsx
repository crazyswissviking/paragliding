"use client";
import { useState, useRef } from "react";

const CLOUD_NAME = "dnfnng4mm";
const UPLOAD_PRESET = "li5gwyqb";

export default function UploadPage() {
  const [bilder, setBilder] = useState<{ url: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [kopiert, setKopiert] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function hochladen(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);

    const neuvBilder: { url: string; name: string }[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        neuvBilder.push({ url: data.secure_url, name: file.name });
      }
    }

    setBilder((prev) => [...neuvBilder, ...prev]);
    setLoading(false);
  }

  function kopieren(url: string) {
    navigator.clipboard.writeText(url);
    setKopiert(url);
    setTimeout(() => setKopiert(null), 2000);
  }

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px", color: "#fff" }}>📸 Bilder Upload</h1>
      <h2 style={{ fontWeight: "normal", color: "#aaa", marginBottom: "30px" }}>Auf Cloudinary hochladen</h2>

      {/* Upload Bereich */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: "2px dashed rgba(255,255,255,0.3)",
          borderRadius: "16px",
          padding: "40px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: "24px",
          background: "rgba(255,255,255,0.05)",
        }}
      >
        <p style={{ fontSize: "48px", margin: "0 0 8px" }}>📁</p>
        <p style={{ color: "#fff", fontSize: "18px", margin: "0 0 8px", fontWeight: "bold" }}>
          Bilder oder Videos auswählen
        </p>
        <p style={{ color: "#aaa", fontSize: "14px", margin: "0" }}>
          Tippe hier um Dateien auszuwählen
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => hochladen(e.target.files)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "20px", color: "#7799ff" }}>
          ⏳ Wird hochgeladen...
        </div>
      )}

      {/* Hochgeladene Bilder */}
      {bilder.length > 0 && (
        <div>
          <p style={{ fontSize: "14px", fontWeight: "bold", color: "#aaa", marginBottom: "12px" }}>
            ✅ {bilder.length} Datei{bilder.length > 1 ? "en" : ""} hochgeladen
          </p>
          {bilder.map((b, i) => (
            <div key={i} style={{
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "12px",
              background: "rgba(255,255,255,0.05)",
            }}>
              {b.url.includes("/video/") ? (
                <video controls style={{ width: "100%", borderRadius: "8px", marginBottom: "12px", maxHeight: "200px" }}>
                  <source src={b.url} type="video/mp4" />
                </video>
              ) : (
                <img src={b.url} alt={b.name} style={{ width: "100%", borderRadius: "8px", marginBottom: "12px", maxHeight: "200px", objectFit: "cover" }} />
              )}
              <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#aaa", wordBreak: "break-all" }}>{b.url}</p>
              <button
                onClick={() => kopieren(b.url)}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: kopiert === b.url ? "#2d6a4f" : "#3355cc",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                {kopiert === b.url ? "✅ URL kopiert!" : "📋 URL kopieren"}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}