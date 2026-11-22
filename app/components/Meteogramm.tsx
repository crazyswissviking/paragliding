"use client";

import { useEffect, useMemo, useState } from "react";

// ── Meteogramm Thun ───────────────────────────────────────────────────────
// Zeigt Wolken, Temperatur, Niederschlag, Wind und Luftdruck für Thun (Open-Meteo)
// und erzeugt bei jedem Laden automatisch eine Erklärung, was man gerade sieht.

const THUN = { name: "Thun", lat: 46.758, lng: 7.628 };

const TEXT = "#1f3a5a";
const TEXT2 = "#5b7491";
const TEXT3 = "#8aa0b8";
const RAND = "#cfe0f2";
const BLAU = "#3a6ea5";
const ORANGE = "#e07b00";
const ROT = "#d64545";

type Zahl = number | null;

type Std = {
  time: string[];
  temperature_2m: Zahl[];
  precipitation: Zahl[];
  precipitation_probability: Zahl[];
  cloud_cover: Zahl[];
  cloud_cover_low: Zahl[];
  cloud_cover_mid: Zahl[];
  cloud_cover_high: Zahl[];
  wind_speed_10m: Zahl[];
  wind_gusts_10m: Zahl[];
  wind_direction_10m: Zahl[];
  pressure_msl: Zahl[];
  freezing_level_height: Zahl[];
  cape: Zahl[];
  is_day: Zahl[];
};

const FELDER: (keyof Std)[] = [
  "temperature_2m", "precipitation", "precipitation_probability", "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high",
  "wind_speed_10m", "wind_gusts_10m", "wind_direction_10m", "pressure_msl", "freezing_level_height", "cape", "is_day",
];

type Geladen = { std: Std; jetzt: number; stand: string };

