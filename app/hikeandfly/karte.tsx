"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Punkt = {
  id: number;
  titel: string;
  startpunkt: string;
  ziel: string;
  lat: number;
  lng: number;
  landeplatz?: string;
  landeplatz_lat?: number;
  landeplatz_lng?: number;
  startplatz_hoehe?: number;
  landeplatz_hoehe?: number;
  schwierigkeit?: string;
};

type Props = {
  abenteuer: Punkt[];
  ausgewaehlt: number | null;
  onAuswaehlen: (id: number) => void;
};

export default function Karte({ abenteuer, ausgewaehlt, onAuswaehlen }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});
  const landeMarkersRef = useRef<Record<number, L.Marker>>({});
  const layerRef = useRef<L.TileLayer | null>(null);
  const [kartentyp, setKartentyp] = useState<"osm" | "swisstopo">("osm");
  const [touchAusgewaehlt, setTouchAusgewaehlt] = useState<number | null>(null);

  const tiles = {
    osm: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap" },
    swisstopo: { url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg", attribution: "© swisstopo" },
  };

  useEffect(() => {
    if (mapRef.current) return;

    const karte = L.map("hike-karte", { zoomControl: true });
    mapRef.current = karte;

    const t = tiles[kartentyp];
    layerRef.current = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: 19 }).addTo(karte);

    const startIcon = L.divIcon({
      html: `<div style="background:#3355cc;border-radius:50%;width:10px;height:10px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      className: "",
      iconSize: [14, 14],
      iconAnchor: [5, 5],
    });

    const landeIcon = L.divIcon({
      html: `<div style="background:#2d6a4f;border-radius:50%;width:10px;height:10px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      className: "",
      iconSize: [14, 14],
      iconAnchor: [5, 5],
    });

    const alleBounds: [number, number][] = [];

    abenteuer.forEach((a) => {
      const tooltipInhalt = `
        <div style="min-width:180px">
          <p style="margin:0 0 6px;font-weight:bold;font-size:14px">${a.titel}</p>
          ${a.ziel ? `<p style="margin:0 0 3px;font-size:12px">🚩 <strong>Startplatz:</strong> ${a.ziel}</p>` : ""}
          ${a.startplatz_hoehe ? `<p style="margin:0 0 3px;font-size:12px">🏔 <strong>Höhe:</strong> ${a.startplatz_hoehe} m</p>` : ""}
          ${a.landeplatz ? `<p style="margin:0 0 3px;font-size:12px">🟢 <strong>Landeplatz:</strong> ${a.landeplatz}</p>` : ""}
          ${a.landeplatz_hoehe ? `<p style="margin:0 0 3px;font-size:12px">⛰ <strong>Landehöhe:</strong> ${a.landeplatz_hoehe} m</p>` : ""}
          ${a.schwierigkeit ? `<p style="margin:0;font-size:12px">💪 <strong>Schwierigkeit:</strong> ${a.schwierigkeit}</p>` : ""}
        </div>
      `;

      const marker = L.marker([a.lat, a.lng], { icon: startIcon })
        .addTo(karte)
        .bindTooltip(tooltipInhalt, { direction: "top", offset: [0, -8], opacity: 1 });

      marker.on("click", () => {
        setTouchAusgewaehlt((prev) => {
          if (prev === a.id) {
            onAuswaehlen(a.id);
            return null;
          }
          return a.id;
        });
      });

      if (a.landeplatz_lat && a.landeplatz_lng) {
        const landeMarker = L.marker([a.landeplatz_lat, a.landeplatz_lng], { icon: landeIcon })
          .bindTooltip(`<strong>${a.titel}</strong><br/>🟢 Landeplatz: ${a.landeplatz}`, { direction: "top", offset: [0, -8], opacity: 1 });
        landeMarkersRef.current[a.id] = landeMarker;

        marker.on("mouseover", () => {
          if (mapRef.current) landeMarker.addTo(mapRef.current);
        });
        marker.on("mouseout", () => {
          if (mapRef.current) landeMarker.removeFrom(mapRef.current);
        });
      }

      markersRef.current[a.id] = marker;
      alleBounds.push([a.lat, a.lng]);
    });

    if (alleBounds.length > 0) {
      const bounds = L.latLngBounds(alleBounds);
      karte.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
    }

    return () => {
      karte.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    Object.values(landeMarkersRef.current).forEach((m) => {
      if (mapRef.current) m.removeFrom(mapRef.current);
    });
    if (ausgewaehlt) {
      if (markersRef.current[ausgewaehlt]) {
        markersRef.current[ausgewaehlt].openTooltip();
        mapRef.current.panTo(markersRef.current[ausgewaehlt].getLatLng());
      }
      if (landeMarkersRef.current[ausgewaehlt] && mapRef.current) {
        landeMarkersRef.current[ausgewaehlt].addTo(mapRef.current);
      }
    }
  }, [ausgewaehlt]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (touchAusgewaehlt && markersRef.current[touchAusgewaehlt]) {
      markersRef.current[touchAusgewaehlt].openTooltip();
      mapRef.current.panTo(markersRef.current[touchAusgewaehlt].getLatLng());
      if (landeMarkersRef.current[touchAusgewaehlt]) {
        landeMarkersRef.current[touchAusgewaehlt].addTo(mapRef.current);
      }
    }
  }, [touchAusgewaehlt]);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    mapRef.current.removeLayer(layerRef.current);
    const t = tiles[kartentyp];
    layerRef.current = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: 19 }).addTo(mapRef.current);
  }, [kartentyp]);

  return (
    <div style={{ position: "relative" }}>
      <div style={{
        position: "absolute", top: "10px", right: "10px", zIndex: 1000,
        display: "flex", gap: "4px", background: "white", borderRadius: "8px",
        padding: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <button onClick={() => setKartentyp("osm")} style={{ padding: "6px 12px", background: kartentyp === "osm" ? "#3355cc" : "transparent", color: kartentyp === "osm" ? "white" : "#555", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
          🗺 OSM
        </button>
        <button onClick={() => setKartentyp("swisstopo")} style={{ padding: "6px 12px", background: kartentyp === "swisstopo" ? "#3355cc" : "transparent", color: kartentyp === "swisstopo" ? "white" : "#555", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
          🇨🇭 Swisstopo
        </button>
      </div>
      <div id="hike-karte" style={{ height: "400px", width: "100%" }} />
    </div>
  );
}