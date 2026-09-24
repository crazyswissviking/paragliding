"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import PasswortSchutz from "../passwort";

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

export default function AdminEinstellungen() {
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function laden() {
      const { data } = await supabase
        .from("einstellungen")
        .select("wert")
        .eq("schluessel", "hintergrund_video_url")
        .single();
      if (data) setVideoUrl(data.wert);
      setLoading(false);
    }
    laden();
  }, []);

  async function speichern(url: string) {
    await supabase
      .from("einstellungen")
      .update({ wert: url })
      .eq("schluessel", "hintergrund_video_url");
    setVideoUrl(url);
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
  }

  return (
    <PasswortSchutz>
      <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>⚙️ Einstellungen</h1>
        <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Admin – Allgemeine Einstellungen</h2>

        {loading ? <p>Wird geladen...</p> : (
          <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>🎥 Hintergrund-Video Hauptseite</h3>

            {videoUrl && (
              <video
                src={videoUrl}
                controls
                muted
                style={{ width: "100%", borderRadius: "8px", marginBottom: "16px", maxHeight: "200px", objectFit: "cover" }}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Neues Video hochladen</label>
                <label style={{ display: "inline-block", padding: "10px 20px", background: uploading ? "#aaa" : "#3355cc", color: "white", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
                  {uploading ? "⏳ Wird hochgeladen..." : "📁 Video hochladen"}
                  <input
                    type="file"
                    accept="video/*"
                    style={{ display: "none" }}
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      const url = await cloudinaryUpload(file);
                      await speichern(url);
                      setUploading(false);
                    }}
                  />
                </label>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>Oder URL direkt eingeben</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/..."
                    style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" }}
                  />
                  <button
                    onClick={() => speichern(videoUrl)}
                    style={{ padding: "8px 16px", background: "#3355cc", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
                  >
                    💾 Speichern
                  </button>
                </div>
              </div>

              {gespeichert && <p style={{ color: "#2d6a4f", fontWeight: "bold", margin: "0" }}>✅ Gespeichert!</p>}
            </div>
          </div>
        )}
      </main>
    </PasswortSchutz>
  );
}