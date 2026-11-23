"use client";

import { useEffect, useMemo, useState } from "react";
import type { DruckDiff, MesswerteAntwort } from "../lib/messwerte";
import { biseStatus, foehnStatus, vorzeichen, type Status } from "../lib/foehn";
import { DruckUhr } from "./Uhren";

// ── Föhn- und Bise-Analyse (eigene Zeile im Dashboard) ────────────────────
// Je Lage: aktuelle Uhr, Verlauf (−24 h bis +24 h), Rückblick auf die letzten Stunden (Messung)
// und Prognose der nächsten 24 Stunden (Wettermodell, auf die Messung kalibriert).
// Die Texte werden bei jeder Aktualisierung automatisch aus den Daten erzeugt.

const TEXT = "#1f3a5a";
const TEXT2 = "#5b7491";
const TEXT3 = "#8aa0b8";
const RAND = "#cfe0f2";
const GRUEN = "#2e9e5b";
const GELB = "#e0a100";
const ORANGE = "#e07b00";
const ROT = "#d64545";
const BLAU = "#3a6ea5";

const H = 3600000;

type Pt = { t: number; d: number };
type Modell = { foehn: Pt[]; bise: Pt[]; jetzt: number };
type Art = "foehn" | "bise";

// ── Modelldaten (Open-Meteo, Zeiten in UTC) ───────────────────────────────
const LUGANO = { lat: 46.0037, lng: 8.9511 };
const ZUERICH = { lat: 47.3769, lng: 8.5417 };
const GENF = { lat: 46.2381, lng: 6.1089 };
const GOTTMADINGEN = { lat: 47.7374, lng: 8.7754 }; // Ersatz für Güttingen (TG) im Modell

