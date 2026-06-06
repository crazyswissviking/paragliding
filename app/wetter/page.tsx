"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";

type Startplatz = {
  id: number;
  name: string;
  typ: string;
  lat: number;
  lng: number;
};

type Wetter = {
  windspeed: number;
  windgusts: number;
  winddirection: number;
  temperature: number;
  weathercode: number;
};

function windrichtung(grad: number): string {
  const richtungen = ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return richtungen[Math.round(grad / 22.5) % 16];
}

function windfarbe(kmh: number): string {
  if (kmh < 10) return "#2d6a4f";
  if (kmh < 20) return "#52b788";
  if (kmh < 30) return "#f4a261";
  if (kmh < 40) return "#e76f51";
  return "#c0392b";
}

function wetterIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

export default function WetterPage() {
  const [startplaetze, setStartplaetze] = useState<Startplatz[]>([]);
  const [wetter, setWetter] = useState<Record<number, Wetter>>({});
  const [loading, setLoading] = useState(true);
  const [aktualisiert, setAktualisiert] = useState<Date | null>(null);

  async function laden() {
    const { data } = await supabase
      .from("startplaetze")
      .select("*")
      .eq("aktiv", true)
      .order("name", { ascending: true });
    setStartplaetze(data || []);
    return data || [];
  }

  async function wetterLaden(plaetze: Startplatz[]) {
    const neuesWetter: Record<number, Wetter> = {};
    await Promise.all(
      plaetze.map(async (p) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&current=temperature_2m,weathercode,windspeed_10m,winddirection_10m,windgusts_10m&wind_speed_unit=kmh&timezone=Europe/Zurich`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.current) {
          neuesWetter[p.id] = {
            windspeed: Math.round(data.current.windspeed_10m),
            windgusts: Math.round(data.current.windgusts_10m),
            winddirection: Math.round(data.current.winddirection_10m),
            temperature: Math.round(data.current.temperature_2m),
            weathercode: data.current.weathercode,
          };
        }
      })
    );
    setWetter(neuesWetter);
    setAktualisiert(new Date());
    setLoading(false);
  }

  useEffect(() => {
    laden().then(wetterLaden);
    const interval = setInterval(() => {
      laden().then(wetterLaden);
    }, 5 * 60 * 1000); // alle 5 Minuten
    return () => clearInterval(interval);
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>🌤 Wetter & Wind</h1>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h2 style={{ fontWeight: "normal", color: "#aaa", margin: "0" }}>Aktuelle Winddaten</h2>
        {aktualisiert && (
          <span style={{ fontSize: "12px", color: "#666" }}>
            🔄 {aktualisiert.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {loading && <p style={{ color: "#aaa" }}>Wetterdaten werden geladen...</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {startplaetze.map((p) => {
          const w = wetter[p.id];
          return (
            <div key={p.id} style={{
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px",
              padding: "20px",
              background: "rgba(255,255,255,0.05)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "bold", color: "#fff" }}>{p.name}</p>
                  <span style={{ fontSize: "11px", padding: "2px 8px", background: "rgba(51,85,204,0.3)", borderRadius: "4px", color: "#7799ff" }}>{p.typ}</span>
                </div>
                {w && <span style={{ fontSize: "32px" }}>{wetterIcon(w.weathercode)}</span>}
              </div>

              {w ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#aaa" }}>💨 Wind</p>
                      <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: windfarbe(w.windspeed) }}>{w.windspeed} km/h</p>
                    </div>
                    <div style={{ padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#aaa" }}>💥 Böen</p>
                      <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: windfarbe(w.windgusts) }}>{w.windgusts} km/h</p>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div style={{ padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#aaa" }}>🧭 Richtung</p>
                      <p style={{ margin: "0", fontSize: "18px", fontWeight: "bold", color: "#fff" }}>{windrichtung(w.winddirection)} {w.winddirection}°</p>
                    </div>
                    <div style={{ padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#aaa" }}>🌡 Temperatur</p>
                      <p style={{ margin: "0", fontSize: "18px", fontWeight: "bold", color: "#fff" }}>{w.temperature}°C</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: "#666", fontSize: "14px" }}>Laden...</p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}