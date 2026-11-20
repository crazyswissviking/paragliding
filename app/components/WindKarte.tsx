"use client";
// Karte mit gemessenem Wind (Pfeile) und Druckunterschieden (Linien) – Darstellung analog winds.mobi.
// Basiskarte: swisstopo (Pixelkarte grau). Daten: MeteoSchweiz + Windline (siehe /api/messwerte).
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DruckDiff, MesswerteAntwort, Messung } from "../lib/messwerte";
import { BISE_OST, BISE_WEST, FOEHN_NORD, FOEHN_SUED, KARTEN_STATIONEN } from "../lib/messwerte";

const TEXT = "#1f3a5a";
const TEXT2 = "#5b7491";
const TEXT3 = "#8aa0b8";
const RAND = "#cfe0f2";
const BLAU = "#3a6ea5";
const GRUEN = "#2e9e5b";
const GELB = "#e0a100";
const ORANGE = "#e07b00";
const ROT = "#d64545";

type Ansicht = "interlaken" | "oberland" | "schweiz";
const ANSICHTEN: Record<Ansicht, { name: string; grenzen: L.LatLngBoundsLiteral }> = {
  interlaken: { name: "Interlaken", grenzen: [[46.645, 7.74], [46.735, 7.96]] },
  oberland: { name: "Berner Oberland", grenzen: [[46.45, 7.35], [46.95, 8.65]] },
  schweiz: { name: "Schweiz (Föhn/Bise)", grenzen: [[45.95, 5.95], [47.75, 9.55]] },
};
// Unter dieser Zoomstufe werden die vielen Oberland-Stationen ausgeblendet (sonst unlesbar)
const MIN_ZOOM_STATIONEN = 8;
const FIT = { animate: false, paddingTopLeft: [24, 24] as [number, number], paddingBottomRight: [40, 72] as [number, number] };

const RICHTUNGEN = ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const richtungText = (g: number | null) => (g == null ? "–" : RICHTUNGEN[Math.round((((g % 360) + 360) % 360) / 22.5) % 16]);
const rund = (v: number | null | undefined) => (v == null ? "–" : String(Math.round(v)));
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const vz = (d: number) => `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d).toFixed(1)}`;

function windFarbe(wind: number | null, boeen: number | null): string {
  if (wind == null) return TEXT3;
  const b = boeen ?? wind;
  if (wind > 25 || b > 38) return ROT;
  if (wind > 15 || b > 28) return GELB;
  return GRUEN;
}

function zeitLokal(iso: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
}
function alterMin(iso: string | null): number | null {
  return iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) : null;
}

function windIcon(m: Messung, veraltet: boolean, zweiteZeile?: string): L.DivIcon {
  const farbe = veraltet ? TEXT3 : windFarbe(m.wind, m.boeen);
  const ruhig = m.wind == null || m.wind < 1 || m.richtung == null;
  const pfeil = ruhig
    ? `<circle cx="22" cy="22" r="4.5" fill="#fff"/>`
    : `<g transform="rotate(${(m.richtung as number) + 180} 22 22)"><path d="M22 6 L31 32 L22 26 L13 32 Z" fill="#fff"/></g>`;
  const werte = `${rund(m.wind)}${m.boeen != null ? `/${rund(m.boeen)}` : ""}`;
  const html =
    `<div class="wk-m"><svg width="40" height="40" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="${farbe}" stroke="#fff" stroke-width="2.5"/>${pfeil}</svg>` +
    `<div class="wk-w">${werte}</div>${zweiteZeile ? `<div class="wk-p">${esc(zweiteZeile)}</div>` : ""}</div>`;
  return L.divIcon({ html, className: "wk-icon", iconSize: [40, 60], iconAnchor: [20, 20], popupAnchor: [0, -18] });
}

function popupMessung(m: Messung): string {
  const alter = alterMin(m.zeit);
  const zeilen = [
    `<b>${esc(m.name)}</b>${m.hoehe != null ? ` <span style="color:${TEXT3}">· ${m.hoehe} m</span>` : ""}${m.rolle ? ` · ${esc(m.rolle)}` : ""}`,
    `Wind <b>${rund(m.wind)} km/h</b>, Böen ${rund(m.boeen)} · aus ${richtungText(m.richtung)}${m.richtung != null ? ` (${Math.round(m.richtung)}°)` : ""}`,
  ];
  const sonst = [m.temp != null ? `${m.temp.toFixed(1)} °C` : "", m.druck != null ? `${m.druck.toFixed(1)} hPa (${m.druckBasis})` : ""].filter(Boolean).join(" · ");
  if (sonst) zeilen.push(sonst);
  zeilen.push(`<span style="color:${TEXT3}">🕒 ${zeitLokal(m.zeit)} Uhr${alter != null ? ` · vor ${alter} Min.` : ""}</span>`);
  return zeilen.join("<br>");
}

