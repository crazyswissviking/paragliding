"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Meteogramm from "./Meteogramm";
import FoehnBise from "./FoehnBise";
import type { DruckDiff, MesswerteAntwort, Messung } from "../lib/messwerte";
import { foehnStatus, biseStatus, vorzeichen } from "../lib/foehn";
import { DruckUhr, bogen, polar } from "./Uhren";
import { supabase } from "../supabase";
import { DASH_STANDARD, DASH_TABELLE, bereinigeAuswahl } from "../lib/dashboard";

// Karte wird erst beim Einblenden geladen (MapLibre nur im Browser)
const WindKarte = dynamic(() => import("./WindKarte"), {
  ssr: false,
  loading: () => <p style={{ margin: "0 0 16px", fontSize: 12, color: "#5b7491" }}>Karte wird geladen…</p>,
});

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
// Referenzpunkte für die Bise (Modell): Genf/Cointrin und Gottmadingen (D, bei Schaffhausen)
const GENF = { lat: 46.2381, lng: 6.1089 };
const GOTTMADINGEN = { lat: 47.7374, lng: 8.7754 };
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
  const alle = [...ORTE, LUGANO, ZUERICH, GENF, GOTTMADINGEN];
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


const PILOTENREGEL =
  "Pilotenregel: Leeseite ab ca. 3–4 hPa besser meiden (Südföhn: Alpennordseite, Nordföhn: Alpensüdseite). Ab ca. 4 hPa greift der Föhn in die Täler, ab ca. 8 hPa bis ins Flachland.";


// Trend beim Föhn: Betrag verglichen mit vor 3 Stunden
function trendFoehn(d: Zahl, vor: Zahl): string {
  if (d == null || vor == null) return "";
  if (d * vor < 0) return "↻ Vorzeichenwechsel";
  const da = Math.abs(d) - Math.abs(vor);
  return da >= 1 ? "↗ verstärkt sich" : da <= -1 ? "↘ schwächt sich ab" : "→ stabil";
}