// ── Daten ─────────────────────────────────────────────────────────────────
async function ladeMeteogramm(): Promise<Geladen | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${THUN.lat}&longitude=${THUN.lng}` +
      `&hourly=temperature_2m,precipitation,precipitation_probability,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,` +
      `wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,freezing_level_height,cape,is_day` +
      `&wind_speed_unit=kmh&timezone=Europe%2FZurich&past_days=1&forecast_days=4`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const std = json.hourly as Std | undefined;
    if (!std || !Array.isArray(std.time) || std.time.length < 24) return null;
    // Alle benötigten Reihen müssen vorhanden sein – sonst Meteogramm ausblenden statt abstürzen
    for (const k of FELDER) {
      const reihe = std[k];
      if (!Array.isArray(reihe) || reihe.length !== std.time.length) return null;
    }
    return { std, jetzt: indexJetzt(std.time), stand: standText() };
  } catch {
    return null;
  }
}

// Zeiten der API sind Schweizer Ortszeit ("2026-11-22T14:00")
function indexJetzt(zeiten: string[]): number {
  const d = new Date();
  const datum = d.toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" });
  const stunde = d.toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Zurich" }).slice(0, 2);
  const ziel = `${datum}T${stunde}:00`;
  const i = zeiten.indexOf(ziel);
  return i >= 0 ? i : Math.min(24, zeiten.length - 1);
}

function standText(): string {
  return new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────
const RICHTUNGEN = ["Nord", "Nordnordost", "Nordost", "Ostnordost", "Ost", "Ostsüdost", "Südost", "Südsüdost", "Süd", "Südsüdwest", "Südwest", "Westsüdwest", "West", "Westnordwest", "Nordwest", "Nordnordwest"];

function richtungWort(grad: Zahl): string {
  if (grad == null) return "unbekannter Richtung";
  return RICHTUNGEN[Math.round((((grad % 360) + 360) % 360) / 22.5) % 16];
}

function zahlen(arr: Zahl[], von: number, bis: number): number[] {
  return arr.slice(von, bis).filter((v): v is number => v != null);
}

function mittel(a: number[]): number | null {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
}

function stundeVon(zeit: string): number {
  return Number(zeit.slice(11, 13));
}

function datumVon(zeit: string): string {
  return zeit.slice(0, 10);
}

function wochentag(datum: string): string {
  return new Date(`${datum}T12:00:00`).toLocaleDateString("de-CH", { weekday: "short", timeZone: "Europe/Zurich" }).replace(".", "");
}

function tagText(datum: string, heute: string): string {
  const diff = Math.round((Date.parse(`${datum}T12:00:00Z`) - Date.parse(`${heute}T12:00:00Z`)) / 86400000);
  if (diff === 0) return "heute";
  if (diff === 1) return "morgen";
  if (diff === 2) return "übermorgen";
  return wochentag(datum);
}

// Längste zusammenhängende Folge von Stunden, für die test() wahr ist
function laengsterLauf(von: number, bis: number, test: (i: number) => boolean): [number, number] | null {
  let best: [number, number] | null = null;
  let start = -1;
  for (let i = von; i <= bis; i++) {
    const ok = i < bis && test(i);
    if (ok && start < 0) start = i;
    if (!ok && start >= 0) {
      if (!best || i - start > best[1] - best[0]) best = [start, i];
      start = -1;
    }
  }
  return best;
}

function bereichText(std: Std, lauf: [number, number], heute: string): string {
  const t0 = datumVon(std.time[lauf[0]]);
  const t1 = datumVon(std.time[lauf[1] - 1]);
  const a = stundeVon(std.time[lauf[0]]);
  const b = stundeVon(std.time[lauf[1] - 1]) + 1;
  if (t0 === t1) return `${tagText(t0, heute)} ${a}–${b} Uhr`;
  return `${tagText(t0, heute)} ${a} Uhr bis ${tagText(t1, heute)} ${b % 24} Uhr`;
}

// Temperatur mit echtem Minuszeichen
function grad(v: number): string {
  return `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)} °C`;
}

// ── Erklärung (automatisch aus den Daten) ─────────────────────────────────
type Punkt = { icon: string; titel: string; text: string };

function erklaere(std: Std, jetzt: number): Punkt[] {
  const n = std.time.length;
  const von = jetzt;
  const bis = Math.min(n, jetzt + 24);
  const heute = datumVon(std.time[jetzt]);
  const punkte: Punkt[] = [];

  // 1) Himmel / Wolken
  {
    const tag: number[] = [];
    for (let i = von; i < bis; i++) if (std.is_day[i] === 1 && std.cloud_cover[i] != null) tag.push(i);
    if (tag.length >= 2) {
      const ges = mittel(tag.map((i) => std.cloud_cover[i] as number)) ?? 0;
      const tief = mittel(tag.map((i) => std.cloud_cover_low[i] ?? 0)) ?? 0;
      const mitt = mittel(tag.map((i) => std.cloud_cover_mid[i] ?? 0)) ?? 0;
      const hoch = mittel(tag.map((i) => std.cloud_cover_high[i] ?? 0)) ?? 0;
      const wort = ges < 15 ? "wolkenlos bis sonnig" : ges < 40 ? "meist sonnig" : ges < 70 ? "wechselnd bewölkt" : ges < 90 ? "überwiegend bewölkt" : "bedeckt";
      let schicht = "";
      if (ges >= 40) {
        if (tief >= mitt && tief >= hoch && tief >= 50) schicht = " Es sind vor allem tiefe Wolken – in tiefen Lagen kann es neblig oder trüb bleiben, weiter oben ist es oft heller.";
        else if (hoch >= tief && hoch >= mitt && tief < 30) schicht = " Es sind vor allem hohe Wolken (Schleierwolken): die Sonne scheint abgeschwächt durch.";
        else if (mitt >= tief && mitt >= hoch) schicht = " Es sind vor allem mittelhohe Wolken – oft ein Zeichen für feuchtere Luft, die aufzieht oder abzieht.";
      }
      const sonnig = laengsterLauf(von, bis, (i) => std.is_day[i] === 1 && (std.cloud_cover[i] ?? 100) < 30);
      const sonne = sonnig && sonnig[1] - sonnig[0] >= 2 ? ` Sonnigste Phase: ${bereichText(std, sonnig, heute)}.` : "";
      punkte.push({ icon: "☁️", titel: "Wolken", text: `Tagsüber ${wort} (Ø ${Math.round(ges)} % Bedeckung; hoch ${Math.round(hoch)} %, mittel ${Math.round(mitt)} %, tief ${Math.round(tief)} %).${schicht}${sonne}` });
    } else {
      const ges = mittel(zahlen(std.cloud_cover, von, bis));
      if (ges != null) punkte.push({ icon: "☁️", titel: "Wolken", text: `In den nächsten Stunden Ø ${Math.round(ges)} % Bedeckung (im Meteogramm die drei grauen Streifen: hohe, mittlere und tiefe Wolken – je dunkler, desto dichter).` });
    }
  }

  // 2) Temperatur & Nullgradgrenze
  {
    const t = zahlen(std.temperature_2m, von, bis);
    if (t.length) {
      const tmin = Math.min(...t);
      const tmax = Math.max(...t);
      let imin = von;
      let imax = von;
      for (let i = von; i < bis; i++) {
        const v = std.temperature_2m[i];
        if (v == null) continue;
        if (v === tmin) imin = i;
        if (v === tmax) imax = i;
      }
      const nul = zahlen(std.freezing_level_height, von, bis);
      let nulText = "";
      if (nul.length) {
        const a = Math.round(Math.min(...nul) / 50) * 50;
        const b = Math.round(Math.max(...nul) / 50) * 50;
        nulText = ` Die Nullgradgrenze liegt ${a === b ? `bei ca. ${a} m` : `zwischen ca. ${a} und ${b} m`} – darüber ist es unter 0 °C (zum Vergleich: Niederhorn 1950 m).`;
      }
      const frost = tmin <= 0 ? " Es gibt Frost – Wege und Startplätze können vereist sein." : "";
      punkte.push({
        icon: "🌡",
        titel: "Temperatur",
        text: `Zwischen ${grad(tmin)} (${tagText(datumVon(std.time[imin]), heute)} ${stundeVon(std.time[imin])} Uhr) und ${grad(tmax)} (${tagText(datumVon(std.time[imax]), heute)} ${stundeVon(std.time[imax])} Uhr).${frost}${nulText}`,
      });
    }
  }

  // 3) Niederschlag
  {
    const p = zahlen(std.precipitation, von, bis);
    const summe = p.reduce((s, v) => s + v, 0);
    const wahr = zahlen(std.precipitation_probability, von, bis);
    const wMax = wahr.length ? Math.max(...wahr) : null;
    if (summe < 0.2) {
      punkte.push({ icon: "☂️", titel: "Niederschlag", text: `Trocken – die blauen Balken bleiben praktisch leer${wMax != null ? ` (höchste Niederschlagswahrscheinlichkeit ${Math.round(wMax)} %)` : ""}.` });
    } else {
      const nass = laengsterLauf(von, bis, (i) => (std.precipitation[i] ?? 0) >= 0.1);
      const tn = zahlen(std.temperature_2m.map((v, i) => ((std.precipitation[i] ?? 0) >= 0.1 ? v : null)), von, bis);
      const tNass = tn.length ? Math.min(...tn) : null;
      const art = tNass == null ? "Niederschlag" : tNass <= 0.5 ? "Schnee" : tNass <= 2 ? "Schneeregen oder Schnee" : "Regen";
      let stark = "";
      const pmax = Math.max(...p);
      if (pmax >= 2) stark = ` Am intensivsten mit bis zu ${pmax.toFixed(1)} mm pro Stunde.`;
      punkte.push({
        icon: art.startsWith("Schnee") ? "❄️" : "🌧",
        titel: "Niederschlag",
        text: `${art}, insgesamt ca. ${summe.toFixed(1)} mm in 24 h${nass ? `, zusammenhängend ${bereichText(std, nass, heute)}` : ""}.${stark}${wMax != null ? ` Wahrscheinlichkeit bis ${Math.round(wMax)} %.` : ""}`,
      });
    }
  }

  // 4) Wind
  {
    const w = zahlen(std.wind_speed_10m, von, bis);
    const b = zahlen(std.wind_gusts_10m, von, bis);
    if (w.length && b.length) {
      const wmax = Math.max(...w);
      const bmax = Math.max(...b);
      let iw = von;
      for (let i = von; i < bis; i++) if (std.wind_speed_10m[i] === wmax) iw = i;
      let ib = von;
      for (let i = von; i < bis; i++) if (std.wind_gusts_10m[i] === bmax) ib = i;
      const stufe = wmax > 25 || bmax > 38 ? "kräftig" : wmax > 15 || bmax > 28 ? "mässig bis böig" : "schwach";
      const hint =
        stufe === "kräftig"
          ? " Das ist für Gleitschirmfliegen klar zu viel."
          : stufe === "mässig bis böig"
            ? " Das ist grenzwertig – vor allem bei böigen Verhältnissen vorsichtig sein."
            : " Das ist ruhig; die Windlinie bleibt im grünen Bereich.";
      punkte.push({
        icon: "💨",
        titel: "Wind",
        text: `Der Wind ist ${stufe}: Spitze ${Math.round(wmax)} km/h um ${tagText(datumVon(std.time[iw]), heute)} ${stundeVon(std.time[iw])} Uhr (aus ${richtungWort(std.wind_direction_10m[iw])}), Böen bis ${Math.round(bmax)} km/h (${tagText(datumVon(std.time[ib]), heute)} ${stundeVon(std.time[ib])} Uhr).${hint} Die Pfeile unter dem Windfeld zeigen, wohin der Wind weht.`,
      });
    }
  }

  // 5) Luftdruck
  {
    const p0 = std.pressure_msl[jetzt];
    const p12 = std.pressure_msl[Math.min(n - 1, jetzt + 12)];
    if (p0 != null && p12 != null) {
      const d = p12 - p0;
      const text =
        d <= -3
          ? "Der Druck fällt deutlich – das deutet auf eine Wetterverschlechterung oder eine heranziehende Front hin, oft mit zunehmendem Wind."
          : d >= 3
            ? "Der Druck steigt deutlich – das Wetter beruhigt sich meist, es klart auf."
            : "Der Druck bleibt ziemlich stabil – keine grosse Wetterumstellung in den nächsten 12 Stunden.";
      punkte.push({ icon: "🧭", titel: "Luftdruck", text: `Jetzt ${Math.round(p0)} hPa, in 12 Stunden ${Math.round(p12)} hPa (${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d).toFixed(1)}). ${text}` });
    }
  }

  // 6) Gewitter (nur wenn relevant)
  {
    const c = zahlen(std.cape, von, bis);
    if (c.length && Math.max(...c) >= 500) {
      punkte.push({ icon: "⛈", titel: "Gewitter", text: `Die Labilität (CAPE) steigt bis ${Math.round(Math.max(...c))} J/kg – Gewitterneigung, im Zweifel nicht fliegen.` });
    }
  }

  // 7) Flug-Fazit (Faustregel, KEINE Freigabe)
  {
    const ok = (i: number) => std.is_day[i] === 1 && (std.wind_speed_10m[i] ?? 99) <= 15 && (std.wind_gusts_10m[i] ?? 99) <= 28 && (std.precipitation[i] ?? 0) < 0.1;
    const lauf = laengsterLauf(von, bis, ok);
    if (lauf && lauf[1] - lauf[0] >= 2) {
      punkte.push({ icon: "🪂", titel: "Flug-Fazit (Modell)", text: `Ruhigstes Fenster am Tag: ${bereichText(std, lauf, heute)} – Wind ≤ 15 km/h, Böen ≤ 28 km/h, trocken. Das gilt für Thun im Tal, am Startplatz kann es anders sein.` });
    } else {
      let wind = 0;
      let boe = 0;
      let nass = 0;
      let tag = 0;
      for (let i = von; i < bis; i++) {
        if (std.is_day[i] !== 1) continue;
        tag++;
        if ((std.wind_speed_10m[i] ?? 0) > 15) wind++;
        if ((std.wind_gusts_10m[i] ?? 0) > 28) boe++;
        if ((std.precipitation[i] ?? 0) >= 0.1) nass++;
      }
      const grund = [wind ? "Wind über 15 km/h" : "", boe ? "Böen über 28 km/h" : "", nass ? "Niederschlag" : ""].filter(Boolean).join(", ");
      punkte.push({
        icon: "🪂",
        titel: "Flug-Fazit (Modell)",
        text: tag === 0 ? "In den nächsten Stunden ist es dunkel – kein Flugfenster." : `Im Modell gibt es keinen ruhigen, trockenen Zeitraum von mindestens 2 Stunden am Tag${grund ? ` (${grund})` : ""}.`,
      });
    }
  }

  // 8) Ausblick auf die nächsten Tage
  {
    const tage: string[] = [];
    for (let i = jetzt; i < n; i++) {
      const d = datumVon(std.time[i]);
      if (d !== heute && !tage.includes(d)) tage.push(d);
    }
    const zeilen: string[] = [];
    for (const d of tage.slice(0, 2)) {
      const idx: number[] = [];
      std.time.forEach((z, i) => {
        if (datumVon(z) === d) idx.push(i);
      });
      if (idx.length < 20) continue;
      const a = idx[0];
      const e = idx[idx.length - 1] + 1;
      const t = zahlen(std.temperature_2m, a, e);
      const p = zahlen(std.precipitation, a, e).reduce((s, v) => s + v, 0);
      const bo = zahlen(std.wind_gusts_10m, a, e);
      const wk = mittel(zahlen(std.cloud_cover, a, e));
      if (!t.length) continue;
      zeilen.push(
        `${tagText(d, heute)} (${wochentag(d)}): ${Math.round(Math.min(...t))}…${Math.round(Math.max(...t))} °C, ${p < 0.2 ? "trocken" : `${p.toFixed(1)} mm Niederschlag`}, Ø ${wk == null ? "–" : Math.round(wk)} % Wolken, Böen bis ${bo.length ? Math.round(Math.max(...bo)) : "–"} km/h`,
      );
    }
    if (zeilen.length) punkte.push({ icon: "📅", titel: "Ausblick", text: zeilen.join(" · ") });
  }

  return punkte;
}

// ── Zeichnen ──────────────────────────────────────────────────────────────
const BREITE = 600;
const L = 40;
const R = 10;
const PLOT = BREITE - L - R;

const Y = {
  tage: 12,
  wolkenTitel: 28,
  wolken: 32,
  tempTitel: 82,
  temp: 86,
  nsTitel: 186,
  ns: 190,
  windTitel: 252,
  wind: 256,
  pfeile: 366,
  druckTitel: 392,
  druck: 396,
  achse: 468,
  hoehe: 480,
};
const H = { wolken: 36, temp: 84, ns: 48, wind: 96, druck: 56 };

function skala(wert: number, min: number, max: number, top: number, hoehe: number): number {
  const f = max === min ? 0.5 : (wert - min) / (max - min);
  return top + hoehe - f * hoehe;
}

function linie(werte: Zahl[], x: (i: number) => number, y: (v: number) => number): string {
  let d = "";
  let offen = false;
  werte.forEach((v, i) => {
    if (v == null) {
      offen = false;
      return;
    }
    d += `${offen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    offen = true;
  });
  return d;
}