// Kompasswinkel auf der (Mercator-)Karte von A nach B, Grad im Uhrzeigersinn ab Norden
function peilung(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
  const dx = (b[1] - a[1]) * rad;
  const dy = merc(b[0]) - merc(a[0]);
  return (Math.atan2(dx, dy) / rad + 360) % 360;
}
const zwischen = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

type Paar = {
  kurz: string;
  titel: string;
  a: { name: string; pos: [number, number] };
  b: { name: string; pos: [number, number] };
  d: DruckDiff;
  farbe: (diff: number) => string;
  deutung: (diff: number) => string;
  versatz?: number; // Lage des Labels auf der Linie (0–1)
};

const foehnFarbe = (d: number) => (Math.abs(d) < 2 ? GRUEN : Math.abs(d) < 4 ? GELB : Math.abs(d) < 8 ? ORANGE : ROT);
const biseFarbe = (d: number) => (d < 0 ? TEXT2 : d < 2 ? GRUEN : d < 4 ? GELB : ORANGE);
const neutral = () => BLAU;

function paare(mess: MesswerteAntwort): Paar[] {
  const pos = (id: string, st: { lat: number; lng: number }): [number, number] => {
    const m = [...(mess.referenz ?? []), ...mess.stationen].find((x) => x.id === id);
    return m && m.lat != null && m.lng != null ? [m.lat, m.lng] : [st.lat, st.lng];
  };
  const k = (id: string) => KARTEN_STATIONEN.find((s) => s.id === id)!;
  const lugano = { name: FOEHN_SUED.name, pos: pos("LUG", FOEHN_SUED) };
  const kloten = { name: FOEHN_NORD.name, pos: pos("KLO", FOEHN_NORD) };
  const guett = { name: BISE_OST.name, pos: pos("GUT", BISE_OST) };
  const genf = { name: BISE_WEST.name, pos: pos("GVE", BISE_WEST) };
  const mer = { name: "Meiringen", pos: pos("MER", k("MER")) };
  const int = { name: "Interlaken", pos: pos("INT", k("INT")) };
  const grh = { name: "Grimsel", pos: pos("GRH", k("GRH")) };
  const alle: Paar[] = [
    {
      kurz: "Föhn", titel: "Föhn: Lugano − Zürich/Kloten", a: lugano, b: kloten, d: mess.foehn, farbe: foehnFarbe,
      deutung: (d) => (Math.abs(d) < 2 ? "kein Föhn" : `${d > 0 ? "Südföhn" : "Nordföhn"}${Math.abs(d) >= 4 ? " (Schwelle ±4 hPa überschritten)" : " möglich"}`),
    },
    {
      kurz: "Bise", titel: "Bise: Güttingen − Genf", a: guett, b: genf, d: mess.bise, farbe: biseFarbe,
      deutung: (d) => (d < 0 ? "Südwestlage, keine Bise" : d < 2 ? "keine Bise" : d < 4 ? "Bise wahrscheinlich" : "Bise-Situation"),
    },
    { kurz: "MER−INT", titel: "Meiringen − Interlaken", a: mer, b: int, d: mess.lokal?.meiringenInterlaken, farbe: neutral, deutung: () => "Haslital (keine anerkannte Schwelle)", versatz: 0.5 },
    { kurz: "GRH−MER", titel: "Grimsel − Meiringen", a: grh, b: mer, d: mess.lokal?.grimselMeiringen, farbe: neutral, deutung: () => "Grimsel nur QNH – auf die Veränderung achten", versatz: 0.5 },
    { kurz: "GRH−INT", titel: "Grimsel − Interlaken", a: grh, b: int, d: mess.lokal?.grimselInterlaken, farbe: neutral, deutung: () => "Grimsel nur QNH – auf die Veränderung achten", versatz: 0.35 },
  ] as Paar[];
  return alle.filter((p) => p.d && p.d.diff != null);
}

function popupPaar(p: Paar): string {
  const diff = p.d.diff as number;
  const tr = p.d.diffVor3h != null ? `<br>vor 3 h: ${vz(p.d.diffVor3h)} hPa` : "";
  return (
    `<b>${esc(p.titel)}</b><br><span style="font-size:18px;font-weight:800;color:${p.farbe(diff)}">${vz(diff)} hPa</span> ${esc(p.deutung(diff))}${tr}` +
    `<br><span style="color:${TEXT3}">Meeresdruck ${p.d.basis ?? ""} · 🕒 ${zeitLokal(p.d.zeit)} Uhr<br>Pfeil: von hohem zu tiefem Druck</span>`
  );
}

