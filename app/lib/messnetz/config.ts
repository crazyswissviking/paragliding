// Welche Datenquellen abgerufen werden.
// Standard: nur Quellen mit klaren, offenen Bedingungen. Weitere per Umgebungsvariable MESSNETZ_QUELLEN (Vercel → Settings → Environment Variables),
// z. B.  MESSNETZ_QUELLEN=meteoschweiz,slf,windline,openwindmap,windsmobi
export type QuellenId = "meteoschweiz" | "slf" | "windline" | "openwindmap" | "windsmobi";

export const ALLE_QUELLEN: QuellenId[] = ["meteoschweiz", "slf", "windline", "openwindmap", "windsmobi"];
export const STANDARD_QUELLEN: QuellenId[] = ["meteoschweiz", "slf", "windline"];

export function aktiveQuellen(env: string | undefined = process.env.MESSNETZ_QUELLEN): QuellenId[] {
  if (!env || !env.trim()) return STANDARD_QUELLEN;
  const gewaehlt = env.split(",").map((s) => s.trim().toLowerCase());
  return ALLE_QUELLEN.filter((q) => gewaehlt.includes(q));
}

// Wie lange ein Abruf im Server-Speicher wiederverwendet wird (schont die Anbieter)
export const ZWISCHENSPEICHER_MS = 5 * 60 * 1000;
