// MeteoSchweiz SwissMetNet (Open Government Data, Quelle: MeteoSchweiz).
// Eine Datei mit den aktuellen 10-Minuten-Werten aller ~160 Stationen + Stationsliste.
// Druck: prestas0 = QFE, pp0qnhs0 = QNH, pp0qffs0 = QFF.
import { holeText, type Holer } from "../holen";
import { leereStation, zahl, type Station } from "../typen";

export const MS_AKTUELL_URL = "https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv";
export const MS_META_URL = "https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/ogd-smn_meta_stations.csv";

type Meta = { name: string; kanton: string; hoehe: number | null; hoeheBaro: number | null; lat: number; lng: number };

export function parseMeta(csv: string): Map<string, Meta> {
  const zeilen = csv.split(/\r?\n/).filter((z) => z.trim() !== "");
  const kopf = zeilen[0].split(";").map((k) => k.trim());
  const ix = (n: string) => kopf.indexOf(n);
  const iA = ix("station_abbr");
  const iN = ix("station_name");
  const iK = ix("station_canton");
  const iH = ix("station_height_masl");
  const iB = ix("station_height_barometer_masl");
  const iLat = ix("station_coordinates_wgs84_lat");
  const iLng = ix("station_coordinates_wgs84_lon");
  const out = new Map<string, Meta>();
  if ([iA, iN, iLat, iLng].some((i) => i < 0)) return out;
  for (const z of zeilen.slice(1)) {
    const c = z.split(";");
    const lat = zahl(c[iLat]);
    const lng = zahl(c[iLng]);
    if (lat == null || lng == null) continue;
    out.set(c[iA].trim(), { name: c[iN].trim(), kanton: iK >= 0 ? c[iK].trim() : "", hoehe: zahl(c[iH]), hoeheBaro: iB >= 0 ? zahl(c[iB]) : null, lat, lng });
  }
  return out;
}

// "202611250630" (UTC) → ISO
export function zeitAusStempel(s: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(s.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00.000Z` : null;
}

export function parseAktuell(csv: string, meta: Map<string, Meta>): Station[] {
  const zeilen = csv.split(/\r?\n/).filter((z) => z.trim() !== "");
  if (zeilen.length < 2) return [];
  const kopf = zeilen[0].split(";").map((k) => k.trim());
  const ix = (n: string) => kopf.indexOf(n);
  const col = {
    st: 0,
    datum: ix("Date"),
    temp: ix("tre200s0"),
    feuchte: ix("ure200s0"),
    richtung: ix("dkl010z0"),
    wind: ix("fu3010z0"),
    boeen: ix("fu3010z1"),
    qfe: ix("prestas0"),
    qff: ix("pp0qffs0"),
    qnh: ix("pp0qnhs0"),
  };
  const out: Station[] = [];
  for (const z of zeilen.slice(1)) {
    const c = z.split(";");
    const abk = c[col.st].trim();
    const m = meta.get(abk);
    if (!m) continue;
    const s = leereStation("meteoschweiz", abk, m.name, m.lat, m.lng);
    s.hoehe = m.hoehe;
    s.hoeheBaro = m.hoeheBaro ?? m.hoehe;
    s.zeit = col.datum >= 0 ? zeitAusStempel(c[col.datum]) : null;
    s.wind = zahl(c[col.wind]);
    s.boeen = zahl(c[col.boeen]);
    s.richtung = zahl(c[col.richtung]);
    s.temp = zahl(c[col.temp]);
    s.feuchte = zahl(c[col.feuchte]);
    s.druck = { qfe: zahl(c[col.qfe]), qnh: zahl(c[col.qnh]), qff: zahl(c[col.qff]) };
    // Stationen ohne jegliche Messwerte weglassen
    if (s.wind == null && s.temp == null && s.druck.qfe == null && s.druck.qnh == null && s.druck.qff == null) continue;
    out.push(s);
  }
  return out;
}

export async function ladeMeteoSchweiz(holer: Holer): Promise<Station[]> {
  const [meta, aktuell] = await Promise.all([holeText(holer, MS_META_URL, "iso-8859-1"), holeText(holer, MS_AKTUELL_URL)]);
  return parseAktuell(aktuell, parseMeta(meta));
}