function Diagramm({ std, jetzt, stunden }: { std: Std; jetzt: number; stunden: number }) {
  const start = Math.max(0, jetzt - 3);
  const ende = Math.min(std.time.length, jetzt + stunden);
  const n = ende - start;
  const sl = <T,>(a: T[]) => a.slice(start, ende);
  const zeit = sl(std.time);
  const bw = PLOT / n;
  const x = (i: number) => L + (i + 0.5) * bw;
  const xJetzt = x(jetzt - start);

  const temp = sl(std.temperature_2m);
  const tw = temp.filter((v): v is number => v != null);
  const tLo = Math.floor(Math.min(...tw) - 1);
  const tHi = Math.ceil(Math.max(...tw) + 1);
  const yT = (v: number) => skala(v, tLo, tHi, Y.temp, H.temp);

  const ns = sl(std.precipitation);
  const nsMax = Math.max(1, ...ns.map((v) => v ?? 0));
  const nsTop = Math.ceil(nsMax);
  const wahr = sl(std.precipitation_probability);

  const wind = sl(std.wind_speed_10m);
  const boeen = sl(std.wind_gusts_10m);
  const wMaxRoh = Math.max(30, ...boeen.map((v) => v ?? 0), ...wind.map((v) => v ?? 0));
  const wMax = Math.ceil(wMaxRoh / 10) * 10;
  const yW = (v: number) => skala(v, 0, wMax, Y.wind, H.wind);

  const druck = sl(std.pressure_msl);
  const dw = druck.filter((v): v is number => v != null);
  const dMin = Math.floor(Math.min(...dw) - 1);
  const dMax = Math.ceil(Math.max(...dw) + 1);
  const yD = (v: number) => skala(v, dMin, dMax, Y.druck, H.druck);

  const nacht = sl(std.is_day);
  const tief = sl(std.cloud_cover_low);
  const mitt = sl(std.cloud_cover_mid);
  const hoch = sl(std.cloud_cover_high);
  const richt = sl(std.wind_direction_10m);

  // Extremwerte beschriften
  let iTmax = -1;
  let iTmin = -1;
  temp.forEach((v, i) => {
    if (v == null) return;
    if (iTmax < 0 || v > (temp[iTmax] as number)) iTmax = i;
    if (iTmin < 0 || v < (temp[iTmin] as number)) iTmin = i;
  });

  const tageKopf: { i: number; text: string }[] = [];
  zeit.forEach((z, i) => {
    if (stundeVon(z) === 0 || i === 0) tageKopf.push({ i, text: `${wochentag(datumVon(z))} ${z.slice(8, 10)}.${z.slice(5, 7)}.` });
  });

  const gesamtH = Y.hoehe;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${BREITE} ${gesamtH}`} style={{ width: "100%", minWidth: 560, display: "block" }} role="img" aria-label={`Meteogramm ${THUN.name}`}>
        {/* Nacht */}
        {nacht.map((v, i) =>
          v === 0 ? <rect key={`n${i}`} x={L + i * bw} y={Y.tage + 2} width={bw + 0.5} height={Y.druck + H.druck - Y.tage - 2} fill="#dfe8f4" opacity="0.65" /> : null,
        )}

        {/* Tageskopf + Trennlinien um Mitternacht */}
        {tageKopf.map((t) => (
          <g key={t.i}>
            <text x={L + t.i * bw + 3} y={Y.tage - 2} fontSize="9.5" fontWeight="700" fill={TEXT2}>
              {t.text}
            </text>
            {t.i > 0 && <line x1={L + t.i * bw} x2={L + t.i * bw} y1={Y.tage} y2={Y.druck + H.druck} stroke={TEXT3} strokeWidth="0.8" strokeDasharray="2 3" />}
          </g>
        ))}

        {/* ── Wolken ── */}
        <text x={L} y={Y.wolkenTitel} fontSize="9" fontWeight="700" fill={TEXT2}>WOLKEN (hoch · mittel · tief)</text>
        {[
          { daten: hoch, name: "hoch" },
          { daten: mitt, name: "mittel" },
          { daten: tief, name: "tief" },
        ].map((reihe, k) => (
          <g key={reihe.name}>
            <rect x={L} y={Y.wolken + k * 12} width={PLOT} height={11} fill="#f2f7fc" stroke={RAND} strokeWidth="0.5" />
            {reihe.daten.map((v, i) => (
              <rect key={i} x={L + i * bw} y={Y.wolken + k * 12} width={bw + 0.4} height={11} fill="#6b7f95" opacity={Math.min(0.9, (v ?? 0) / 100)} />
            ))}
            <text x={L - 4} y={Y.wolken + k * 12 + 8.5} fontSize="8" textAnchor="end" fill={TEXT3}>{reihe.name}</text>
          </g>
        ))}

        {/* ── Temperatur ── */}
        <text x={L} y={Y.tempTitel} fontSize="9" fontWeight="700" fill={TEXT2}>TEMPERATUR °C</text>
        {(() => {
          const lo = tLo;
          const hi = tHi;
          const schritt = hi - lo > 14 ? 5 : hi - lo > 6 ? 2 : 1;
          const ticks: number[] = [];
          for (let v = Math.ceil(lo / schritt) * schritt; v <= hi; v += schritt) ticks.push(v);
          return ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={L + PLOT} y1={yT(v)} y2={yT(v)} stroke={v === 0 ? BLAU : RAND} strokeWidth={v === 0 ? 1.1 : 0.6} strokeDasharray={v === 0 ? "4 3" : undefined} />
              <text x={L - 4} y={yT(v) + 3} fontSize="8" textAnchor="end" fill={v === 0 ? BLAU : TEXT3}>{v}</text>
            </g>
          ));
        })()}
        <path d={linie(temp, x, yT)} fill="none" stroke={ROT} strokeWidth="2" strokeLinejoin="round" />
        {iTmax >= 0 && (
          <text x={x(iTmax)} y={yT(temp[iTmax] as number) - 5} fontSize="9" fontWeight="700" textAnchor="middle" fill={ROT}>{Math.round(temp[iTmax] as number)}°</text>
        )}
        {iTmin >= 0 && iTmin !== iTmax && (
          <text x={x(iTmin)} y={yT(temp[iTmin] as number) + 12} fontSize="9" fontWeight="700" textAnchor="middle" fill={BLAU}>{Math.round(temp[iTmin] as number)}°</text>
        )}

        {/* ── Niederschlag ── */}
        <text x={L} y={Y.nsTitel} fontSize="9" fontWeight="700" fill={TEXT2}>NIEDERSCHLAG mm/h · Wahrscheinlichkeit (gestrichelt)</text>
        <rect x={L} y={Y.ns} width={PLOT} height={H.ns} fill="#f7fbff" stroke={RAND} strokeWidth="0.5" />
        {ns.map((v, i) => {
          const h = ((v ?? 0) / nsTop) * H.ns;
          return h > 0.3 ? <rect key={i} x={L + i * bw + 0.6} y={Y.ns + H.ns - h} width={Math.max(1, bw - 1.2)} height={h} fill={BLAU} rx="1" /> : null;
        })}
        <path d={linie(wahr, x, (v) => Y.ns + H.ns - (v / 100) * H.ns)} fill="none" stroke={TEXT3} strokeWidth="1" strokeDasharray="3 2" />
        <text x={L - 4} y={Y.ns + 8} fontSize="8" textAnchor="end" fill={TEXT3}>{nsTop}</text>
        <text x={L - 4} y={Y.ns + H.ns} fontSize="8" textAnchor="end" fill={TEXT3}>0</text>

        {/* ── Wind ── */}
        <text x={L} y={Y.windTitel} fontSize="9" fontWeight="700" fill={TEXT2}>WIND km/h · Böen (orange) · Pfeile = Windrichtung</text>
        <rect x={L} y={yW(Math.min(15, wMax))} width={PLOT} height={Y.wind + H.wind - yW(Math.min(15, wMax))} fill="#2e9e5b" opacity="0.09" />
        <rect x={L} y={yW(Math.min(25, wMax))} width={PLOT} height={yW(Math.min(15, wMax)) - yW(Math.min(25, wMax))} fill="#e0a100" opacity="0.1" />
        {wMax > 25 && <rect x={L} y={Y.wind} width={PLOT} height={yW(25) - Y.wind} fill="#d64545" opacity="0.08" />}
        {Array.from({ length: wMax / 10 + 1 }, (_, k) => k * 10).map((v) => (
          <g key={v}>
            <line x1={L} x2={L + PLOT} y1={yW(v)} y2={yW(v)} stroke={RAND} strokeWidth="0.6" />
            <text x={L - 4} y={yW(v) + 3} fontSize="8" textAnchor="end" fill={TEXT3}>{v}</text>
          </g>
        ))}
        <path d={linie(boeen, x, yW)} fill="none" stroke={ORANGE} strokeWidth="1.5" strokeDasharray="4 2" />
        <path d={linie(wind, x, yW)} fill="none" stroke={BLAU} strokeWidth="2.2" strokeLinejoin="round" />
        {richt.map((g, i) =>
          g != null && (start + i) % 3 === 0 ? (
            <g key={i} transform={`translate(${x(i).toFixed(1)} ${Y.pfeile + 4}) rotate(${g + 180})`}>
              <path d="M0 -6 L4 5 L0 2.5 L-4 5 Z" fill={BLAU} opacity="0.85" />
            </g>
          ) : null,
        )}

        {/* ── Luftdruck ── */}
        <text x={L} y={Y.druckTitel} fontSize="9" fontWeight="700" fill={TEXT2}>LUFTDRUCK hPa (auf Meereshöhe)</text>
        <rect x={L} y={Y.druck} width={PLOT} height={H.druck} fill="#f7fbff" stroke={RAND} strokeWidth="0.5" />
        <path d={linie(druck, x, yD)} fill="none" stroke={TEXT} strokeWidth="2" strokeLinejoin="round" />
        <text x={L - 4} y={Y.druck + 8} fontSize="8" textAnchor="end" fill={TEXT3}>{dMax}</text>
        <text x={L - 4} y={Y.druck + H.druck} fontSize="8" textAnchor="end" fill={TEXT3}>{dMin}</text>

        {/* ── Jetzt-Marker ── */}
        <line x1={xJetzt} x2={xJetzt} y1={Y.tage} y2={Y.druck + H.druck} stroke="#3355cc" strokeWidth="1.4" strokeDasharray="4 3" />
        <circle cx={xJetzt} cy={Y.tage} r="3" fill="#3355cc" />
        <text x={xJetzt} y={Y.hoehe - 2} fontSize="9" fontWeight="700" textAnchor="middle" fill="#3355cc" stroke="#fff" strokeWidth="3" style={{ paintOrder: "stroke" }}>jetzt</text>

        {/* ── Zeitachse ── */}
        {zeit.map((z, i) =>
          stundeVon(z) % 6 === 0 ? (
            <text key={i} x={x(i)} y={Y.achse} fontSize="9" textAnchor="middle" fill={TEXT2}>{String(stundeVon(z)).padStart(2, "0")}</text>
          ) : null,
        )}
        <text x={L + PLOT} y={Y.hoehe - 2} fontSize="8" textAnchor="end" fill={TEXT3}>Uhrzeit (Ortszeit) · graue Flächen = Nacht</text>
      </svg>
    </div>
  );
}

// ── Komponente ────────────────────────────────────────────────────────────
// `version` wird von der Hauptkomponente bei jeder Aktualisierung erhöht → Daten und Erklärung werden neu erzeugt.
export default function Meteogramm({ version }: { version: number }) {
  const [daten, setDaten] = useState<Geladen | null>(null);
  const [fehler, setFehler] = useState(false);
  const [stunden, setStunden] = useState(48);

  useEffect(() => {
    let aktiv = true;
    ladeMeteogramm().then((g) => {
      if (!aktiv) return;
      if (g) {
        setDaten(g);
        setFehler(false);
      } else {
        setFehler(true);
      }
    });
    return () => {
      aktiv = false;
    };
  }, [version]);

  const punkte = useMemo(() => (daten ? erklaere(daten.std, daten.jetzt) : []), [daten]);

  const chip = (h: number): React.CSSProperties => ({
    border: `1px solid ${stunden === h ? BLAU : RAND}`,
    background: stunden === h ? BLAU : "#fff",
    color: stunden === h ? "#fff" : BLAU,
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <section style={{ background: "#fff", border: `1px solid ${RAND}`, borderRadius: 14, padding: 10, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: 0.6 }}>🌦 METEOGRAMM {THUN.name.toUpperCase()}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[24, 48, 72].map((h) => (
            <button key={h} onClick={() => setStunden(h)} aria-pressed={stunden === h} style={chip(h)}>
              {h} h
            </button>
          ))}
        </div>
      </div>

      {!daten && (
        <p style={{ margin: "8px 0", fontSize: 12, color: TEXT2 }}>{fehler ? "Das Meteogramm konnte gerade nicht geladen werden." : "Meteogramm wird geladen…"}</p>
      )}

      {daten && (
        <>
          <Diagramm std={daten.std} jetzt={daten.jetzt} stunden={stunden} />

          <div style={{ marginTop: 10, background: "#f4f9ff", border: `1px solid ${RAND}`, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: TEXT, marginBottom: 6 }}>
              🧭 Was wir sehen <span style={{ fontWeight: 400, color: TEXT2 }}>· nächste 24 Stunden · Stand {daten.stand} Uhr</span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
              {punkte.map((p) => (
                <li key={p.titel} style={{ fontSize: 12, lineHeight: 1.5, color: TEXT }}>
                  <span aria-hidden="true">{p.icon} </span>
                  <b>{p.titel}:</b> <span style={{ color: TEXT2 }}>{p.text}</span>
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 10, color: TEXT3, lineHeight: 1.5, marginTop: 8 }}>
              Der Text wird bei jeder Aktualisierung automatisch aus den Modelldaten für Thun erzeugt (Open-Meteo, Zeiten in Schweizer Ortszeit). Es sind Faustregeln –
              kein Wetterbriefing und keine Flugfreigabe; am Startplatz kann es anders sein.
            </div>
          </div>
        </>
      )}
    </section>
  );
}
