// Luftdruck: QFE = Druck an der Station, QNH = auf Meereshöhe (ICAO-Standardatmosphäre),
// QFF = auf Meereshöhe mit der tatsächlichen Temperatur (Wetterkarten-Druck).
// Fehlende Werte werden berechnet und in `berechnet` gekennzeichnet.
// Geprüft an 16 MeteoSchweiz-Stationen: QNH ±0.13 hPa, QFF ±0.25 hPa (nur Stationen bis 1000 m).
import type { Station, Zahl } from "./typen";

const G = 9.80665;
const R = 287.05;
const GRADIENT = 0.0065; // K/m
const T0 = 288.15; // K

export function qnhAusQfe(qfe: number, hoehe: number): number {
  return qfe * Math.pow(1 - (GRADIENT * hoehe) / T0, -5.255);
}

export function qfeAusQnh(qnh: number, hoehe: number): number {
  return qnh / Math.pow(1 - (GRADIENT * hoehe) / T0, -5.255);
}

export function qffAusQfe(qfe: number, hoehe: number, tempC: number): number {
  const tMittel = tempC + 273.15 + (GRADIENT * hoehe) / 2;
  return qfe * Math.exp((G * hoehe) / (R * tMittel));
}

// Plausible Bereiche – alles andere (z. B. 0 oder −2 bei defekten Sensoren) wird verworfen
export function gueltigQfe(v: Zahl): Zahl {
  return v != null && v > 450 && v < 1100 ? v : null;
}
export function gueltigMeeresDruck(v: Zahl): Zahl {
  return v != null && v > 900 && v < 1100 ? v : null;
}

const QFF_MAX_HOEHE = 1000; // darüber ist die Reduktion auf Meereshöhe nicht aussagekräftig (MeteoSchweiz liefert dort auch kein QFF)

export function ergaenzeDruck(s: Station): Station {
  const d = { ...s.druck };
  d.qfe = gueltigQfe(d.qfe);
  d.qnh = gueltigMeeresDruck(d.qnh);
  d.qff = gueltigMeeresDruck(d.qff);
  const h = s.hoeheBaro ?? s.hoehe;
  const berechnet: Station["berechnet"] = [];
  if (h != null) {
    if (d.qfe == null && d.qnh != null) {
      d.qfe = round1(qfeAusQnh(d.qnh, h));
      berechnet.push("qfe");
    }
    if (d.qnh == null && d.qfe != null) {
      d.qnh = round1(qnhAusQfe(d.qfe, h));
      berechnet.push("qnh");
    }
    if (d.qff == null && d.qfe != null && s.temp != null && h <= QFF_MAX_HOEHE) {
      d.qff = round1(qffAusQfe(d.qfe, h, s.temp));
      berechnet.push("qff");
    }
  }
  return { ...s, druck: d, berechnet };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
