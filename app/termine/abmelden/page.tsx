"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../supabase";

function AbmeldenInhalt() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [anmeldung, setAnmeldung] = useState<{ name: string; termin: string } | null>(null);
  const [status, setStatus] = useState<"laden" | "gefunden" | "abgemeldet" | "fehler">("laden");

  useEffect(() => {
    async function laden() {
      if (!id) { setStatus("fehler"); return; }
      const { data } = await supabase
        .from("anmeldungen")
        .select("name, termin")
        .eq("id", id)
        .single();
      if (data) {
        setAnmeldung(data);
        setStatus("gefunden");
      } else {
        setStatus("fehler");
      }
    }
    laden();
  }, [id]);

  async function abmelden() {
    const { error } = await supabase
      .from("anmeldungen")
      .delete()
      .eq("id", id);
    if (error) {
      setStatus("fehler");
    } else {
      setStatus("abgemeldet");
    }
  }

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "500px", margin: "100px auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🪂 Swissgliders Members</h1>
      <h2 style={{ fontWeight: "normal", color: "#555", marginBottom: "30px" }}>Abmeldung</h2>

      {status === "laden" && <p style={{ color: "#888" }}>Wird geladen...</p>}

      {status === "fehler" && (
        <div style={{ padding: "16px", background: "#fdecea", borderRadius: "10px", color: "#c0392b" }}>
          ❌ Anmeldung nicht gefunden.
        </div>
      )}

      {status === "gefunden" && anmeldung && (
        <div>
          <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "12px", marginBottom: "24px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#888" }}>Anmeldung gefunden:</p>
            <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: "18px" }}>{anmeldung.name}</p>
            <p style={{ margin: "0", color: "#555" }}>🌕 {anmeldung.termin}</p>
          </div>
          <p style={{ color: "#555", marginBottom: "20px" }}>Möchtest du dich von diesem Termin abmelden?</p>
          <button
            onClick={abmelden}
            style={{
              width: "100%",
              padding: "14px",
              background: "#c0392b",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "16px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Ja, abmelden
          </button>
        </div>
      )}

      {status === "abgemeldet" && (
        <div style={{ padding: "16px", background: "#e6f4ea", borderRadius: "10px", color: "#2d6a4f" }}>
          ✅ Du wurdest erfolgreich abgemeldet.
        </div>
      )}
    </main>
  );
}

export default function Abmelden() {
  return (
    <Suspense fallback={<p style={{ padding: "40px" }}>Wird geladen...</p>}>
      <AbmeldenInhalt />
    </Suspense>
  );
}