// Trend als Wertänderung in 3 Stunden
function trendWert(d: Zahl, vor: Zahl): string {
  if (d == null || vor == null) return "";
  const dl = d - vor;
  if (Math.abs(dl) < 0.5) return "→ stabil";
  return `${dl > 0 ? "↗ +" : "↘ −"}${Math.abs(dl).toFixed(1)} in 3 h`;
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


// Wind-Uhr: Kompassring mit Windrichtung (Kugel am Rand = Richtung, aus der der Wind weht),
// Geschwindigkeit als Bogen um den Rand (volle Runde = 40 km/h), Böenspitze als Strich, Zahl in der Mitte.
const WIND_VOLL = 40;
function WindUhr({ wind, boeen, richtung, farbe, size = 96 }: { wind: Zahl; boeen: Zahl; richtung: Zahl; farbe: string; size?: number }) {
  const w = wind == null ? 0 : Math.min(Math.max(wind, 0), WIND_VOLL);
  const wWinkel = Math.min((w / WIND_VOLL) * 360, 359.9);
  const bWinkel = boeen == null ? null : Math.min((Math.min(Math.max(boeen, 0), WIND_VOLL) / WIND_VOLL) * 360, 359.9);
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  const klein = size < 80;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" role="img" aria-label={`Wind ${r(wind)} km/h, Böen ${r(boeen)}, Richtung ${richtungText(richtung)}`} style={{ flexShrink: 0 }}>
      <circle r="45" fill="none" stroke="#e3edf8" strokeWidth="5" />
      {wind != null && wWinkel > 0.5 && <path d={bogen(45, 0, wWinkel)} fill="none" stroke={farbe} strokeWidth="5" strokeLinecap="round" />}
      {bWinkel != null && (() => {
        const [x0, y0] = polar(41, bWinkel);
        const [x1, y1] = polar(49, bWinkel);
        return <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={TEXT} strokeWidth="2" strokeLinecap="round" />;
      })()}
      <circle r="38" fill="#f4f9ff" stroke={RAND} />
      {ticks.map((a) => {
        const gross = a % 90 === 0;
        const [x0, y0] = polar(gross ? 31 : 33, a);
        const [x1, y1] = polar(36, a);
        return <line key={a} x1={x0} y1={y0} x2={x1} y2={y1} stroke={gross ? TEXT2 : TEXT3} strokeWidth={gross ? 1.6 : 1} />;
      })}
      {!klein &&
        [["N", 0], ["O", 90], ["S", 180], ["W", 270]].map(([t, a]) => {
          const [x, y] = polar(25, a as number);
          return (
            <text key={t as string} x={x} y={y + 2.5} textAnchor="middle" fontSize="7" fill={TEXT3}>
              {t}
            </text>
          );
        })}
      {richtung != null && (
        <g transform={`rotate(${richtung})`}>
          <line x1="0" y1="-14" x2="0" y2="-29" stroke={farbe} strokeWidth="2.5" strokeLinecap="round" />
          <circle cy="-31" r="4.5" fill={farbe} stroke="#fff" strokeWidth="1.2" />
        </g>
      )}
      <circle r={klein ? 15 : 17} fill="#fff" stroke={RAND} />
      <text y={klein ? 2 : 1} textAnchor="middle" fontSize={klein ? 15 : 16} fontWeight="800" fill={TEXT}>
        {r(wind)}
      </text>
      <text y={klein ? 10 : 9} textAnchor="middle" fontSize="5.5" fill={TEXT2}>
        km/h
      </text>
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

function DruckVerlauf({ diff, gemessen, jetzt, linien, loMin, hiMin, label }: { diff: Zahl[]; gemessen?: Zahl[]; jetzt: number; linien: number[]; loMin: number; hiMin: number; label: string }) {
  const W = 300, H = 96, L = 28, Rr = 6, T = 8, B = 16;
  const vals = [...diff, ...(gemessen ?? [])].filter((v): v is number => v != null);
  const lo = Math.min(loMin, ...vals);
  const hi = Math.max(hiMin, ...vals);
  const n = Math.max(diff.length - 1, 1);
  const x = (i: number) => L + (i / n) * (W - L - Rr);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const breite = W - L - Rr;
  const xJetzt = L + (Math.min(jetzt, n) / n) * breite;
  const oben = Math.max(...linien);
  const unten = Math.min(...linien);
  const fmt = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={label}>
      {oben > 0 && <rect x={L} y={y(hi)} width={breite} height={y(oben) - y(hi)} fill={ROT} opacity="0.08" />}
      {unten < 0 && <rect x={L} y={y(unten)} width={breite} height={y(lo) - y(unten)} fill={ROT} opacity="0.08" />}
      <line x1={L} x2={W - Rr} y1={y(0)} y2={y(0)} stroke={TEXT3} strokeOpacity="0.6" />
      <text x={L - 4} y={y(0) + 3} textAnchor="end" fontSize="9" fill={TEXT3}>0</text>
      {linien.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - Rr} y1={y(v)} y2={y(v)} stroke={ORANGE} strokeDasharray="4 3" strokeOpacity="0.8" />
          <text x={L - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill={ORANGE}>{fmt(v)}</text>
        </g>
      ))}
      {gemessen ? (
        <>
          <path d={pfad(diff, x, y)} fill="none" stroke={TEXT3} strokeWidth="1.8" strokeDasharray="5 3" strokeLinejoin="round" />
          <path d={pfad(gemessen, x, y)} fill="none" stroke={BLAU} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      ) : (
        <path d={pfad(diff, x, y)} fill="none" stroke={BLAU} strokeWidth="2.5" strokeLinejoin="round" />
      )}
      <line x1={xJetzt} x2={xJetzt} y1={T} y2={H - B} stroke="#3355cc" strokeDasharray="3 3" />
      {[0, 6, 12, 18, 23].map((h) => (
        <text key={h} x={x(h)} y={H - 3} textAnchor="middle" fontSize="9" fill={TEXT3}>{h}h</text>
      ))}
    </svg>
  );
}

