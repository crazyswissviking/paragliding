// Alle Messnetze abrufen, vereinheitlichen, Druck ergänzen.
import { aktiveQuellen, ZWISCHENSPEICHER_MS, type QuellenId } from "./config";
import { standardHoler, type Holer } from "./holen";
import { ergaenzeDruck } from "./druck";
import { ladeMeteoSchweiz } from "./quellen/meteoschweiz";
import { ladeSlf } from "./quellen/slf";
import { ladeWindline } from "./quellen/windline";
import { ladeOpenWindMap } from "./quellen/openwindmap";
import { ladeWindsMobi } from "./quellen/windsmobi";
import type { MessnetzAntwort, NetzStatus, Station } from "./typen";

const LADER: Record<QuellenId, (h: Holer) => Promise<Station[]>> = {
  meteoschweiz: ladeMeteoSchweiz,
  slf: ladeSlf,
  windline: ladeWindline,
  openwindmap: ladeOpenWindMap,
  windsmobi: ladeWindsMobi,
};

// Je Stations-ID nur ein Eintrag (der jüngste) – sonst scheitert das Speichern ("ON CONFLICT … a second time")
export function ohneDuplikate(liste: Station[]): Station[] {
  const m = new Map<string, Station>();
  for (const s of liste) {
    const alt = m.get(s.id);
    if (!alt || (s.zeit ?? "") > (alt.zeit ?? "")) m.set(s.id, s);
  }
  return [...m.values()];
}

export async function ladeMessnetz(holer: Holer = standardHoler, quellen: QuellenId[] = aktiveQuellen()): Promise<MessnetzAntwort> {
  const stationen: Station[] = [];
  const netze: NetzStatus[] = [];
  await Promise.all(
    quellen.map(async (q) => {
      const t0 = Date.now();
      try {
        const liste = await LADER[q](holer);
        stationen.push(...liste.map(ergaenzeDruck));
        netze.push({ netz: q, ok: true, anzahl: liste.length, dauerMs: Date.now() - t0 });
      } catch (e) {
        netze.push({ netz: q, ok: false, anzahl: 0, fehler: e instanceof Error ? e.message : String(e), dauerMs: Date.now() - t0 });
      }
    }),
  );
  stationen.splice(0, stationen.length, ...ohneDuplikate(stationen));
  stationen.sort((a, b) => a.netz.localeCompare(b.netz) || a.name.localeCompare(b.name, "de"));
  netze.sort((a, b) => a.netz.localeCompare(b.netz));
  return { stationen, netze, abgerufen: new Date().toISOString() };
}

// Zwischenspeicher im Server-Speicher (pro Instanz)
let speicher: { zeit: number; schluessel: string; wert: MessnetzAntwort } | null = null;

export async function ladeMessnetzZwischengespeichert(holer: Holer = standardHoler): Promise<{ antwort: MessnetzAntwort; frisch: boolean }> {
  const quellen = aktiveQuellen();
  const schluessel = quellen.join(",");
  if (speicher && speicher.schluessel === schluessel && Date.now() - speicher.zeit < ZWISCHENSPEICHER_MS) return { antwort: speicher.wert, frisch: false };
  const antwort = await ladeMessnetz(holer, quellen);
  // Nur zwischenspeichern, wenn mindestens ein Netz geantwortet hat
  if (antwort.netze.some((n) => n.ok)) speicher = { zeit: Date.now(), schluessel, wert: antwort };
  return { antwort, frisch: true };
}
