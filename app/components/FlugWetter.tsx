"use client";
import { useCallback, useEffect, useState } from "react";

// ── Farben ────────────────────────────────────────────────────────────────
const TEXT = "#1f3a5a";
const TEXT2 = "#5b7491";
const TEXT3 = "#8aa0b8";
const RAND = "#cfe0f2";
const BLAU = "#3a6ea5";
const GRUEN = "#2e9e5b";
const GELB = "#e0a100";
const ORANGE = "#e07b00";
const ROT = "#d64545";

// ── Orte ──────────────────────────────────────────────────────────────────
type Ort = { id: string; name: string; lat: number; lng: number };

const ORTE: Ort[] = [
  { id: "thun", name: "Thun", lat: 46.758, lng: 7.628 },
  { id: "niederhorn", name: "Niederhorn", lat: 46.7167, lng: 7.7694 },
  { id: "interlaken", name: "Interlaken", lat: 46.6863, lng: 7.8632 },
  { id: "muerren", name: "Mürren", lat: 46.559, lng: 7.8925 },
  { id: "grindelwald", name: "Grindelwald", lat: 46.624, lng: 8.0413 },
  { id: "adelboden", name: "Adelboden", lat: 46.492, lng: 7.559 },
];
// Referenzpunkte für die Föhn-Druckdifferenz
const LUGANO = { lat: 46.0037, lng: 8.9511 };
const ZUERICH = { lat: 47.3769, lng: 8.5417 };
// Ort für Höhenwind / Thermik-Kennzahlen
const HOEHEN_ORT = ORTE[2];

// ── Typen ─────────────────────────────────────────────────────────────────
type Zahl = number | null;

type Aktuell = {
  time: string;
  temperature_2m: Zahl;
  wind_speed_10m: Zahl;
  wind_direction_10m: Zahl;
  wind_gusts_10m: Zahl;
  cloud_cover: Zahl;
  precipitation: Zahl;
  pressure_msl: Zahl;
};

type Stunden = {
  time: string[];
  wind_speed_10m: Zahl[];
  wind_direction_10m: Zahl[];
  wind_gusts_10m: Zahl[];
  pressure_msl: Zahl[];
  precipitation: Zahl[];
  cloud_cover: Zahl[];
  temperature_2m: Zahl[];
};

type ApiOrt = { current: Aktuell; hourly: Stunden };

type Hoehe = {
  time: string[];
  cape: Zahl[];
  freezing_level_height: Zahl[];
  wind_speed_850hPa: Zahl[];
  wind_direction_850hPa: Zahl[];
  wind_speed_700hPa: Zahl[];
  wind_direction_700hPa: Zahl[];
};

// ── Daten laden ───────────────────────────────────────────────────────────
async function ladeHaupt(): Promise<ApiOrt[]> {
  const alle = [...ORTE, LUGANO, ZUERICH];
  const lats = alle.map((o) => o.lat).join(",");
  const lngs = alle.map((o) => o.lng).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
    `&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation,pressure_msl` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation,cloud_cover,temperature_2m` +
    `&wind_speed_unit=kmh&timezone=Europe%2FZurich&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  const arr: ApiOrt[] = Array.isArray(json) ? json : [json];
  if (arr.length < alle.length) throw new Error("Unvollständige Antwort");
  return arr;
}

// Zusatzdaten – falls diese Abfrage scheitert, wird der Block einfach ausgeblendet
async function ladeHoehe(): Promise<Hoehe | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${HOEHEN_ORT.lat}&longitude=${HOEHEN_ORT.lng}` +
      `&hourly=cape,freezing_level_height,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa` +
      `&wind_speed_unit=kmh&timezone=Europe%2FZurich&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.hourly as Hoehe;
  } catch {
    return null;
  }
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────
const RICHTUNGEN = ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

function richtungText(grad: Zahl): string {
  if (grad == null) return "–";
  return RICHTUNGEN[Math.round((((grad % 360) + 360) % 360) / 22.5) % 16];
}

function r(v: Zahl): string {
  return v == null ? "–" : String(Math.round(v));
}

type Stufe = { label: string; farbe: string };