// Gemessene Stundenwerte (UTC-Zeitstempel) auf die heutigen Stunden 0–23 in Schweizer Ortszeit abbilden
function verlaufHeute(verlauf: { t: number; d: number }[] | undefined): Zahl[] {
  const out: Zahl[] = Array.from({ length: 24 }, () => null);
  if (!verlauf) return out;
  const tag = (ms: number) => new Date(ms).toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" });
  const heute = tag(Date.now());
  for (const p of verlauf) {
    if (tag(p.t) !== heute) continue;
    const std = Number(new Date(p.t).toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Zurich" }).slice(0, 2));
    if (Number.isInteger(std) && std >= 0 && std < 24) out[std] = p.d;
  }
  return out;
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

// ── Messwerte (MeteoSchweiz) ──────────────────────────────────────────────
async function ladeMess(): Promise<MesswerteAntwort | null> {
  try {
    const res = await fetch("/api/messwerte");
    if (!res.ok) return null;
    return (await res.json()) as MesswerteAntwort;
  } catch {
    return null;
  }
}

// Dashboard-Auswahl aus dem Admin-Tool (Supabase). Bei Fehler/leer: Standard.
async function ladeDashKonfig(): Promise<string[] | null> {
  try {
    const { data, error } = await supabase.from(DASH_TABELLE).select("eintraege").eq("id", 1).maybeSingle();
    if (error || !data) return null;
    return bereinigeAuswahl(data.eintraege);
  } catch {
    return null;
  }
}

// Zeiten der Messdateien sind UTC – Anzeige in Schweizer Ortszeit
function zeitLokal(iso: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
}

function alterMin(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function alterText(min: number | null): string {
  if (min == null) return "";
  if (min < 1) return "gerade eben";
  if (min < 90) return `vor ${min} Min.`;
  return `vor ${Math.round(min / 60)} Std.`;
}

// ── Dashboard: kompakte Kacheln ───────────────────────────────────────────
const dashUhrKachel = (farbe: string): React.CSSProperties => ({
  background: "#fff", border: `1px solid ${RAND}`, borderTop: `4px solid ${farbe}`, borderRadius: 14, padding: "8px 6px 6px", minWidth: 0,
  display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 2,
});

function DashWind({ m }: { m: Messung }) {
  const st = windStufe(m.wind, m.boeen, null);
  const alter = alterMin(m.zeit);
  const veraltet = alter != null && alter > 40;
  return (
    <div style={dashUhrKachel(st.farbe)}>
      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {m.name}{m.rolle ? ` · ${m.rolle}` : ""}
      </div>
      <WindUhr wind={m.wind} boeen={m.boeen} richtung={m.richtung} farbe={st.farbe} size={104} />
      <div style={{ fontSize: 11, color: TEXT2 }}>
        Böen <b style={{ color: TEXT }}>{r(m.boeen)}</b> · aus {richtungText(m.richtung)}
      </div>
      <div style={{ fontSize: 9, color: veraltet ? ORANGE : TEXT3, fontWeight: veraltet ? 700 : 400 }}>
        {zeitLokal(m.zeit)} Uhr{veraltet ? " ⚠" : ""}
      </div>
    </div>
  );
}

function DashLokal({ l }: { l: MesswerteAntwort["lokal"] }) {
  const uhren: { label: string; d: DruckDiff }[] = [
    { label: "Meiringen − Interlaken", d: l.meiringenInterlaken },
    { label: "Grimsel − Meiringen", d: l.grimselMeiringen },
    { label: "Grimsel − Interlaken", d: l.grimselInterlaken },
  ];
  return (
    <div style={{ ...dashUhrKachel(TEXT3), gridColumn: "span 2" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2 }}>⛰ Haslital · Druckunterschiede</div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
        {uhren.map((u) => (
          <div key={u.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 96 }}>
            <DruckUhr wert={u.d.diff} bereich={6} size={72} beschriftung={false} />
            <div style={{ fontSize: 9, color: TEXT2, lineHeight: 1.2 }}>{u.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: TEXT3 }}>Skala ±6 hPa · hPa</div>
    </div>
  );
}

function MessKarte({ m }: { m: Messung }) {
  const st = windStufe(m.wind, m.boeen, null);
  const alter = alterMin(m.zeit);
  const veraltet = alter != null && alter > 40;
  return (
    <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 8, display: "flex", gap: 10, alignItems: "center" }}>
      <WindUhr wind={m.wind} boeen={m.boeen} richtung={m.richtung} farbe={st.farbe} size={72} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: TEXT2 }}>
          {m.name} <span style={{ color: TEXT3 }}>{m.hoehe != null ? `· ${m.hoehe} m` : ""}</span>
          {m.rolle && (
            <span style={{ marginLeft: 6, fontSize: 10, color: m.rolle === "Startplatz" ? BLAU : GRUEN, border: `1px solid ${m.rolle === "Startplatz" ? BLAU : GRUEN}`, borderRadius: 999, padding: "0 6px" }}>
              {m.rolle === "Startplatz" ? "🚩" : "🟢"} {m.rolle}
            </span>
          )}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>
          {r(m.wind)} <span style={{ fontSize: 11, fontWeight: 400, color: TEXT2 }}>km/h</span>
        </div>
        <div style={{ fontSize: 11, color: TEXT2 }}>
          Böen {r(m.boeen)} · {richtungText(m.richtung)}
          {m.temp != null ? ` · ${m.temp.toFixed(1)}°` : ""}
          {m.regen != null && m.regen > 0 ? ` · 🌧 ${m.regen} mm/10′` : ""}
        </div>
        <div style={{ fontSize: 10, color: veraltet ? ORANGE : TEXT3, fontWeight: veraltet ? 700 : 400 }}>
          <span style={{ color: st.farbe, fontWeight: 700 }}>● {st.label}</span> · 🕒 {zeitLokal(m.zeit)} Uhr{alter != null ? ` · ${alterText(alter)}` : ""}
          {veraltet ? " ⚠" : ""}
          {m.status && m.status !== "online" ? " · Station offline" : ""}
        </div>
      </div>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────
export default function FlugWetter() {
  const [daten, setDaten] = useState<ApiOrt[] | null>(null);
  const [hoehe, setHoehe] = useState<Hoehe | null>(null);
  const [fehler, setFehler] = useState(false);
  const [laden, setLaden] = useState(true);
  const [gewaehlt] = useState("interlaken");
  const [mess, setMess] = useState<MesswerteAntwort | null>(null);
  const [messGeladen, setMessGeladen] = useState(false);
  const [dashKeys, setDashKeys] = useState<string[]>(DASH_STANDARD);
  const [alleMess, setAlleMess] = useState(false);
  const [karteOffen, setKarteOffen] = useState(false);
  const [ladeVersion, setLadeVersion] = useState(0); // zählt Aktualisierungen (für das Meteogramm)

  // Ein-/Ausblenden der Karte pro Gerät merken (falls der Browser-Speicher verfügbar ist)
  useEffect(() => {
    // bewusst asynchron (nach dem ersten Rendern), damit Server- und Browser-HTML übereinstimmen
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem("vf_karte") === "1") setKarteOffen(true);
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const karteUmschalten = () =>
    setKarteOffen((v) => {
      try {
        localStorage.setItem("vf_karte", v ? "0" : "1");
      } catch {}
      return !v;
    });

  useEffect(() => {
    ladeDashKonfig().then((k) => {
      if (k) setDashKeys(k);
    });
  }, []);

  // Lädt alle Daten (ohne synchrones setState – wird vom Effekt unten aufgerufen)
  const ladeAlles = useCallback(async () => {
    setLadeVersion((v) => v + 1);
    try {
      const d = await ladeHaupt();
      setDaten(d);
      setFehler(false);
    } catch {
      setFehler(true);
    }
    ladeHoehe().then((h) => setHoehe(h));
    ladeMess().then((m) => {
      if (m) setMess(m);
      setMessGeladen(true);
    });
    setLaden(false);
  }, []);

  // Knopf ↻: zuerst „…“ anzeigen, dann laden
  const aktualisieren = () => {
    setLaden(true);
    void ladeAlles();
  };

  useEffect(() => {
    const start = setTimeout(ladeAlles, 0);
    const t = setInterval(ladeAlles, 10 * 60 * 1000);
    return () => {
      clearTimeout(start);
      clearInterval(t);
    };
  }, [ladeAlles]);

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
          {daten ? `Modell-Stand ${daten[0].current.time.slice(11, 16)} Uhr · dazu Messwerte von MeteoSchweiz` : "Modell- und Messdaten"}
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
  const genf = daten[ORTE.length + 2];
  const gottm = daten[ORTE.length + 3];

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

  // Bise (Modell): Gottmadingen − Genf, positiv = Bise
  const biseModell: Zahl[] = gottm.hourly.pressure_msl.map((v, i) => {
    const g = genf.hourly.pressure_msl[i];
    return v != null && g != null ? v - g : null;
  });
  const biseModellJetzt: Zahl =
    gottm.current.pressure_msl != null && genf.current.pressure_msl != null
      ? gottm.current.pressure_msl - genf.current.pressure_msl
      : null;

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
  // Hinweise bevorzugt aus Messwerten, sonst aus dem Modell
  const foehnWert: Zahl = mess?.foehn.diff ?? diffJetzt;
  if (foehnWert != null && Math.abs(foehnWert) >= 2) {
    chips.push({ text: `${foehnStatus(foehnWert).text} (${vorzeichen(foehnWert)} hPa)`, farbe: foehnStatus(foehnWert).farbe });
  }
  const biseWert: Zahl = mess?.bise?.diff ?? biseModellJetzt;
  if (biseWert != null && biseWert >= 2) {
    chips.push({ text: `${biseStatus(biseWert).text} (${vorzeichen(biseWert)} hPa)`, farbe: biseStatus(biseWert).farbe });
  }
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

      {/* Dashboard: die wichtigsten Messdaten (Auswahl im Admin-Tool) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6 }}>📡 DASHBOARD · MESSDATEN JETZT</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={karteUmschalten}
            aria-expanded={karteOffen}
            style={{ border: `1px solid ${karteOffen ? BLAU : RAND}`, background: karteOffen ? BLAU : "#fff", color: karteOffen ? "#fff" : BLAU, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            🗺 Karte {karteOffen ? "ausblenden" : "einblenden"}
          </button>
          <button
            onClick={() => setAlleMess((v) => !v)}
            aria-expanded={alleMess}
            style={{ border: `1px solid ${RAND}`, background: "#fff", color: BLAU, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {alleMess ? "Alle Messdaten ▴" : "Alle Messdaten ▾"}
          </button>
        </div>
      </div>
      {/* Föhn & Bise: eigene Zeile mit Analyse und 24-h-Prognose */}
      {mess && <FoehnBise mess={mess} version={ladeVersion} zeigeFoehn={dashKeys.includes("foehn")} zeigeBise={dashKeys.includes("bise")} />}
      {mess ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
          {dashKeys.map((k) => {
            // Föhn und Bise stehen oben in der eigenen Analyse-Zeile
            if (k === "foehn" || k === "bise") return null;
            if (k === "lokal") {
              return mess.lokal ? <DashLokal key={k} l={mess.lokal} /> : null;
            }
            const m = [...(mess.windline ?? []), ...mess.stationen].find((x) => x.id === k);
            return m ? <DashWind key={k} m={m} /> : null;
          })}
        </div>
      ) : (
        <p style={{ margin: "0 0 16px", fontSize: 12, color: TEXT2 }}>
          {messGeladen ? "Messwerte sind momentan nicht verfügbar." : "Messwerte werden geladen…"}
        </p>
      )}

      {/* Karte: Wind und Druckunterschiede (ein-/ausblendbar) */}
      {karteOffen && mess && <WindKarte mess={mess} />}

      {alleMess && (
      <>
      {/* Windline: Start- und Landeplätze */}
      {mess && (mess.windline ?? []).length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6, marginBottom: 8 }}>🪂 STARTPLÄTZE & LANDEPLÄTZE · WINDLINE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginBottom: 8 }}>
            {(mess.windline ?? []).map((m) => (
              <MessKarte key={m.id} m={m} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: TEXT3, lineHeight: 1.5, marginBottom: 16 }}>
            Messwerte der Windline-Stationen (10-Min-Mittel und Spitze), Zeiten in Schweizer Ortszeit. Quelle:{" "}
            <a href="https://www.windline.ch" target="_blank" rel="noopener noreferrer" style={{ color: TEXT3 }}>windline.ch</a>.
          </div>
        </>
      )}

      {/* Gemessene Werte (MeteoSchweiz) */}
      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6, marginBottom: 8 }}>📡 GEMESSEN · METEOSCHWEIZ (10-MIN-WERTE)</div>
      {mess && mess.stationen.length > 0 ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginBottom: 8 }}>
            {mess.stationen.map((m) => (
              <MessKarte key={m.id} m={m} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8, marginBottom: 8, alignItems: "start" }}>
          {mess.foehn.diff != null && (() => {
            const fs = foehnStatus(mess.foehn.diff);
            const tr = trendFoehn(mess.foehn.diff, mess.foehn.diffVor3h);
            const verlauf = verlaufHeute(mess.foehn.verlauf);
            return (
              <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 10, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6, marginBottom: 4 }}>🏔 FÖHN GEMESSEN · DRUCK LUGANO − ZÜRICH/KLOTEN (+ SÜD · − NORD)</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: fs.farbe }}>{vorzeichen(mess.foehn.diff)}</span>
                  <span style={{ fontSize: 12, color: TEXT2 }}>hPa</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: fs.farbe }}>● {fs.text}</span>
                  {tr && (
                    <span style={{ fontSize: 11, color: TEXT2 }}>
                      {tr}{mess.foehn.diffVor3h != null ? ` (vor 3 h: ${vorzeichen(mess.foehn.diffVor3h)} hPa)` : ""}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: TEXT3, marginTop: 2 }}>
                  🕒 {zeitLokal(mess.foehn.zeit)} Uhr · {alterText(alterMin(mess.foehn.zeit))} · Meeresdruck {mess.foehn.basis}
                </div>
                <div style={{ marginTop: 8 }}>
                  <DruckVerlauf diff={diffStunden} gemessen={verlauf} jetzt={jetzt} linien={[-4, 4]} loMin={-8} hiMin={8} label="Verlauf der Druckdifferenz Lugano minus Zürich, gemessen und Modell" />
                  <div style={{ fontSize: 10, color: TEXT2, display: "flex", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                    <span><span style={{ color: BLAU, fontWeight: 700 }}>━</span> gemessen</span>
                    <span><span style={{ color: TEXT3, fontWeight: 700 }}>╍</span> Modell-Prognose</span>
                    <span><span style={{ color: ORANGE, fontWeight: 700 }}>╍</span> Schwelle ±4 hPa</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: TEXT2, marginTop: 6 }}>{fs.hinweis}</div>
                <div style={{ fontSize: 10, color: TEXT3, marginTop: 4 }}>{PILOTENREGEL}</div>
              </div>
            );
          })()}
          {mess.bise?.diff != null && (() => {
            const bs = biseStatus(mess.bise.diff);
            const tr = trendWert(mess.bise.diff, mess.bise.diffVor3h);
            const verlauf = verlaufHeute(mess.bise.verlauf);
            return (
              <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 10, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6, marginBottom: 4 }}>🌬 BISE GEMESSEN · DRUCK GÜTTINGEN − GENF (+ = BISE)</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: bs.farbe }}>{vorzeichen(mess.bise.diff)}</span>
                  <span style={{ fontSize: 12, color: TEXT2 }}>hPa</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: bs.farbe }}>● {bs.text}</span>
                  {tr && <span style={{ fontSize: 11, color: TEXT2 }}>{tr}</span>}
                </div>
                <div style={{ fontSize: 10, color: TEXT3, marginTop: 2 }}>
                  🕒 {zeitLokal(mess.bise.zeit)} Uhr · {alterText(alterMin(mess.bise.zeit))} · Meeresdruck {mess.bise.basis}
                </div>
                <div style={{ marginTop: 8 }}>
                  <DruckVerlauf diff={biseModell} gemessen={verlauf} jetzt={jetzt} linien={[2, 4]} loMin={-4} hiMin={6} label="Verlauf der Druckdifferenz Güttingen minus Genf, gemessen und Modell Gottmadingen minus Genf" />
                  <div style={{ fontSize: 10, color: TEXT2, display: "flex", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                    <span><span style={{ color: BLAU, fontWeight: 700 }}>━</span> gemessen (Güttingen − Genf)</span>
                    <span><span style={{ color: TEXT3, fontWeight: 700 }}>╍</span> Modell (Gottmadingen − Genf)</span>
                    <span><span style={{ color: ORANGE, fontWeight: 700 }}>╍</span> Schwellen 2 / 4 hPa</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: TEXT2, marginTop: 6 }}>{bs.hinweis}</div>
                <div style={{ fontSize: 10, color: TEXT3, marginTop: 4 }}>
                  Bise = Nordostwind im Mittelland, sobald der Druck in Güttingen (Bodensee) höher ist als in Genf. Schwellen (ab ca. 2 hPa wahrscheinlich) sind Erfahrungswerte.
                </div>
              </div>
            );
          })()}
          </div>
          {mess.lokal && (mess.lokal.meiringenInterlaken.diff != null || mess.lokal.grimselMeiringen.diff != null || mess.lokal.grimselInterlaken.diff != null) && (() => {
            const zeilen: { label: string; d: DruckDiff }[] = [
              { label: "Meiringen − Interlaken", d: mess.lokal.meiringenInterlaken },
              { label: "Grimsel − Meiringen", d: mess.lokal.grimselMeiringen },
              { label: "Grimsel − Interlaken", d: mess.lokal.grimselInterlaken },
            ];
            const zeit = zeilen.map((z) => z.d.zeit).find((z) => z != null) ?? null;
            return (
              <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6, marginBottom: 6 }}>⛰ LOKAL HASLITAL · DRUCKUNTERSCHIEDE (HPA)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "4px 12px", alignItems: "baseline" }}>
                  {zeilen.map((z) => (
                    <div key={z.label} style={{ display: "contents" }}>
                      <span style={{ fontSize: 12, color: TEXT2 }}>{z.label}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: TEXT, textAlign: "right" }}>{z.d.diff == null ? "–" : vorzeichen(z.d.diff)}</span>
                      <span style={{ fontSize: 11, color: TEXT2 }}>{trendWert(z.d.diff, z.d.diffVor3h)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: TEXT3, marginTop: 6 }}>
                  🕒 {zeitLokal(zeit)} Uhr · {alterText(alterMin(zeit))}
                </div>
                <div style={{ fontSize: 10, color: TEXT3, marginTop: 4, lineHeight: 1.5 }}>
                  Positiv = höherer Druck an der erstgenannten Station. Grimsel (1980 m) liefert nur QNH (Reduktion mit Standardatmosphäre) – die absoluten Werte sind dort ungenau, achte vor allem auf die Veränderung. Für diese Paare gibt es keine allgemein anerkannte Föhn-Schwelle. Das Haslital gilt als klassisches Föhntal (Grimsel-Föhn).
                </div>
              </div>
            );
          })()}
          <div style={{ fontSize: 10, color: TEXT3, lineHeight: 1.5, marginBottom: 16 }}>
            Messungen an Talstationen und einzelnen Höhenstationen – der Wind am Startplatz kann deutlich abweichen. Zeiten in Schweizer Ortszeit. Quelle: MeteoSchweiz.
          </div>
        </>
      ) : (
        <p style={{ margin: "0 0 16px", fontSize: 12, color: TEXT2 }}>
          {messGeladen ? "Messwerte sind momentan nicht verfügbar." : "Messwerte werden geladen…"}
        </p>
      )}

      </>
      )}

      {/* Meteogramm Thun mit automatischer Erklärung */}
      <Meteogramm version={ladeVersion} />

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

      {/* Höhenwind */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, marginBottom: 14 }}>
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
        Messwerte: MeteoSchweiz (Open Government Data, CC BY) und Windline. Modell/Prognose: <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" style={{ color: TEXT3 }}>Open-Meteo.com</a>. Farben und Schwellen sind grobe Faustregeln und ersetzen weder ein Wetterbriefing noch die eigene Beurteilung vor Ort.
      </div>
    </div>
  );
}