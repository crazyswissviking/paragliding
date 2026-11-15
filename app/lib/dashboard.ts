// Dashboard auf der Hauptseite: Katalog der wählbaren Messdaten + Standard-Auswahl.
// Die gewählten Einträge (Reihenfolge = Anzeigereihenfolge) liegen in Supabase in der
// Tabelle "dashboard_einstellungen" (eine Zeile mit id = 1) und werden im Admin-Tool gepflegt.
import { KARTEN_STATIONEN, WINDLINE_STATIONEN } from "./messwerte";

export const DASH_TABELLE = "dashboard_einstellungen";

export type DashElement = { key: string; label: string; gruppe: string };

export const DASH_ELEMENTE: DashElement[] = [
  { key: "foehn", label: "Föhn (Druck Lugano − Zürich)", gruppe: "Föhn, Bise & Druck" },
  { key: "bise", label: "Bise (Druck Güttingen − Genf)", gruppe: "Föhn, Bise & Druck" },
  { key: "lokal", label: "Haslital: Druckunterschiede", gruppe: "Föhn, Bise & Druck" },
  ...WINDLINE_STATIONEN.map((s) => ({
    key: `W${s.id}`,
    label: `${s.name}${s.rolle ? ` · ${s.rolle}` : ""}`,
    gruppe: "Windline",
  })),
  ...KARTEN_STATIONEN.map((s) => ({
    key: s.id,
    label: `${s.name} (${s.hoehe} m)`,
    gruppe: "MeteoSchweiz",
  })),
];

// Standard, solange im Admin-Tool noch nichts gespeichert wurde
export const DASH_STANDARD: string[] = ["foehn", "bise", "W6200", "W6117", "INT"];

// Aus der Datenbank gelesene Auswahl prüfen: nur bekannte Schlüssel, keine Doppelten
export function bereinigeAuswahl(x: unknown): string[] | null {
  if (!Array.isArray(x)) return null;
  const erlaubt = new Set(DASH_ELEMENTE.map((e) => e.key));
  const out: string[] = [];
  for (const k of x) {
    if (typeof k === "string" && erlaubt.has(k) && !out.includes(k)) out.push(k);
  }
  return out;
}