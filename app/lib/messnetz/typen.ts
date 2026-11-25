// Gemeinsames Datenmodell für alle Messnetze (Schweiz).
// Einheiten: Wind in km/h, Richtung in Grad (Herkunft, 0 = Nord), Temperatur °C, Druck hPa.

export type Zahl = number | null;

export type Messnetz = "meteoschweiz" | "slf" | "windline" | "openwindmap" | "holfuy" | "pdcs" | "aletsch" | "windball" | "pgsonda";

export const NETZ_NAMEN: Record<Messnetz, string> = {
  meteoschweiz: "MeteoSchweiz",
  slf: "SLF (IMIS)",
  windline: "Windline",
  openwindmap: "OpenWindMap",
  holfuy: "Holfuy",
  pdcs: "PDCS",
  aletsch: "Fluggruppe Aletsch",
  windball: "Windball",
  pgsonda: "PG-Sonda",
};

// Welche Druckwerte nicht gemessen, sondern aus anderen Werten berechnet wurden
export type Berechnet = "qfe" | "qnh" | "qff";

export type Station = {
  id: string; // z. B. "meteoschweiz-BER"
  netz: Messnetz;
  extId: string; // Kennung beim Anbieter
  name: string;
  lat: number;
  lng: number;
  hoehe: Zahl; // Stationshöhe, m ü. M.
  hoeheBaro: Zahl; // Höhe des Drucksensors (für Umrechnungen), sonst Stationshöhe
  zeit: string | null; // Zeitpunkt der Messung (ISO, UTC)
  wind: Zahl; // km/h, Mittelwert
  boeen: Zahl; // km/h, Spitze
  richtung: Zahl; // Grad, Herkunft
  temp: Zahl; // °C
  feuchte: Zahl; // %
  druck: { qfe: Zahl; qnh: Zahl; qff: Zahl }; // hPa
  berechnet: Berechnet[];
};

export type NetzStatus = {
  netz: string; // Quelle (z. B. "meteoschweiz", "windsmobi")
  ok: boolean;
  anzahl: number;
  fehler?: string;
  dauerMs: number;
};

export type MessnetzAntwort = {
  stationen: Station[];
  netze: NetzStatus[];
  abgerufen: string; // ISO
};

export function leereStation(netz: Messnetz, extId: string, name: string, lat: number, lng: number): Station {
  return {
    id: `${netz}-${extId}`,
    netz,
    extId,
    name,
    lat,
    lng,
    hoehe: null,
    hoeheBaro: null,
    zeit: null,
    wind: null,
    boeen: null,
    richtung: null,
    temp: null,
    feuchte: null,
    druck: { qfe: null, qnh: null, qff: null },
    berechnet: [],
  };
}

// Zahl aus Text/Zahl; "-", "", null, NaN → null
export function zahl(v: unknown): Zahl {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (s === "" || s === "-" || s === "–") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function rund(v: Zahl, stellen = 1): Zahl {
  if (v == null) return null;
  const f = 10 ** stellen;
  return Math.round(v * f) / f;
}
