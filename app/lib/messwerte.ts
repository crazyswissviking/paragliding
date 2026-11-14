// Echte Messwerte der automatischen Wetterstationen von MeteoSchweiz (SwissMetNet).
// Quelle: MeteoSchweiz, Open Government Data (CC BY) – "Source: MeteoSwiss".
// Dateien: https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/<kürzel>/ogd-smn_<kürzel>_t_now.csv
// Alle Zeitstempel in diesen Dateien sind UTC (Format dd.mm.yyyy HH:MM).

export type Station = { id: string; name: string; hoehe: number };

// Stationen, die als Karte angezeigt werden (Höhen laut MeteoSchweiz-Stationsliste)
export const KARTEN_STATIONEN: Station[] = [
  { id: "INT", name: "Interlaken", hoehe: 578 },
  { id: "BRZ", name: "Brienz", hoehe: 567 },
  { id: "MER", name: "Meiringen", hoehe: 589 },
  { id: "FRU", name: "Frutigen", hoehe: 756 },
  { id: "BOL", name: "Boltigen", hoehe: 820 },
  { id: "ABO", name: "Adelboden", hoehe: 1321 },
  { id: "GRH", name: "Grimsel Hospiz", hoehe: 1980 },
  { id: "JUN", name: "Jungfraujoch", hoehe: 3571 },
  { id: "ALT", name: "Altdorf", hoehe: 438 },
];

// Referenzstationen für die gemessene Föhn-Druckdifferenz
export const FOEHN_SUED: Station = { id: "LUG", name: "Lugano", hoehe: 273 };
export const FOEHN_NORD: Station = { id: "KLO", name: "Zürich / Kloten", hoehe: 426 };

// Referenzstationen für die Bise (gängiger Index: Druck Güttingen/TG minus Genf)
export const BISE_WEST = { id: "GVE", name: "Genf / Cointrin" };
export const BISE_OST = { id: "GUT", name: "Güttingen" };

export type Messung = {
  id: string;
  name: string;
  quelle: "MeteoSchweiz" | "Windline";
  rolle?: string; // z. B. "Startplatz" / "Landeplatz" (nur Windline)
  status?: string; // z. B. "online" (nur Windline)
  hoehe: number | null;
  zeit: string | null; // ISO-Zeit (UTC) der letzten Messung
  wind: number | null; // km/h, Zehnminutenmittel (fu3010z0)
  boeen: number | null; // km/h, Zehnminutenmaximum der Böenspitze (fu3010z1)
  richtung: number | null; // Grad, Zehnminutenmittel (dkl010z0)
  temp: number | null; // °C (tre200s0)
  regen: number | null; // mm in den letzten 10 Min. (rre150z0)
};

export type DruckDiff = {
  diff: number | null; // hPa (Station A minus Station B)
  diffVor3h: number | null;
  zeit: string | null; // ISO-Zeit (UTC)
  basis: "QFF" | "QNH" | null;
  verlauf: { t: number; d: number }[]; // Stundenwerte (t = UTC-Millisekunden), ca. die letzten 36 Stunden
};
export type FoehnMessung = DruckDiff; // Lugano minus Zürich/Kloten (+ Südföhn, − Nordföhn)

export type MesswerteAntwort = {
  stationen: Messung[];
  windline: Messung[];
  foehn: DruckDiff; // Lugano − Zürich/Kloten (+ Südföhn, − Nordföhn)
  bise: DruckDiff; // Güttingen − Genf (+ Bise)
  lokal: {
    meiringenInterlaken: DruckDiff; // Meiringen − Interlaken
    grimselMeiringen: DruckDiff; // Grimsel − Meiringen (QNH, Höhenreduktion ungenau)
    grimselInterlaken: DruckDiff; // Grimsel − Interlaken (QNH, Höhenreduktion ungenau)
  };
  fehlend: string[];
  abgerufen: string;
};

export function dateiUrl(id: string): string {
  const k = id.toLowerCase();
  return `https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/${k}/ogd-smn_${k}_t_now.csv`;
}

export function num(v: string | undefined): number | null {
  if (v === undefined) return null;
  const t = v.trim();
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// "12.11.2026 22:50" (UTC) -> "2026-11-12T22:50:00.000Z"
export function stempelZuIso(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/);
  if (!m) return null;
  const ms = Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]));
  return new Date(ms).toISOString();
}

type Tabelle = { spalte: (name: string) => number; zeilen: string[][] };

