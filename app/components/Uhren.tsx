"use client";

// Runde Rundinstrumente (SVG). Winkel in Grad, 0° = oben, im Uhrzeigersinn.
import { vorzeichen } from "../lib/foehn";

type Zahl = number | null;

const TEXT = "#1f3a5a";
const TEXT2 = "#5b7491";
const TEXT3 = "#8aa0b8";

// ── Runde „Uhren“ (Rundinstrumente) ───────────────────────────────────────
// Winkel in Grad, 0° = oben, im Uhrzeigersinn
export function polar(rad: number, winkel: number): [number, number] {
  const a = (winkel * Math.PI) / 180;
  return [rad * Math.sin(a), -rad * Math.cos(a)];
}

export function bogen(rad: number, von: number, bis: number): string {
  const [x0, y0] = polar(rad, von);
  const [x1, y1] = polar(rad, bis);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${rad} ${rad} 0 ${bis - von > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

// Druck-Uhr: 270°-Rundinstrument mit Zeiger, 0 hPa oben. Farbzonen aus der jeweiligen Statusfunktion.
export function DruckUhr({ wert, bereich, farbeFuer, size = 96, einheit = "hPa", beschriftung = true }: { wert: Zahl; bereich: number; farbeFuer?: (d: number) => string; size?: number; einheit?: string; beschriftung?: boolean }) {
  const SWEEP = 135; // ±135° um „12 Uhr“
  const wInst = wert == null ? 0 : Math.max(-bereich, Math.min(bereich, wert));
  const zeiger = (wInst / bereich) * SWEEP;
  const segmente = 27;
  const schritt = (2 * SWEEP) / segmente;
  const farbe = wert != null && farbeFuer ? farbeFuer(wert) : TEXT;
  const klein = size < 80;
  const [zx, zy] = polar(34, zeiger);
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" role="img" aria-label={`${wert == null ? "keine Daten" : vorzeichen(wert)} ${einheit}`} style={{ flexShrink: 0 }}>
      {Array.from({ length: segmente }, (_, i) => {
        const a0 = -SWEEP + i * schritt;
        const mitte = ((a0 + schritt / 2) / SWEEP) * bereich;
        return <path key={i} d={bogen(42, a0 + 0.6, a0 + schritt - 0.6)} fill="none" stroke={farbeFuer ? farbeFuer(mitte) : "#cfe0f2"} strokeWidth="7" opacity={0.85} />;
      })}
      {[-1, -0.5, 0, 0.5, 1].map((f) => {
        const [x0, y0] = polar(33, f * SWEEP);
        const [x1, y1] = polar(37, f * SWEEP);
        return <line key={f} x1={x0} y1={y0} x2={x1} y2={y1} stroke={TEXT2} strokeWidth="1.2" />;
      })}
      {beschriftung && !klein && (
        <text x={0} y={-24} textAnchor="middle" fontSize="6" fill={TEXT3}>0</text>
      )}
      {wert != null && (
        <>
          <line x1="0" y1="0" x2={zx} y2={zy} stroke={TEXT} strokeWidth="2.6" strokeLinecap="round" />
          <circle r="4.5" fill={TEXT} />
          <circle r="1.6" fill="#fff" />
        </>
      )}
      <text y={klein ? 30 : 27} textAnchor="middle" fontSize={klein ? 13 : 14} fontWeight="800" fill={farbe}>
        {wert == null ? "–" : vorzeichen(wert)}
      </text>
      {!klein && (
        <text y={36} textAnchor="middle" fontSize="6" fill={TEXT2}>
          {einheit}
        </text>
      )}
    </svg>
  );
}