async function ladeModell(): Promise<Modell | null> {
  try {
    const punkte = [LUGANO, ZUERICH, GENF, GOTTMADINGEN];
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${punkte.map((p) => p.lat).join(",")}&longitude=${punkte.map((p) => p.lng).join(",")}` +
      `&hourly=pressure_msl&timezone=GMT&past_days=1&forecast_days=2`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const arr = Array.isArray(json) ? json : [json];
    if (arr.length < 4) return null;
    const zeiten: string[] = arr[0]?.hourly?.time ?? [];
    const druck = arr.map((a) => (a?.hourly?.pressure_msl ?? []) as (number | null)[]);
    if (zeiten.length < 24 || druck.some((d) => d.length !== zeiten.length)) return null;
    const diff = (a: (number | null)[], b: (number | null)[]): Pt[] => {
      const out: Pt[] = [];
      zeiten.forEach((z, i) => {
        const x = a[i];
        const y = b[i];
        if (x != null && y != null) out.push({ t: Date.parse(`${z}:00Z`), d: x - y });
      });
      return out;
    };
    return { foehn: diff(druck[0], druck[1]), bise: diff(druck[3], druck[2]), jetzt: Date.now() };
  } catch {
    return null;
  }
}

// ── Konfiguration je Lage ─────────────────────────────────────────────────
type Cfg = {
  titel: string;
  icon: string;
  sub: string;
  status: (d: number) => Status;
  staerke: (d: number) => number; // Mass für „stärker / schwächer“
  zonen: { von: number; bis: number; farbe: string }[]; // Farbbänder im Diagramm
  linien: number[];
  grundMin: number; // Mindestbereich der y-Achse
  grundMax: number;
};

const CFG: Record<Art, Cfg> = {
  foehn: {
    titel: "Föhn-Analyse",
    icon: "🏔",
    sub: "Druck Lugano − Zürich (+ Südföhn, − Nordföhn)",
    status: (d) => foehnStatus(d),
    staerke: (d) => Math.abs(d),
    zonen: [
      { von: -99, bis: -8, farbe: ROT },
      { von: -8, bis: -4, farbe: ORANGE },
      { von: -4, bis: -2, farbe: GELB },
      { von: -2, bis: 2, farbe: GRUEN },
      { von: 2, bis: 4, farbe: GELB },
      { von: 4, bis: 8, farbe: ORANGE },
      { von: 8, bis: 99, farbe: ROT },
    ],
    linien: [-8, -4, -2, 0, 2, 4, 8],
    grundMin: -5,
    grundMax: 5,
  },
  bise: {
    titel: "Bise-Analyse",
    icon: "🌬",
    sub: "Druck Güttingen − Genf (+ Bise)",
    status: (d) => biseStatus(d),
    staerke: (d) => d,
    zonen: [
      { von: -99, bis: 0, farbe: TEXT3 },
      { von: 0, bis: 2, farbe: GRUEN },
      { von: 2, bis: 4, farbe: GELB },
      { von: 4, bis: 99, farbe: ORANGE },
    ],
    linien: [0, 2, 4],
    grundMin: -2,
    grundMax: 5,
  },
};

// ── Zeit-Helfer ───────────────────────────────────────────────────────────
const ZH = "Europe/Zurich";

function datumZH(ms: number): string {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: ZH });
}

function stundeZH(ms: number): number {
  return Number(new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false, timeZone: ZH }).slice(0, 2));
}

function zeitWort(ms: number, jetzt: number): string {
  const diff = Math.round((Date.parse(`${datumZH(ms)}T12:00:00Z`) - Date.parse(`${datumZH(jetzt)}T12:00:00Z`)) / 86400000);
  const tag = diff === 0 ? "heute" : diff === 1 ? "morgen" : diff === 2 ? "übermorgen" : diff === -1 ? "gestern" : "";
  return `${tag ? tag + " " : ""}${stundeZH(ms)} Uhr`;
}

function interpoliere(pts: Pt[], t: number): number | null {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (t >= a.t && t <= b.t) return b.t === a.t ? a.d : a.d + ((b.d - a.d) * (t - a.t)) / (b.t - a.t);
  }
  return null;
}

// ── Texte ─────────────────────────────────────────────────────────────────
function rueckblick(art: Art, gem: DruckDiff, jetzt: number): string {
  const c = CFG[art];
  const cur = gem.diff;
  if (cur == null) return "Aktuell liegen keine Messwerte vor.";
  const st = c.status(cur);
  const verl = (gem.verlauf ?? []).filter((p) => p.t >= jetzt - 12 * H && p.t <= jetzt).sort((a, b) => a.t - b.t);
  if (verl.length < 2) return `Jetzt ${vorzeichen(cur)} hPa (${st.text}). Für die letzten Stunden liegen zu wenige Messwerte vor.`;

  const start = verl[0];
  const stunden = Math.max(1, Math.round((jetzt - start.t) / H));
  const stStart = c.status(start.d);
  const delta = c.staerke(cur) - c.staerke(start.d);

  let verlauf: string;
  if (art === "foehn" && cur * start.d < 0 && Math.abs(cur) >= 1 && Math.abs(start.d) >= 1) {
    verlauf = `Der Druckunterschied hat das Vorzeichen gewechselt (${start.d > 0 ? "von Süd- zu Nordüberdruck" : "von Nord- zu Südüberdruck"}).`;
  } else if (delta >= 1) {
    verlauf = `Der Unterschied hat sich um ${delta.toFixed(1)} hPa verstärkt.`;
  } else if (delta <= -1) {
    verlauf = `Der Unterschied hat sich um ${Math.abs(delta).toFixed(1)} hPa abgeschwächt.`;
  } else {
    verlauf = "Der Unterschied ist praktisch unverändert geblieben.";
  }

  // Seit wann gilt der aktuelle Zustand?
  let seit: string;
  let i = verl.length - 1;
  while (i >= 0 && c.status(verl[i].d).text === st.text) i--;
  if (i < 0) seit = `Dieser Zustand besteht seit mehr als ${stunden} Stunden.`;
  else if (i === verl.length - 1) seit = "Der Zustand hat sich erst in der letzten Stunde eingestellt.";
  else seit = `„${st.text}“ gilt seit ca. ${zeitWort(verl[i + 1].t, jetzt)}.`;

  // Höchstwert im Fenster
  let peak = verl[0];
  for (const p of verl) if (c.staerke(p.d) > c.staerke(peak.d)) peak = p;
  const peakText = c.staerke(peak.d) - c.staerke(cur) >= 1 ? ` Höchstwert: ${vorzeichen(peak.d)} hPa um ${zeitWort(peak.t, jetzt)}.` : "";

  return `Vor ${stunden} Stunden: ${vorzeichen(start.d)} hPa (${stStart.text}). Jetzt: ${vorzeichen(cur)} hPa (${st.text}). ${verlauf} ${seit}${peakText}`;
}

type Prognose = { text: string; hinweis: string; fut: Pt[]; versatz: number | null };

function prognose(art: Art, gem: DruckDiff, modell: Pt[], jetzt: number): Prognose {
  const c = CFG[art];
  const cur = gem.diff;
  const mJetzt = interpoliere(modell, jetzt);
  const versatz = cur != null && mJetzt != null ? cur - mJetzt : null;
  const off = versatz ?? 0;
  const fut = modell.filter((p) => p.t > jetzt && p.t <= jetzt + 24 * H).map((p) => ({ t: p.t, d: p.d + off }));
  const start = cur ?? (mJetzt != null ? mJetzt + off : null);
  if (fut.length < 6 || start == null) return { text: "Für die nächsten 24 Stunden liegt keine Prognose vor.", hinweis: "", fut: [], versatz };

  const st0 = c.status(start);

  // Zustandswechsel (ein neuer Zustand muss mindestens 2 Stunden gelten)
  const wechsel: { t: number; d: number; text: string }[] = [];
  let aktuell = st0.text;
  for (let i = 0; i < fut.length; i++) {
    const t = c.status(fut[i].d).text;
    const naechster = fut[i + 1] ? c.status(fut[i + 1].d).text : t;
    if (t !== aktuell && naechster === t) {
      wechsel.push({ t: fut[i].t, d: fut[i].d, text: t });
      aktuell = t;
    }
  }

  let peak = fut[0];
  for (const p of fut) if (c.staerke(p.d) > c.staerke(peak.d)) peak = p;
  const ende = fut[fut.length - 1];
  const min = Math.min(...fut.map((p) => p.d));
  const max = Math.max(...fut.map((p) => p.d));

  const teile: string[] = [];
  if (wechsel.length === 0) {
    teile.push(`Die Lage bleibt voraussichtlich bei „${st0.text}“; der Unterschied bewegt sich zwischen ${vorzeichen(min)} und ${vorzeichen(max)} hPa.`);
  } else {
    const kette = wechsel.slice(0, 4).map((w) => `ab ca. ${zeitWort(w.t, jetzt)} ${w.text} (${vorzeichen(w.d)} hPa)`);
    teile.push(`Entwicklung: jetzt „${st0.text}“, ${kette.join(", dann ")}.`);
  }
  const mehr = c.staerke(peak.d) - c.staerke(start);
  if (mehr >= 1) teile.push(`Höhepunkt ca. ${zeitWort(peak.t, jetzt)} mit ${vorzeichen(peak.d)} hPa.`);

  const gesamt = c.staerke(ende.d) - c.staerke(start);
  teile.push(
    gesamt >= 1.5
      ? `Tendenz: verstärkt sich (in 24 h ${vorzeichen(ende.d)} hPa).`
      : gesamt <= -1.5
        ? `Tendenz: schwächt sich ab (in 24 h ${vorzeichen(ende.d)} hPa).`
        : `Tendenz: ungefähr gleichbleibend (in 24 h ${vorzeichen(ende.d)} hPa).`,
  );

  const stPeak = c.status(peak.d);
  const relevant = c.staerke(peak.d) >= 2;
  return { text: teile.join(" "), hinweis: relevant ? stPeak.hinweis : "", fut, versatz };
}

// ── Diagramm: Messung (−24 h … jetzt) und Prognose (jetzt … +24 h) ───────
const W = 360;
const HH = 166;
const ML = 30;
const MR = 8;
const MT = 8;
const MB = 38;

function Verlauf({ art, mess, fut, jetzt, cur }: { art: Art; mess: Pt[]; fut: Pt[]; jetzt: number; cur: number | null }) {
  const c = CFG[art];
  const t0 = jetzt - 24 * H;
  const t1 = jetzt + 24 * H;
  const alle = [...mess.map((p) => p.d), ...fut.map((p) => p.d), ...(cur != null ? [cur] : [])];
  const lo = Math.floor(Math.min(c.grundMin, ...alle) - 0.5);
  const hi = Math.ceil(Math.max(c.grundMax, ...alle) + 0.5);
  const x = (t: number) => ML + ((t - t0) / (t1 - t0)) * (W - ML - MR);
  const y = (v: number) => MT + (1 - (v - lo) / (hi - lo)) * (HH - MT - MB);
  const pfad = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.d).toFixed(1)}`).join(" ");
  const gemessen = [...mess, ...(cur != null ? [{ t: jetzt, d: cur }] : [])];
  const prog = fut.length ? [...(cur != null ? [{ t: jetzt, d: cur }] : []), ...fut] : [];
  const ticks = [
    { t: t0, l: "−24 h" },
    { t: jetzt - 12 * H, l: "−12 h" },
    { t: jetzt, l: "jetzt" },
    { t: jetzt + 12 * H, l: "+12 h" },
    { t: t1, l: "+24 h" },
  ];
  const schritt = hi - lo > 14 ? 4 : 2;
  const yTicks: number[] = [];
  for (let v = Math.ceil(lo / schritt) * schritt; v <= hi; v += schritt) yTicks.push(v);

  return (
    <svg viewBox={`0 0 ${W} ${HH}`} style={{ width: "100%", display: "block" }} role="img" aria-label={`${c.titel}: Verlauf der letzten 24 und nächsten 24 Stunden`}>
      {c.zonen.map((z, i) => {
        const a = Math.max(z.von, lo);
        const b = Math.min(z.bis, hi);
        return b > a ? <rect key={i} x={ML} y={y(b)} width={W - ML - MR} height={y(a) - y(b)} fill={z.farbe} opacity={0.11} /> : null;
      })}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={ML} x2={W - MR} y1={y(v)} y2={y(v)} stroke={RAND} strokeWidth={v === 0 ? 1 : 0.5} />
          <text x={ML - 4} y={y(v) + 3} fontSize="8" textAnchor="end" fill={TEXT3}>{v}</text>
        </g>
      ))}
      {c.linien
        .filter((v) => v !== 0 && v > lo && v < hi)
        .map((v) => (
          <line key={v} x1={ML} x2={W - MR} y1={y(v)} y2={y(v)} stroke={TEXT3} strokeWidth="0.7" strokeDasharray="3 3" />
        ))}
      <rect x={x(jetzt)} y={MT} width={W - MR - x(jetzt)} height={HH - MT - MB} fill="#3355cc" opacity="0.04" />
      <line x1={x(jetzt)} x2={x(jetzt)} y1={MT} y2={HH - MB} stroke="#3355cc" strokeWidth="1.2" strokeDasharray="4 3" />
      {gemessen.length > 1 && <path d={pfad(gemessen)} fill="none" stroke={TEXT} strokeWidth="2.2" strokeLinejoin="round" />}
      {prog.length > 1 && <path d={pfad(prog)} fill="none" stroke={BLAU} strokeWidth="2" strokeDasharray="5 3" strokeLinejoin="round" />}
      {cur != null && <circle cx={x(jetzt)} cy={y(cur)} r="3.5" fill={c.status(cur).farbe} stroke="#fff" strokeWidth="1.2" />}
      {ticks.map((tk, i) => (
        <text
          key={tk.l}
          x={x(tk.t)}
          y={HH - MB + 12}
          fontSize="8.5"
          textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
          fill={tk.l === "jetzt" ? "#3355cc" : TEXT2}
          fontWeight={tk.l === "jetzt" ? 700 : 400}
        >
          {tk.l}
        </text>
      ))}
      <line x1={ML} x2={ML + 18} y1={HH - 7} y2={HH - 7} stroke={TEXT} strokeWidth="2.2" />
      <text x={ML + 22} y={HH - 4} fontSize="8" fill={TEXT2}>Messung</text>
      <line x1={ML + 72} x2={ML + 90} y1={HH - 7} y2={HH - 7} stroke={BLAU} strokeWidth="2" strokeDasharray="4 2" />
      <text x={ML + 94} y={HH - 4} fontSize="8" fill={TEXT2}>Modell (auf Messung kalibriert) · hPa</text>
    </svg>
  );
}