export function leseCsv(text: string): Tabelle {
  const zeilen = text.split(/\r?\n/).filter((z) => z.trim() !== "").map((z) => z.split(";"));
  const kopf = zeilen.shift() ?? [];
  return { spalte: (name) => kopf.indexOf(name), zeilen };
}

export function letzteMessung(csv: string, st: Station): Messung {
  const t = leseCsv(csv);
  const iZeit = t.spalte("reference_timestamp");
  const iWind = t.spalte("fu3010z0");
  // letzte Zeile mit Zeitstempel; bevorzugt eine mit Windwert
  const gueltig = t.zeilen.filter((z) => stempelZuIso(z[iZeit]) !== null);
  const zeile = [...gueltig].reverse().find((z) => num(z[iWind]) !== null) ?? gueltig[gueltig.length - 1];
  const wert = (name: string) => (zeile ? num(zeile[t.spalte(name)]) : null);
  return {
    id: st.id,
    name: st.name,
    quelle: "MeteoSchweiz",
    hoehe: st.hoehe,
    zeit: zeile ? stempelZuIso(zeile[iZeit]) : null,
    wind: wert("fu3010z0"),
    boeen: wert("fu3010z1"),
    richtung: wert("dkl010z0"),
    temp: wert("tre200s0"),
    regen: wert("rre150z0"),
  };
}

export function reihe(csv: string, param: string): { t: number; v: number }[] {
  const t = leseCsv(csv);
  const iZeit = t.spalte("reference_timestamp");
  const iWert = t.spalte(param);
  if (iWert < 0) return [];
  const out: { t: number; v: number }[] = [];
  for (const z of t.zeilen) {
    const iso = stempelZuIso(z[iZeit]);
    const v = num(z[iWert]);
    if (iso && v !== null) out.push({ t: new Date(iso).getTime(), v });
  }
  return out;
}

const runde1 = (x: number) => Math.round(x * 10) / 10;

type DruckParam = ReadonlyArray<readonly [string, "QFF" | "QNH"]>;
const STANDARD_PARAM: DruckParam = [["pp0qffs0", "QFF"], ["pp0qnhs0", "QNH"]];

// Differenz A − B über gemeinsame Zeitstempel; bevorzugt QFF, sonst QNH.
export function druckDifferenz(a: string | null, b: string | null, params: DruckParam = STANDARD_PARAM): DruckDiff {
  const leer: DruckDiff = { diff: null, diffVor3h: null, zeit: null, basis: null, verlauf: [] };
  if (!a || !b) return leer;
  for (const [param, basis] of params) {
    const ra = reihe(a, param);
    const rb = new Map(reihe(b, param).map((x) => [x.t, x.v]));
    const paare = ra.filter((x) => rb.has(x.t)).map((x) => ({ t: x.t, d: x.v - (rb.get(x.t) as number) }));
    if (paare.length === 0) continue;
    const letzte = paare[paare.length - 1];
    const vor = paare.find((p) => p.t === letzte.t - 3 * 3600 * 1000);
    return {
      diff: runde1(letzte.d),
      diffVor3h: vor ? runde1(vor.d) : null,
      zeit: new Date(letzte.t).toISOString(),
      basis,
      verlauf: paare.filter((p) => new Date(p.t).getUTCMinutes() === 0).slice(-36).map((p) => ({ t: p.t, d: runde1(p.d) })),
    };
  }
  return leer;
}

// Föhn: Lugano − Zürich (positiv = Südföhn, negativ = Nordföhn)
export function foehnBerechnen(sued: string | null, nord: string | null): FoehnMessung {
  return druckDifferenz(sued, nord);
}

// ── Windline (Start-/Landeplätze) ─────────────────────────────────────────
// Offiziell dokumentierter JSON-Ausgang für eigene Webseiten:
// https://www.windline.ch/support-faq/windline-in-eigene-webseite-einbinden/
// Stationsliste: https://m.windline.ch/ (Stand der Prüfung; IDs können sich ändern)
// Einheit: Die Windwerte (windspeed1 / windpeak1) kommen in m/s (von Christian an
// der Windline-Seite bestätigt) und werden hier in km/h umgerechnet (x 3.6).
export type WindlineStation = { id: string; name: string; rolle?: string };