// Grobe Faustregel für den Wind – KEINE Flugfreigabe
function windStufe(wind: Zahl, boeen: Zahl, regen: Zahl): Stufe {
  if (wind == null) return { label: "–", farbe: TEXT3 };
  const b = boeen ?? wind;
  const n = regen ?? 0;
  if (n > 0.3 || wind > 25 || b > 38) return { label: "stark", farbe: ROT };
  if (wind > 15 || b > 28 || n > 0) return { label: "böig", farbe: GELB };
  return { label: "ruhig", farbe: GRUEN };
}

function foehnStatus(d: Zahl): { text: string; farbe: string; hinweis: string } {
  if (d == null) return { text: "keine Daten", farbe: TEXT3, hinweis: "" };
  if (d < 2) return { text: "kein Föhn", farbe: GRUEN, hinweis: "Kein nennenswerter Südüberdruck." };
  if (d < 4) return { text: "Föhn möglich", farbe: GELB, hinweis: "Leichter Südüberdruck – in exponierten Tälern kann es föhnig werden." };
  if (d < 8) return { text: "Föhnlage", farbe: ORANGE, hinweis: "Südwind kann bis in die Täler durchgreifen (z. B. Lauterbrunnental, Grindelwald). Lee-Rotoren beachten." };
  return { text: "starker Föhn", farbe: ROT, hinweis: "Deutlicher Südüberdruck – starker Föhn wahrscheinlich." };
}

function stundeAusZeit(zeit: string): number {
  // "2026-11-12T14:15" → 14.25
  const h = Number(zeit.slice(11, 13));
  const m = Number(zeit.slice(14, 16));
  return h + (Number.isNaN(m) ? 0 : m / 60);
}

function werte(arr: Zahl[], von = 6, bis = 21): number[] {
  return arr.slice(von, bis + 1).filter((v): v is number => v != null);
}

function wolkenEmoji(wolken: Zahl, regen: Zahl): string {
  if ((regen ?? 0) > 0.2) return "🌧";
  if (wolken == null) return "–";
  if (wolken < 20) return "☀️";
  if (wolken < 50) return "🌤";
  if (wolken < 80) return "⛅";
  return "☁️";
}

// ── Grafik-Bausteine ──────────────────────────────────────────────────────
function WindPfeil({ grad, farbe, size = 46 }: { grad: Zahl; farbe: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-22 -22 44 44" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle r="20" fill="#f4f9ff" stroke={RAND} />
      <text y="-11" textAnchor="middle" fontSize="6" fill={TEXT3}>N</text>
      {grad != null && (
        <g transform={`rotate(${grad + 180})`}>
          <path d="M0 -13 L7 7 L0 3 L-7 7 Z" fill={farbe} />
        </g>
      )}
    </svg>
  );
}

