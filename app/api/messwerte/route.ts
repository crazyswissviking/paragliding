import { NextResponse } from "next/server";
import { ladeMesswerte } from "../../lib/messwerte";

// Daten werden serverseitig geholt (kein CORS-Problem) und kurz zwischengespeichert.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const daten = await ladeMesswerte((url, init) => fetch(url, { ...init, cache: "no-store" }));
    return NextResponse.json(daten, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error("Messwerte-Fehler:", err);
    return NextResponse.json({ error: "Messwerte nicht verfuegbar" }, { status: 502 });
  }
}