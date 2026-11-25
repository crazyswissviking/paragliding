// SLF IMIS-Messnetz (Schnee- und Lawinenforschung; CC BY 4.0, Quelle: WSL-Institut für Schnee- und Lawinenforschung SLF).
// Wind in m/s → km/h. IMIS misst keinen Luftdruck.
// Hinweis der SLF: Schnittstelle ist zum Abrufen gedacht und darf nicht überlastet werden → Abruf nur alle ≥ 5 Minuten (Zwischenspeicher in index.ts).
import { holeJson, type Holer } from "../holen";
import { leereStation, rund, zahl, type Station } from "../typen";
import { inSchweiz } from "../schweiz";

const BASIS = "https://measurement-api.slf.ch/public/api/imis";

type SlfStation = { code: string; label: string; lat: number; lon: number; elevation: number | null; canton_code?: string; country_code?: string; type?: string };
type SlfMessung = {
  station_code: string;
  measure_date: string;
  TA_30MIN_MEAN?: number | null;
  RH_30MIN_MEAN?: number | null;
  VW_30MIN_MEAN?: number | null;
  VW_30MIN_MAX?: number | null;
  DW_30MIN_MEAN?: number | null;
};

const MS_ZU_KMH = 3.6;

export function parseSlf(stationen: SlfStation[], messungen: SlfMessung[]): Station[] {
  // jüngste Messung je Station mit Wind- oder Temperaturwert
  const letzte = new Map<string, SlfMessung>();
  for (const m of messungen) {
    if (m.VW_30MIN_MEAN == null && m.TA_30MIN_MEAN == null) continue;
    const alt = letzte.get(m.station_code);
    if (!alt || m.measure_date > alt.measure_date) letzte.set(m.station_code, m);
  }
  const out: Station[] = [];
  for (const st of stationen) {
    const m = letzte.get(st.code);
    if (!m) continue;
    if (typeof st.lat !== "number" || typeof st.lon !== "number" || !inSchweiz(st.lat, st.lon)) continue;
    const s = leereStation("slf", st.code, st.label, st.lat, st.lon);
    s.hoehe = zahl(st.elevation);
    s.hoeheBaro = s.hoehe;
    s.zeit = m.measure_date;
    const w = zahl(m.VW_30MIN_MEAN);
    const b = zahl(m.VW_30MIN_MAX);
    s.wind = w == null ? null : rund(w * MS_ZU_KMH);
    s.boeen = b == null ? null : rund(b * MS_ZU_KMH);
    s.richtung = zahl(m.DW_30MIN_MEAN) == null ? null : Math.round(zahl(m.DW_30MIN_MEAN) as number);
    s.temp = rund(zahl(m.TA_30MIN_MEAN));
    s.feuchte = rund(zahl(m.RH_30MIN_MEAN), 0);
    out.push(s);
  }
  return out;
}

export async function ladeSlf(holer: Holer): Promise<Station[]> {
  const [stationen, messungen] = await Promise.all([holeJson<SlfStation[]>(holer, `${BASIS}/stations`), holeJson<SlfMessung[]>(holer, `${BASIS}/measurements`)]);
  return parseSlf(stationen, messungen);
}