const STIL = `
.wk-icon{background:none;border:none}
.wk-m{display:flex;flex-direction:column;align-items:center;width:40px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}
.wk-w{margin-top:1px;background:#fff;border-radius:6px;padding:0 4px;font:700 11px/16px system-ui,sans-serif;color:${TEXT};white-space:nowrap}
.wk-p{margin-top:1px;background:rgba(255,255,255,.85);border-radius:6px;padding:0 3px;font:600 9px/12px system-ui,sans-serif;color:${TEXT2};white-space:nowrap}
.wk-lbl{background:#fff;border:2px solid;border-radius:999px;padding:1px 7px;font:800 11px/16px system-ui,sans-serif;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.25);transform:translate(-50%,-50%);position:absolute;left:0;top:0}
.wk-pfeil{transform-origin:center}
.wk-name{background:rgba(255,255,255,.9);border:none;box-shadow:none;font:700 11px system-ui,sans-serif;color:${TEXT2};padding:0 4px}
.wk-name:before{display:none}
`;

export default function WindKarte({ mess }: { mess: MesswerteAntwort }) {
  const box = useRef<HTMLDivElement>(null);
  const karte = useRef<L.Map | null>(null);
  const gruppen = useRef<{ oberland: L.LayerGroup; referenz: L.LayerGroup; druck: L.LayerGroup; druckLokal: L.LayerGroup } | null>(null);
  const [ansicht, setAnsicht] = useState<Ansicht>("oberland");
  const [zeigeWind, setZeigeWind] = useState(true);
  const [zeigeDruck, setZeigeDruck] = useState(true);
  const [beruehrung, setBeruehrung] = useState(false);
  const [bereit, setBereit] = useState(false);

  // Karte anlegen
  useEffect(() => {
    if (!box.current) return;
    const mobil = L.Browser.mobile;
    setBeruehrung(mobil);
    const map = L.map(box.current, { scrollWheelZoom: true, wheelPxPerZoomLevel: 120, dragging: !mobil, zoomSnap: 0.25, minZoom: 6, maxZoom: 16 });
    L.tileLayer("https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg", {
      maxZoom: 18,
      attribution: '© <a href="https://www.swisstopo.admin.ch" target="_blank" rel="noopener noreferrer">swisstopo</a>',
    }).addTo(map);
    map.fitBounds(ANSICHTEN.oberland.grenzen, FIT);
    karte.current = map;
    gruppen.current = { oberland: L.layerGroup(), referenz: L.layerGroup(), druck: L.layerGroup(), druckLokal: L.layerGroup() };
    setBereit(true);
    return () => {
      map.remove();
      karte.current = null;
      gruppen.current = null;
      setBereit(false);
    };
  }, []);

  // Ansicht wechseln
  useEffect(() => {
    if (bereit && karte.current) karte.current.fitBounds(ANSICHTEN[ansicht].grenzen, FIT);
  }, [ansicht, bereit]);

  // Daten zeichnen
  useEffect(() => {
    const g = gruppen.current;
    if (!bereit || !g) return;
    g.oberland.clearLayers();
    g.referenz.clearLayers();
    g.druck.clearLayers();
    g.druckLokal.clearLayers();

    const marker = (m: Messung, ref: boolean) => {
      if (m.lat == null || m.lng == null) return null;
      const alter = alterMin(m.zeit);
      const veraltet = alter != null && alter > 60;
      const zweite = ref && m.druck != null ? `${m.druck.toFixed(0)} hPa` : undefined;
      const mk = L.marker([m.lat, m.lng], { icon: windIcon(m, veraltet, zweite), zIndexOffset: Math.round((m.wind ?? 0) * 10) + (m.rolle ? 500 : 0), title: m.name });
      mk.bindPopup(popupMessung(m));
      if (ref) mk.bindTooltip(esc(m.name), { permanent: true, direction: "right", offset: [22, -10], className: "wk-name" });
      return mk;
    };
    [...(mess.stationen ?? []), ...(mess.windline ?? [])].forEach((m) => marker(m, false)?.addTo(g.oberland));
    (mess.referenz ?? []).forEach((m) => marker(m, true)?.addTo(g.referenz));

    paare(mess).forEach((p) => {
      const ziel = p.kurz === "Föhn" || p.kurz === "Bise" ? g.druck : g.druckLokal;
      const diff = p.d.diff as number;
      const farbe = p.farbe(diff);
      const [hoch, tief] = diff >= 0 ? [p.a.pos, p.b.pos] : [p.b.pos, p.a.pos];
      L.polyline([p.a.pos, p.b.pos], { color: farbe, weight: 3, opacity: 0.85, dashArray: "8 6" }).bindPopup(popupPaar(p)).addTo(ziel);
      if (diff !== 0) {
        const w = peilung(hoch, tief);
        const spitze = zwischen(hoch, tief, 0.7);
        L.marker(spitze, {
          interactive: false,
          icon: L.divIcon({
            className: "wk-icon",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            html: `<svg class="wk-pfeil" width="22" height="22" viewBox="0 0 22 22" style="transform:rotate(${w}deg)"><path d="M11 2 L18 18 L11 14 L4 18 Z" fill="${farbe}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
          }),
        }).addTo(ziel);
      }
      L.marker(zwischen(p.a.pos, p.b.pos, p.versatz ?? 0.45), {
        icon: L.divIcon({
          className: "wk-icon",
          iconSize: [0, 0],
          html: `<div class="wk-lbl" style="border-color:${farbe};color:${farbe}">${esc(p.kurz)} ${vz(diff)}</div>`,
        }),
        zIndexOffset: 800,
      }).bindPopup(popupPaar(p)).addTo(ziel);
    });
  }, [mess, bereit]);

  // Ebenen ein-/ausschalten (Wind, Druck, Zoomstufe)
  useEffect(() => {
    const map = karte.current;
    const g = gruppen.current;
    if (!bereit || !map || !g) return;
    const sync = () => {
      const set = (grp: L.LayerGroup, an: boolean) => {
        if (an && !map.hasLayer(grp)) grp.addTo(map);
        if (!an && map.hasLayer(grp)) map.removeLayer(grp);
      };
      set(g.referenz, zeigeWind);
      set(g.oberland, zeigeWind && map.getZoom() >= MIN_ZOOM_STATIONEN);
      // Föhn/Bise (großräumig) nur bei weitem Ausschnitt, Haslital-Differenzen nur bei nahem Ausschnitt
      set(g.druck, zeigeDruck && map.getZoom() < MIN_ZOOM_STATIONEN);
      set(g.druckLokal, zeigeDruck && map.getZoom() >= MIN_ZOOM_STATIONEN);
    };
    sync();
    map.on("zoomend", sync);
    return () => {
      map.off("zoomend", sync);
    };
  }, [zeigeWind, zeigeDruck, bereit, mess]);

  const knopf = (aktiv: boolean): React.CSSProperties => ({
    border: `1px solid ${aktiv ? BLAU : RAND}`, background: aktiv ? BLAU : "#fff", color: aktiv ? "#fff" : BLAU,
    borderRadius: 999, padding: "3px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer",
  });

  return (
    <div style={{ marginBottom: 16 }}>
      <style>{STIL}</style>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, alignItems: "center" }}>
        {(Object.keys(ANSICHTEN) as Ansicht[]).map((a) => (
          <button key={a} onClick={() => setAnsicht(a)} style={knopf(ansicht === a)} aria-pressed={ansicht === a}>
            {ANSICHTEN[a].name}
          </button>
        ))}
        <span style={{ width: 8 }} />
        <button onClick={() => setZeigeWind((v) => !v)} style={knopf(zeigeWind)} aria-pressed={zeigeWind}>💨 Wind</button>
        <button onClick={() => setZeigeDruck((v) => !v)} style={knopf(zeigeDruck)} aria-pressed={zeigeDruck}>🧭 Druckunterschiede</button>
      </div>
      <div style={{ position: "relative", zIndex: 0, isolation: "isolate", borderRadius: 14, overflow: "hidden", border: `1px solid ${RAND}` }}>
        <div ref={box} style={{ height: 380, width: "100%", background: "#e8eef5" }} role="application" aria-label="Karte mit Wind und Druckunterschieden" />
      </div>
      <div style={{ fontSize: 10, color: TEXT3, lineHeight: 1.5, marginTop: 6 }}>
        Pfeil = Windrichtung (wohin der Wind weht), Zahl = Wind/Böen in km/h; grün ≤ 15, gelb 15–25, rot &gt; 25 km/h, grau = Messung älter als 1 Std.
        Gestrichelte Linien = Druckunterschied in hPa, der Pfeil zeigt vom hohen zum tiefen Druck (Föhn: Lugano − Zürich, Bise: Güttingen − Genf).
        {" "}Je nach Ausschnitt sieht man die Oberland-Stationen samt Haslital-Druckunterschieden (Interlaken, Oberland) oder Föhn und Bise (Schweiz). Zoom mit dem Mausrad, den Tasten +/− oder zwei Fingern. Klicke auf eine Station oder Linie für Details.
        {beruehrung ? " Auf dem Handy: mit zwei Fingern verschieben und zoomen." : ""}
      </div>
    </div>
  );
}