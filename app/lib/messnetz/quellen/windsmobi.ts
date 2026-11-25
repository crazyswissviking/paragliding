// winds.mobi: Sammeldienst (Open Source) mit u. a. Holfuy, PDCS, Fluggruppe Aletsch, Windball, PG-Sonda.
// Holfuy und PDCS haben keine öffentliche API – sie sind nur hier erreichbar. Die Nutzungsbedingungen von winds.mobi und
// der jeweiligen Anbieter sind NICHT geklärt → Quelle ist standardmässig ausgeschaltet (siehe config.ts).
// Direkt abgerufene Netze (MeteoSchweiz, SLF, Windline, OpenWindMap) werden hier bewusst ausgelassen.
import { holeJson, type Holer } from "../holen";
import { leereStation, zahl, type Messnetz, type Station } from "../typen";
import { inSchweiz } from "../schweiz";

const URL_CH =
  "https://winds.mobi/api/2.3/stations/?limit=2000&within-pt1-lat=47.9&within-pt1-lon=10.6&within-pt2-lat=45.75&within-pt2-lon=5.9&is-highest-duplicates-rating=false";

const ANBIETER: Record<string, Messnetz> = {
  "holfuy.com": "holfuy",
  "pdcs.ch": "pdcs",
  "fluggruppe-aletsch.ch": "aletsch",
  "windball.ch": "windball",
  "pgsonda.cz": "pgsonda",
};

type WmStation = {
  _id: string;
  alt?: number | null;
  loc?: { coordinates?: [number, number] };
  name?: string;
  short?: string;
  "pv-name"?: string;
  last?: {
    _id?: number; // Unix-Sekunden
    "w-dir"?: number | null;
    "w-avg"?: number | null;
    "w-max"?: number | null;
    temp?: number | null;
    hum?: number | null;
    pres?: { qfe?: number | null; qnh?: number | null; qff?: number | null } | null;
  };
};

export function parseWindsMobi(daten: WmStation[]): Station[] {
  const out: Station[] = [];
  for (const d of daten) {
    const netz = d["pv-name"] ? ANBIETER[d["pv-name"]] : undefined;
    const koord = d.loc?.coordinates;
    const l = d.last;
    if (!netz || !koord || !l) continue;
    const [lng, lat] = koord;
    if (!inSchweiz(lat, lng)) continue;
    const extId = d._id.replace(/^[a-z]+-/i, "");
    const s = leereStation(netz, extId, (d.short || d.name || d._id).trim(), lat, lng);
    s.hoehe = zahl(d.alt);
    s.hoeheBaro = s.hoehe;
    s.zeit = typeof l._id === "number" ? new Date(l._id * 1000).toISOString() : null;
    s.wind = zahl(l["w-avg"]);
    s.boeen = zahl(l["w-max"]);
    s.richtung = zahl(l["w-dir"]);
    s.temp = zahl(l.temp);
    s.feuchte = zahl(l.hum);
    s.druck = { qfe: zahl(l.pres?.qfe), qnh: zahl(l.pres?.qnh), qff: zahl(l.pres?.qff) };
    out.push(s);
  }
  return out;
}

export async function ladeWindsMobi(holer: Holer): Promise<Station[]> {
  return parseWindsMobi(await holeJson<WmStation[]>(holer, URL_CH));
}
