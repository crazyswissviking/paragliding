import { after, NextResponse } from "next/server";
import { ladeMessnetzZwischengespeichert } from "../../lib/messnetz";
import { speichereMessnetz } from "../../lib/messnetz/speichern";

// Alle Schweizer Windmessnetze (Wind, Temperatur, QFE/QNH/QFF) in einheitlicher Form.
// Abruf serverseitig (kein CORS-Problem). Nach der Antwort werden die Werte in Supabase abgelegt.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const { antwort, frisch } = await ladeMessnetzZwischengespeichert();
    if (antwort.stationen.length === 0) {
      return NextResponse.json({ error: "Keine Messnetz-Daten verfuegbar", netze: antwort.netze }, { status: 502 });
    }
    if (frisch) after(() => speichereMessnetz(antwort));
    return NextResponse.json(antwort, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (err) {
    console.error("Messnetz-Fehler:", err);
    return NextResponse.json({ error: "Messnetz nicht verfuegbar" }, { status: 502 });
  }
}