function pfad(vals: Zahl[], x: (i: number) => number, y: (v: number) => number): string {
  let d = "";
  let offen = false;
  vals.forEach((v, i) => {
    if (v == null) {
      offen = false;
      return;
    }
    d += `${offen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    offen = true;
  });
  return d;
}

function WindDiagramm({ s, jetzt }: { s: Stunden; jetzt: number }) {
  const W = 680, H = 250, L = 34, Rr = 10, T = 12, B = 64;
  const von = 6, bis = 21;
  const n = bis - von;
  const std: number[] = [];
  for (let h = von; h <= bis; h++) std.push(h);

  const w = std.map((h) => s.wind_speed_10m[h] ?? null);
  const b = std.map((h) => s.wind_gusts_10m[h] ?? null);
  const dir = std.map((h) => s.wind_direction_10m[h] ?? null);

  const maxV = Math.max(30, ...w.map((v) => v ?? 0), ...b.map((v) => v ?? 0));
  const yMax = Math.ceil(maxV / 10) * 10;
  const x = (i: number) => L + (i / n) * (W - L - Rr);
  const y = (v: number) => T + (1 - v / yMax) * (H - T - B);
  const breite = W - L - Rr;

  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += 10) ticks.push(v);

  const flaeche =
    `M${x(0).toFixed(1)} ${y(0).toFixed(1)} ` +
    w.map((v, i) => `L${x(i).toFixed(1)} ${y(v ?? 0).toFixed(1)}`).join(" ") +
    ` L${x(n).toFixed(1)} ${y(0).toFixed(1)} Z`;

  const xJetzt = jetzt >= von && jetzt <= bis ? L + ((jetzt - von) / n) * breite : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Wind- und Böenverlauf heute">
      {/* Farbbänder */}
      <rect x={L} y={y(15)} width={breite} height={y(0) - y(15)} fill={GRUEN} opacity="0.1" />
      <rect x={L} y={y(25)} width={breite} height={y(15) - y(25)} fill={GELB} opacity="0.13" />
      <rect x={L} y={y(yMax)} width={breite} height={y(25) - y(yMax)} fill={ROT} opacity="0.1" />

      {/* Gitter + Y-Achse */}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - Rr} y1={y(v)} y2={y(v)} stroke="#fff" strokeOpacity="0.9" />
          <text x={L - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill={TEXT3}>{v}</text>
        </g>
      ))}
      <text x={4} y={T + 2} fontSize="9" fill={TEXT3}>km/h</text>

      {/* Fläche + Linien */}
      <path d={flaeche} fill={BLAU} opacity="0.16" />
      <path d={pfad(b, x, y)} fill="none" stroke={ORANGE} strokeWidth="2" strokeDasharray="5 4" />
      <path d={pfad(w, x, y)} fill="none" stroke={BLAU} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

      {/* Jetzt-Marker */}
      {xJetzt != null && (
        <g>
          <line x1={xJetzt} x2={xJetzt} y1={T} y2={H - B} stroke="#3355cc" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x={xJetzt} y={T - 2} textAnchor="middle" fontSize="9" fill="#3355cc" fontWeight="bold">jetzt</text>
        </g>
      )}

      {/* X-Achse, Windpfeile, Richtungstext */}
      {std.map((h, i) =>
        i % 2 === 0 ? (
          <g key={h}>
            <text x={x(i)} y={H - B + 14} textAnchor="middle" fontSize="10" fill={TEXT2}>{h}h</text>
            {dir[i] != null && (
              <g transform={`translate(${x(i)} ${H - B + 36}) rotate(${(dir[i] as number) + 180})`}>
                <path d="M0 -10 L5.5 7 L0 3.5 L-5.5 7 Z" fill={BLAU} />
              </g>
            )}
            <text x={x(i)} y={H - B + 58} textAnchor="middle" fontSize="9" fill={TEXT3}>{richtungText(dir[i])}</text>
          </g>
        ) : null
      )}
    </svg>
  );
}

function FoehnVerlauf({ diff, jetzt }: { diff: Zahl[]; jetzt: number }) {
  const W = 300, H = 92, L = 22, Rr = 6, T = 8, B = 16;
  const vals = diff.filter((v): v is number => v != null);
  const lo = Math.min(-2, ...vals);
  const hi = Math.max(8, ...vals);
  const n = Math.max(diff.length - 1, 1);
  const x = (i: number) => L + (i / n) * (W - L - Rr);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const breite = W - L - Rr;
  const xJetzt = L + (Math.min(jetzt, 24) / 24) * breite;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Verlauf der Druckdifferenz Lugano minus Zürich">
      <rect x={L} y={y(hi)} width={breite} height={y(4) - y(hi)} fill={ROT} opacity="0.09" />
      <line x1={L} x2={W - Rr} y1={y(4)} y2={y(4)} stroke={ROT} strokeDasharray="4 3" strokeOpacity="0.6" />
      <line x1={L} x2={W - Rr} y1={y(0)} y2={y(0)} stroke={TEXT3} strokeOpacity="0.5" />
      <text x={L - 4} y={y(4) + 3} textAnchor="end" fontSize="9" fill={ROT}>4</text>
      <text x={L - 4} y={y(0) + 3} textAnchor="end" fontSize="9" fill={TEXT3}>0</text>
      <path d={pfad(diff, x, y)} fill="none" stroke={BLAU} strokeWidth="2.5" strokeLinejoin="round" />
      <line x1={xJetzt} x2={xJetzt} y1={T} y2={H - B} stroke="#3355cc" strokeDasharray="3 3" />
      {[0, 6, 12, 18, 24].map((h) => (
        <text key={h} x={L + (h / 24) * breite} y={H - 3} textAnchor="middle" fontSize="9" fill={TEXT3}>{h}h</text>
      ))}
    </svg>
  );
}

function Kachel({ titel, wert, sub, farbe }: { titel: string; wert: string; sub?: string; farbe?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 12, padding: "8px 10px", minWidth: 0 }}>
      <div style={{ fontSize: 10, color: TEXT3, textTransform: "uppercase", letterSpacing: 0.4 }}>{titel}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: farbe ?? TEXT }}>{wert}</div>
      {sub && <div style={{ fontSize: 10, color: TEXT2 }}>{sub}</div>}
    </div>
  );
}

function Chip({ text, farbe }: { text: string; farbe: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: farbe, background: "#fff", border: `1px solid ${farbe}`, borderRadius: 999, padding: "3px 10px" }}>
      {text}
    </span>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────
export default function FlugWetter() {
  const [daten, setDaten] = useState<ApiOrt[] | null>(null);
  const [hoehe, setHoehe] = useState<Hoehe | null>(null);
  const [fehler, setFehler] = useState(false);
  const [laden, setLaden] = useState(true);
  const [gewaehlt, setGewaehlt] = useState("interlaken");

  const aktualisieren = useCallback(async () => {
    setLaden(true);
    try {
      const d = await ladeHaupt();
      setDaten(d);
      setFehler(false);
    } catch {
      setFehler(true);
    }
    ladeHoehe().then((h) => setHoehe(h));
    setLaden(false);
  }, []);

  useEffect(() => {
    aktualisieren();
    const t = setInterval(aktualisieren, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [aktualisieren]);

  const karte: React.CSSProperties = {
    background: "rgba(255,255,255,0.78)",
    border: `1px solid ${RAND}`,
    borderRadius: 18,
    boxShadow: "0 4px 18px rgba(58,110,165,0.12)",
    padding: 16,
    textAlign: "left",
    color: TEXT,
  };

  const kopf = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>🌤 Flugwetter Berner Oberland</div>
        <div style={{ fontSize: 11, color: TEXT2 }}>
          {daten ? `Stand ${daten[0].current.time.slice(11, 16)} Uhr · Modelldaten` : "Modelldaten"}
        </div>
      </div>
      <button
        onClick={aktualisieren}
        disabled={laden}
        aria-label="Wetter aktualisieren"
        style={{ border: `1px solid ${RAND}`, background: "#fff", color: BLAU, borderRadius: 999, width: 34, height: 34, cursor: laden ? "default" : "pointer", fontSize: 16 }}
      >
        {laden ? "…" : "↻"}
      </button>
    </div>
  );

  if (!daten) {
    return (
      <div style={{ ...karte, marginBottom: 24 }}>
        {kopf}
        {fehler ? (
          <p style={{ margin: 0, fontSize: 13, color: TEXT2 }}>
            Wetterdaten konnten gerade nicht geladen werden. Bitte später nochmals versuchen oder direkt{" "}
            <a href="https://www.meteoschweiz.admin.ch" target="_blank" rel="noopener noreferrer" style={{ color: "#3355cc" }}>MeteoSchweiz</a> öffnen.
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: TEXT2 }}>Wird geladen…</p>
        )}
      </div>
    );
  }

  const orteDaten = ORTE.map((o, i) => ({ ort: o, d: daten[i] }));
  const lugano = daten[ORTE.length];
  const zuerich = daten[ORTE.length + 1];

  const sel = orteDaten.find((o) => o.ort.id === gewaehlt) ?? orteDaten[2];
  const jetzt = stundeAusZeit(sel.d.current.time);

  // Föhn
  const diffStunden: Zahl[] = lugano.hourly.pressure_msl.map((v, i) => {
    const z = zuerich.hourly.pressure_msl[i];
    return v != null && z != null ? v - z : null;
  });
  const diffJetzt: Zahl =
    lugano.current.pressure_msl != null && zuerich.current.pressure_msl != null
      ? lugano.current.pressure_msl - zuerich.current.pressure_msl
      : null;
  const foehn = foehnStatus(diffJetzt);

  // Tageskennzahlen des gewählten Ortes (6–21 Uhr)
  const h = sel.d.hourly;
  const temps = werte(h.temperature_2m, 0, 23);
  const boeenMax = werte(h.wind_gusts_10m);
  const regenSumme = werte(h.precipitation).reduce((a, v) => a + v, 0);
  const wolkenTag = werte(h.cloud_cover, 10, 17);
  const wolkenMittel = wolkenTag.length ? wolkenTag.reduce((a, v) => a + v, 0) / wolkenTag.length : null;

  // Höhe / Thermik
  const capeMax = hoehe ? Math.max(0, ...werte(hoehe.cape, 10, 20)) : null;
  const nullgrad = hoehe ? werte(hoehe.freezing_level_height, 10, 17) : [];
  const nullgradMittel = nullgrad.length ? nullgrad.reduce((a, v) => a + v, 0) / nullgrad.length : null;

  const suedwindHoehe = hoehe
    ? [8, 11, 14, 17].some((st) => {
        const g = hoehe.wind_direction_700hPa[st];
        const v = hoehe.wind_speed_700hPa[st];
        return g != null && v != null && g >= 135 && g <= 245 && v >= 40;
      })
    : false;

  // Hinweis-Chips
  const chips: { text: string; farbe: string }[] = [];
  if (diffJetzt != null && diffJetzt >= 2) chips.push({ text: `Föhn: ${foehn.text}`, farbe: foehn.farbe });
  if (suedwindHoehe) chips.push({ text: "Südwind in der Höhe ≥ 40 km/h", farbe: ORANGE });
  if (capeMax != null && capeMax >= 500) chips.push({ text: "Gewitterneigung (CAPE)", farbe: ROT });
  if (regenSumme >= 1) chips.push({ text: `Regen heute: ${regenSumme.toFixed(1)} mm`, farbe: BLAU });
  if (chips.length === 0) chips.push({ text: "Keine Auffälligkeiten im Modell", farbe: GRUEN });

  const stufeSel = windStufe(sel.d.current.wind_speed_10m, sel.d.current.wind_gusts_10m, sel.d.current.precipitation);

  return (
    <div style={{ ...karte, marginBottom: 24 }}>
      {kopf}

      {/* Hinweis-Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {chips.map((c) => (
          <Chip key={c.text} text={c.text} farbe={c.farbe} />
        ))}
      </div>

      {/* Wind aktuell */}
      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6, marginBottom: 8 }}>💨 WIND JETZT (10 m, MODELL)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 16 }}>
        {orteDaten.map(({ ort, d }) => {
          const st = windStufe(d.current.wind_speed_10m, d.current.wind_gusts_10m, d.current.precipitation);
          const aktiv = ort.id === sel.ort.id;
          return (
            <button
              key={ort.id}
              onClick={() => setGewaehlt(ort.id)}
              style={{
                textAlign: "left", background: "#fff", cursor: "pointer", display: "flex", gap: 10, alignItems: "center",
                border: aktiv ? "2px solid #3355cc" : `1px solid ${RAND}`, borderRadius: 14, padding: aktiv ? 7 : 8, color: TEXT,
              }}
            >
              <WindPfeil grad={d.current.wind_direction_10m} farbe={st.farbe} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: TEXT2 }}>{ort.name}</div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>
                  {r(d.current.wind_speed_10m)} <span style={{ fontSize: 11, fontWeight: 400, color: TEXT2 }}>km/h</span>
                </div>
                <div style={{ fontSize: 11, color: TEXT2 }}>
                  Böen {r(d.current.wind_gusts_10m)} · {richtungText(d.current.wind_direction_10m)}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: st.farbe }}>● {st.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tagesverlauf */}
      <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            📈 Heute in {sel.ort.name}{" "}
            <span style={{ color: stufeSel.farbe, fontSize: 11 }}>● jetzt {stufeSel.label}</span>
          </div>
          <div style={{ fontSize: 10, color: TEXT2, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span><span style={{ color: BLAU, fontWeight: 700 }}>━</span> Wind</span>
            <span><span style={{ color: ORANGE, fontWeight: 700 }}>╍</span> Böen</span>
            <span>Pfeile: Windrichtung</span>
          </div>
        </div>
        <WindDiagramm s={sel.d.hourly} jetzt={jetzt} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: TEXT3, marginTop: 2 }}>
          <span>Grün ≤ 15 km/h</span>
          <span>Gelb 15–25 km/h</span>
          <span>Rot &gt; 25 km/h</span>
        </div>
      </div>

      {/* Kennzahlen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 16 }}>
        <Kachel titel="Temp. heute" wert={temps.length ? `${Math.round(Math.min(...temps))}…${Math.round(Math.max(...temps))}°` : "–"} sub={sel.ort.name} />
        <Kachel titel="Böen max." wert={boeenMax.length ? `${Math.round(Math.max(...boeenMax))} km/h` : "–"} sub="6–21 Uhr" />
        <Kachel titel="Niederschlag" wert={`${regenSumme.toFixed(1)} mm`} sub="6–21 Uhr" />
        <Kachel titel="Bewölkung" wert={`${wolkenEmoji(wolkenMittel, regenSumme > 0.5 ? 1 : 0)} ${r(wolkenMittel)}%`} sub="Ø 10–17 Uhr" />
        {nullgradMittel != null && <Kachel titel="Nullgradgrenze" wert={`${Math.round(nullgradMittel / 10) * 10} m`} sub="Ø 10–17 Uhr" />}
        {capeMax != null && (
          <Kachel titel="CAPE max." wert={`${Math.round(capeMax)}`} sub="J/kg · Labilität" farbe={capeMax >= 500 ? ROT : capeMax >= 200 ? GELB : GRUEN} />
        )}
      </div>

      {/* Föhn + Höhenwind */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, marginBottom: 14 }}>
        <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6, marginBottom: 6 }}>🏔 FÖHN · DRUCK LUGANO − ZÜRICH</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: foehn.farbe }}>{diffJetzt == null ? "–" : `${diffJetzt > 0 ? "+" : ""}${diffJetzt.toFixed(1)}`}</span>
            <span style={{ fontSize: 12, color: TEXT2 }}>hPa</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: foehn.farbe }}>● {foehn.text}</span>
          </div>
          <FoehnVerlauf diff={diffStunden} jetzt={jetzt} />
          <div style={{ fontSize: 11, color: TEXT2, marginTop: 4 }}>{foehn.hinweis} Faustwert: ab ca. 4 hPa Föhnlage (Südföhn, Wind aus S/SW).</div>
        </div>

        {hoehe && (
          <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6, marginBottom: 8 }}>🧭 HÖHENWIND ÜBER INTERLAKEN</div>
            <div style={{ display: "grid", gridTemplateColumns: "64px repeat(4, 1fr)", gap: 6, alignItems: "center", textAlign: "center" }}>
              <div />
              {[8, 11, 14, 17].map((st) => (
                <div key={st} style={{ fontSize: 11, color: TEXT2, fontWeight: 700 }}>{st}h</div>
              ))}
              {([
                { label: "1500 m", dir: hoehe.wind_direction_850hPa, spd: hoehe.wind_speed_850hPa },
                { label: "3000 m", dir: hoehe.wind_direction_700hPa, spd: hoehe.wind_speed_700hPa },
              ]).map((zeile) => (
                <div key={zeile.label} style={{ display: "contents" }}>
                  <div style={{ fontSize: 11, color: TEXT2, textAlign: "left" }}>{zeile.label}</div>
                  {[8, 11, 14, 17].map((st) => {
                    const v = zeile.spd[st] ?? null;
                    const g = zeile.dir[st] ?? null;
                    const stark = v != null && v >= 40;
                    return (
                      <div key={st} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <WindPfeil grad={g} farbe={stark ? ORANGE : BLAU} size={34} />
                        <div style={{ fontSize: 11, fontWeight: 700, color: stark ? ORANGE : TEXT }}>{r(v)}</div>
                        <div style={{ fontSize: 9, color: TEXT3 }}>{richtungText(g)}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: TEXT3, marginTop: 6 }}>km/h · 850 hPa ≈ 1500 m, 700 hPa ≈ 3000 m</div>
          </div>
        )}
      </div>

      {/* Links + Quelle */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {[
          { t: "MeteoSchweiz", u: "https://www.meteoschweiz.admin.ch" },
          { t: "Meteoblue Thermik", u: "https://www.meteoblue.com/de/wetter/aviation/thermal/interlaken_schweiz_2660253" },
          { t: "Windy", u: "https://www.windy.com/46.686/7.863" },
        ].map((l) => (
          <a key={l.t} href={l.u} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#3355cc", textDecoration: "none", background: "#fff", border: `1px solid ${RAND}`, borderRadius: 999, padding: "4px 12px" }}>
            {l.t} ↗
          </a>
        ))}
      </div>
      <div style={{ fontSize: 10, color: TEXT3, lineHeight: 1.5 }}>
        Wetterdaten: <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" style={{ color: TEXT3 }}>Open-Meteo.com</a> – Modellwerte, keine Stationsmessungen. Farben und Schwellen sind grobe Faustregeln und ersetzen weder ein Wetterbriefing noch die eigene Beurteilung vor Ort.
      </div>
    </div>
  );
}