// ── Karte je Lage ─────────────────────────────────────────────────────────
function Karte({ art, gem, modell, jetzt }: { art: Art; gem: DruckDiff; modell: Pt[] | null; jetzt: number }) {
  const c = CFG[art];
  const cur = gem.diff;
  const st = cur != null ? c.status(cur) : null;
  const rueck = useMemo(() => rueckblick(art, gem, jetzt), [art, gem, jetzt]);
  const prog = useMemo(() => (modell ? prognose(art, gem, modell, jetzt) : null), [art, gem, modell, jetzt]);
  const gemVerlauf = useMemo(() => (gem.verlauf ?? []).filter((p) => p.t >= jetzt - 24 * H && p.t <= jetzt), [gem, jetzt]);
  const farbe = st?.farbe ?? TEXT3;

  return (
    <div style={{ background: "#fff", border: `1px solid ${RAND}`, borderTop: `4px solid ${farbe}`, borderRadius: 14, padding: 10, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: TEXT }}>
        {c.icon} {c.titel}
      </div>
      <div style={{ fontSize: 10, color: TEXT3, marginBottom: 4 }}>{c.sub}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <DruckUhr wert={cur} bereich={10} farbeFuer={(v) => c.status(v).farbe} size={96} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: farbe }}>● {st ? st.text : "keine Daten"}</div>
          {st && cur != null && <div style={{ fontSize: 11, color: TEXT2, maxWidth: 220 }}>{st.hinweis}</div>}
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        <Verlauf art={art} mess={gemVerlauf} fut={prog?.fut ?? []} jetzt={jetzt} cur={cur} />
      </div>

      <div style={{ fontSize: 11, fontWeight: 800, color: TEXT2, letterSpacing: 0.4, marginTop: 6 }}>⏪ LETZTE STUNDEN</div>
      <p style={{ margin: "2px 0 6px", fontSize: 12, lineHeight: 1.5, color: TEXT }}>{rueck}</p>

      <div style={{ fontSize: 11, fontWeight: 800, color: TEXT2, letterSpacing: 0.4 }}>⏩ PROGNOSE NÄCHSTE 24 STUNDEN</div>
      <p style={{ margin: "2px 0 4px", fontSize: 12, lineHeight: 1.5, color: TEXT }}>
        {prog ? prog.text : "Prognose wird geladen…"}
      </p>
      {prog && prog.hinweis && <p style={{ margin: "0 0 4px", fontSize: 11, lineHeight: 1.5, color: TEXT2 }}>Bedeutung: {prog.hinweis}</p>}
      {prog && (
        <p style={{ margin: 0, fontSize: 10, lineHeight: 1.4, color: TEXT3 }}>
          Wettermodell Open-Meteo{art === "bise" ? " (Modellpunkt Gottmadingen statt Güttingen)" : ""}
          {prog.versatz != null ? `, Versatz zur Messung ${vorzeichen(prog.versatz)} hPa ausgeglichen` : ", nicht auf Messung kalibriert"}. Unsicherheit ca. ±1–2 hPa.
          {prog.versatz != null && Math.abs(prog.versatz) > 3 ? " Achtung: Modell und Messung weichen stark ab – Prognose mit Vorsicht lesen." : ""}
        </p>
      )}
    </div>
  );
}

