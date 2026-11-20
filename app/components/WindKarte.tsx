"use client";
// Karte mit gemessenem Wind (Pfeile) und Druckunterschieden (Linien) – Darstellung analog winds.mobi.
// Kartenbibliothek: MapLibre GL JS. Basiskarte: swisstopo (Pixelkarte grau). Daten: MeteoSchweiz + Windline (siehe /api/messwerte).
import { useEffect, useRef, useState } from "react";
import { GeoJSONSource, Map as MapLibreMap, Marker, NavigationControl, Popup } from "maplibre-gl";
import type { MapLayerMouseEvent } from "maplibre-gl";
import type { Feature, LineString } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
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
const ANSICHTEN: Record<Ansicht, { name: string; grenzen: [[number, number], [number, number]] }> = {
  interlaken: { name: "Interlaken", grenzen: [[46.645, 7.74], [46.735, 7.96]] },
  oberland: { name: "Berner Oberland", grenzen: [[46.45, 7.35], [46.95, 8.65]] },
  schweiz: { name: "Schweiz (Föhn/Bise)", grenzen: [[45.95, 5.95], [47.75, 9.55]] },
};
// Unter dieser Zoomstufe werden die vielen Oberland-Stationen ausgeblendet (sonst unlesbar)
const MIN_ZOOM_STATIONEN = 7;
const FIT_PADDING = { top: 24, left: 24, right: 40, bottom: 72 };
const grenzen = (g: [[number, number], [number, number]]): [[number, number], [number, number]] => [[g[0][1], g[0][0]], [g[1][1], g[1][0]]];

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

// ── Marker-Elemente (HTML) ────────────────────────────────────────────────
function stationElement(m: Messung, veraltet: boolean, ref: boolean): HTMLElement {
  const farbe = veraltet ? TEXT3 : windFarbe(m.wind, m.boeen);
  const ruhig = m.wind == null || m.wind < 1 || m.richtung == null;
  const pfeil = ruhig
    ? `<circle cx="22" cy="22" r="4.5" fill="#fff"/>`
    : `<g transform="rotate(${(m.richtung as number) + 180} 22 22)"><path d="M22 6 L31 32 L22 26 L13 32 Z" fill="#fff"/></g>`;
  const werte = `${rund(m.wind)}${m.boeen != null ? `/${rund(m.boeen)}` : ""}`;
  const el = document.createElement("div");
  el.className = "wk-m";
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `${m.name}: Wind ${rund(m.wind)} km/h`);
  el.style.zIndex = String(10 + Math.round(m.wind ?? 0) + (m.rolle ? 500 : 0));
  el.innerHTML =
    `<svg width="40" height="40" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="${farbe}" stroke="#fff" stroke-width="2.5"/>${pfeil}</svg>` +
    `<div class="wk-w">${werte}</div>` +
    (ref && m.druck != null ? `<div class="wk-p">${m.druck.toFixed(0)} hPa</div>` : "") +
    (ref ? `<div class="wk-name">${esc(m.name)}</div>` : "");
  return el;
}

function pfeilElement(winkel: number, farbe: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "wk-pfeil";
  el.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22" style="transform:rotate(${winkel}deg)"><path d="M11 2 L18 18 L11 14 L4 18 Z" fill="${farbe}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  return el;
}

function labelElement(text: string, farbe: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "wk-lblbox";
  el.innerHTML = `<div class="wk-lbl" style="border-color:${farbe};color:${farbe}">${esc(text)}</div>`;
  return el;
}

const STIL = `
.wk-m{width:40px;height:40px;cursor:pointer;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}
.wk-w{position:absolute;top:42px;left:50%;transform:translateX(-50%);background:#fff;border-radius:6px;padding:0 4px;font:700 11px/16px system-ui,sans-serif;color:${TEXT};white-space:nowrap}
.wk-p{position:absolute;top:60px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.85);border-radius:6px;padding:0 3px;font:600 9px/12px system-ui,sans-serif;color:${TEXT2};white-space:nowrap}
.wk-name{position:absolute;left:46px;top:8px;background:rgba(255,255,255,.9);padding:0 4px;font:700 11px/16px system-ui,sans-serif;color:${TEXT2};white-space:nowrap;border-radius:4px}
.wk-pfeil{width:22px;height:22px;pointer-events:none}
.wk-lblbox{width:0;height:0;cursor:pointer}
.wk-lbl{position:absolute;left:0;top:0;transform:translate(-50%,-50%);background:#fff;border:2px solid;border-radius:999px;padding:1px 7px;font:800 11px/16px system-ui,sans-serif;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.wk-karte .maplibregl-popup-content{font:12px/1.5 system-ui,sans-serif;color:${TEXT};padding:10px 12px;border-radius:10px}
`;

