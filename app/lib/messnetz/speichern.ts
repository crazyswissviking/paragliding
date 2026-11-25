// Ablage der Messnetz-Werte in Supabase (nur serverseitig, mit Service-Role-Schlüssel).
//  - messnetz_stationen: Stammdaten (1 Zeile je Station)
//  - messnetz_aktuell:   jüngster Wert je Station (QFE / QNH / QFF, Wind, Temperatur …)
//  - messnetz_verlauf:   1 Wert je Station und Stunde, 7 Tage aufbewahrt
// Ohne SUPABASE_SERVICE_ROLE_KEY wird nichts gespeichert (die Karte funktioniert trotzdem).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MessnetzAntwort, Station } from "./typen";

const URL_STANDARD = "https://pcbqmjyfbkcwlmoztkem.supabase.co";
const AUFBEWAHREN_TAGE = 7;
const BLOCK = 400;
export const MIN_ABSTAND_MS = 10 * 60 * 1000; // höchstens alle 10 Min. speichern (pro Serverinstanz)

let zuletzt = 0;
let zuletztAufgeraeumt = 0;

export function adminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_STANDARD, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function stundeVon(iso: string): string {
  const d = new Date(iso);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

const werte = (s: Station) => ({
  wind: s.wind,
  boeen: s.boeen,
  richtung: s.richtung,
  temp: s.temp,
  feuchte: s.feuchte,
  qfe: s.druck.qfe,
  qnh: s.druck.qnh,
  qff: s.druck.qff,
  berechnet: s.berechnet,
});

export function zeilenStationen(stationen: Station[], jetzt: string) {
  return stationen.map((s) => ({
    id: s.id, netz: s.netz, ext_id: s.extId, name: s.name, lat: s.lat, lng: s.lng, hoehe: s.hoehe, hoehe_baro: s.hoeheBaro, aktualisiert: jetzt,
  }));
}
export function zeilenAktuell(stationen: Station[], jetzt: string) {
  return stationen.filter((s) => s.zeit).map((s) => ({ station_id: s.id, zeit: s.zeit, abgerufen: jetzt, ...werte(s) }));
}
export function zeilenVerlauf(stationen: Station[]) {
  return stationen.filter((s) => s.zeit).map((s) => ({ station_id: s.id, stunde: stundeVon(s.zeit as string), zeit: s.zeit, ...werte(s) }));
}

async function schreibe(client: SupabaseClient, tabelle: string, zeilen: object[], konflikt: string) {
  for (let i = 0; i < zeilen.length; i += BLOCK) {
    const { error } = await client.from(tabelle).upsert(zeilen.slice(i, i + BLOCK), { onConflict: konflikt });
    if (error) throw new Error(`${tabelle}: ${error.message}`);
  }
}

export type SpeicherErgebnis = { gespeichert: boolean; grund?: string; stationen?: number };

export async function speichereMessnetz(antwort: MessnetzAntwort, client: SupabaseClient | null = adminClient(), jetztMs: number = Date.now(), erzwingen = false): Promise<SpeicherErgebnis> {
  if (!client) return { gespeichert: false, grund: "kein SUPABASE_SERVICE_ROLE_KEY" };
  if (!erzwingen && jetztMs - zuletzt < MIN_ABSTAND_MS) return { gespeichert: false, grund: "zu früh" };
  const stationen = antwort.stationen;
  if (stationen.length === 0) return { gespeichert: false, grund: "keine Stationen" };
  zuletzt = jetztMs;
  const jetzt = new Date(jetztMs).toISOString();
  try {
    // Stammdaten zuerst (Fremdschlüssel), danach Messwerte
    await schreibe(client, "messnetz_stationen", zeilenStationen(stationen, jetzt), "id");
    await Promise.all([schreibe(client, "messnetz_aktuell", zeilenAktuell(stationen, jetzt), "station_id"), schreibe(client, "messnetz_verlauf", zeilenVerlauf(stationen), "station_id,stunde")]);
    if (jetztMs - zuletztAufgeraeumt > 60 * 60 * 1000) {
      zuletztAufgeraeumt = jetztMs;
      const grenze = new Date(jetztMs - AUFBEWAHREN_TAGE * 86400000).toISOString();
      const { error } = await client.from("messnetz_verlauf").delete().lt("stunde", grenze);
      if (error) console.error("Messnetz aufräumen:", error.message);
    }
    return { gespeichert: true, stationen: stationen.length };
  } catch (e) {
    zuletzt = 0; // beim nächsten Abruf erneut versuchen
    const grund = e instanceof Error ? e.message : String(e);
    console.error("Messnetz speichern:", grund);
    return { gespeichert: false, grund };
  }
}

// Nur für Tests
export function _zuruecksetzen() {
  zuletzt = 0;
  zuletztAufgeraeumt = 0;
}