export const WINDLINE_STATIONEN: WindlineStation[] = [
  { id: "4109", name: "Niederhorn" },
  { id: "6200", name: "Amisbühl", rolle: "Startplatz" },
  { id: "6679", name: "Howald (Beatenberg)" },
  { id: "6117", name: "Höhematte", rolle: "Landeplatz" },
  { id: "6116", name: "Lehn", rolle: "Landeplatz" },
  { id: "4104", name: "Grindelwald First" },
  { id: "4096", name: "Niederhünigen" },
];

export function windlineUrl(id: string): string {
  return `https://m.windline.ch/sensorAjaxData.php?stationID=${id}`;
}

export function parseWindline(text: string, st: WindlineStation): Messung {
  const j = JSON.parse(text) as Record<string, unknown>;
  const wert = (k: string): string | undefined => {
    const v = j[k];
    return typeof v === "string" || typeof v === "number" ? String(v) : undefined;
  };
  const status = wert("status");
  const online = status === undefined || status === "online";
  const ts = Number(wert("timestamp"));
  const n = (k: string) => (online ? num(wert(k)) : null);
  // m/s -> km/h, eine Nachkommastelle
  const kmh = (k: string) => {
    const v = n(k);
    return v === null ? null : Math.round(v * 3.6 * 10) / 10;
  };
  return {
    id: `W${st.id}`,
    name: st.name,
    quelle: "Windline",
    rolle: st.rolle,
    status,
    hoehe: num(wert("altitude")),
    zeit: Number.isFinite(ts) && ts > 0 ? new Date(ts).toISOString() : null,
    wind: kmh("windspeed1"),
    boeen: kmh("windpeak1"),
    richtung: n("winddir1"),
    temp: n("temp1"),
    regen: n("rainfall1"),
  };
}

type Fetcher = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; arrayBuffer: () => Promise<ArrayBuffer> }>;

async function ladeCsv(fetcher: Fetcher, id: string): Promise<string> {
  const res = await fetcher(dateiUrl(id), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  // Die Dateien sind Windows-1252; für die benötigten Zahlenspalten genügt latin1.
  return Buffer.from(await res.arrayBuffer()).toString("latin1");
}

async function ladeWindlineStation(fetcher: Fetcher, st: WindlineStation): Promise<Messung> {
  const res = await fetcher(windlineUrl(st.id), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`W${st.id}: HTTP ${res.status}`);
  return parseWindline(Buffer.from(await res.arrayBuffer()).toString("utf8"), st);
}

export async function ladeMesswerte(fetcher: Fetcher): Promise<MesswerteAntwort> {
  const alle: { id: string }[] = [...KARTEN_STATIONEN, FOEHN_SUED, FOEHN_NORD, BISE_WEST, BISE_OST];
  const [res, resW] = await Promise.all([
    Promise.allSettled(alle.map((s) => ladeCsv(fetcher, s.id))),
    Promise.allSettled(WINDLINE_STATIONEN.map((s) => ladeWindlineStation(fetcher, s))),
  ]);

  const csv = new Map<string, string>();
  const fehlend: string[] = [];
  res.forEach((r, i) => {
    if (r.status === "fulfilled") csv.set(alle[i].id, r.value);
    else fehlend.push(alle[i].id);
  });

  const windline: Messung[] = [];
  resW.forEach((r, i) => {
    if (r.status === "fulfilled") windline.push(r.value);
    else fehlend.push(`W${WINDLINE_STATIONEN[i].id}`);
  });

  const stationen = KARTEN_STATIONEN.filter((s) => csv.has(s.id)).map((s) => letzteMessung(csv.get(s.id) as string, s));
  const c = (id: string) => csv.get(id) ?? null;
  const foehn = foehnBerechnen(c(FOEHN_SUED.id), c(FOEHN_NORD.id));
  // Bise: positiv, wenn der Druck in Güttingen höher ist als in Genf
  const bise = druckDifferenz(c(BISE_OST.id), c(BISE_WEST.id));
  // Lokal (Haslital/Oberland): Bergstation Grimsel hat keinen QFF → nur QNH verwenden
  const nurQnh: DruckParam = [["pp0qnhs0", "QNH"]];
  const lokal = {
    meiringenInterlaken: druckDifferenz(c("MER"), c("INT")),
    grimselMeiringen: druckDifferenz(c("GRH"), c("MER"), nurQnh),
    grimselInterlaken: druckDifferenz(c("GRH"), c("INT"), nurQnh),
  };
  return { stationen, windline, foehn, bise, lokal, fehlend, abgerufen: new Date().toISOString() };
}