export default function WindKarte({ mess }: { mess: MesswerteAntwort }) {
  const box = useRef<HTMLDivElement>(null);
  const karte = useRef<MapLibreMap | null>(null);
  const stationen = useRef<{ m: Marker; ref: boolean }[]>([]);
  const druckMarker = useRef<{ m: Marker; gross: boolean }[]>([]);
  const [ansicht, setAnsicht] = useState<Ansicht>("oberland");
  const [zeigeWind, setZeigeWind] = useState(true);
  const [zeigeDruck, setZeigeDruck] = useState(true);
  const [beruehrung, setBeruehrung] = useState(false);
  const [bereit, setBereit] = useState(false);

  // Karte anlegen
  useEffect(() => {
    if (!box.current) return;
    // Touch-Geräte: Seite soll weiter scrollbar bleiben → Karte nur mit zwei Fingern bewegen.
    // Mit Maus: Mausrad zoomt direkt.
    const touch = window.matchMedia("(pointer: coarse)").matches;
    setBeruehrung(touch);
    const map = new MapLibreMap({
      container: box.current,
      style: {
        version: 8,
        sources: {
          basis: {
            type: "raster",
            tiles: ["https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg"],
            tileSize: 256,
            maxzoom: 18,
            attribution: '© <a href="https://www.swisstopo.admin.ch" target="_blank" rel="noopener noreferrer">swisstopo</a>',
          },
        },
        layers: [{ id: "basis", type: "raster", source: "basis" }],
      },
      bounds: grenzen(ANSICHTEN.oberland.grenzen),
      fitBoundsOptions: { padding: FIT_PADDING, animate: false },
      minZoom: 5,
      maxZoom: 15.5,
      dragRotate: false,
      pitchWithRotate: false,
      cooperativeGestures: touch,
      locale: {
        "CooperativeGesturesHandler.MobileHelpText": "Mit zwei Fingern verschieben und zoomen",
        "CooperativeGesturesHandler.WindowsHelpText": "Strg + Mausrad zum Zoomen",
        "CooperativeGesturesHandler.MacHelpText": "⌘ + Mausrad zum Zoomen",
      },
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    map.scrollZoom.setWheelZoomRate(1 / 200); // Mausrad etwas flotter als Standard
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");

    map.on("load", () => {
      map.addSource("druck", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      const linie = (id: string, filter: "gross" | "lokal") => {
        const zoomGrenze = filter === "gross" ? { maxzoom: MIN_ZOOM_STATIONEN } : { minzoom: MIN_ZOOM_STATIONEN };
        map.addLayer({
          id, type: "line", source: "druck", filter: ["==", ["get", "gruppe"], filter], ...zoomGrenze,
          layout: { "line-cap": "round" },
          paint: { "line-color": ["get", "farbe"], "line-width": 3, "line-opacity": 0.85, "line-dasharray": [2.5, 2] },
        });
        // unsichtbare, breite Linie als Klickfläche
        map.addLayer({
          id: `${id}-hit`, type: "line", source: "druck", filter: ["==", ["get", "gruppe"], filter], ...zoomGrenze,
          paint: { "line-color": "#000", "line-width": 18, "line-opacity": 0 },
        });
        map.on("click", `${id}-hit`, (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (f) new Popup({ offset: 8, maxWidth: "260px" }).setLngLat(e.lngLat).setHTML(String(f.properties?.popup ?? "")).addTo(map);
        });
        map.on("mouseenter", `${id}-hit`, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", `${id}-hit`, () => (map.getCanvas().style.cursor = ""));
      };
      linie("druck-gross", "gross");
      linie("druck-lokal", "lokal");
      setBereit(true);
    });
    karte.current = map;
    return () => {
      map.remove();
      karte.current = null;
      stationen.current = [];
      druckMarker.current = [];
      setBereit(false);
    };
  }, []);

  // Ansicht wechseln
  useEffect(() => {
    if (bereit && karte.current) karte.current.fitBounds(grenzen(ANSICHTEN[ansicht].grenzen), { padding: FIT_PADDING, animate: false });
  }, [ansicht, bereit]);

  // Daten zeichnen
  useEffect(() => {
    const map = karte.current;
    if (!bereit || !map) return;
    stationen.current.forEach((x) => x.m.remove());
    druckMarker.current.forEach((x) => x.m.remove());
    stationen.current = [];
    druckMarker.current = [];

    const popup = (html: string) => new Popup({ offset: 22, maxWidth: "260px" }).setHTML(html);
    const stationMarker = (m: Messung, ref: boolean) => {
      if (m.lat == null || m.lng == null) return;
      const alter = alterMin(m.zeit);
      const marker = new Marker({ element: stationElement(m, alter != null && alter > 60, ref), anchor: "center" })
        .setLngLat([m.lng, m.lat])
        .setPopup(popup(popupMessung(m)))
        .addTo(map);
      stationen.current.push({ m: marker, ref });
    };
    [...(mess.stationen ?? []), ...(mess.windline ?? [])].forEach((m) => stationMarker(m, false));
    (mess.referenz ?? []).forEach((m) => stationMarker(m, true));

    const features: Feature<LineString, { farbe: string; popup: string; gruppe: string }>[] = [];
    paare(mess).forEach((p) => {
      const diff = p.d.diff as number;
      const farbe = p.farbe(diff);
      const gross = p.kurz === "Föhn" || p.kurz === "Bise";
      const html = popupPaar(p);
      const ll = (pos: [number, number]): [number, number] => [pos[1], pos[0]]; // [lat,lng] → [lng,lat]
      features.push({
        type: "Feature",
        properties: { farbe, popup: html, gruppe: gross ? "gross" : "lokal" },
        geometry: { type: "LineString", coordinates: [ll(p.a.pos), ll(p.b.pos)] },
      });
      if (diff !== 0) {
        const [hoch, tief] = diff >= 0 ? [p.a.pos, p.b.pos] : [p.b.pos, p.a.pos];
        const mk = new Marker({ element: pfeilElement(peilung(hoch, tief), farbe), anchor: "center" })
          .setLngLat(ll(zwischen(hoch, tief, 0.7)))
          .addTo(map);
        druckMarker.current.push({ m: mk, gross });
      }
      const lbl = new Marker({ element: labelElement(`${p.kurz} ${vz(diff)}`, farbe), anchor: "center" })
        .setLngLat(ll(zwischen(p.a.pos, p.b.pos, p.versatz ?? 0.45)))
        .setPopup(popup(html))
        .addTo(map);
      lbl.getElement().style.zIndex = "800";
      druckMarker.current.push({ m: lbl, gross });
    });
    (map.getSource("druck") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
  }, [mess, bereit]);

  // Ebenen ein-/ausschalten (Wind, Druck, Zoomstufe)
  useEffect(() => {
    const map = karte.current;
    if (!bereit || !map) return;
    const sync = () => {
      const nah = map.getZoom() >= MIN_ZOOM_STATIONEN;
      stationen.current.forEach(({ m, ref }) => {
        m.getElement().style.display = zeigeWind && (ref || nah) ? "" : "none";
      });
      // Föhn/Bise (großräumig) nur bei weitem Ausschnitt, Haslital-Differenzen nur bei nahem Ausschnitt
      druckMarker.current.forEach(({ m, gross }) => {
        m.getElement().style.display = zeigeDruck && (gross ? !nah : nah) ? "" : "none";
      });
    };
    sync();
    for (const id of ["druck-gross", "druck-gross-hit", "druck-lokal", "druck-lokal-hit"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", zeigeDruck ? "visible" : "none");
    }
    map.on("zoom", sync);
    return () => {
      map.off("zoom", sync);
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
      <div style={{ position: "relative", zIndex: 0, isolation: "isolate", borderRadius: 14, overflow: "hidden", border: `1px solid ${RAND}` }} className="wk-karte">
        <div ref={box} style={{ height: 380, width: "100%", background: "#e8eef5" }} role="application" aria-label="Karte mit Wind und Druckunterschieden" />
      </div>
      <div style={{ fontSize: 10, color: TEXT3, lineHeight: 1.5, marginTop: 6 }}>
        Pfeil = Windrichtung (wohin der Wind weht), Zahl = Wind/Böen in km/h; grün ≤ 15, gelb 15–25, rot &gt; 25 km/h, grau = Messung älter als 1 Std.
        Gestrichelte Linien = Druckunterschied in hPa, der Pfeil zeigt vom hohen zum tiefen Druck (Föhn: Lugano − Zürich, Bise: Güttingen − Genf).
        {" "}Je nach Ausschnitt sieht man die Oberland-Stationen samt Haslital-Druckunterschieden (Interlaken, Oberland) oder Föhn und Bise (Schweiz).
        {" "}Zoom mit dem Mausrad, den Tasten +/− oder zwei Fingern. Klicke auf eine Station oder Linie für Details.
        {beruehrung ? " Auf dem Handy: mit zwei Fingern verschieben und zoomen." : ""}
      </div>
    </div>
  );
}