// Windline (windline.ch): öffentliche Stationsliste m.windline.ch, Daten je Station als JSON.
// Wind in m/s → km/h (geprüft gegen winds.mobi). "airpressurestation_qfe" = QFE, "airpressurestation" = QNH.
import { holeJson, type Holer } from "../holen";
import { leereStation, rund, zahl, type Station } from "../typen";
import { gueltigMeeresDruck, gueltigQfe } from "../druck";

// Aktive Stationen laut m.windline.ch (Stand Nov 2026). Demo-/Offline-Stationen sind bewusst nicht dabei.
export const WINDLINE_IDS = [6200, 4104, 6679, 6117, 6116, 4108, 4201, 4116, 4109, 4096];

const MS_ZU_KMH = 3.6;

type WindlineJson = Record<string, unknown>;

// 46°42'41.67"N → 46.7116
export function dms(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const m = /(\d+)\s*°\s*(\d+)\s*['′]\s*([\d.]+)\s*["″]?\s*([NSEW])/i.exec(text);
  if (!m) return null;
  const wert = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
  return /[SW]/i.test(m[4]) ? -wert : wert;
}

export function parseWindline(j: WindlineJson): Station | null {
  const lat = dms(j.latitude);
  const lng = dms(j.longitude);
  const id = zahl(j.stationID);
  if (lat == null || lng == null || id == null) return null;
  const s = leereStation("windline", String(id), String(j.stationName ?? `Windline ${id}`), lat, lng);
  s.hoehe = zahl(j.altitude);
  s.hoeheBaro = s.hoehe;
  const ts = zahl(j.timestamp);
  s.zeit = ts == null ? null : new Date(ts).toISOString();
  const w = zahl(j.windspeed1);
  const b = zahl(j.windpeak1);
  s.wind = w == null ? null : rund(w * MS_ZU_KMH);
  s.boeen = b == null ? null : rund(b * MS_ZU_KMH);
  s.richtung = zahl(j.winddir1);
  s.temp = zahl(j.temp1);
  s.feuchte = zahl(j.hum1);
  s.druck = { qfe: gueltigQfe(zahl(j.airpressurestation_qfe)), qnh: gueltigMeeresDruck(zahl(j.airpressurestation)), qff: null };
  if (j.status && j.status !== "online") return null; // offline: keine Werte anzeigen
  return s;
}

export async function ladeWindline(holer: Holer): Promise<Station[]> {
  const ergebnisse = await Promise.allSettled(WINDLINE_IDS.map((id) => holeJson<WindlineJson>(holer, `https://m.windline.ch/sensorAjaxData.php?stationID=${id}`)));
  const out: Station[] = [];
  for (const e of ergebnisse) {
    if (e.status !== "fulfilled") continue;
    const s = parseWindline(e.value);
    if (s) out.push(s);
  }
  if (out.length === 0) throw new Error("Keine Windline-Station erreichbar");
  return out;
}