// ── Zeile ─────────────────────────────────────────────────────────────────
export default function FoehnBise({ mess, version, zeigeFoehn, zeigeBise }: { mess: MesswerteAntwort; version: number; zeigeFoehn: boolean; zeigeBise: boolean }) {
  const [modell, setModell] = useState<Modell | null>(null);

  useEffect(() => {
    let aktiv = true;
    ladeModell().then((m) => {
      if (aktiv && m) setModell(m);
    });
    return () => {
      aktiv = false;
    };
  }, [version]);

  // „Jetzt“: Zeitpunkt des Modellabrufs; ohne Modell die Zeit der letzten Messung
  const zeitMess = mess.foehn?.zeit ? Date.parse(mess.foehn.zeit) : NaN;
  const jetzt = modell ? modell.jetzt : Number.isNaN(zeitMess) ? 0 : zeitMess;

  if (!zeigeFoehn && !zeigeBise) return null;
  if (!jetzt) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6, marginBottom: 8 }}>🏔 FÖHN & BISE · ANALYSE UND PROGNOSE</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 8, alignItems: "start" }}>
        {zeigeFoehn && mess.foehn && <Karte art="foehn" gem={mess.foehn} modell={modell?.foehn ?? null} jetzt={jetzt} />}
        {zeigeBise && mess.bise && <Karte art="bise" gem={mess.bise} modell={modell?.bise ?? null} jetzt={jetzt} />}
      </div>
      <div style={{ fontSize: 10, color: TEXT3, lineHeight: 1.5, marginTop: 6 }}>
        Rückblick aus den MeteoSchweiz-Messwerten, Prognose aus dem Wettermodell. Schwellen sind Erfahrungswerte (Föhn ab ca. 4 hPa in den Tälern, Bise ab ca. 2–4 hPa) – keine Flugfreigabe.
      </div>
    </div>
  );
}
