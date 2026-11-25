// OpenWindMap (Pioupiou/Windbird): nur Wind. Community-Lizenz: Namensnennung + Verlinkung nötig,
// und die Daten dürfen nur mit OFFENEN anderen Sensordaten kombiniert werden (sonst "Extended License" bei contact@openwindmap.org).
import { holeJson, type Holer } from "../holen";
import { leereStation, zahl, type Station } from "../typen";
import { inSchweiz } from "../schweiz";

export const OPENWINDMAP_NAMENSNENNUNG = "Winddaten (c) Mitwirkende des OpenWindMap-Windnetzes, https://openwindmap.org";

type OwmStation = {
  id: number;
  meta?: { name?: string };
  location?: { latitude?: number; longitude?: number; success?: boolean };
  measurements?: { date?: string; wind_heading?: number | null; wind_speed_avg?: number | null; wind_speed_max?: number | null };
  status?: { state?: string | null };
};

export function parseOpenWindMap(daten: OwmStation[]): Station[] {
  const out: Station[] = [];
  for (const d of daten) {
    const lat = d.location?.latitude;
    const lng = d.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number" || !inSchweiz(lat, lng)) continue;
    if (d.location?.success === false) continue;
    const m = d.measurements;
    if (!m || m.wind_speed_avg == null || d.status?.state === "off") continue;
    const s = leereStation("openwindmap", String(d.id), d.meta?.name?.trim() || `Pioupiou ${d.id}`, lat, lng);
    s.zeit = m.date ?? null;
    s.wind = zahl(m.wind_speed_avg);
    s.boeen = zahl(m.wind_speed_max);
    s.richtung = zahl(m.wind_heading);
    out.push(s);
  }
  return out;
}

export async function ladeOpenWindMap(holer: Holer): Promise<Station[]> {
  const j = await holeJson<{ data: OwmStation[] }>(holer, "https://api.openwindmap.org/v1/live-with-meta/all");
  return parseOpenWindMap(j.data ?? []);
}
